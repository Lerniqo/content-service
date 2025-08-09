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
    const emoji = this.getStatusEmoji(statusCode);
    const reqId = requestId || 'no-id';
    
    // Simple one-line summary for all requests
    const summary = `${emoji} ${request.method} ${request.url} → ${statusCode} (${reqId})`;
    
    if (statusCode >= 500) {
      // Server errors - critical, need full context
      const errorDetails = {
        statusCode,
        method: request.method,
        url: request.url,
        requestId: reqId,
        error: exception instanceof Error ? {
          name: exception.name,
          message: exception.message,
          ...(process.env.NODE_ENV === 'development' && { 
            stack: exception.stack?.split('\n').slice(0, 5).join('\n') 
          })
        } : exception,
        userAgent: request.headers['user-agent'],
        ip: request.ip
      };
      
      this.logger.error(errorDetails, `🚨 SERVER ERROR | ${summary} | ${message}`);
    } else if (statusCode >= 400) {
      // Client errors - include relevant request details
      const clientDetails = {
        statusCode,
        method: request.method,
        url: request.url,
        requestId: reqId,
        body: this.sanitizeRequestBody(request.body),
        params: request.params,
        query: request.query,
        userAgent: request.headers['user-agent']
      };
      
      this.logger.warn(clientDetails, `⚠️ CLIENT ERROR | ${summary} | ${message}`);
    } else {
      // Other exceptions - minimal logging
      this.logger.info({ statusCode, method: request.method, url: request.url, requestId: reqId }, 
        `ℹ️ HTTP EXCEPTION | ${summary} | ${message}`);
    }
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
    if (!headers || typeof headers !== 'object') return {};

    const sanitized: any = {};
    const keepHeaders = ['content-type', 'accept', 'user-agent', 'x-request-id'];
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    Object.entries(headers).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (keepHeaders.includes(lowerKey)) {
        sanitized[key] = value;
      } else if (sensitiveHeaders.includes(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      }
    });

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
