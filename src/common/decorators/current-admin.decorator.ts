import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithAdmin } from '@shared/interfaces/request-with-user.interface';

export const CurrentAdmin = createParamDecorator(
  (data: keyof RequestWithAdmin['admin'] | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithAdmin>();
    const admin = request.admin;

    return data ? admin?.[data] : admin;
  },
);