require('dotenv').config();

const AWS = require('aws-sdk');

const S3_BUCKET = process.env.S3_BUCKET_NAME || 'weavekit-backups';
const MAX_BACKUPS = Number(process.env.S3_MAX_BACKUPS || 23);

// Configure AWS SDK from environment
// Requires: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
if (process.env.AWS_REGION) {
  AWS.config.update({ region: process.env.AWS_REGION });
}

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

async function backupSession(sessionId, payload) {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
    // Silently skip if AWS is not configured
    return { skipped: true, reason: 'aws_not_configured' };
  }

  const prefix = `sessions/${sessionId}/`;
  const timestamp = Date.now();
  const key = `${prefix}backup-${timestamp}.json`;

  // 1) Upload new backup
  await s3
    .putObject({
      Bucket: S3_BUCKET,
      Key: key,
      Body: Buffer.from(JSON.stringify(payload, null, 0), 'utf-8'),
      ContentType: 'application/json'
    })
    .promise();

  // 2) List all backups for this session
  const listResponse = await s3
    .listObjectsV2({
      Bucket: S3_BUCKET,
      Prefix: prefix
    })
    .promise();

  const items = listResponse.Contents || [];
  if (items.length <= MAX_BACKUPS) {
    return { uploaded: key, deleted: 0 };
  }

  // 3) If more than MAX_BACKUPS, delete the oldest
  const sorted = items
    .slice()
    .sort((a, b) => new Date(a.LastModified) - new Date(b.LastModified));

  const toDelete = sorted.slice(0, sorted.length - MAX_BACKUPS);
  if (toDelete.length === 0) {
    return { uploaded: key, deleted: 0 };
  }

  await s3
    .deleteObjects({
      Bucket: S3_BUCKET,
      Delete: {
        Objects: toDelete.map((obj) => ({ Key: obj.Key }))
      }
    })
    .promise();

  return { uploaded: key, deleted: toDelete.length };
}

module.exports = { backupSession, MAX_BACKUPS };


