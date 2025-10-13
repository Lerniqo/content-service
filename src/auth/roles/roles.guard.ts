import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

interface AuthenticatedUser {
  role?: string[];
}

interface AuthenticatedRequest {
  user?: AuthenticatedUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true; // If no roles are required, allow access
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { user } = request;
    if (!user) {
      return false; // If no user is authenticated, deny access
    }
    return requiredRoles.some((role) => user.role?.includes(role));
  }
}
