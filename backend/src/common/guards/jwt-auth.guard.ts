import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { firstValueFrom, isObservable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isPublic) {
      return super.canActivate(context) as Promise<boolean>;
    }

    try {
      const result = super.canActivate(context);
      if (result instanceof Promise) {
        await result;
      } else if (isObservable(result)) {
        await firstValueFrom(result);
      }
    } catch {
      // Optional auth on public routes — missing/invalid JWT is allowed.
    }

    return true;
  }

  handleRequest<T>(
    err: Error | null,
    user: T,
    _info: unknown,
    context: ExecutionContext,
  ): T {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      if (err) return null as T;
      return user;
    }

    if (err || !user) {
      throw err ?? new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Authentication required.' });
    }
    return user;
  }
}
