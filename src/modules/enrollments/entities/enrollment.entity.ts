import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { generateUuid } from '@common/utils/uuid.util';

export type EnrollmentDocument = HydratedDocument<Enrollment>;

export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
}

@Schema({
  _id: false,
  timestamps: true,
  collection: 'enrollments',
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
})
export class Enrollment {
  @Prop({ type: String, default: generateUuid, unique: true })
  _id: string;

  id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true, index: true })
  courseId: string;

  @Prop({ type: String, required: true })
  orderId: string;

  @Prop({ type: String, enum: EnrollmentStatus, default: EnrollmentStatus.ACTIVE })
  status: EnrollmentStatus;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  progress: number;

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
  lessonProgress: Map<string, {
    completed: boolean;
    watchTime: number;
    lastPosition: number;
    completedAt: Date | null;
  }>;

  @Prop({ type: String, default: null })
  currentLessonId: string;

  @Prop({ type: Date, default: () => new Date() })
  enrolledAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);
EnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
