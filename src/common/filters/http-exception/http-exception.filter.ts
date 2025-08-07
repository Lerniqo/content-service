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
    
    // Create log context
    const logContext = {
      statusCode,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip || request.connection.remoteAddress,
      requestId,
      timestamp: errorResponse.timestamp,
    };

    // Log based on status code severity
    if (statusCode >= 500) {
      // Server errors - log as error with full stack trace
      this.logger.error(
        {
          ...logContext,
          exception: exception instanceof Error ? {
            name: exception.name,
            message: exception.message,
            stack: exception.stack,
          } : exception,
        },
        `Server Error: ${message}`,
      );
    } else if (statusCode >= 400) {
      // Client errors - log as warning
      this.logger.warn(
        {
          ...logContext,
          body: this.sanitizeRequestBody(request.body),
          params: request.params,
          query: request.query,
        },
        `Client Error: ${message}`,
      );
    } else {
      // Other errors - log as info
      this.logger.info(
        logContext,
        `HTTP Exception: ${message}`,
      );
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
}
