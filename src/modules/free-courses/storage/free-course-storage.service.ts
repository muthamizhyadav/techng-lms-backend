import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { generateUuid } from '@common/utils/uuid.util';

export type FreeCourseUploadPurpose =
  | 'thumbnail'
  | 'banner'
  | 'video'
  | 'document'
  | 'attachment';

export interface UploadedPart {
  partNumber: number;
  eTag: string;
}

export interface PresignFreeCourseUploadParams {
  purpose: FreeCourseUploadPurpose;
  fileName: string;
  contentType: string;
  fileSize?: number;
  courseId?: string;
  moduleId?: string;
}

const ALLOWED_MIME_TYPES: Record<FreeCourseUploadPurpose, string[]> = {
  thumbnail: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/gif',
  ],
  banner: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/gif',
  ],
  video: [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-matroska',
    'video/x-msvideo',
  ],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
  ],
  attachment: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
};

@Injectable()
export class FreeCourseStorageService {
  private readonly logger = new Logger(FreeCourseStorageService.name);
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly publicBaseUrl: string;
  private readonly defaultExpiresIn: number;
  private readonly maxVideoSizeMb: number;
  private readonly maxImageSizeMb: number;
  private readonly maxDocumentSizeMb: number;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('storage.endpoint');
    const accessKeyId = this.configService.get<string>('storage.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'storage.secretAccessKey',
    );
    const region = this.configService.get<string>('storage.region') || 'auto';

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'Storage is not fully configured. Using fallback client configuration.',
      );
    }

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: true,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });

    this.bucketName =
      this.configService.get<string>('storage.bucketName') || 'techng-lms';
    this.publicBaseUrl = (
      this.configService.get<string>('storage.publicBaseUrl') || ''
    ).replace(/\/+$/, '');
    this.defaultExpiresIn =
      this.configService.get<number>('storage.uploadExpiresIn') || 900;
    this.maxVideoSizeMb =
      this.configService.get<number>('storage.maxVideoSizeMb') || 4096;
    this.maxImageSizeMb =
      this.configService.get<number>('storage.maxThumbnailSizeMb') || 15;
    this.maxDocumentSizeMb = 100;
  }

  private encodePathSegment(segment: string): string {
    return encodeURIComponent(segment);
  }

  validateFile(
    purpose: FreeCourseUploadPurpose,
    contentType: string,
    fileSize?: number,
  ): void {
    const allowed = ALLOWED_MIME_TYPES[purpose];
    if (allowed && !allowed.includes(contentType.toLowerCase())) {
      throw new BadRequestException(
        `Invalid content type "${contentType}" for purpose "${purpose}". Allowed types: ${allowed.join(', ')}`,
      );
    }

    if (fileSize !== undefined && fileSize > 0) {
      let maxBytes = 0;
      if (purpose === 'video') {
        maxBytes = this.maxVideoSizeMb * 1024 * 1024;
      } else if (purpose === 'thumbnail' || purpose === 'banner') {
        maxBytes = this.maxImageSizeMb * 1024 * 1024;
      } else {
        maxBytes = this.maxDocumentSizeMb * 1024 * 1024;
      }

      if (fileSize > maxBytes) {
        throw new BadRequestException(
          `File size exceeds maximum allowed size (${Math.round(maxBytes / (1024 * 1024))} MB) for ${purpose}`,
        );
      }
    }
  }

  buildKey(
    purpose: FreeCourseUploadPurpose,
    originalName: string,
    courseId?: string,
    moduleId?: string,
  ): string {
    const extMatch = /\.([a-zA-Z0-9]+)$/.exec(originalName || '');
    const ext = extMatch ? extMatch[1].toLowerCase() : 'bin';
    const safeBase =
      (originalName || 'file')
        .replace(/\.[a-zA-Z0-9]+$/, '')
        .replace(/[^a-zA-Z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'file';

    const safeCourseId = courseId
      ? courseId.replace(/[^a-zA-Z0-9-_]/g, '')
      : 'general';
    const safeModuleId = moduleId
      ? moduleId.replace(/[^a-zA-Z0-9-_]/g, '')
      : 'general';
    const uniqueFileName = `${generateUuid()}-${safeBase}.${ext}`;

    switch (purpose) {
      case 'thumbnail':
        return `free-courses/thumbnails/${uniqueFileName}`;
      case 'banner':
        return `free-courses/banners/${uniqueFileName}`;
      case 'video':
        return `free-courses/videos/${safeCourseId}/${safeModuleId}/${uniqueFileName}`;
      case 'document':
        return `free-courses/documents/${safeCourseId}/${uniqueFileName}`;
      case 'attachment':
        return `free-courses/attachments/${safeCourseId}/${uniqueFileName}`;
      default:
        return `free-courses/attachments/${safeCourseId}/${uniqueFileName}`;
    }
  }

  getPublicUrl(key: string): string {
    if (
      this.publicBaseUrl &&
      this.publicBaseUrl.startsWith('http') &&
      !this.publicBaseUrl.includes('<HASH>')
    ) {
      const encodedKey = key
        .split('/')
        .map((segment) => this.encodePathSegment(segment))
        .join('/');
      return `${this.publicBaseUrl}/${encodedKey}`;
    }
    return `/api/v1/uploads/stream?key=${encodeURIComponent(key)}`;
  }

  async getSignedGetUrl(
    key: string,
    expiresIn = 86400,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getObjectStream(
    key: string,
    range?: string,
  ): Promise<{
    stream: NodeJS.ReadableStream;
    contentLength?: number;
    contentRange?: string;
    contentType?: string;
    acceptRanges?: string;
    statusCode: number;
  }> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Range: range,
    });

    const response = await this.client.send(command);

    return {
      stream: response.Body as unknown as NodeJS.ReadableStream,
      contentLength: response.ContentLength,
      contentRange: response.ContentRange,
      contentType: response.ContentType || 'video/mp4',
      acceptRanges: response.AcceptRanges || 'bytes',
      statusCode: range ? 206 : 200,
    };
  }

  async getPresignedPutUrl(
    key: string,
    contentType: string,
    expiresIn = this.defaultExpiresIn,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async createMultipartUpload(
    key: string,
    contentType: string,
  ): Promise<{ uploadId: string }> {
    const command = new CreateMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });
    const result = await this.client.send(command);
    return { uploadId: result.UploadId! };
  }

  async getPresignedPartUrl(
    key: string,
    uploadId: string,
    partNumber: number,
    expiresIn = this.defaultExpiresIn,
  ): Promise<string> {
    const command = new UploadPartCommand({
      Bucket: this.bucketName,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: UploadedPart[],
  ): Promise<void> {
    const command = new CompleteMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((part) => ({
          PartNumber: part.partNumber,
          ETag: part.eTag,
        })),
      },
    });
    await this.client.send(command);
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    const command = new AbortMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: key,
      UploadId: uploadId,
    });
    await this.client.send(command).catch((err: Error) => {
      this.logger.warn(
        `Failed to abort multipart upload "${uploadId}": ${err?.message}`,
      );
    });
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    await this.client.send(command).catch((err: Error) => {
      this.logger.warn(`Failed to delete object "${key}": ${err?.message}`);
    });
  }
}
