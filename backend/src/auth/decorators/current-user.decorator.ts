import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
  },
);
