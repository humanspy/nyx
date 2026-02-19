/**
 * S3 config — Railway Buckets inject AWS_* variable names.
 * Railway injects: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 *   AWS_DEFAULT_REGION, AWS_ENDPOINT_URL, AWS_S3_BUCKET_NAME
 */
import { S3Client } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION || process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT_URL || process.env.S3_ENDPOINT || undefined,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID     || process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY,
  },
  // Railway Buckets (MinIO-compatible) requires path-style addressing
  forcePathStyle: !!(process.env.AWS_ENDPOINT_URL || process.env.S3_ENDPOINT),
});

export const S3_BUCKET =
  process.env.AWS_S3_BUCKET_NAME || process.env.S3_BUCKET || 'nyx-media';
