// ChefSocial LiveKit Telephony Integration Service
// Provides WebRTC-based voice communication for enhanced voice processing
const { AccessToken, RoomServiceClient, EgressClient } = require('livekit-server-sdk');
const { v4: uuidv4 } = require('uuid');

class ChefSocialLiveKitService {
    constructor(logger = null, database = null) {
        this.logger = logger;
        this.db = database;
        
        // LiveKit Configuration from environment
        this.liveKitUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';
        this.liveKitApiKey = process.env.LIVEKIT_API_KEY;
        this.liveKitApiSecret = process.env.LIVEKIT_API_SECRET;
        
        // Validate configuration
        this.validateConfiguration();
        
        // Initialize clients
        this.roomService = new RoomServiceClient(this.liveKitUrl, this.liveKitApiKey, this.liveKitApiSecret);
        this.egressService = new EgressClient(this.liveKitUrl, this.liveKitApiKey, this.liveKitApiSecret);
        
        // Voice session management
        this.activeSessions = new Map(); // sessionId -> sessionData
        this.userSessions = new Map(); // userId -> sessionId
        
        // Performance metrics
        this.metrics = {
            sessionsCreated: 0,
            sessionsCompleted: 0,
            totalDuration: 0,
            averageLatency: 0,
            errors: 0
        };
        
        // Session cleanup interval
        this.startSessionCleanup();
        
        if (this.logger) {
            this.logger.info('ChefSocial LiveKit service initialized', {
                liveKitUrl: this.liveKitUrl,
                service: 'livekit'
            });
        }
    }

    validateConfiguration() {
        if (!this.liveKitApiKey || !this.liveKitApiSecret) {
            throw new Error('LiveKit API credentials not configured. Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET');
        }
        
        if (!this.liveKitUrl) {
            throw new Error('LiveKit server URL not configured. Set LIVEKIT_URL');
        }
    }

    // Generate secure access token for user
    async generateAccessToken(userId, roomName, userMetadata = {}) {
        try {
            const token = new AccessToken(this.liveKitApiKey, this.liveKitApiSecret, {
                identity: userId,
                ttl: '24h' // Token valid for 24 hours
            });

            // Add room permissions
            token.addGrant({
                room: roomName,
                roomJoin: true,
                canPublish: true,
                canSubscribe: true,
                canPublishData: true,
                canUpdateOwnMetadata: true
            });

            const accessToken = await token.toJwt();

            if (this.logger) {
                this.logger.info('LiveKit access token generated', {
                    userId,
                    roomName,
                    service: 'livekit',
                    tokenGenerated: true
                });
            }

            return accessToken;
        } catch (error) {
            if (this.logger) {
                this.logger.error('Failed to generate LiveKit access token', error, {
                    userId,
                    roomName,
                    service: 'livekit'
                });
            }
            throw error;
        }
    }

