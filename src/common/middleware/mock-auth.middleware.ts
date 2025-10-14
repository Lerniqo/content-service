/* eslint-disable prettier/prettier */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Extend the Request interface to include user
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string[];
    [key: string]: any;
  };
}

@Injectable()
export class MockAuthMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // In production, API Gateway should provide user info via headers
    // In development, we can simulate this or use direct user headers for testing
    
    // Priority 1: Check for API Gateway style headers (production pattern)
    const userId = req.headers['x-user-id'] as string;
    const userRoles = req.headers['x-user-roles'] as string;
    
    if (userId && userRoles) {
      // API Gateway provided user information (no need for x-user-name)
      req.user = {
        id: userId,
        role: userRoles.split(',').map((role) => role.trim()),
      };
    }
    // Priority 2: Check for direct user header (testing/development)
    else if (req.headers['user']) {
      try {
        const userHeader = req.headers['user'] as string;
        req.user = JSON.parse(userHeader) as {
          id: string;
          role: string[];
          [key: string]: any;
        };
      } catch {
        // If parsing fails, use default mock user
        req.user = {
          id: 'mock-admin-123',
          role: ['admin'],
        };
      }
    }
    // Priority 3: Development fallback
    else if (process.env.NODE_ENV !== 'production') {
      // Default mock user for development when no headers provided
      req.user = {
        id: 'mock-admin-123',
        role: ['admin'],
      };
    } else {
      // Production mode without proper headers - this should not happen
      // API Gateway should always provide user info
      throw new Error(
        'User authentication information not provided by API Gateway',
      );
    }
    
    next();
  }
}
