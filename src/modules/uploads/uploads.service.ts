import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { R2Service, UploadedPart } from './r2.service';
import {
  PresignUploadDto,
  CompleteMultipartUploadDto,
  AbortMultipartUploadDto,
  isAllowedContentType,
} from './dto/uploads.dto';

export interface PresignUploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

export interface InitMultipartResult {
  key: string;
  uploadId: string;
  publicUrl: string;
  expiresIn: number;
}

export interface PartPresignResult {
  partUrl: string;
  partNumber: number;
  expiresIn: number;
}

export interface CompleteMultipartResult {
  publicUrl: string;
  key: string;
}

@Injectable()
export class UploadsService {
  private readonly maxVideoSizeBytes: number;
  private readonly maxThumbnailSizeBytes: number;
  private readonly uploadExpiresIn: number;

  constructor(
    private readonly r2Service: R2Service,
    private readonly configService: ConfigService,
  ) {
    this.maxVideoSizeBytes =
      (this.configService.get<number>('storage.maxVideoSizeMb') || 4096) *
      1024 *
      1024;
    this.maxThumbnailSizeBytes =
      (this.configService.get<number>('storage.maxThumbnailSizeMb') || 10) *
      1024 *
      1024;
    this.uploadExpiresIn =
      this.configService.get<number>('storage.uploadExpiresIn') || 900;
  }

  private validateUpload(dto: PresignUploadDto): void {
    if (!isAllowedContentType(dto.purpose, dto.contentType)) {
      throw new BadRequestException(
        dto.purpose === 'video'
          ? 'Invalid video type. Supported: MP4, WebM, OGG, MOV, MKV, AVI'
          : 'Invalid image type. Supported: JPG, PNG, WebP, GIF, AVIF',
      );
    }

    if (dto.fileSize !== undefined) {
      const maxBytes =
        dto.purpose === 'video'
          ? this.maxVideoSizeBytes
          : this.maxThumbnailSizeBytes;
      if (dto.fileSize > maxBytes) {
        const maxMb = maxBytes / 1024 / 1024;
        throw new BadRequestException(
          `File exceeds the ${maxMb} MB size limit for ${dto.purpose} uploads`,
        );
      }
    }
  }

  async getPresignedUpload(
    dto: PresignUploadDto,
  ): Promise<PresignUploadResult> {
    this.validateUpload(dto);
    const key = this.r2Service.buildKey(dto.purpose, dto.fileName);
    const uploadUrl = await this.r2Service.getPresignedPutUrl(
      key,
      dto.contentType,
    );
    return {
      uploadUrl,
      publicUrl: this.r2Service.getPublicUrl(key),
      key,
      expiresIn: this.uploadExpiresIn,
    };
  }

  async initMultipart(dto: PresignUploadDto): Promise<InitMultipartResult> {
    this.validateUpload(dto);
    const key = this.r2Service.buildKey(dto.purpose, dto.fileName);
    const { uploadId } = await this.r2Service.createMultipartUpload(
      key,
      dto.contentType,
    );
    return {
      key,
      uploadId,
      publicUrl: this.r2Service.getPublicUrl(key),
      expiresIn: this.uploadExpiresIn,
    };
  }

  async getPartPresign(
    key: string,
    uploadId: string,
    partNumber: number,
  ): Promise<PartPresignResult> {
    const partUrl = await this.r2Service.getPresignedPartUrl(
      key,
      uploadId,
      partNumber,
    );
    return { partUrl, partNumber, expiresIn: this.uploadExpiresIn };
  }

  async completeMultipart(
    dto: CompleteMultipartUploadDto,
  ): Promise<CompleteMultipartResult> {
    const parts: UploadedPart[] = [...dto.parts].sort(
      (a, b) => a.partNumber - b.partNumber,
    );
    const expectedPartNumbers = parts.map((part) => part.partNumber);
    const hasGaps = expectedPartNumbers.some((num, index) => num !== index + 1);
    if (hasGaps) {
      throw new BadRequestException(
        'Multipart parts must be consecutive and start at part number 1',
      );
    }

    try {
      await this.r2Service.completeMultipartUpload(
        dto.key,
        dto.uploadId,
        parts,
      );
    } catch (err) {
      const message = (err as Error)?.message ?? 'Unknown error';
      throw new BadRequestException(
        `Failed to finalize multipart upload: ${message}`,
      );
    }

    return {
      publicUrl: this.r2Service.getPublicUrl(dto.key),
      key: dto.key,
    };
  }

  async abortMultipart(dto: AbortMultipartUploadDto): Promise<void> {
    await this.r2Service.abortMultipartUpload(dto.key, dto.uploadId);
  }
}
