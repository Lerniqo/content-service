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
            req.user = {
                id: 'mock-admin-123',
                role: ['admin'],
                username: 'mock-admin'
            };
        }
        next();
    }
}
