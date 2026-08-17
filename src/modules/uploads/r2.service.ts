import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export type UploadPurpose = 'video' | 'thumbnail';

export interface UploadedPart {
  partNumber: number;
  eTag: string;
}

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly publicBaseUrl: string;
  private readonly defaultExpiresIn: number;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('storage.endpoint');
    const accessKeyId = this.configService.get<string>('storage.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'storage.secretAccessKey',
    );
    const region = this.configService.get<string>('storage.region') || 'auto';

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'R2 storage is not fully configured. Upload features will be unavailable.',
      );
    }

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.bucketName =
      this.configService.get<string>('storage.bucketName') || 'techng-lms';
    this.publicBaseUrl = this.configService
      .get<string>('storage.publicBaseUrl')
      ?.replace(/\/+$/, '');
    this.defaultExpiresIn =
      this.configService.get<number>('storage.uploadExpiresIn') || 900;
  }

  private encodePathSegment(segment: string): string {
    return encodeURIComponent(segment);
  }

  buildKey(purpose: UploadPurpose, originalName: string): string {
    const extMatch = /\.([a-zA-Z0-9]+)$/.exec(originalName || '');
    const ext = extMatch ? extMatch[1].toLowerCase() : 'bin';
    const safeBase =
      (originalName || 'file')
        .replace(/\.[a-zA-Z0-9]+$/, '')
        .replace(/[^a-zA-Z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'file';
    const folder = purpose === 'video' ? 'videos' : 'thumbnails';
    return `${folder}/${uuidv4()}-${safeBase}.${ext}`;
  }

  getPublicUrl(key: string): string {
    if (this.publicBaseUrl) {
      const encodedKey = key
        .split('/')
        .map((segment) => this.encodePathSegment(segment))
        .join('/');
      return `${this.publicBaseUrl}/${encodedKey}`;
    }
    return key;
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
    return { uploadId: result.UploadId };
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
      const message = err?.message ?? 'Unknown error';
      this.logger.warn(
        `Failed to abort multipart upload "${uploadId}": ${message}`,
      );
    });
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    await this.client.send(command);
  }

  async deleteObjectsByKeys(keys: string[]): Promise<void> {
    await Promise.all(
      keys.filter(Boolean).map((key) => this.deleteObject(key)),
    );
  }
}
