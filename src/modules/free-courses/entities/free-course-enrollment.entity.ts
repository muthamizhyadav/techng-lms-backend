import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { generateUuid } from '@common/utils/uuid.util';

export type FreeCourseEnrollmentDocument =
  HydratedDocument<FreeCourseEnrollment>;

export enum FreeCourseEnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
}

@Schema({
  _id: false,
  timestamps: true,
  collection: 'free_course_enrollments',
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
export class FreeCourseEnrollment {
  @Prop({ type: String, default: generateUuid, unique: true })
  _id: string;

  id: string;

  @Prop({ type: String, required: true, index: true })
  studentId: string;

  @Prop({ type: String, required: true, index: true })
  courseId: string;

  @Prop({
    type: String,
    enum: FreeCourseEnrollmentStatus,
    default: FreeCourseEnrollmentStatus.ACTIVE,
  })
  status: FreeCourseEnrollmentStatus;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ type: [String], default: [] })
  completedChapters: string[];

  @Prop({
    type: Map,
    of: {
      completed: { type: Boolean, default: false },
      watchTime: { type: Number, default: 0 },
      lastPosition: { type: Number, default: 0 },
      completedAt: { type: Date, default: null },
    },
    default: {},
  })
  chapterProgress: Map<
    string,
    {
      completed: boolean;
      watchTime: number;
      lastPosition: number;
      completedAt: Date | null;
    }
  >;

  @Prop({ type: String, default: null })
  currentChapterId: string;

  @Prop({ type: Date, default: () => new Date() })
  enrolledAt: Date;

  @Prop({ type: String, ref: 'Admin', default: null })
  assignedByAdminId: string;

  createdAt: Date;
  updatedAt: Date;
}

export const FreeCourseEnrollmentSchema =
  SchemaFactory.createForClass(FreeCourseEnrollment);

FreeCourseEnrollmentSchema.index(
  { studentId: 1, courseId: 1 },
  { unique: true },
);

