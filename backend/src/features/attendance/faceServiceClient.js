/**
 * HTTP client for the Python face recognition microservice.
 * Uses Node.js v18+ built-in fetch and FormData — no extra packages needed.
 * Communicates with face_service/face_service.py running on port 5002.
 */

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || 'http://localhost:5002';
const FACE_SERVICE_SECRET = process.env.FACE_SERVICE_SECRET || '';

async function callFaceService(path, formData) {
  const response = await fetch(`${FACE_SERVICE_URL}${path}`, {
    method: 'POST',
    body: formData,
    headers: FACE_SERVICE_SECRET ? { 'X-Internal-Secret': FACE_SERVICE_SECRET } : undefined,
    signal: AbortSignal.timeout(15000),
  });
  return response.json();
}

/**
 * Enroll an employee's face photo.
 * @param {string|number} tenantId
 * @param {string|number} employeeId  - employee_details.id (PK)
 * @param {Buffer} photoBuffer
 * @param {string} filename
 */
async function enrollFace(tenantId, employeeId, photoBuffer, filename = 'photo.jpg') {
  const form = new FormData();
  form.append('tenant_id', String(tenantId));
  form.append('employee_id', String(employeeId));
  form.append('photo', new Blob([photoBuffer], { type: 'image/jpeg' }), filename);
  return callFaceService('/enroll', form);
}

/**
 * Verify a selfie against an employee's enrolled face.
 * extraFrameBuffers (optional): additional frames captured ~300-500ms apart,
 * enabling the blink/head-turn liveness challenge server-side. Without them,
 * the service falls back to single-frame quality/spoof heuristics only.
 * Returns { success, verified, confidence, message }
 */
async function verifyFace(tenantId, employeeId, selfieBuffer, filename = 'selfie.jpg', extraFrameBuffers = []) {
  const form = new FormData();
  form.append('tenant_id', String(tenantId));
  form.append('employee_id', String(employeeId));
  form.append('selfie', new Blob([selfieBuffer], { type: 'image/jpeg' }), filename);
  extraFrameBuffers.slice(0, 2).forEach((buf, i) => {
    form.append(`selfie_${i + 2}`, new Blob([buf], { type: 'image/jpeg' }), `frame_${i + 2}.jpg`);
  });
  return callFaceService('/verify', form);
}

/**
 * Identify which employee a selfie belongs to (scans all enrolled for tenant).
 * Returns { success, identified, employee_id, confidence }
 */
async function identifyFace(tenantId, selfieBuffer, filename = 'selfie.jpg') {
  const form = new FormData();
  form.append('tenant_id', String(tenantId));
  form.append('selfie', new Blob([selfieBuffer], { type: 'image/jpeg' }), filename);
  return callFaceService('/identify', form);
}

/**
 * Remove an employee's enrolled face data.
 */
async function unenrollFace(tenantId, employeeId) {
  const response = await fetch(`${FACE_SERVICE_URL}/unenroll`, {
    method: 'DELETE',
    body: JSON.stringify({ tenant_id: String(tenantId), employee_id: String(employeeId) }),
    headers: {
      'Content-Type': 'application/json',
      ...(FACE_SERVICE_SECRET ? { 'X-Internal-Secret': FACE_SERVICE_SECRET } : {}),
    },
    signal: AbortSignal.timeout(10000),
  });
  return response.json();
}

/**
 * Check if the face service is reachable.
 */
async function healthCheck() {
  try {
    const response = await fetch(`${FACE_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

module.exports = { enrollFace, verifyFace, identifyFace, unenrollFace, healthCheck };
