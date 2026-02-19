import { Router } from 'express';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { s3Client, S3_BUCKET } from '../config/s3.js';

const router = Router();
router.use(requireAuth);

const MAX_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 1024) * 1024 * 1024;

router.post('/upload-url', async (req, res) => {
  const { fileName, fileSize, mimeType, chunkCount = 1 } = req.body;
  if (!fileName || !fileSize) return res.status(400).json({ error: 'fileName and fileSize required' });
  if (fileSize > MAX_SIZE) return res.status(413).json({ error: `File too large. Max ${process.env.MAX_FILE_SIZE_MB || 1024}GB` });

  const fileId = uuidv4();
  const s3Key = `uploads/${req.user.id}/${fileId}`;
  await pool.query(
    'INSERT INTO media_files (id,uploader_id,s3_key,s3_bucket,file_size,mime_type,chunk_count) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [fileId, req.user.id, s3Key, S3_BUCKET, fileSize, mimeType, chunkCount]
  );

  const command = new PutObjectCommand({ Bucket: S3_BUCKET, Key: s3Key, ContentType: 'application/octet-stream' });
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  res.json({ fileId, uploadUrl, s3Key });
});

router.post('/:fileId/complete', async (req, res) => {
  await pool.query("UPDATE media_files SET upload_status='complete' WHERE id=$1 AND uploader_id=$2", [req.params.fileId, req.user.id]);
  res.json({ ok: true });
});

router.get('/:fileId/download-url', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM media_files WHERE id=$1', [req.params.fileId]);
  if (!rows[0]) return res.status(404).json({ error: 'File not found' });
  if (rows[0].upload_status !== 'complete') return res.status(400).json({ error: 'File not ready' });
  const command = new GetObjectCommand({ Bucket: rows[0].s3_bucket, Key: rows[0].s3_key });
  const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  res.json({ downloadUrl, mimeType: rows[0].mime_type, fileSize: rows[0].file_size });
});

export default router;
