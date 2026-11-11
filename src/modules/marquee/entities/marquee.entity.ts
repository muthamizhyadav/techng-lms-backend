import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { generateUuid } from '@common/utils/uuid.util';

export type MarqueeAnnouncementDocument = HydratedDocument<MarqueeAnnouncement>;

@Schema({
  _id: false,
  timestamps: true,
  collection: 'marquee_announcements',
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
export class MarqueeAnnouncement {
  @Prop({ type: String, default: generateUuid, unique: true })
  _id: string;

  id: string;

  @Prop({ required: true, trim: true })
  text: string;

  @Prop({ trim: true, default: null })
  linkUrl: string;

  @Prop({ trim: true, default: null })
  linkText: string;

  @Prop({ trim: true, default: null })
  badgeText: string;

  @Prop({ trim: true, default: 'zap' })
  icon: string;

  @Prop({ type: Number, default: 1 })
  priority: number;

  @Prop({ type: Number, default: 1 })
  order: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  startDate?: Date | null;

  @Prop({ type: Date, default: null })
  endDate?: Date | null;

  @Prop({ type: String, ref: 'Admin', default: null })
  createdByAdminId?: string;

  @Prop({ type: String, ref: 'Admin', default: null })
  updatedByAdminId?: string;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;
}

export const MarqueeAnnouncementSchema =
  SchemaFactory.createForClass(MarqueeAnnouncement);

MarqueeAnnouncementSchema.index({ isActive: 1, order: 1, priority: -1, deletedAt: 1 });

