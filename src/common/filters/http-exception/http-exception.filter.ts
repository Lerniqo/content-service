import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { PinoLogger } from 'nestjs-pino';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | object;
  error?: string;
  details?: any;
  requestId?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error, details } = this.getErrorInfo(exception);
    
    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
      details,
      requestId: request.headers['x-request-id'] as string || undefined,
    };

    // Log the error with appropriate level
    this.logError(exception, errorResponse, request);

    // Send structured error response
    response.status(status).json(errorResponse);
  }

  private getErrorInfo(exception: unknown): {
    status: number;
    message: string | object;
    error?: string;
    details?: any;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      
      if (typeof response === 'string') {
        return {
          status,
          message: response,
          error: exception.name,
        };
      }
      
      if (typeof response === 'object' && response !== null) {
        return {
          status,
          message: (response as any).message || exception.message,
          error: (response as any).error || exception.name,
          details: response,
        };
      }
      
      return {
        status,
        message: exception.message,
        error: exception.name,
      };
    }

    if (exception instanceof Error) {
      // Handle validation errors, database errors, etc.
      const status = this.getStatusFromError(exception);
      return {
        status,
        message: status === HttpStatus.INTERNAL_SERVER_ERROR 
          ? 'Internal server error' 
          : exception.message,
        error: exception.name,
        details: status === HttpStatus.INTERNAL_SERVER_ERROR ? undefined : {
          name: exception.name,
          stack: process.env.NODE_ENV === 'development' ? exception.stack : undefined,
        },
      };
    }

    // Unknown error type
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'UnknownError',
      details: process.env.NODE_ENV === 'development' ? { exception } : undefined,
    };
  }

  private getStatusFromError(error: Error): number {
    // Map common error types to HTTP status codes
    const errorName = error.name.toLowerCase();
    
    if (errorName.includes('validation')) {
      return HttpStatus.BAD_REQUEST;
    }
    
    if (errorName.includes('unauthorized') || errorName.includes('authentication')) {
      return HttpStatus.UNAUTHORIZED;
    }
    
    if (errorName.includes('forbidden') || errorName.includes('authorization')) {
      return HttpStatus.FORBIDDEN;
    }
    
    if (errorName.includes('notfound') || errorName.includes('not found')) {
      return HttpStatus.NOT_FOUND;
    }
    
    if (errorName.includes('conflict') || errorName.includes('duplicate')) {
      return HttpStatus.CONFLICT;
    }
    
    if (errorName.includes('timeout')) {
      return HttpStatus.REQUEST_TIMEOUT;
    }
    
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private logError(exception: unknown, errorResponse: ErrorResponse, request: Request): void {
    const { statusCode, message, requestId } = errorResponse;
    
    // Create enhanced log context with better readability
    const logContext = {
      statusCode,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip || request.connection.remoteAddress,
      requestId: requestId || 'N/A',
      timestamp: errorResponse.timestamp,
    };

    // Create formatted error message with visual separators
    const formatLogMessage = (level: string, emoji: string, title: string) => {
      const separator = '═'.repeat(50);
      return `\n${separator}\n${emoji} ${level.toUpperCase()}: ${title}\n${separator}`;
    };

    // Log based on status code severity with enhanced formatting
    if (statusCode >= 500) {
      // Server errors - log as error with full stack trace and enhanced formatting
      const errorDetails = exception instanceof Error ? {
        name: exception.name,
        message: exception.message,
        stack: exception.stack?.split('\n').slice(0, 10).join('\n'), // Limit stack trace lines
      } : exception;

      this.logger.error(
        {
          ...logContext,
          error: {
            type: '🔥 CRITICAL SERVER ERROR',
            details: errorDetails,
            severity: 'HIGH',
            action: 'Immediate investigation required',
          }
        },
        formatLogMessage('error', '🚨', `Server Error [${statusCode}]: ${message}`),
      );
    } else if (statusCode >= 400) {
      // Client errors - log as warning with enhanced context
      const requestDetails = {
        body: this.sanitizeRequestBody(request.body),
        params: Object.keys(request.params || {}).length > 0 ? request.params : null,
        query: Object.keys(request.query || {}).length > 0 ? request.query : null,
        headers: this.sanitizeHeaders(request.headers),
      };

      this.logger.warn(
        {
          ...logContext,
          request: {
            type: '⚠️ CLIENT ERROR',
            details: requestDetails,
            severity: statusCode >= 450 ? 'MEDIUM' : 'LOW',
            action: 'Review client request',
          }
        },
        formatLogMessage('warning', '⚠️', `Client Error [${statusCode}]: ${message}`),
      );
    } else {
      // Other errors - log as info with minimal context
      this.logger.info(
        {
          ...logContext,
          info: {
            type: 'ℹ️ HTTP EXCEPTION',
            severity: 'LOW',
            action: 'Informational only',
          }
        },
        formatLogMessage('info', 'ℹ️', `HTTP Exception [${statusCode}]: ${message}`),
      );
    }

    // Add a summary log for quick scanning
    this.logger.info({
      summary: `${this.getStatusEmoji(statusCode)} ${request.method} ${request.url} → ${statusCode} (${requestId || 'no-id'})`
    });
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    // Create a copy and remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private sanitizeHeaders(headers: any): any {
    if (!headers || typeof headers !== 'object') {
      return {};
    }

    // Only include relevant headers and sanitize sensitive ones
    const relevantHeaders = ['content-type', 'accept', 'user-agent', 'x-request-id', 'origin', 'referer'];
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized: any = {};

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      
      if (relevantHeaders.includes(lowerKey)) {
        sanitized[key] = value;
      } else if (sensitiveHeaders.includes(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private getStatusEmoji(statusCode: number): string {
    if (statusCode >= 500) return '🔥'; // Server errors
    if (statusCode >= 400) return '⚠️';  // Client errors
    if (statusCode >= 300) return '🔄'; // Redirects
    if (statusCode >= 200) return '✅'; // Success
    return 'ℹ️'; // Informational
  }
}
