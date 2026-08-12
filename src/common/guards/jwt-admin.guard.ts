import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Admin } from '@modules/admins/entities/admin.entity';

@Injectable()
export class JwtAdminGuard extends AuthGuard('admin-jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    const admin = super.handleRequest(err, user, info, context, status);

    if (admin) {
      const request = context.switchToHttp().getRequest();
      request.admin = admin as Admin;
    }

    return admin;
  }
}
