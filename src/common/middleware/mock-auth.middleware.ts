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
      // API Gateway provided user information
      req.user = {
        id: userId,
        role: userRoles.split(',').map((role) => role.trim()),
      };
      return next();
    }
    
    // Priority 2: Check for direct user header (testing/development)
    if (req.headers['user']) {
      try {
        const userHeader = req.headers['user'] as string;
        req.user = JSON.parse(userHeader) as {
          id: string;
          role: string[];
          [key: string]: any;
        };
        return next();
      } catch {
        // If parsing fails, continue to next fallback
      }
    }
    
    // Priority 3: Development fallback
    if (process.env.NODE_ENV !== 'production') {
      // Default mock user for development when no headers provided
      req.user = {
        id: 'mock-admin-123',
        role: ['admin'],
      };
      return next();
    }
    
    // Production mode without proper headers
    // Check if Authorization header exists for better error message
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      throw new Error(
        'API Gateway must extract user information from Bearer token and forward as x-user-id and x-user-roles headers',
      );
    }
    
    throw new Error(
      'User authentication information not provided. Missing x-user-id and x-user-roles headers from API Gateway',
    );
  }
}
