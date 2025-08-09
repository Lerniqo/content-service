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
        // Only add mock user in development mode
        if (process.env.NODE_ENV !== 'production') {
            // First, try to parse user from header (for testing)
            const userHeader = req.headers['user'] as string;
            if (userHeader) {
                try {
                    req.user = JSON.parse(userHeader);
                } catch (e) {
                    // If parsing fails, use default mock user
                    req.user = {
                        id: 'mock-admin-123',
                        role: ['admin'],
                        username: 'mock-admin'
                    };
                }
            } else {
                // Default mock user if no header is provided
                req.user = {
                    id: 'mock-admin-123',
                    role: ['admin'],
                    username: 'mock-admin'
                };
            }
        }
        next();
    }
}
