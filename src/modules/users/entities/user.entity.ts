import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole, UserStatus } from '@shared/enums/role.enum';
import { generateUuid } from '@common/utils/uuid.util';

export type UserDocument = HydratedDocument<User>;

/** A single device/browser login session for a student account. */
@Schema({ _id: false })
export class UserSession {
  @Prop({ required: true })
  sessionId: string;

  @Prop({ default: null })
  deviceId: string;

  @Prop({ default: null })
  deviceName: string;

  @Prop({ default: null })
  platform: string;

  @Prop({ default: null })
  ipAddress: string;

  @Prop({ default: null })
  userAgent: string;

  @Prop({ type: Date, default: Date.now })
  loggedInAt: Date;

  @Prop({ type: Date, default: Date.now })
  lastActiveAt: Date;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

@Schema({
  _id: false,
  timestamps: true,
  collection: 'users',
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.password;
      delete ret.refreshTokenHash;
      delete ret.activeSessions;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.phoneOtp;
      delete ret.googleId;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    versionKey: false,
  },
})
export class User {
  @Prop({ type: String, default: generateUuid, unique: true })
  _id: string;

  id: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: false })
  password: string;

  @Prop({ default: null })
  googleId: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: false, trim: true, default: null })
  lastName: string;

  @Prop({ trim: true, default: null })
  phone: string;

  @Prop({ default: null })
  avatar: string;

  @Prop({ type: Date, default: null })
  dateOfBirth: Date;

  @Prop({ enum: ['male', 'female', 'other'], default: null })
  gender: string;

  @Prop({ default: null })
  address: string;

  @Prop({ default: null })
  city: string;

  @Prop({ default: null })
  state: string;

  @Prop({ default: 'India' })
  country: string;

  @Prop({ default: null })
  pincode: string;

  @Prop({ default: null })
  highestQualification: string;

  @Prop({ default: null })
  college: string;

  @Prop({ type: Number, default: null })
  yearOfPassing: number;

  @Prop({ default: null })
  currentCompany: string;

  @Prop({ default: null })
  jobRole: string;

  @Prop({ type: Number, default: 0 })
  experienceYears: number;

  @Prop({ type: String, enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ default: false })
  phoneVerified: boolean;

  @Prop({ default: null })
  emailVerificationToken: string;

  @Prop({ type: Date, default: null })
  emailVerificationExpires: Date;

  @Prop({ default: null })
  phoneOtp: string;

  @Prop({ type: Date, default: null })
  phoneOtpExpires: Date;

  @Prop({ default: null })
  refreshTokenHash: string;

  @Prop({ default: null })
  passwordResetToken: string;

  @Prop({ type: Date, default: null })
  passwordResetExpires: Date;

  @Prop({ type: [UserSessionSchema], default: [] })
  activeSessions: UserSession[];

  @Prop({ type: Date, default: null })
  lastLoginAt: Date;

  @Prop({ type: Number, default: 0 })
  profileCompletionPercentage: number;

  @Prop({ default: false })
  isProfileComplete: boolean;

  @Prop({ default: 'en' })
  preferredLanguage: string;

  @Prop({ default: true })
  emailNotifications: boolean;

  @Prop({ default: true })
  smsNotifications: boolean;

  @Prop({ default: true })
  pushNotifications: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date;

  createdAt: Date;
  updatedAt: Date;

  get fullName(): string {
    return this.lastName
      ? `${this.firstName} ${this.lastName}`
      : this.firstName;
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  isSuspended(): boolean {
    return this.status === UserStatus.SUSPENDED;
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ phone: 1 });

UserSchema.virtual('fullName').get(function (this: UserDocument) {
  return this.lastName ? `${this.firstName} ${this.lastName}` : this.firstName;
});

UserSchema.methods.isActive = function (this: UserDocument): boolean {
  return this.status === UserStatus.ACTIVE;
};

UserSchema.methods.isSuspended = function (this: UserDocument): boolean {
  return this.status === UserStatus.SUSPENDED;
};