    // Create or join a voice room for the user
    async createVoiceSession(userId, sessionType = 'voice_chat', metadata = {}) {
        try {
            const sessionId = `voice_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const roomName = `room_${sessionId}`;

            // Create room configuration
            const roomOptions = {
                name: roomName,
                emptyTimeout: 300, // 5 minutes before empty room cleanup
                maxParticipants: 2, // User + AI agent
                metadata: JSON.stringify({
                    sessionId,
                    userId,
                    sessionType,
                    created: new Date().toISOString(),
                    ...metadata
                })
            };

            // Create the LiveKit room
            const room = await this.roomService.createRoom(roomOptions);

            // Generate access token for the user
            const accessToken = await this.generateAccessToken(userId, roomName, {
                sessionId,
                sessionType,
                role: 'user'
            });

            // Create session data
            const sessionData = {
                sessionId,
                userId,
                roomName,
                sessionType,
                accessToken,
                status: 'created',
                created: new Date(),
                lastActivity: new Date(),
                metadata: {
                    ...metadata,
                    roomConfig: roomOptions
                },
                participants: [],
                recordings: [],
                performance: {
                    startTime: Date.now(),
                    latencyMeasurements: [],
                    errors: []
                }
            };

            // Store session
            this.activeSessions.set(sessionId, sessionData);
            this.userSessions.set(userId, sessionId);
            this.metrics.sessionsCreated++;

            // Log session creation
            if (this.logger) {
                this.logger.info('Voice session created', {
                    sessionId,
                    userId,
                    roomName,
                    sessionType,
                    service: 'livekit'
                });
            }

            // Store in database if available
            if (this.db) {
                await this.storeVoiceSession(sessionData);
            }

            return {
                sessionId,
                roomName,
                accessToken,
                liveKitUrl: this.liveKitUrl,
                sessionData: {
                    sessionId,
                    sessionType,
                    created: sessionData.created
                }
            };

        } catch (error) {
            this.metrics.errors++;
            if (this.logger) {
                this.logger.error('Failed to create voice session', error, {
                    userId,
                    sessionType,
                    service: 'livekit'
                });
            }
            throw error;
        }
    }

    // Join existing voice session
    async joinVoiceSession(sessionId, userId) {
        try {
            const sessionData = this.activeSessions.get(sessionId);
            if (!sessionData) {
                throw new Error('Voice session not found or expired');
            }

            // Verify user access
            if (sessionData.userId !== userId) {
                throw new Error('Unauthorized access to voice session');
            }

            // Update session activity
            sessionData.lastActivity = new Date();
            sessionData.status = 'active';

            // Generate new access token for rejoining
            const accessToken = await this.generateAccessToken(userId, sessionData.roomName, {
                sessionId,
                sessionType: sessionData.sessionType,
                role: 'user',
                rejoining: true
            });

            sessionData.accessToken = accessToken;

            if (this.logger) {
                this.logger.info('User joined voice session', {
                    sessionId,
                    userId,
                    roomName: sessionData.roomName,
                    service: 'livekit'
                });
            }

            return {
                sessionId,
                roomName: sessionData.roomName,
                accessToken,
                liveKitUrl: this.liveKitUrl,
                sessionData: {
                    sessionId,
                    sessionType: sessionData.sessionType,
                    created: sessionData.created,
                    status: sessionData.status
                }
            };

        } catch (error) {
            if (this.logger) {
                this.logger.error('Failed to join voice session', error, {
                    sessionId,
                    userId,
                    service: 'livekit'
                });
            }
            throw error;
        }
    }

    // End voice session and cleanup
    async endVoiceSession(sessionId, userId) {
        try {
            const sessionData = this.activeSessions.get(sessionId);
            if (!sessionData) {
                throw new Error('Voice session not found');
            }

            // Verify user access
            if (sessionData.userId !== userId) {
                throw new Error('Unauthorized access to voice session');
            }

            // Update session data
            sessionData.status = 'ended';
            sessionData.endTime = new Date();
            sessionData.duration = sessionData.endTime - sessionData.created;

            // Stop any ongoing recordings
            if (sessionData.recordings.length > 0) {
                await this.stopSessionRecording(sessionId);
            }

            // Delete the LiveKit room
            try {
                await this.roomService.deleteRoom(sessionData.roomName);
            } catch (roomError) {
                if (this.logger) {
                    this.logger.warn('Failed to delete LiveKit room', {
                        sessionId,
                        roomName: sessionData.roomName,
                        error: roomError.message
                    });
                }
            }

            // Update metrics
            this.metrics.sessionsCompleted++;
            this.metrics.totalDuration += sessionData.duration;

            // Log session end
            if (this.logger) {
                this.logger.info('Voice session ended', {
                    sessionId,
                    userId,
                    duration: sessionData.duration,
                    roomName: sessionData.roomName,
                    service: 'livekit'
                });
            }

            // Update database
            if (this.db) {
                await this.updateVoiceSession(sessionData);
            }

            // Clean up from memory after delay (keep for short time for analytics)
            setTimeout(() => {
                this.activeSessions.delete(sessionId);
                this.userSessions.delete(userId);
            }, 5 * 60 * 1000); // 5 minutes

            return {
                sessionId,
                status: 'ended',
                duration: sessionData.duration,
                summary: {
                    created: sessionData.created,
                    ended: sessionData.endTime,
                    duration: sessionData.duration,
                    participants: sessionData.participants.length,
                    recordings: sessionData.recordings.length
                }
            };

        } catch (error) {
            if (this.logger) {
                this.logger.error('Failed to end voice session', error, {
                    sessionId,
                    userId,
                    service: 'livekit'
                });
            }
            throw error;
        }
    }

    // Start recording a voice session
    async startSessionRecording(sessionId, recordingOptions = {}) {
        try {
            const sessionData = this.activeSessions.get(sessionId);
            if (!sessionData) {
                throw new Error('Voice session not found');
            }

            const recordingId = `recording_${sessionId}_${Date.now()}`;
            
            // Configure recording
            const egressInfo = await this.egressService.startRoomCompositeEgress(
                sessionData.roomName,
                {
                    fileType: 'MP4',
                    output: {
                        case: 'file',
                        value: {
                            filepath: `recordings/${recordingId}.mp4`,
                            ...recordingOptions
                        }
                    },
                    options: {
                        width: 1920,
                        height: 1080,
                        videoBitrate: 3000000,
                        audioBitrate: 128000
                    }
                }
            );

            const recordingData = {
                recordingId,
                egressId: egressInfo.egressId,
                status: 'active',
                startTime: new Date(),
                filepath: `recordings/${recordingId}.mp4`
            };

            sessionData.recordings.push(recordingData);

            if (this.logger) {
                this.logger.info('Voice session recording started', {
                    sessionId,
                    recordingId,
                    egressId: egressInfo.egressId,
                    service: 'livekit'
                });
            }

            return recordingData;

        } catch (error) {
            if (this.logger) {
                this.logger.error('Failed to start session recording', error, {
                    sessionId,
                    service: 'livekit'
                });
            }
            throw error;
        }
    }

    // Stop recording a voice session
    async stopSessionRecording(sessionId) {
        try {
            const sessionData = this.activeSessions.get(sessionId);
            if (!sessionData) {
                throw new Error('Voice session not found');
            }

            const activeRecordings = sessionData.recordings.filter(r => r.status === 'active');
            
            for (const recording of activeRecordings) {
                try {
                    await this.egressService.stopEgress(recording.egressId);
                    recording.status = 'stopped';
                    recording.endTime = new Date();
                    recording.duration = recording.endTime - recording.startTime;

                    if (this.logger) {
                        this.logger.info('Voice session recording stopped', {
                            sessionId,
                            recordingId: recording.recordingId,
                            duration: recording.duration,
                            service: 'livekit'
                        });
                    }
                } catch (stopError) {
                    if (this.logger) {
                        this.logger.error('Failed to stop individual recording', stopError, {
                            sessionId,
                            recordingId: recording.recordingId
                        });
                    }
                }
            }

            return activeRecordings.map(r => ({
                recordingId: r.recordingId,
                status: r.status,
                duration: r.duration,
                filepath: r.filepath
            }));

        } catch (error) {
            if (this.logger) {
                this.logger.error('Failed to stop session recordings', error, {
                    sessionId,
                    service: 'livekit'
                });
            }
            throw error;
        }
    }

    // Get active session for user
    getActiveSession(userId) {
        const sessionId = this.userSessions.get(userId);
        if (!sessionId) return null;

        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            this.userSessions.delete(userId);
            return null;
        }

        return {
            sessionId: sessionData.sessionId,
            roomName: sessionData.roomName,
            sessionType: sessionData.sessionType,
            status: sessionData.status,
            created: sessionData.created,
            lastActivity: sessionData.lastActivity
        };
    }

    // Get session statistics
    getSessionStats(sessionId) {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) return null;

        return {
            sessionId,
            status: sessionData.status,
            duration: sessionData.endTime ? 
                sessionData.endTime - sessionData.created : 
                Date.now() - sessionData.created.getTime(),
            participants: sessionData.participants.length,
            recordings: sessionData.recordings.length,
            performance: sessionData.performance
        };
    }

    // Get service metrics
    getMetrics() {
        return {
            ...this.metrics,
            activeSessions: this.activeSessions.size,
            activeUsers: this.userSessions.size,
            averageDuration: this.metrics.sessionsCompleted > 0 ? 
                this.metrics.totalDuration / this.metrics.sessionsCompleted : 0
        };
    }

    // Store voice session in database
    async storeVoiceSession(sessionData) {
        if (!this.db) return;

        try {
            await this.db.db.run(`
                INSERT INTO voice_sessions (
                    session_id, user_id, room_name, session_type, status,
                    created_at, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                sessionData.sessionId,
                sessionData.userId,
                sessionData.roomName,
                sessionData.sessionType,
                sessionData.status,
                sessionData.created.toISOString(),
                JSON.stringify(sessionData.metadata)
            ]);
        } catch (error) {
            if (this.logger) {
                this.logger.error('Failed to store voice session in database', error);
            }
        }
    }

    // Update voice session in database
    async updateVoiceSession(sessionData) {
        if (!this.db) return;

        try {
            await this.db.db.run(`
                UPDATE voice_sessions 
                SET status = ?, ended_at = ?, duration = ?, metadata = ?
                WHERE session_id = ?
            `, [
                sessionData.status,
                sessionData.endTime ? sessionData.endTime.toISOString() : null,
                sessionData.duration || null,
                JSON.stringify(sessionData.metadata),
                sessionData.sessionId
            ]);
        } catch (error) {
            if (this.logger) {
                this.logger.error('Failed to update voice session in database', error);
            }
        }
    }

    // Session cleanup for inactive sessions
    startSessionCleanup() {
        setInterval(() => {
            const now = Date.now();
            const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

            for (const [sessionId, sessionData] of this.activeSessions.entries()) {
                if (sessionData.status === 'active' && 
                    (now - sessionData.lastActivity.getTime()) > maxInactiveTime) {
                    
                    if (this.logger) {
                        this.logger.info('Cleaning up inactive voice session', {
                            sessionId,
                            userId: sessionData.userId,
                            inactiveTime: now - sessionData.lastActivity.getTime()
                        });
                    }

                    this.endVoiceSession(sessionId, sessionData.userId).catch(error => {
                        if (this.logger) {
                            this.logger.error('Failed to cleanup inactive session', error, {
                                sessionId
                            });
                        }
                    });
                }
            }
        }, 5 * 60 * 1000); // Check every 5 minutes
    }

    // Health check
    async healthCheck() {
        try {
            // Try to list rooms to verify connection
            await this.roomService.listRooms();
            return {
                status: 'healthy',
                service: 'livekit',
                url: this.liveKitUrl,
                metrics: this.getMetrics()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                service: 'livekit',
                error: error.message,
                url: this.liveKitUrl
            };
        }
    }

    // Graceful shutdown
    async shutdown() {
        if (this.logger) {
            this.logger.info('Shutting down LiveKit service', {
                activeSessions: this.activeSessions.size
            });
        }

        // End all active sessions
        const endPromises = [];
        for (const [sessionId, sessionData] of this.activeSessions.entries()) {
            endPromises.push(
                this.endVoiceSession(sessionId, sessionData.userId).catch(error => {
                    if (this.logger) {
                        this.logger.error('Failed to end session during shutdown', error, {
                            sessionId
                        });
                    }
                })
            );
        }

        await Promise.allSettled(endPromises);
        
        if (this.logger) {
            this.logger.info('LiveKit service shutdown complete');
        }
    }
}

module.exports = ChefSocialLiveKitService;