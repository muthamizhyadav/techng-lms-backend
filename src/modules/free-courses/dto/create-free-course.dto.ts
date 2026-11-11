import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { FreeCourseStatus } from '../entities/free-course.entity';

export class FreeCourseAttachmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  _id?: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  fileUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fileSize?: number;
}

export class FreeCourseChapterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  _id?: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoThumbnail?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoDuration?: string;

  @ApiProperty()
  @IsNumber()
  order: number;

  @ApiPropertyOptional({ enum: ['video', 'quiz', 'document'] })
  @IsOptional()
  @IsEnum(['video', 'quiz', 'document'])
  type?: 'video' | 'quiz' | 'document';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trainerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uploadDate?: string;

  @ApiPropertyOptional({ type: [FreeCourseAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FreeCourseAttachmentDto)
  attachments?: FreeCourseAttachmentDto[];
}

export class FreeCourseModuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  _id?: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNumber()
  order: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnail?: string | null;

  @ApiProperty({ type: [FreeCourseChapterDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FreeCourseChapterDto)
  chapters: FreeCourseChapterDto[];
}

export class CreateFreeCourseDto {
  @ApiProperty({ example: 'Complete Python for Beginners' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Master Python basics from scratch for free' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'TechNG Team' })
  @IsOptional()
  @IsString()
  instructor?: string;

  @ApiPropertyOptional({ example: 'trainer_123' })
  @IsOptional()
  @IsString()
  trainerId?: string;

  @ApiPropertyOptional({ example: 'Monika Sharma' })
  @IsOptional()
  @IsString()
  trainerName?: string;

  @ApiPropertyOptional({ example: 'Lead QA Architect' })
  @IsOptional()
  @IsString()
  trainerDesignation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trainerAvatar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trainerBio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promotionalVideoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promotionalVideoDuration?: string;

  @ApiProperty({ example: 'Programming' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ enum: FreeCourseStatus })
  @IsOptional()
  @IsEnum(FreeCourseStatus)
  status?: FreeCourseStatus;

  @ApiPropertyOptional({ example: 'Beginner' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({ example: '4 hours' })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({ example: '03:45:00' })
  @IsOptional()
  @IsString()
  videoDuration?: string;

  @ApiPropertyOptional({ example: ['Python', 'Data Structures'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnail?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  banner?: string | null;

  @ApiPropertyOptional({ type: [FreeCourseAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FreeCourseAttachmentDto)
  attachments?: FreeCourseAttachmentDto[];

  @ApiPropertyOptional({ type: [FreeCourseModuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FreeCourseModuleDto)
  modules?: FreeCourseModuleDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  _id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  createdAt?: any;

  @ApiPropertyOptional()
  @IsOptional()
  updatedAt?: any;

  @ApiPropertyOptional()
  @IsOptional()
  __v?: any;
}

export class UpdateFreeCourseDto extends PartialType(CreateFreeCourseDto) {}

