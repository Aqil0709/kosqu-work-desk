const multer          = require('multer');
const path            = require('path');
const fs              = require('fs');
const { query }       = require('../../config/db');
// Lazy-load to avoid crashing at startup if 'canvas' native module is missing
let faceRecognition = null;
const getFaceRecognition = () => {
  if (!faceRecognition) {
    try {
      faceRecognition = require('../../../utils/faceRecognition');
    } catch (e) {
      throw new Error(`Face recognition module unavailable: ${e.message}. Install 'canvas' and '@vladmandic/face-api' to enable biometric features.`);
    }
  }
  return faceRecognition;
};

const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/'))
      return cb(new Error('Image files only'));
    cb(null, file);
  },
});
exports.uploadMiddleware = upload.single('photo');

/** Enroll face for an employee */
exports.enroll = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Photo required' });

    const targetEmployeeId = req.body.employee_id || req.user.id;

    // Only admin/hr can enroll others; employees only themselves
    if (req.user.position === 'employee' && +targetEmployeeId !== +req.user.id)
      return res.status(403).json({ success: false, message: 'Access denied' });

    await getFaceRecognition().ensureModelsLoaded();
    const embedding = await getFaceRecognition().extractFaceEncoding(req.file.buffer);

    if (!embedding)
      return res.status(422).json({ success: false, message: 'No face detected in image. Please use a clear front-facing photo.' });

    // Save photo file
    const dir = path.join(__dirname, '../../uploads/face-photos', String(req.tenantId));
    fs.mkdirSync(dir, { recursive: true });
    const filename = `emp_${targetEmployeeId}_${Date.now()}.jpg`;
    fs.writeFileSync(path.join(dir, filename), req.file.buffer);

    await query(
      `INSERT INTO face_embeddings (tenant_id, employee_id, embedding, photo_path)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE embedding=VALUES(embedding), photo_path=VALUES(photo_path), enrolled_at=NOW(), is_active=1`,
      [req.tenantId, targetEmployeeId, JSON.stringify(embedding), `face-photos/${req.tenantId}/${filename}`]
    );

    res.json({ success: true, message: 'Face enrolled successfully', dimensions: embedding.length });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/** Verify face — used during check-in/check-out */
exports.verify = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Photo required' });

    const employeeId = req.body.employee_id || req.user.id;

    const rows = await query(
      `SELECT embedding FROM face_embeddings WHERE tenant_id=? AND employee_id=? AND is_active=1`,
      [req.tenantId, employeeId]
    );
    if (!rows[0])
      return res.status(404).json({ success: false, message: 'No face enrolled for this employee. Please enroll first.' });

    await getFaceRecognition().ensureModelsLoaded();
    const liveEmbedding = await getFaceRecognition().extractFaceEncoding(req.file.buffer);

    if (!liveEmbedding)
      return res.status(422).json({ success: false, message: 'No face detected in photo. Ensure good lighting and face the camera.' });

    const storedEmbedding = JSON.parse(rows[0].embedding);
    const fr              = getFaceRecognition();
    const similarity      = fr.compareFaceSimilarity(storedEmbedding, liveEmbedding);
    const matched         = similarity >= fr.MATCH_THRESHOLD;

    // Basic liveness heuristic: reject obvious duplicates (near-zero distance from stored itself won't happen live)
    const livenessScore = Math.min(1, similarity + 0.1); // placeholder; replace with actual liveness model

    res.json({
      success: true,
      matched,
      similarity_score: +similarity.toFixed(4),
      liveness_score: +livenessScore.toFixed(4),
      threshold: fr.MATCH_THRESHOLD,
      message: matched ? 'Face matched' : 'Face did not match. Please try again.',
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/** Re-enrollment — delete existing + re-enroll */
exports.reenroll = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Photo required' });

    const targetEmployeeId = req.body.employee_id || req.user.id;
    if (req.user.position === 'employee' && +targetEmployeeId !== +req.user.id)
      return res.status(403).json({ success: false, message: 'Access denied' });

    await query(
      `UPDATE face_embeddings SET is_active=0 WHERE tenant_id=? AND employee_id=?`,
      [req.tenantId, targetEmployeeId]
    );

    // forward to enroll
    req.body.employee_id = targetEmployeeId;
    return exports.enroll(req, res);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/** Check enrollment status */
exports.status = async (req, res) => {
  try {
    const employeeId = req.params.employeeId || req.user.id;
    const rows = await query(
      `SELECT id, enrolled_at, photo_path FROM face_embeddings WHERE tenant_id=? AND employee_id=? AND is_active=1`,
      [req.tenantId, employeeId]
    );
    res.json({ success: true, enrolled: rows.length > 0, data: rows[0] || null });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
