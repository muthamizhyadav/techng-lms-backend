import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AdminRole, AdminStatus } from '@shared/enums/user-status.enum';
import { generateUuid } from '@common/utils/uuid.util';

export type AdminDocument = HydratedDocument<Admin>;

@Schema({
  _id: false,
  timestamps: true,
  collection: 'admins',
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = ret._id as string;
      delete ret._id;
      delete ret.password;
      delete ret.refreshTokenHash;
      delete ret.twoFactorSecret;
      delete ret.passwordResetToken;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    versionKey: false,
  },
})
export class Admin {
  @Prop({ type: String, default: generateUuid, unique: true })
  _id: string;

  id: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ trim: true, default: null })
  phone: string;

  @Prop({ default: null })
  avatar: string;

  @Prop({ type: String, enum: AdminRole, default: AdminRole.ADMIN })
  role: AdminRole;

  @Prop({ type: String, enum: AdminStatus, default: AdminStatus.ACTIVE })
  status: AdminStatus;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ default: null })
  department: string;

  @Prop({ default: null })
  designation: string;

  @Prop({ default: null })
  bio: string;

  @Prop({ type: String, ref: 'Admin', default: null })
  createdByAdminId: string;

  createdBy?: Admin;

  @Prop({ type: String, ref: 'Admin', default: null })
  updatedByAdminId: string;

  @Prop({ type: Number, default: 0 })
  loginCount: number;

  @Prop({ type: Date, default: null })
  lastLoginAt: Date;

  @Prop({ type: Date, default: null })
  lastActiveAt: Date;

  @Prop({ default: null })
  lastLoginIp: string;

  @Prop({ default: null })
  refreshTokenHash: string;

  @Prop({ default: null })
  passwordResetToken: string;

  @Prop({ type: Date, default: null })
  passwordResetExpires: Date;

  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop({ default: null })
  twoFactorSecret: string;

  @Prop({ default: true })
  emailNotifications: boolean;

  @Prop({ default: true })
  smsNotifications: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date;

  createdAt: Date;
  updatedAt: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  isSuperAdmin(): boolean {
    return this.role === AdminRole.SUPER_ADMIN;
  }

  isActive(): boolean {
    return this.status === AdminStatus.ACTIVE;
  }

  can(permission: string): boolean {
    if (this.role === AdminRole.SUPER_ADMIN) return true;
    return this.permissions.includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    if (this.role === AdminRole.SUPER_ADMIN) return true;
    return permissions.some((p) => this.permissions.includes(p));
  }

  hasAllPermissions(permissions: string[]): boolean {
    if (this.role === AdminRole.SUPER_ADMIN) return true;
    return permissions.every((p) => this.permissions.includes(p));
  }

  updateLastActive(): void {
    this.lastActiveAt = new Date();
  }
}

export const AdminSchema = SchemaFactory.createForClass(Admin);

AdminSchema.index({ phone: 1 });

AdminSchema.virtual('createdBy', {
  ref: 'Admin',
  localField: 'createdByAdminId',
  foreignField: '_id',
  justOne: true,
});

AdminSchema.virtual('fullName').get(function (this: AdminDocument) {
  return `${this.firstName} ${this.lastName}`;
});

AdminSchema.methods.isSuperAdmin = function (this: AdminDocument): boolean {
  return this.role === AdminRole.SUPER_ADMIN;
};

AdminSchema.methods.isActive = function (this: AdminDocument): boolean {
  return this.status === AdminStatus.ACTIVE;
};

AdminSchema.methods.can = function (
  this: AdminDocument,
  permission: string,
): boolean {
  if (this.role === AdminRole.SUPER_ADMIN) return true;
  return this.permissions.includes(permission);
};

AdminSchema.methods.hasAnyPermission = function (
  this: AdminDocument,
  permissions: string[],
): boolean {
  if (this.role === AdminRole.SUPER_ADMIN) return true;
  return permissions.some((p) => this.permissions.includes(p));
};

AdminSchema.methods.hasAllPermissions = function (
  this: AdminDocument,
  permissions: string[],
): boolean {
  if (this.role === AdminRole.SUPER_ADMIN) return true;
  return permissions.every((p) => this.permissions.includes(p));
};

AdminSchema.methods.updateLastActive = function (this: AdminDocument): void {
  this.lastActiveAt = new Date();
};
