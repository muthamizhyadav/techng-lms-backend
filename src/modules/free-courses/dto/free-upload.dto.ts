import {
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FreeCourseUploadPurpose } from '../storage/free-course-storage.service';

export class PresignFreeCourseUploadDto {
  @ApiProperty({
    enum: ['thumbnail', 'banner', 'video', 'document', 'attachment'],
    description: 'Purpose of upload in free courses',
  })
  @IsEnum(['thumbnail', 'banner', 'video', 'document', 'attachment'])
  purpose: FreeCourseUploadPurpose;

  @ApiProperty({ example: 'intro-video.mp4' })
  @IsString()
  fileName: string;

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  contentType: string;

  @ApiPropertyOptional({ example: 10485760 })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ description: 'Free course ID for scoped directory' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Module ID for scoped video directory' })
  @IsOptional()
  @IsString()
  moduleId?: string;
}

export class UploadedPartDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  partNumber: number;

  @ApiProperty({ example: '"etag-string"' })
  @IsString()
  eTag: string;
}

export class CompleteFreeCourseMultipartDto {
  @ApiProperty({ description: 'S3 object key' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Multipart upload ID' })
  @IsString()
  uploadId: string;

  @ApiProperty({ type: [UploadedPartDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadedPartDto)
  parts: UploadedPartDto[];
}

export class AbortFreeCourseMultipartDto {
  @ApiProperty({ description: 'S3 object key' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Multipart upload ID' })
  @IsString()
  uploadId: string;
}

