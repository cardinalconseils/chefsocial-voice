/**
 * Client-only LiveKit utilities
 * Safe for browser use - no server-side dependencies
 */

import { Room, RoomOptions, LocalAudioTrack, createLocalAudioTrack, RoomEvent } from 'livekit-client'

export interface LiveKitClientConfig {
  serverUrl: string
  roomName: string
  participantName: string
  enableTelephony?: boolean
}

export interface VoiceSession {
  roomName: string
  participantName: string
  isConnected: boolean
  isRecording: boolean
  audioTrack?: LocalAudioTrack
}

/**
 * Client-side LiveKit Voice Processor
 */
export class LiveKitVoiceProcessor {
  private room: Room | null = null
  private audioTrack: LocalAudioTrack | null = null
  private isRecording = false
  private eventCallbacks: Map<string, Function[]> = new Map()

  constructor(private config: LiveKitClientConfig) {}

  /**
   * Initialize connection and prepare for recording
   */
  async initialize(): Promise<VoiceSession> {
    try {
      // Get token from server
      const tokenResponse = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantName: this.config.participantName,
          roomName: this.config.roomName,
          enableTelephony: this.config.enableTelephony
        })
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to get LiveKit token')
      }

      const { token, serverUrl } = await tokenResponse.json()

      // Create room
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true
      })

      // Set up event listeners
      this.setupEventListeners()

      // Connect to room
      await this.room.connect(serverUrl, token)

      // Create audio track
      this.audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      })

      return {
        roomName: this.config.roomName,
        participantName: this.config.participantName,
        isConnected: this.room.state === 'connected',
        isRecording: false,
        audioTrack: this.audioTrack
      }

    } catch (error) {
      console.error('LiveKit initialization failed:', error)
      throw new Error(`Failed to initialize LiveKit: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Start voice recording
   */
  async startRecording(): Promise<void> {
    if (!this.room || !this.audioTrack) {
      throw new Error('LiveKit not initialized')
    }

    try {
      await this.room.localParticipant.publishTrack(this.audioTrack)
      this.isRecording = true
      this.emit('recording_started', { timestamp: Date.now() })
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw error
    }
  }

  /**
   * Stop voice recording
   */
  async stopRecording(): Promise<Blob | null> {
    if (!this.room || !this.audioTrack) return null

    try {
      await this.room.localParticipant.unpublishTrack(this.audioTrack)
      this.isRecording = false
      this.emit('recording_stopped', { timestamp: Date.now() })

      // Return recorded data (simplified)
      return new Blob([], { type: 'audio/webm' })
    } catch (error) {
      console.error('Failed to stop recording:', error)
      return null
    }
  }

  /**
   * Get current session status
   */
  getSession(): VoiceSession {
    return {
      roomName: this.config.roomName,
      participantName: this.config.participantName,
      isConnected: this.room?.state === 'connected',
      isRecording: this.isRecording,
      audioTrack: this.audioTrack || undefined
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    if (this.room) {
      await this.room.disconnect()
    }
    
    if (this.audioTrack) {
      this.audioTrack.stop()
    }

    this.room = null
    this.audioTrack = null
    this.isRecording = false
    
    this.emit('disconnected', { timestamp: Date.now() })
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, [])
    }
    this.eventCallbacks.get(event)!.push(callback)
  }

  // Private methods

  private setupEventListeners(): void {
    if (!this.room) return

    this.room.on(RoomEvent.Connected, () => {
      this.emit('connected', { room: this.config.roomName })
    })

    this.room.on(RoomEvent.Disconnected, () => {
      this.emit('disconnected', { timestamp: Date.now() })
    })
  }

  private emit(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in callback for ${event}:`, error)
        }
      })
    }
  }
}

/**
 * Test LiveKit connection capabilities
 */
export async function testLiveKitConnection(): Promise<{
  success: boolean
  error?: string
  capabilities: {
    audioSupported: boolean
    roomConnection: boolean
    telephonyReady: boolean
  }
}> {
  try {
    // Test API endpoint
    const response = await fetch('/api/livekit/token')
    const config = await response.json()

    return {
      success: config.configured,
      capabilities: {
        audioSupported: !!navigator.mediaDevices?.getUserMedia,
        roomConnection: config.configured,
        telephonyReady: config.features?.telephony || false
      }
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      capabilities: {
        audioSupported: false,
        roomConnection: false,
        telephonyReady: false
      }
    }
  }
} 