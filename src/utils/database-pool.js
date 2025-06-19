// ChefSocial Database Connection Pool
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const winston = require('winston');

class DatabasePool {
    constructor(options = {}) {
        this.dbPath = options.dbPath || path.join(__dirname, 'chefsocial.db');
        this.maxConnections = options.maxConnections || 10;
        this.minConnections = options.minConnections || 2;
        this.acquireTimeoutMs = options.acquireTimeoutMs || 30000;
        this.idleTimeoutMs = options.idleTimeoutMs || 300000; // 5 minutes
        
        this.pool = [];
        this.activeConnections = new Set();
        this.waitingQueue = [];
        this.metrics = {
            totalConnections: 0,
            activeConnections: 0,
            queuedRequests: 0,
            totalQueries: 0,
            failedQueries: 0,
            averageQueryTime: 0
        };

        // Configure logger
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.simple()
                })
            ]
        });

        this.init();
    }

    async init() {
        try {
            // Create initial pool of connections
            for (let i = 0; i < this.minConnections; i++) {
                await this.createConnection();
            }

            // Start pool maintenance
            this.startMaintenanceInterval();
            
            this.logger.info(`✅ Database pool initialized with ${this.pool.length} connections`);
        } catch (error) {
            this.logger.error('❌ Failed to initialize database pool:', error);
            throw error;
        }
    }

    async createConnection() {
        return new Promise((resolve, reject) => {
            const connection = {
                id: Date.now() + Math.random(),
                db: new sqlite3.Database(this.dbPath, (err) => {
                    if (err) {
                        this.logger.error('❌ Database connection error:', err);
                        reject(err);
                    } else {
                        connection.createdAt = Date.now();
                        connection.lastUsed = Date.now();
                        connection.isActive = false;
                        connection.queryCount = 0;
                        
                        // Enable foreign keys and set pragmas for performance
                        connection.db.serialize(() => {
                            connection.db.run('PRAGMA foreign_keys = ON');
                            connection.db.run('PRAGMA journal_mode = WAL');
                            connection.db.run('PRAGMA synchronous = NORMAL');
                            connection.db.run('PRAGMA cache_size = 1000');
                            connection.db.run('PRAGMA temp_store = memory');
                            connection.db.run('PRAGMA mmap_size = 268435456'); // 256MB
                        });

                        this.pool.push(connection);
                        this.metrics.totalConnections++;
                        
                        this.logger.debug(`Created database connection ${connection.id}`);
                        resolve(connection);
                    }
                }),
                stats: {
                    queries: 0,
                    errors: 0,
                    totalTime: 0
                }
            };
        });
    }

    async acquire() {
        return new Promise((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
                if (index !== -1) {
                    this.waitingQueue.splice(index, 1);
                    this.metrics.queuedRequests--;
                }
                reject(new Error(`Connection acquire timeout after ${this.acquireTimeoutMs}ms`));
            }, this.acquireTimeoutMs);

            const tryAcquire = () => {
                // Find available connection
                const connection = this.pool.find(conn => !conn.isActive);
                
                if (connection) {
                    clearTimeout(timeoutHandle);
                    connection.isActive = true;
                    connection.lastUsed = Date.now();
                    this.activeConnections.add(connection);
                    this.metrics.activeConnections = this.activeConnections.size;
                    
                    this.logger.debug(`Acquired connection ${connection.id}`);
                    resolve(connection);
                    return true;
                }

                // Create new connection if pool not at max
                if (this.pool.length < this.maxConnections) {
                    this.createConnection()
                        .then(connection => {
                            clearTimeout(timeoutHandle);
                            connection.isActive = true;
                            connection.lastUsed = Date.now();
                            this.activeConnections.add(connection);
                            this.metrics.activeConnections = this.activeConnections.size;
                            
                            this.logger.debug(`Created and acquired new connection ${connection.id}`);
                            resolve(connection);
                        })
                        .catch(error => {
                            clearTimeout(timeoutHandle);
                            reject(error);
                        });
                    return true;
                }

                return false;
            };

            if (!tryAcquire()) {
                // Queue the request
                this.waitingQueue.push({ resolve, reject, tryAcquire });
                this.metrics.queuedRequests++;
                this.logger.debug(`Queued connection request (queue size: ${this.waitingQueue.length})`);
            }
        });
    }

    release(connection) {
        if (!connection || !this.activeConnections.has(connection)) {
            this.logger.warn('Attempted to release inactive or invalid connection');
            return;
        }

        connection.isActive = false;
        connection.lastUsed = Date.now();
        this.activeConnections.delete(connection);
        this.metrics.activeConnections = this.activeConnections.size;

        this.logger.debug(`Released connection ${connection.id}`);

        // Process waiting queue
        if (this.waitingQueue.length > 0) {
            const waiting = this.waitingQueue.shift();
            this.metrics.queuedRequests--;
            
            if (waiting.tryAcquire()) {
                // Connection was acquired by queued request
                return;
            }
        }
    }

    async query(sql, params = []) {
        const startTime = Date.now();
        let connection = null;

        try {
            connection = await this.acquire();
            const result = await this.executeQuery(connection, sql, params);
            
            const duration = Date.now() - startTime;
            this.updateQueryMetrics(connection, duration, false);
            
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            if (connection) {
                this.updateQueryMetrics(connection, duration, true);
            }
            
            this.logger.error('Database query error:', error);
            throw error;
        } finally {
            if (connection) {
                this.release(connection);
            }
        }
    }

    async executeQuery(connection, sql, params) {
        return new Promise((resolve, reject) => {
            if (sql.trim().toUpperCase().startsWith('SELECT')) {
                // SELECT query
                connection.db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            } else {
                // INSERT, UPDATE, DELETE
                connection.db.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve({
                        lastID: this.lastID,
                        changes: this.changes
                    });
                });
            }
        });
    }

    async get(sql, params = []) {
        const connection = await this.acquire();
        try {
            return new Promise((resolve, reject) => {
                connection.db.get(sql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        } finally {
            this.release(connection);
        }
    }

    async all(sql, params = []) {
        return await this.query(sql, params);
    }

    async run(sql, params = []) {
        return await this.query(sql, params);
    }

    updateQueryMetrics(connection, duration, isError) {
        connection.queryCount++;
        connection.stats.queries++;
        connection.stats.totalTime += duration;
        
        if (isError) {
            connection.stats.errors++;
            this.metrics.failedQueries++;
        }

        this.metrics.totalQueries++;
        
        // Update average query time
        const totalTime = this.pool.reduce((sum, conn) => sum + conn.stats.totalTime, 0);
        this.metrics.averageQueryTime = this.metrics.totalQueries > 0 
            ? totalTime / this.metrics.totalQueries 
            : 0;
    }

    startMaintenanceInterval() {
        setInterval(() => {
            this.performMaintenance();
        }, 60000); // Every minute
    }

    performMaintenance() {
        const now = Date.now();
        const connectionsToRemove = [];

        // Check for idle connections to remove
        for (const connection of this.pool) {
            if (!connection.isActive && 
                (now - connection.lastUsed) > this.idleTimeoutMs &&
                this.pool.length > this.minConnections) {
                connectionsToRemove.push(connection);
            }
        }

        // Remove idle connections
        for (const connection of connectionsToRemove) {
            try {
                connection.db.close();
                const index = this.pool.indexOf(connection);
                if (index !== -1) {
                    this.pool.splice(index, 1);
                    this.metrics.totalConnections--;
                    this.logger.debug(`Removed idle connection ${connection.id}`);
                }
            } catch (error) {
                this.logger.error('Error closing idle connection:', error);
            }
        }

        // Log pool statistics
        if (this.pool.length > 0) {
            this.logger.debug('Pool maintenance:', {
                total: this.pool.length,
                active: this.activeConnections.size,
                queued: this.waitingQueue.length,
                totalQueries: this.metrics.totalQueries,
                avgQueryTime: Math.round(this.metrics.averageQueryTime)
            });
        }
    }

    getStats() {
        return {
            pool: {
                total: this.pool.length,
                active: this.activeConnections.size,
                idle: this.pool.length - this.activeConnections.size,
                queued: this.waitingQueue.length,
                maxConnections: this.maxConnections,
                minConnections: this.minConnections
            },
            metrics: { ...this.metrics },
            connections: this.pool.map(conn => ({
                id: conn.id,
                isActive: conn.isActive,
                queries: conn.queryCount,
                createdAt: new Date(conn.createdAt).toISOString(),
                lastUsed: new Date(conn.lastUsed).toISOString(),
                stats: conn.stats
            }))
        };
    }

    async healthCheck() {
        try {
            const result = await this.query('SELECT 1 as health');
            return {
                status: 'healthy',
                connectionCount: this.pool.length,
                activeConnections: this.activeConnections.size,
                queuedRequests: this.waitingQueue.length
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                connectionCount: this.pool.length,
                activeConnections: this.activeConnections.size
            };
        }
    }

    async close() {
        this.logger.info('Closing database pool...');
        
        // Close all connections
        const closePromises = this.pool.map(connection => {
            return new Promise((resolve) => {
                connection.db.close((err) => {
                    if (err) {
                        this.logger.error(`Error closing connection ${connection.id}:`, err);
                    }
                    resolve();
                });
            });
        });

        await Promise.all(closePromises);
        
        this.pool.length = 0;
        this.activeConnections.clear();
        this.waitingQueue.length = 0;
        
        this.logger.info('✅ Database pool closed');
    }
}

module.exports = DatabasePool;