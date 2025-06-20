// ChefSocial Voice - Centralized Logging System
// Production-ready structured logging with Winston

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ChefSocialError } from './error-types';

// Log levels and their priorities
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn', 
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug'
}

// Context interface for structured logging
export interface LogContext {
  requestId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  userAgent?: string;
  ip?: string;
  query?: Record<string, any>;
  body?: Record<string, any>;
  [key: string]: any;
}

// Sanitization configuration
interface SanitizationConfig {
  sensitiveFields: string[];
  maxObjectDepth: number;
  maxStringLength: number;
}

const SANITIZATION_CONFIG: SanitizationConfig = {
  sensitiveFields: [
    'password', 'passwordHash', 'token', 'accessToken', 'refreshToken',
    'secret', 'apiKey', 'privateKey', 'cardNumber', 'cvv', 'ssn',
    'authorization', 'cookie', 'session'
  ],
  maxObjectDepth: 3,
  maxStringLength: 1000
};

class ChefSocialLogger {
  private winston: winston.Logger;
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.winston = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const { combine, timestamp, errors, json, printf, colorize } = winston.format;

    // Custom format for development
    const devFormat = printf(({ level, message, timestamp, ...meta }: any) => {
      const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
      return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
    });

    // Base format
    const baseFormat = combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      errors({ stack: true }),
      json()
    );

    // Console format for development
    const consoleFormat = combine(
      colorize(),
      timestamp({ format: 'HH:mm:ss' }),
      devFormat
    );

    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        level: this.isProduction ? 'info' : 'debug',
        format: this.isProduction ? baseFormat : consoleFormat,
        silent: process.env.NODE_ENV === 'test'
      })
    ];

    // File transports for production
    if (this.isProduction) {
      // Error logs
      transports.push(
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          format: baseFormat,
          maxSize: '20m',
          maxFiles: '14d',
          zippedArchive: true
        })
      );

      // Combined logs
      transports.push(
        new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          format: baseFormat,
          maxSize: '20m',
          maxFiles: '7d',
          zippedArchive: true
        })
      );

      // HTTP access logs
      transports.push(
        new DailyRotateFile({
          filename: 'logs/access-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'http',
          format: baseFormat,
          maxSize: '50m',
          maxFiles: '7d',
          zippedArchive: true
        })
      );
    }

    return winston.createLogger({
      level: this.isProduction ? 'info' : 'debug',
      format: baseFormat,
      transports,
      // Don't exit on handled exceptions
      exitOnError: false,
      // Handle uncaught exceptions
      exceptionHandlers: this.isProduction ? [
        new DailyRotateFile({
          filename: 'logs/exceptions-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          format: baseFormat,
          maxSize: '20m',
          maxFiles: '14d'
        })
      ] : [],
      // Handle unhandled promise rejections
      rejectionHandlers: this.isProduction ? [
        new DailyRotateFile({
          filename: 'logs/rejections-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          format: baseFormat,
          maxSize: '20m',
          maxFiles: '14d'
        })
      ] : []
    });
  }

  // Sanitize sensitive data from logs
  private sanitize(data: any, depth: number = 0): any {
    if (depth > SANITIZATION_CONFIG.maxObjectDepth) {
      return '[Max Depth Exceeded]';
    }

    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return data.length > SANITIZATION_CONFIG.maxStringLength 
        ? data.substring(0, SANITIZATION_CONFIG.maxStringLength) + '...[TRUNCATED]'
        : data;
    }

    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        return data.map(item => this.sanitize(item, depth + 1));
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        
        if (SANITIZATION_CONFIG.sensitiveFields.some(field => lowerKey.includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitize(value, depth + 1);
        }
      }
      return sanitized;
    }

    return data;
  }

  // Generate unique request ID
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Core logging methods
  error(message: string, context?: LogContext, error?: Error | ChefSocialError): void {
    const logData: any = {
      message,
      ...this.sanitize(context),
      level: LogLevel.ERROR
    };

    if (error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error instanceof ChefSocialError ? {
          code: error.code,
          statusCode: error.statusCode,
          details: this.sanitize(error.details),
          requestId: error.requestId,
          userId: error.userId
        } : {})
      };
    }

    this.winston.error(logData);
  }

  warn(message: string, context?: LogContext): void {
    this.winston.warn({
      message,
      ...this.sanitize(context),
      level: LogLevel.WARN
    });
  }

  info(message: string, context?: LogContext): void {
    this.winston.info({
      message,
      ...this.sanitize(context),
      level: LogLevel.INFO
    });
  }

  http(message: string, context?: LogContext): void {
    this.winston.http({
      message,
      ...this.sanitize(context),
      level: LogLevel.HTTP
    });
  }

  debug(message: string, context?: LogContext): void {
    this.winston.debug({
      message,
      ...this.sanitize(context),
      level: LogLevel.DEBUG
    });
  }

  // Specialized logging methods
  logRequest(method: string, url: string, context: LogContext): void {
    this.http(`${method} ${url}`, {
      ...context,
      type: 'request'
    });
  }

  logResponse(method: string, url: string, statusCode: number, duration: number, context?: LogContext): void {
    const level = statusCode >= 400 ? LogLevel.ERROR : statusCode >= 300 ? LogLevel.WARN : LogLevel.HTTP;
    
    this.winston.log(level, `${method} ${url} - ${statusCode} - ${duration}ms`, {
      ...this.sanitize(context),
      statusCode,
      duration,
      type: 'response'
    });
  }

  logDatabaseOperation(operation: string, table: string, duration: number, context?: LogContext): void {
    this.debug(`Database ${operation} on ${table} completed in ${duration}ms`, {
      ...this.sanitize(context),
      operation,
      table,
      duration,
      type: 'database'
    });
  }

  logAuthentication(action: string, userId?: string, email?: string, success: boolean = true, context?: LogContext): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const message = `Authentication ${action} ${success ? 'successful' : 'failed'}`;
    
    this.winston.log(level, message, {
      ...this.sanitize(context),
      userId,
      email: email ? this.sanitize(email) : undefined,
      action,
      success,
      type: 'authentication'
    });
  }

  logPerformance(operation: string, duration: number, threshold: number = 1000, context?: LogContext): void {
    const level = duration > threshold ? LogLevel.WARN : LogLevel.DEBUG;
    const message = `Performance: ${operation} took ${duration}ms${duration > threshold ? ' (SLOW)' : ''}`;
    
    this.winston.log(level, message, {
      ...this.sanitize(context),
      operation,
      duration,
      threshold,
      slow: duration > threshold,
      type: 'performance'
    });
  }

  logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    const message = `Security Event [${severity.toUpperCase()}]: ${event}`;
    
    this.winston.log(level, message, {
      ...this.sanitize(context),
      event,
      severity,
      type: 'security'
    });
  }

  // Business logic logging
  logUserAction(action: string, userId: string, details?: Record<string, any>, context?: LogContext): void {
    this.info(`User action: ${action}`, {
      ...this.sanitize(context),
      userId,
      action,
      details: this.sanitize(details),
      type: 'user_action'
    });
  }

  logVoiceProcessing(
    requestId: string, 
    stage: 'started' | 'transcription' | 'generation' | 'completed' | 'failed',
    duration?: number,
    context?: LogContext
  ): void {
    const message = `Voice processing ${stage}`;
    const level = stage === 'failed' ? LogLevel.ERROR : LogLevel.INFO;
    
    this.winston.log(level, message, {
      ...this.sanitize(context),
      requestId,
      stage,
      duration,
      type: 'voice_processing'
    });
  }

  // Error alerting (in production, this could integrate with external services)
  alertCriticalError(error: ChefSocialError | Error, context?: LogContext): void {
    const alertData = {
      message: `CRITICAL ERROR: ${error.message}`,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error instanceof ChefSocialError ? {
          code: error.code,
          statusCode: error.statusCode
        } : {})
      },
      context: this.sanitize(context),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      type: 'critical_alert'
    };

    // Log the critical error
    this.winston.error(alertData);

    // In production, you would send this to external alerting services
    // Examples: Slack webhook, PagerDuty, email alerts, etc.
    if (this.isProduction) {
      this.sendExternalAlert(alertData);
    }
  }

  private sendExternalAlert(alertData: any): void {
    // TODO: Implement external alerting integration
    // This could include:
    // - Slack webhooks
    // - Email alerts
    // - PagerDuty integration
    // - SMS alerts for critical issues
    // - Push notifications to admin dashboard
    
    console.error('CRITICAL ALERT:', alertData);
  }

  // Health check logging
  logHealthCheck(service: string, status: 'healthy' | 'unhealthy', details?: Record<string, any>): void {
    const level = status === 'healthy' ? LogLevel.INFO : LogLevel.ERROR;
    
    this.winston.log(level, `Health check: ${service} is ${status}`, {
      service,
      status,
      details: this.sanitize(details),
      type: 'health_check'
    });
  }

  // Create child logger with default context
  createChildLogger(defaultContext: LogContext): ChefSocialLogger {
    const childLogger = new ChefSocialLogger();
    
    // Override methods to include default context
    const originalMethods = ['error', 'warn', 'info', 'http', 'debug'];
    originalMethods.forEach(method => {
      const originalMethod = (childLogger as any)[method];
      (childLogger as any)[method] = (message: string, context?: LogContext, ...args: any[]) => {
        const mergedContext = { ...defaultContext, ...context };
        return originalMethod.call(childLogger, message, mergedContext, ...args);
      };
    });

    return childLogger;
  }
}

// Export singleton instance
export const logger = new ChefSocialLogger();

// Export the class for testing and custom instances
export { ChefSocialLogger }; 