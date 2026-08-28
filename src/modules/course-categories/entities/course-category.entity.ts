import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { generateUuid } from '@common/utils/uuid.util';

export type CourseCategoryDocument = HydratedDocument<CourseCategory>;

@Schema({
  _id: false,
  timestamps: true,
  collection: 'course-categories',
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
export class CourseCategory {
  @Prop({ type: String, default: generateUuid, unique: true })
  _id: string;

  id: string;

  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ trim: true, default: null })
  description: string;

  @Prop({ trim: true, default: null })
  icon: string;

  @Prop({ trim: true, default: null })
  thumbnail: string;

  @Prop({ type: String, ref: 'CourseCategory', default: null })
  parentId: string;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String, ref: 'Admin', default: null })
  createdByAdminId: string;

  @Prop({ type: String, ref: 'Admin', default: null })
  updatedByAdminId: string;

  @Prop({ type: Date, default: null })
  deletedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const CourseCategorySchema =
  SchemaFactory.createForClass(CourseCategory);

CourseCategorySchema.index({ name: 'text', slug: 'text', description: 'text' });
CourseCategorySchema.index({ sortOrder: 1 });
CourseCategorySchema.index({ parentId: 1 });
