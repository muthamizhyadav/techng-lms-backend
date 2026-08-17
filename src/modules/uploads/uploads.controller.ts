import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAdminGuard } from '@common/guards/jwt-admin.guard';
import { UploadsService } from './uploads.service';
import {
  PresignUploadDto,
  CompleteMultipartUploadDto,
  AbortMultipartUploadDto,
} from './dto/uploads.dto';

@ApiTags('📤 Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('presign')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Get presigned upload URL (Admin only)',
    description:
      'Returns a presigned PUT URL to upload a thumbnail or small file directly to R2 from the browser.',
  })
  @ApiBody({ type: PresignUploadDto })
  @ApiResponse({
    status: 201,
    description: 'Presigned URL generated',
    schema: {
      example: {
        uploadUrl: 'https://.../videos/uuid.mp4?X-Amz-...',
        publicUrl: 'https://pub-...r2.dev/videos/uuid.mp4',
        key: 'videos/uuid.mp4',
        expiresIn: 900,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid content type or size' })
  async presign(@Body() dto: PresignUploadDto) {
    return this.uploadsService.getPresignedUpload(dto);
  }

  @Post('multipart')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Initialize a multipart upload (Admin only)',
    description:
      'Starts a multipart upload on R2 for large video files. Upload parts directly to R2 then call complete.',
  })
  @ApiBody({ type: PresignUploadDto })
  @ApiResponse({
    status: 201,
    description: 'Multipart upload initialized',
    schema: {
      example: {
        key: 'videos/uuid.mp4',
        uploadId: 'a1b2c3...',
        publicUrl: 'https://pub-...r2.dev/videos/uuid.mp4',
        expiresIn: 900,
      },
    },
  })
  async initMultipart(@Body() dto: PresignUploadDto) {
    return this.uploadsService.initMultipart(dto);
  }

  @Get('multipart/:uploadId/parts/:partNumber/presign')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Get presigned URL for a multipart part (Admin only)',
  })
  @ApiParam({ name: 'uploadId', description: 'Multipart upload ID' })
  @ApiParam({
    name: 'partNumber',
    description: '1-based part number',
    example: 1,
  })
  @ApiQuery({
    name: 'key',
    required: true,
    description: 'Object key from the init response',
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned part URL generated',
    schema: {
      example: {
        partUrl: 'https://.../videos/uuid.mp4?partNumber=1&X-Amz-...',
        partNumber: 1,
        expiresIn: 900,
      },
    },
  })
  async partPresign(
    @Param('uploadId') uploadId: string,
    @Param('partNumber', ParseIntPipe) partNumber: number,
    @Query('key') key: string,
  ) {
    return this.uploadsService.getPartPresign(key, uploadId, partNumber);
  }

  @Post('multipart/:uploadId/complete')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Complete a multipart upload (Admin only)',
    description:
      'Finalizes a multipart upload after every part has been uploaded. Returns the public URL.',
  })
  @ApiParam({ name: 'uploadId', description: 'Multipart upload ID' })
  @ApiBody({ type: CompleteMultipartUploadDto })
  @ApiResponse({
    status: 201,
    description: 'Multipart upload completed',
    schema: {
      example: {
        publicUrl: 'https://pub-...r2.dev/videos/uuid.mp4',
        key: 'videos/uuid.mp4',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parts or completion failed',
  })
  async complete(
    @Param('uploadId') uploadId: string,
    @Body() dto: CompleteMultipartUploadDto,
  ) {
    return this.uploadsService.completeMultipart({
      ...dto,
      uploadId,
    });
  }

  @Post('multipart/:uploadId/abort')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Abort a multipart upload (Admin only)',
    description: 'Cancels an in-progress multipart upload and frees its parts.',
  })
  @ApiParam({ name: 'uploadId', description: 'Multipart upload ID' })
  @ApiBody({ type: AbortMultipartUploadDto })
  @ApiResponse({ status: 201, description: 'Multipart upload aborted' })
  async abort(
    @Param('uploadId') uploadId: string,
    @Body() dto: AbortMultipartUploadDto,
  ) {
    await this.uploadsService.abortMultipart({
      ...dto,
      uploadId,
    });
    return { message: 'Multipart upload aborted' };
  }
}
