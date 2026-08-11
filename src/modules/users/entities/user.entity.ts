import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole, UserStatus } from '@shared/enums/role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  collection: 'users',
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = (ret._id as { toString(): string } | undefined)?.toString();
      delete ret._id;
      delete ret.password;
      delete ret.refreshTokenHash;
      delete ret.emailVerificationToken;
      delete ret.phoneOtp;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    versionKey: false,
  },
})
export class User {
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
    return `${this.firstName} ${this.lastName}`;
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
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.methods.isActive = function (this: UserDocument): boolean {
  return this.status === UserStatus.ACTIVE;
};

UserSchema.methods.isSuspended = function (this: UserDocument): boolean {
  return this.status === UserStatus.SUSPENDED;
};
