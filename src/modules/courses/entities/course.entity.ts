import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { generateUuid } from '@common/utils/uuid.util';

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export type CourseDocument = HydratedDocument<Course>;

@Schema({
  _id: false,
  timestamps: true,
  collection: 'courses',
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
export class Course {
  @Prop({ type: String, default: generateUuid, unique: true })
  _id: string;

  id: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true, default: null })
  description: string;

  @Prop({ trim: true, default: null })
  instructor: string;

  @Prop({ required: true, trim: true })
  category: string;

  @Prop({ type: String, enum: CourseStatus, default: CourseStatus.DRAFT })
  status: CourseStatus;

  @Prop({ type: Number, default: 0, min: 0 })
  students: number;

  @Prop({ trim: true, default: null })
  duration: string;

  @Prop({ trim: true, default: null })
  level: string;

  @Prop({ type: [String], default: [] })
  skills: string[];

  @Prop({ type: Number, default: 0, min: 0 })
  price: number;

  @Prop({ trim: true, default: null })
  thumbnail: string;

  @Prop({ type: String, ref: 'Admin', default: null })
  createdByAdminId: string;

  @Prop({ type: String, ref: 'Admin', default: null })
  updatedByAdminId: string;

  @Prop({ type: Date, default: null })
  deletedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const CourseSchema = SchemaFactory.createForClass(Course);

CourseSchema.index({ title: 'text', category: 'text', instructor: 'text' });
