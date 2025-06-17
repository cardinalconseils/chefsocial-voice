// ChefSocial Voice AI - Middleware Registry
const requestLogger = require('./requestLogger');
const rateLimiting = require('./rateLimiting');
const authentication = require('./authentication');
const validation = require('./validation');
const errorHandler = require('./errorHandler');
const timeout = require('./timeout');
const internationalization = require('./internationalization');
const security = require('./security');

module.exports = {
    requestLogger,
    rateLimiting,
    authentication,
    validation,
    errorHandler,
    timeout,
    internationalization,
    security
};