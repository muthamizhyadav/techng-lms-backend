/**
 * One-time setup: configures the CORS policy on the Cloudflare R2 bucket
 * so the browser can upload files directly via presigned URLs.
 *
 * Usage: node scripts/setup-r2-cors.js [origin1 origin2 ...]
 * If no origins are passed, a permissive default (all origins) is applied.
 */
require('dotenv').config();
const {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} = require('@aws-sdk/client-s3');

const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error(
    'Missing R2 configuration. Ensure R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME are set.',
  );
  process.exit(1);
}

const cliOrigins = process.argv.slice(2);
const allowedOrigins = cliOrigins.length ? cliOrigins : ['*'];

const client = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

const corsRules = [
  {
    AllowedHeaders: ['*'],
    AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
    AllowedOrigins: allowedOrigins,
    ExposeHeaders: ['ETag'],
    MaxAgeSeconds: 3600,
  },
];

async function main() {
  try {
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucketName,
        CORSConfiguration: { CORSRules: corsRules },
      }),
    );
    console.log('CORS policy applied to bucket:', bucketName);
    console.log('Allowed origins:', allowedOrigins.join(', '));
  } catch (err) {
    console.error('Failed to apply CORS policy:', err.message || err);
    process.exit(1);
  }
}

main();
