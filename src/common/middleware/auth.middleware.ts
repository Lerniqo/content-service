import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AuthMiddleware.name);
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Extract user ID and roles from headers sent by API Gateway
    const userId = req.headers['x-user-id'] as string;
    const userRoles = req.headers['x-user-roles'] as string;

    // Parse roles from comma-separated string to array
    const rolesArray = userRoles
      ? userRoles.split(',').map((role) => role.trim().toLowerCase())
      : [];

    // Set user object on request with data from API Gateway headers
    const request = req as Record<string, any>;
    request.user = {
      id: userId,
      role: rolesArray,
    };

    this.logger.debug({
      message: 'User extracted from headers',
      userId,
      roles: rolesArray,
    });

    next();
  }
}
