import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { generateUuid } from '@common/utils/uuid.util';

export type LoginActivityDocument = HydratedDocument<LoginActivity>;

@Schema({
  _id: false,
  timestamps: true,
  collection: 'login_activities',
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    versionKey: false,
  },
})
export class LoginActivity {
  @Prop({ type: String, default: generateUuid, unique: true })
  _id: string;

  id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  userRole: string; // 'super_admin' | 'admin' | 'trainer' | 'support' | 'finance' | 'student'

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ trim: true, default: '' })
  name: string;

  @Prop({ default: null })
  ipAddress?: string;

  @Prop({ default: 'Desktop' })
  device?: string;

  @Prop({ default: 'Chrome' })
  browser?: string;

  @Prop({ default: 'Windows' })
  os?: string;

  @Prop({ type: Date, default: Date.now, index: true })
  loginAt: Date;

  @Prop({ enum: ['success', 'failed', 'conflict_blocked'], default: 'success' })
  status: 'success' | 'failed' | 'conflict_blocked';

  @Prop({ default: null })
  failureReason?: string;
}

export const LoginActivitySchema = SchemaFactory.createForClass(LoginActivity);

LoginActivitySchema.index({ loginAt: -1 });
LoginActivitySchema.index({ userRole: 1, loginAt: -1 });

