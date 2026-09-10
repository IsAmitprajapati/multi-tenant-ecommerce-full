
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { type JwtAccessPayload } from '../../auth/types/jwt-payload.type.js';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext):JwtAccessPayload => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.user as JwtAccessPayload;
  },
);
