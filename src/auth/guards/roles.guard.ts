/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import { LoggerUtil } from '../../common/utils/logger.util';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RolesGuard.name);
  }

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from the @Roles() decorator
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    
    if (!requiredRoles || requiredRoles.length === 0) {
      // No roles required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    LoggerUtil.logDebug(
      this.logger,
      'RolesGuard',
      'Checking user roles',
      { 
        requiredRoles, 
        userRoles: user?.role,
        userId: user?.id 
      },
    );

    if (!user) {
      LoggerUtil.logWarn(
        this.logger,
        'RolesGuard',
        'No user found in request - authentication required',
      );
      throw new UnauthorizedException('Authentication required');
    }

    if (!user.role || !Array.isArray(user.role)) {
      LoggerUtil.logWarn(
        this.logger,
        'RolesGuard',
        'No valid roles found for user',
        { userId: user.id, userRoles: user.role },
      );
      throw new ForbiddenException('User roles not found or invalid');
    }

    // Check if user has any of the required roles
    const hasRequiredRole = requiredRoles.some(role => 
      user.role.includes(role.toLowerCase())
    );

    if (!hasRequiredRole) {
      LoggerUtil.logWarn(
        this.logger,
        'RolesGuard',
        'Access denied - insufficient permissions',
        { 
          userId: user.id,
          userRoles: user.role,
          requiredRoles,
        },
      );
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}. User roles: ${user.role.join(', ')}`
      );
    }

    LoggerUtil.logDebug(
      this.logger,
      'RolesGuard',
      'Access granted',
      { 
        userId: user.id,
        userRoles: user.role,
        requiredRoles,
      },
    );

    return true;
  }
}