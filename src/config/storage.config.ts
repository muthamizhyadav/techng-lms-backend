import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  provider: process.env.R2_PROVIDER || 'r2',
  endpoint: process.env.R2_ENDPOINT,
  region: process.env.R2_REGION || 'auto',
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME,
  publicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
  publicBucketUrl: process.env.R2_PUBLIC_BUCKET_URL,
  uploadExpiresIn: parseInt(process.env.R2_UPLOAD_EXPIRES_IN, 10) || 900,
  maxVideoSizeMb: parseInt(process.env.R2_MAX_VIDEO_SIZE_MB, 10) || 4096,
  maxThumbnailSizeMb: parseInt(process.env.R2_MAX_THUMBNAIL_SIZE_MB, 10) || 10,
}));
