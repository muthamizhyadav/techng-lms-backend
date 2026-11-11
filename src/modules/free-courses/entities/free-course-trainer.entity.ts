import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { generateUuid } from '@common/utils/uuid.util';

export type FreeCourseTrainerDocument = HydratedDocument<FreeCourseTrainer>;

@Schema({
  _id: false,
  timestamps: true,
  collection: 'free_course_trainers',
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
export class FreeCourseTrainer {
  @Prop({ type: String, default: generateUuid, unique: true })
  _id: string;

  id: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true, sparse: true, default: null })
  username: string;

  @Prop({ type: String, default: null })
  adminId: string;

  @Prop({ trim: true, default: null })
  email: string;

  @Prop({ trim: true, default: null })
  phone: string;

  @Prop({ trim: true, default: 'Lead Trainer' })
  designation: string;

  @Prop({ trim: true, default: null })
  avatar: string;

  @Prop({ trim: true, default: '' })
  bio: string;

  @Prop({ type: [String], default: [] })
  expertise: string[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: Date, default: null })
  deletedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const FreeCourseTrainerSchema = SchemaFactory.createForClass(FreeCourseTrainer);
FreeCourseTrainerSchema.index({ name: 'text', designation: 'text' });
FreeCourseTrainerSchema.index({ isActive: 1, deletedAt: 1 });

