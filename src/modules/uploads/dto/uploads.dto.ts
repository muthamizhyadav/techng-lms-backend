import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsInt,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UploadPurpose } from '../r2.service';

export class PresignUploadDto {
  @ApiProperty({
    example: 'intro-course.mp4',
    description: 'Original file name (used to derive the stored key)',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName: string;

  @ApiProperty({
    example: 'video/mp4',
    description: 'MIME content type of the file',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  contentType: string;

  @ApiProperty({
    example: 'video',
    enum: ['video', 'thumbnail'],
    description: 'Purpose of the upload',
  })
  @IsEnum(['video', 'thumbnail'], {
    message: 'purpose must be either "video" or "thumbnail"',
  })
  purpose: UploadPurpose;

  @ApiPropertyOptional({
    example: 524288000,
    description:
      'Exact file size in bytes. Enforced against the configured size limit for the purpose.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  fileSize?: number;
}

export class InitMultipartUploadDto extends PresignUploadDto {}

export class MultipartPartDto {
  @ApiProperty({ example: 1, description: 'Part number (1-based)' })
  @IsInt()
  @Min(1)
  partNumber: number;

  @ApiProperty({
    example: '"etag-from-response-header"',
    description: 'ETag returned in the upload part response header',
  })
  @IsString()
  @MinLength(1)
  @Matches(/^[A-Za-z0-9+=\-_:.]+$/, {
    message: 'eTag contains invalid characters',
  })
  eTag: string;
}

export class CompleteMultipartUploadDto {
  @ApiProperty({
    example: 'videos/uuid-intro-course.mp4',
    description: 'Object key returned when the multipart upload was started',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  key: string;

  @ApiProperty({
    example: 'upload-id-from-init',
    description: 'Upload ID returned when the multipart upload was started',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  uploadId: string;

  @ApiProperty({
    description: 'Completed parts with their ETags, ordered by part number',
    type: [MultipartPartDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MultipartPartDto)
  parts: MultipartPartDto[];
}

export class AbortMultipartUploadDto {
  @ApiProperty({ description: 'Object key of the in-progress upload' })
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  key: string;

  @ApiProperty({ description: 'Upload ID to abort' })
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  uploadId: string;
}

const VIDEO_CONTENT_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-matroska',
  'video/x-msvideo',
  'application/octet-stream',
];

const IMAGE_CONTENT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

export function isAllowedContentType(
  purpose: UploadPurpose,
  contentType: string,
): boolean {
  const normalized = (contentType || '').toLowerCase();
  return purpose === 'video'
    ? VIDEO_CONTENT_TYPES.includes(normalized)
    : IMAGE_CONTENT_TYPES.includes(normalized);
}

export { VIDEO_CONTENT_TYPES, IMAGE_CONTENT_TYPES };

export function getPurposeFileExtension(purpose: UploadPurpose): string {
  return purpose === 'video' ? 'video' : 'image';
}
