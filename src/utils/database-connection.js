// ChefSocial Database Connection Management
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DatabasePool = require('./database-pool');

class DatabaseConnection {
    constructor(options = {}) {
        this.dbPath = options.dbPath || path.join(__dirname, 'chefsocial.db');
        this.db = null;
        this.pool = null;
        this.usePool = process.env.DB_POOL_ENABLED !== 'false'; // Default to true
    }

    async init() {
        try {
            if (this.usePool) {
                // Initialize connection pool
                this.pool = new DatabasePool({
                    dbPath: this.dbPath,
                    maxConnections: parseInt(process.env.DB_POOL_MAX) || 10,
                    minConnections: parseInt(process.env.DB_POOL_MIN) || 2,
                    acquireTimeoutMs: 30000,
                    idleTimeoutMs: 300000
                });
                
                console.log('✅ Connected to ChefSocial database with connection pooling');
            } else {
                // Use single connection (legacy mode)
                this.db = new sqlite3.Database(this.dbPath, (err) => {
                    if (err) {
                        console.error('❌ Database connection error:', err);
                    } else {
                        console.log('✅ Connected to ChefSocial database (single connection)');
                    }
                });
            }
        } catch (error) {
            console.error('❌ Database initialization error:', error);
            throw error;
        }
    }

    // Generic query method that works with both pool and single connection
    async query(sql, params = []) {
        if (this.usePool && this.pool) {
            return await this.pool.query(sql, params);
        } else if (this.db) {
            return new Promise((resolve, reject) => {
                if (sql.trim().toUpperCase().startsWith('SELECT')) {
                    this.db.all(sql, params, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                } else {
                    this.db.run(sql, params, function(err) {
                        if (err) reject(err);
                        else resolve({ lastID: this.lastID, changes: this.changes });
                    });
                }
            });
        } else {
            throw new Error('Database not initialized');
        }
    }

    // Get single row
    async get(sql, params = []) {
        if (this.usePool && this.pool) {
            return await this.pool.get(sql, params);
        } else if (this.db) {
            return new Promise((resolve, reject) => {
                this.db.get(sql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        } else {
            throw new Error('Database not initialized');
        }
    }

    // Get all rows
    async all(sql, params = []) {
        if (this.usePool && this.pool) {
            return await this.pool.all(sql, params);
        } else if (this.db) {
            return new Promise((resolve, reject) => {
                this.db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        } else {
            throw new Error('Database not initialized');
        }
    }

    // Run insert/update/delete
    async run(sql, params = []) {
        if (this.usePool && this.pool) {
            return await this.pool.run(sql, params);
        } else if (this.db) {
            return new Promise((resolve, reject) => {
                this.db.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve({ lastID: this.lastID, changes: this.changes });
                });
            });
        } else {
            throw new Error('Database not initialized');
        }
    }

    // Database pool management methods
    async getPoolStats() {
        if (this.usePool && this.pool) {
            return this.pool.getStats();
        }
        return {
            pool: {
                total: 1,
                active: 1,
                idle: 0,
                queued: 0,
                maxConnections: 1,
                minConnections: 1
            },
            metrics: {
                totalConnections: 1,
                activeConnections: 1,
                queuedRequests: 0,
                totalQueries: 0,
                failedQueries: 0,
                averageQueryTime: 0
            },
            mode: 'single-connection'
        };
    }

    async healthCheck() {
        if (this.usePool && this.pool) {
            return await this.pool.healthCheck();
        } else if (this.db) {
            return new Promise((resolve) => {
                this.db.get('SELECT 1 as health', (err) => {
                    if (err) {
                        resolve({
                            status: 'unhealthy',
                            error: err.message,
                            mode: 'single-connection'
                        });
                    } else {
                        resolve({
                            status: 'healthy',
                            mode: 'single-connection'
                        });
                    }
                });
            });
        } else {
            return {
                status: 'unhealthy',
                error: 'Database not initialized'
            };
        }
    }

    async close() {
        if (this.usePool && this.pool) {
            await this.pool.close();
            console.log('✅ Database connection pool closed');
        } else if (this.db) {
            return new Promise((resolve) => {
                this.db.close((err) => {
                    if (err) {
                        console.error('❌ Database close error:', err);
                    } else {
                        console.log('✅ Database connection closed');
                    }
                    resolve();
                });
            });
        }
    }
}

module.exports = DatabaseConnection;