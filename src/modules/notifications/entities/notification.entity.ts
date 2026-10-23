import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { generateUuid } from '@common/utils/uuid.util';

export type AdminNotificationDocument = HydratedDocument<AdminNotification>;

export enum AdminNotificationType {
  STUDENT_REGISTERED = 'student_registered',
  COURSE_PURCHASED = 'course_purchased',
  TEST = 'test',
  SYSTEM = 'system',
}

@Schema({
  _id: false,
  timestamps: true,
  collection: 'notifications',
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.recipientAdminIds;
      delete ret.readByAdminIds;
      return ret;
    },
  },
})
export class AdminNotification {
  @Prop({ type: String, default: generateUuid, unique: true })
  _id: string;

  id: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  body: string;

  @Prop({
    type: String,
    enum: AdminNotificationType,
    default: AdminNotificationType.SYSTEM,
  })
  type: AdminNotificationType;

  @Prop({ type: String, default: null })
  link: string;

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  data: Record<string, string>;

  /** Empty means the notification is visible to every admin. */
  @Prop({ type: [String], default: [] })
  recipientAdminIds: string[];

  @Prop({ type: [String], default: [] })
  readByAdminIds: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const AdminNotificationSchema =
  SchemaFactory.createForClass(AdminNotification);

AdminNotificationSchema.index({ createdAt: -1 });
