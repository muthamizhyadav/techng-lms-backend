import { Request } from 'express';
import { User } from '@modules/users/entities/user.entity';
import { Admin } from '@modules/admins/entities/admin.entity';

export interface RequestWithStudent extends Request {
  user: User;
}

export interface RequestWithAdmin extends Request {
  admin: Admin;
}
