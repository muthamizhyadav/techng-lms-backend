import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { generateUuid } from '@common/utils/uuid.util';

export enum FreeCourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export type FreeCourseDocument = HydratedDocument<FreeCourse>;

export interface FreeCourseAttachment {
  _id?: string;
  title: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
}

export interface FreeCourseChapter {
  _id: string;
  title: string;
  description?: string;
  videoUrl?: string;
  videoThumbnail?: string | null;
  duration?: number;
  videoDuration?: string;
  order: number;
  type?: 'video' | 'document' | 'quiz';
  documentUrl?: string;
  trainerName?: string;
  uploadDate?: string;
  attachments?: FreeCourseAttachment[];
}

export interface FreeCourseModuleItem {
  _id: string;
  title: string;
  order: number;
  thumbnail?: string | null;
  chapters: FreeCourseChapter[];
}

@Schema({
  _id: false,
  timestamps: true,
  collection: 'free_courses',
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
export class FreeCourse {
  @Prop({ type: String, default: generateUuid, unique: true })
  _id: string;

  id: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true, default: null })
  description: string;

  @Prop({ trim: true, default: null })
  instructor: string;

  @Prop({ type: String, ref: 'FreeCourseTrainer', default: null })
  trainerId: string;

  @Prop({ trim: true, default: null })
  trainerName: string;

  @Prop({ trim: true, default: 'Lead Trainer' })
  trainerDesignation: string;

  @Prop({ trim: true, default: null })
  trainerAvatar: string;

  @Prop({ trim: true, default: '' })
  trainerBio: string;

  @Prop({ trim: true, default: null })
  promotionalVideoUrl: string;

  @Prop({ trim: true, default: null })
  promotionalVideoDuration: string;

  @Prop({ required: true, trim: true })
  category: string;

  @Prop({
    type: String,
    enum: FreeCourseStatus,
    default: FreeCourseStatus.DRAFT,
  })
  status: FreeCourseStatus;

  @Prop({ trim: true, default: 'All Levels' })
  level: string;

  @Prop({ trim: true, default: null })
  duration: string;

  @Prop({ trim: true, default: null })
  videoDuration: string;

  @Prop({ type: [String], default: [] })
  skills: string[];

  @Prop({ trim: true, default: null })
  thumbnail: string;

  @Prop({ trim: true, default: null })
  banner: string;

  @Prop({
    type: [
      {
        _id: { type: String, default: generateUuid },
        title: { type: String, required: true },
        fileUrl: { type: String, required: true },
        fileType: { type: String, default: 'application/pdf' },
        fileSize: { type: Number, default: 0 },
      },
    ],
    default: [],
  })
  attachments: FreeCourseAttachment[];

  @Prop({
    type: [
      {
        _id: { type: String, default: generateUuid },
        title: { type: String, required: true },
        order: { type: Number, required: true },
        thumbnail: { type: String, default: null },
        chapters: [
          {
            _id: { type: String, default: generateUuid },
            title: { type: String, required: true },
            description: { type: String, default: '' },
            videoUrl: { type: String, default: '' },
            videoThumbnail: { type: String, default: null },
            duration: { type: Number, default: 0 },
            videoDuration: { type: String, default: null },
            order: { type: Number, required: true },
            type: {
              type: String,
              enum: ['video', 'quiz', 'document'],
              default: 'video',
            },
            documentUrl: { type: String, default: null },
            trainerName: { type: String, default: null },
            uploadDate: { type: String, default: null },
            attachments: [
              {
                _id: { type: String, default: generateUuid },
                title: { type: String, required: true },
                fileUrl: { type: String, required: true },
                fileType: { type: String, default: 'application/pdf' },
                fileSize: { type: Number, default: 0 },
              },
            ],
          },
        ],
      },
    ],
    default: [],
  })
  modules: FreeCourseModuleItem[];

  @Prop({ type: Number, default: 0, min: 0 })
  students: number;

  @Prop({ type: String, ref: 'Admin', default: null })
  createdByAdminId: string;

  @Prop({ type: String, ref: 'Admin', default: null })
  updatedByAdminId: string;

  @Prop({ type: Date, default: null })
  deletedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const FreeCourseSchema = SchemaFactory.createForClass(FreeCourse);

FreeCourseSchema.index({ title: 'text', category: 'text', instructor: 'text', trainerName: 'text' });
FreeCourseSchema.index({ trainerId: 1 });
FreeCourseSchema.index({ status: 1, deletedAt: 1 });

