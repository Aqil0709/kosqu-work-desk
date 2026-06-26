/**
 * Storage Abstraction Layer
 *
 * STORAGE_DRIVER=local  (default)  — saves to local disk under src/features/uploads/
 * STORAGE_DRIVER=s3                — uploads to S3/MinIO via environment variables:
 *     S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT (MinIO)
 *
 * Usage (replaces direct multer.diskStorage calls):
 *
 *   const { createUploader, getFileUrl, deleteFile } = require('../../utils/storage');
 *
 *   const upload = createUploader({ dest: 'employee-docs', allowedTypes: ['image/', 'application/pdf'] });
 *   router.post('/upload', upload.single('file'), async (req, res) => {
 *     const url = getFileUrl(req.file);
 *     // req.file.storagePath — relative path for local / S3 key for remote
 *   });
 */

const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const crypto  = require('crypto');

const STORAGE_DRIVER = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
const LOCAL_UPLOADS_ROOT = path.join(__dirname, '..', 'features', 'uploads');

// ── Helpers ────────────────────────────────────────────────────────────────

const safeFilename = (originalName) => {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const base = crypto.randomBytes(12).toString('hex');
  return `${base}${ext}`;
};

// ── S3 driver (lazy-loaded — only if STORAGE_DRIVER=s3) ───────────────────
let s3Client = null;
let S3_BUCKET = process.env.S3_BUCKET;

const getS3 = () => {
  if (s3Client) return s3Client;
  try {
    const { S3Client } = require('@aws-sdk/client-s3');
    s3Client = new S3Client({
      region:   process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT, // MinIO endpoint
      credentials: {
        accessKeyId:     process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: !!process.env.S3_ENDPOINT, // required for MinIO
    });
  } catch (e) {
    throw new Error(`[storage] STORAGE_DRIVER=s3 but @aws-sdk/client-s3 is not installed. Run: npm install @aws-sdk/client-s3 @aws-sdk/lib-storage`);
  }
  return s3Client;
};

const uploadToS3 = async (buffer, key, mimeType) => {
  const { Upload } = require('@aws-sdk/lib-storage');
  const upload = new Upload({
    client: getS3(),
    params: {
      Bucket:      S3_BUCKET,
      Key:         key,
      Body:        buffer,
      ContentType: mimeType,
    },
  });
  await upload.done();
  return key;
};

const deleteFromS3 = async (key) => {
  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
  await getS3().send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
};

// ── Local driver ───────────────────────────────────────────────────────────

const saveLocally = (buffer, dest, filename) => {
  const dirPath = path.join(LOCAL_UPLOADS_ROOT, dest);
  fs.mkdirSync(dirPath, { recursive: true });
  const filePath = path.join(dirPath, filename);
  fs.writeFileSync(filePath, buffer);
  return path.join(dest, filename).replace(/\\/g, '/');
};

const deleteLocally = (storagePath) => {
  const fullPath = path.join(LOCAL_UPLOADS_ROOT, storagePath);
  try { fs.unlinkSync(fullPath); } catch { /* already deleted */ }
};

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * createUploader({ dest, allowedTypes, maxSizeMB })
 * Returns a multer middleware. Files are stored in memory buffer then written
 * to the configured backend (local disk or S3) in a custom storage engine.
 *
 * After upload, req.file contains:
 *   storagePath  — relative local path or S3 key
 *   storageUrl   — public-accessible URL (local: /uploads/... , s3: https://...)
 */
const createUploader = ({
  dest          = 'misc',
  allowedTypes  = null, // e.g. ['image/', 'application/pdf'] — null = allow all
  maxSizeMB     = 10,
} = {}) => {
  const storage = multer.memoryStorage();

  const fileFilter = allowedTypes
    ? (req, file, cb) => {
        const ok = allowedTypes.some((t) => file.mimetype.startsWith(t) || file.mimetype === t);
        cb(ok ? null : new Error(`File type not allowed: ${file.mimetype}`), ok);
      }
    : undefined;

  const upload = multer({
    storage,
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter,
  });

  // Wrap the multer middleware to persist the file after it's in memory
  const wrapSingle = (fieldName) => {
    const base = upload.single(fieldName);
    return async (req, res, next) => {
      base(req, res, async (err) => {
        if (err) return next(err);
        if (!req.file) return next();

        try {
          const filename     = safeFilename(req.file.originalname);
          const mimeType     = req.file.mimetype;
          const buffer       = req.file.buffer;

          if (STORAGE_DRIVER === 's3') {
            const key          = `${dest}/${filename}`;
            req.file.storagePath = await uploadToS3(buffer, key, mimeType);
            req.file.storageUrl  = process.env.S3_ENDPOINT
              ? `${process.env.S3_ENDPOINT}/${S3_BUCKET}/${key}`
              : `https://${S3_BUCKET}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/${key}`;
          } else {
            req.file.storagePath = saveLocally(buffer, dest, filename);
            req.file.storageUrl  = `/uploads/${req.file.storagePath}`;
          }

          // Backward compat: set req.file.filename and req.file.path
          req.file.filename = filename;
          req.file.path     = req.file.storageUrl;

          next();
        } catch (writeErr) {
          next(writeErr);
        }
      });
    };
  };

  const wrapArray = (fieldName, maxCount = 10) => {
    const base = upload.array(fieldName, maxCount);
    return async (req, res, next) => {
      base(req, res, async (err) => {
        if (err) return next(err);
        if (!req.files || !req.files.length) return next();

        try {
          for (const file of req.files) {
            const filename = safeFilename(file.originalname);
            if (STORAGE_DRIVER === 's3') {
              const key        = `${dest}/${filename}`;
              file.storagePath = await uploadToS3(file.buffer, key, file.mimetype);
              file.storageUrl  = process.env.S3_ENDPOINT
                ? `${process.env.S3_ENDPOINT}/${S3_BUCKET}/${key}`
                : `https://${S3_BUCKET}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/${key}`;
            } else {
              file.storagePath = saveLocally(file.buffer, dest, filename);
              file.storageUrl  = `/uploads/${file.storagePath}`;
            }
            file.filename = filename;
            file.path     = file.storageUrl;
          }
          next();
        } catch (writeErr) {
          next(writeErr);
        }
      });
    };
  };

  return {
    single:  wrapSingle,
    array:   wrapArray,
    // Expose raw multer for cases needing fields()
    _raw:    upload,
    driver:  STORAGE_DRIVER,
  };
};

/**
 * deleteFile(storagePath) — delete from whichever backend is active
 */
const deleteFile = async (storagePath) => {
  if (!storagePath) return;
  if (STORAGE_DRIVER === 's3') {
    await deleteFromS3(storagePath);
  } else {
    deleteLocally(storagePath);
  }
};

/**
 * getFileUrl(storagePath) — build a URL from a stored path
 */
const getFileUrl = (storagePath) => {
  if (!storagePath) return null;
  if (STORAGE_DRIVER === 's3') {
    return process.env.S3_ENDPOINT
      ? `${process.env.S3_ENDPOINT}/${S3_BUCKET}/${storagePath}`
      : `https://${S3_BUCKET}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/${storagePath}`;
  }
  return `/uploads/${storagePath}`;
};

module.exports = {
  createUploader,
  deleteFile,
  getFileUrl,
  STORAGE_DRIVER,
  LOCAL_UPLOADS_ROOT,
};
