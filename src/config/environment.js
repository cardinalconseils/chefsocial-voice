// ChefSocial Voice AI - Environment Configuration
module.exports = {
    development: {
        cors: {
            origins: [
                'http://localhost:3001',
                'http://localhost:3000', 
                'http://localhost:4000'
            ]
        },
        database: {
            path: './chefsocial.db'
        },
        logging: {
            level: 'debug',
            console: true
        },
        rateLimiting: {
            enabled: true,
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 1000 // requests per window
        }
    },
    
    production: {
        cors: {
            origins: [
                'https://chef-social.com',
                'https://app.chef-social.com',
                'https://chefsocial.io',
                'https://app.chefsocial.io'
            ]
        },
        database: {
            path: process.env.DATABASE_URL || './chefsocial.db'
        },
        logging: {
            level: 'info',
            console: false
        },
        rateLimiting: {
            enabled: true,
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // requests per window (stricter in production)
        }
    },
    
    test: {
        cors: {
            origins: ['http://localhost:3001']
        },
        database: {
            path: ':memory:' // In-memory database for testing
        },
        logging: {
            level: 'error',
            console: false
        },
        rateLimiting: {
            enabled: false
        }
    }
};

// Validate environment-specific configuration
const currentEnv = process.env.NODE_ENV || 'development';
const config = module.exports[currentEnv];

if (!config) {
    throw new Error(`Invalid NODE_ENV: ${currentEnv}. Must be one of: development, production, test`);
}

// Export current environment config as default
module.exports.current = config;
module.exports.environment = currentEnv;