import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithStudent } from '@shared/interfaces/request-with-user.interface';

export const CurrentUser = createParamDecorator(
  (
    data: keyof RequestWithStudent['user'] | undefined,
    ctx: ExecutionContext,
  ) => {
    const request = ctx.switchToHttp().getRequest<RequestWithStudent>();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
