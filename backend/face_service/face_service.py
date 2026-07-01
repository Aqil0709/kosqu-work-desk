"""
Face Recognition Microservice
Runs as a separate HTTP server on port 5002.
Node.js backend calls this service to enroll and verify faces.

Install deps:
    pip install -r requirements.txt
    (flask, face_recognition, numpy, Pillow, opencv-python-headless)
"""

import os
import io
import re
import sys
import logging
import pickle

logging.basicConfig(level=logging.INFO, format='[FaceService] %(levelname)s %(message)s')

# face_recognition (via dlib) and opencv are the two dependencies most likely to
# fail to install, especially on Windows where dlib needs CMake + a C++ build
# toolchain. Fail loudly with the exact fix instead of a raw traceback, since a
# silent/cryptic failure here is the #1 real-world cause of "face check-in
# doesn't work" — the Node backend then correctly reports 503, but only if this
# process actually manages to report *something* rather than dying at import time.
try:
    import numpy as np
    import cv2
    from PIL import Image
    import face_recognition
except ImportError as e:
    logging.error(f'Missing dependency: {e}')
    logging.error('Install with: pip install -r requirements.txt')
    logging.error(
        'If "face_recognition" or "dlib" fails to build on Windows, install '
        'CMake (https://cmake.org/download/) and Visual Studio Build Tools '
        '("Desktop development with C++" workload) first, then retry. '
        'Alternatively, install a prebuilt dlib wheel matching your Python '
        'version from https://github.com/z-mahmud22/Dlib_Windows_Python3.x'
    )
    sys.exit(1)

from flask import Flask, request, jsonify, abort

app = Flask(__name__)

# Directory where face encodings are stored per tenant+employee
ENCODINGS_DIR = os.path.join(os.path.dirname(__file__), 'encodings')
os.makedirs(ENCODINGS_DIR, exist_ok=True)

TOLERANCE = 0.5  # Lower = stricter match. 0.5 is a good default.

# ── Quality / anti-spoof thresholds ────────────────────────────────────────────
BLUR_VARIANCE_THRESHOLD = 60.0     # Laplacian variance below this = too blurred
MIN_FACE_SIZE_RATIO = 0.12         # face bounding box must be >= 12% of the smaller image dimension
MOIRE_ENERGY_THRESHOLD = 0.35      # high-frequency energy ratio typical of screen/photo replay

# ── Internal-service auth ──────────────────────────────────────────────────────
# This service has no user-facing auth of its own — it is only ever meant to be
# called by the trusted Node backend. FACE_SERVICE_SECRET must match the same
# value configured on the Node side (faceServiceClient.js) and be sent as the
# X-Internal-Secret header. If unset, the check is skipped (local dev only) —
# always set this in any environment reachable outside localhost.
FACE_SERVICE_SECRET = os.environ.get('FACE_SERVICE_SECRET')

# tenant_id / employee_id are used to build filesystem paths — they must be
# strictly numeric to prevent path traversal (e.g. "../../etc/passwd").
_ID_RE = re.compile(r'^\d{1,20}$')


def _validate_id(value, label):
    if not value or not _ID_RE.match(str(value)):
        abort(400, description=f'{label} must be a positive integer')
    return str(value)


@app.before_request
def check_internal_secret():
    if not FACE_SERVICE_SECRET:
        return  # no secret configured — local/dev mode only
    if request.path == '/health':
        return
    provided = request.headers.get('X-Internal-Secret')
    if provided != FACE_SERVICE_SECRET:
        abort(401, description='Unauthorized')


def encoding_path(tenant_id, employee_id):
    tenant_id = _validate_id(tenant_id, 'tenant_id')
    employee_id = _validate_id(employee_id, 'employee_id')
    return os.path.join(ENCODINGS_DIR, f"{tenant_id}_{employee_id}.pkl")


def load_encodings(tenant_id, employee_id):
    path = encoding_path(tenant_id, employee_id)
    if not os.path.exists(path):
        return []
    with open(path, 'rb') as f:
        return pickle.load(f)


def save_encodings(tenant_id, employee_id, encodings):
    path = encoding_path(tenant_id, employee_id)
    with open(path, 'wb') as f:
        pickle.dump(encodings, f)


def decode_image(image_bytes):
    """Convert raw bytes to RGB numpy array."""
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    return np.array(img)


def blur_variance(image_array):
    """Laplacian variance — low value means the image is blurry/out of focus."""
    gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def moire_energy_ratio(image_array, face_box):
    """
    Crude screen/photo-replay detector: photos of photos (phone/monitor re-capture)
    tend to carry more high-frequency periodic energy than a live face due to the
    display's pixel grid / moire interference. Computes the ratio of high-frequency
    FFT energy to total energy within the face crop.
    """
    top, right, bottom, left = face_box
    crop = image_array[max(top, 0):bottom, max(left, 0):right]
    if crop.size == 0:
        return 0.0
    gray = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY).astype(np.float32)
    f = np.fft.fft2(gray)
    fshift = np.fft.fftshift(f)
    magnitude = np.abs(fshift)

    h, w = magnitude.shape
    cy, cx = h // 2, w // 2
    radius = min(h, w) // 6  # low-frequency core radius

    total_energy = magnitude.sum() + 1e-6
    y, x = np.ogrid[:h, :w]
    mask = (x - cx) ** 2 + (y - cy) ** 2 > radius ** 2
    high_freq_energy = magnitude[mask].sum()

    return float(high_freq_energy / total_energy)


def face_size_ratio(image_array, face_box):
    top, right, bottom, left = face_box
    face_h, face_w = bottom - top, right - left
    img_h, img_w = image_array.shape[:2]
    return min(face_h / img_h, face_w / img_w)


# ── Multi-frame liveness (blink / head-turn challenge) ─────────────────────────
# A single still image can be spoofed with a printed photo or a paused video frame.
# Requiring 3 frames captured ~300-500ms apart and checking for EITHER a genuine
# blink (eye-aspect-ratio dip) OR head-yaw movement between frames means a static
# photo — even a high-quality one — fails, because neither signal changes across
# frames of a non-moving image.
EAR_BLINK_THRESHOLD = 0.21   # eye-aspect-ratio below this = eye considered closed
MIN_EAR_DROP = 0.04          # required dip from the most-open frame to count as a blink
MIN_YAW_DELTA_RATIO = 0.015  # minimum relative nose-to-eye-center shift to count as head turn


def _eye_aspect_ratio(eye_points):
    pts = np.array(eye_points)
    # Standard 6-point EAR formula (Soukupova & Cech).
    a = np.linalg.norm(pts[1] - pts[5])
    b = np.linalg.norm(pts[2] - pts[4])
    c = np.linalg.norm(pts[0] - pts[3])
    if c == 0:
        return 0.0
    return (a + b) / (2.0 * c)


def _frame_liveness_signals(image_array, face_box):
    """Returns (avg_ear, yaw_offset) for one frame, or None if landmarks unavailable."""
    landmarks_list = face_recognition.face_landmarks(image_array, [face_box])
    if not landmarks_list:
        return None
    landmarks = landmarks_list[0]
    if 'left_eye' not in landmarks or 'right_eye' not in landmarks:
        return None

    left_ear = _eye_aspect_ratio(landmarks['left_eye'])
    right_ear = _eye_aspect_ratio(landmarks['right_eye'])
    avg_ear = (left_ear + right_ear) / 2.0

    # Head yaw proxy: horizontal offset of the nose tip from the midpoint between
    # the two eye centers, normalized by inter-eye distance (rotation-invariant-ish).
    left_eye_center = np.mean(landmarks['left_eye'], axis=0)
    right_eye_center = np.mean(landmarks['right_eye'], axis=0)
    eye_midpoint_x = (left_eye_center[0] + right_eye_center[0]) / 2.0
    inter_eye_dist = np.linalg.norm(right_eye_center - left_eye_center) or 1.0

    nose_x = None
    if 'nose_tip' in landmarks and landmarks['nose_tip']:
        nose_x = np.mean([p[0] for p in landmarks['nose_tip']])
    elif 'nose_bridge' in landmarks and landmarks['nose_bridge']:
        nose_x = np.mean([p[0] for p in landmarks['nose_bridge']])
    if nose_x is None:
        return None

    yaw_offset = (nose_x - eye_midpoint_x) / inter_eye_dist
    return avg_ear, yaw_offset


def assess_multi_frame_liveness(frames_with_boxes):
    """
    frames_with_boxes: list of (image_array, face_box) tuples, in capture order.
    Returns (passed: bool, reason: str|None).
    Requires at least 2 frames with valid landmark signals.
    """
    signals = []
    for image_array, face_box in frames_with_boxes:
        s = _frame_liveness_signals(image_array, face_box)
        if s is not None:
            signals.append(s)

    if len(signals) < 2:
        return False, 'liveness_landmarks_unavailable'

    ears = [s[0] for s in signals]
    yaws = [s[1] for s in signals]

    blinked = (max(ears) - min(ears)) >= MIN_EAR_DROP and min(ears) <= EAR_BLINK_THRESHOLD
    turned = (max(yaws) - min(yaws)) >= MIN_YAW_DELTA_RATIO

    if blinked or turned:
        return True, None
    return False, 'no_liveness_motion_detected'


def assess_liveness(image_array, face_box):
    """
    Single-frame liveness/anti-spoof heuristic. Returns (passed: bool, reason: str|None).
    This is not a substitute for a dedicated liveness SDK, but catches the common
    cases: printed photo held up to camera, screen replay, and low-quality/blurred
    captures that make verification unreliable.
    """
    blur = blur_variance(image_array)
    if blur < BLUR_VARIANCE_THRESHOLD:
        return False, 'blurred_image'

    size_ratio = face_size_ratio(image_array, face_box)
    if size_ratio < MIN_FACE_SIZE_RATIO:
        return False, 'face_too_small'

    moire = moire_energy_ratio(image_array, face_box)
    if moire > MOIRE_ENERGY_THRESHOLD:
        return False, 'possible_spoof_replay'

    return True, None


# ── Health check ──────────────────────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


# ── POST /enroll ───────────────────────────────────────────────────────────────
# Body: multipart form-data  { tenant_id, employee_id, photo: <image file> }
# Registers the employee's face. Can be called multiple times to add more photos.
@app.route('/enroll', methods=['POST'])
def enroll():
    tenant_id  = request.form.get('tenant_id')
    employee_id = request.form.get('employee_id')
    file = request.files.get('photo')

    if not tenant_id or not employee_id or not file:
        return jsonify({'success': False, 'message': 'tenant_id, employee_id and photo are required'}), 400

    image_array = decode_image(file.read())
    face_locations = face_recognition.face_locations(image_array)

    if len(face_locations) == 0:
        return jsonify({'success': False, 'reason': 'no_face', 'message': 'No face detected in the photo. Please use a clear front-facing photo.'}), 422

    if len(face_locations) > 1:
        return jsonify({'success': False, 'reason': 'multiple_faces', 'message': 'Multiple faces detected. Please upload a photo with only one face.'}), 422

    passed, reason = assess_liveness(image_array, face_locations[0])
    if not passed:
        messages = {
            'blurred_image': 'Photo is too blurred. Please use a sharp, well-lit photo.',
            'face_too_small': 'Face is too small in the frame. Please move closer to the camera.',
            'possible_spoof_replay': 'This looks like a photo of a photo or screen. Please use a live front-facing photo.',
        }
        return jsonify({'success': False, 'reason': reason, 'message': messages.get(reason, 'Photo quality check failed.')}), 422

    encoding = face_recognition.face_encodings(image_array, face_locations)[0]
    existing = load_encodings(tenant_id, employee_id)
    existing.append(encoding)
    save_encodings(tenant_id, employee_id, existing)

    logging.info(f'Enrolled face for tenant={tenant_id} employee={employee_id} (total encodings: {len(existing)})')
    return jsonify({'success': True, 'message': 'Face enrolled successfully', 'total_encodings': len(existing)})


# ── POST /verify ───────────────────────────────────────────────────────────────
# Body: multipart form-data  { tenant_id, employee_id, selfie: <image file>,
#                               selfie_2, selfie_3: <optional additional frames> }
# Passing 2+ frames (captured ~300-500ms apart) enables the blink/head-turn
# liveness challenge; a single frame falls back to the static heuristic checks
# only (blur/size/moire), same as before, for backward compatibility.
# Returns { success, verified, confidence }
@app.route('/verify', methods=['POST'])
def verify():
    tenant_id  = request.form.get('tenant_id')
    employee_id = request.form.get('employee_id')
    file = request.files.get('selfie')
    extra_files = [request.files.get('selfie_2'), request.files.get('selfie_3')]
    extra_files = [f for f in extra_files if f is not None]

    if not tenant_id or not employee_id or not file:
        return jsonify({'success': False, 'message': 'tenant_id, employee_id and selfie are required'}), 400

    known_encodings = load_encodings(tenant_id, employee_id)
    if not known_encodings:
        return jsonify({'success': False, 'reason': 'not_enrolled', 'message': 'Face not enrolled for this employee. Please ask HR to enroll your face first.'}), 404

    image_array = decode_image(file.read())
    face_locations = face_recognition.face_locations(image_array)

    if len(face_locations) == 0:
        return jsonify({'success': False, 'verified': False, 'reason': 'no_face', 'message': 'No face detected in selfie. Please take a clear front-facing photo.'}), 422

    if len(face_locations) > 1:
        return jsonify({'success': False, 'verified': False, 'reason': 'multiple_faces', 'message': 'Multiple faces detected in frame. Please ensure only you are visible and try again.'}), 422

    passed, reason = assess_liveness(image_array, face_locations[0])
    if not passed:
        messages = {
            'blurred_image': 'Selfie is too blurred. Please hold the camera steady and try again.',
            'face_too_small': 'Face is too small/far from the camera. Please move closer.',
            'possible_spoof_replay': 'Spoof check failed — this looks like a photo of a photo or a screen. Please use a live camera capture.',
        }
        return jsonify({'success': False, 'verified': False, 'reason': reason, 'message': messages.get(reason, 'Liveness check failed.')}), 422

    # Multi-frame blink/head-turn challenge — only enforced when the client sent
    # additional frames (progressive rollout without breaking older clients).
    if extra_files:
        frames_with_boxes = [(image_array, face_locations[0])]
        for ef in extra_files:
            try:
                arr = decode_image(ef.read())
                locs = face_recognition.face_locations(arr)
                if len(locs) == 1:
                    frames_with_boxes.append((arr, locs[0]))
            except Exception:
                continue

        live_passed, live_reason = assess_multi_frame_liveness(frames_with_boxes)
        if not live_passed:
            messages = {
                'liveness_landmarks_unavailable': 'Could not analyze face movement. Please retry check-in with your face clearly visible.',
                'no_liveness_motion_detected': 'Liveness check failed — please blink naturally or turn your head slightly during capture.',
            }
            return jsonify({'success': False, 'verified': False, 'reason': live_reason, 'message': messages.get(live_reason, 'Liveness check failed.')}), 422

    unknown_encoding = face_recognition.face_encodings(image_array, face_locations)[0]
    distances = face_recognition.face_distance(known_encodings, unknown_encoding)
    best_distance = float(np.min(distances))
    confidence = round((1 - best_distance) * 100, 1)
    verified = bool(best_distance <= TOLERANCE)

    logging.info(f'Verify tenant={tenant_id} employee={employee_id} distance={best_distance:.3f} verified={verified} multi_frame={bool(extra_files)}')

    if verified:
        return jsonify({'success': True, 'verified': True, 'confidence': confidence, 'message': 'Face verified successfully'})
    else:
        return jsonify({'success': True, 'verified': False, 'reason': 'face_mismatch', 'confidence': confidence, 'message': 'Face does not match. Please try again or contact HR.'})


# ── POST /identify ─────────────────────────────────────────────────────────────
# Body: multipart form-data  { tenant_id, selfie: <image file> }
# Scans ALL enrolled employees for the tenant and returns the best match.
@app.route('/identify', methods=['POST'])
def identify():
    tenant_id = request.form.get('tenant_id')
    file = request.files.get('selfie')

    if not tenant_id or not file:
        return jsonify({'success': False, 'message': 'tenant_id and selfie are required'}), 400

    image_array = decode_image(file.read())
    face_locations = face_recognition.face_locations(image_array)

    if len(face_locations) == 0:
        return jsonify({'success': False, 'reason': 'no_face', 'message': 'No face detected in selfie.'}), 422

    if len(face_locations) > 1:
        return jsonify({'success': False, 'reason': 'multiple_faces', 'message': 'Multiple faces detected. Only one person may be identified at a time.'}), 422

    passed, reason = assess_liveness(image_array, face_locations[0])
    if not passed:
        return jsonify({'success': False, 'reason': reason, 'message': 'Photo quality/liveness check failed.'}), 422

    unknown_encoding = face_recognition.face_encodings(image_array, face_locations)[0]

    best_employee_id = None
    best_distance = 1.0

    for fname in os.listdir(ENCODINGS_DIR):
        if not fname.endswith('.pkl'):
            continue
        parts = fname.replace('.pkl', '').split('_', 1)
        if len(parts) != 2 or parts[0] != str(tenant_id):
            continue
        emp_id = parts[1]
        known = load_encodings(tenant_id, emp_id)
        if not known:
            continue
        distances = face_recognition.face_distance(known, unknown_encoding)
        min_dist = float(np.min(distances))
        if min_dist < best_distance:
            best_distance = min_dist
            best_employee_id = emp_id

    if best_employee_id and best_distance <= TOLERANCE:
        confidence = round((1 - best_distance) * 100, 1)
        logging.info(f'Identified employee={best_employee_id} for tenant={tenant_id} distance={best_distance:.3f}')
        return jsonify({'success': True, 'identified': True, 'employee_id': best_employee_id, 'confidence': confidence})
    else:
        return jsonify({'success': True, 'identified': False, 'message': 'Could not identify any employee from this photo.'})


# ── DELETE /unenroll ───────────────────────────────────────────────────────────
# Body: JSON  { tenant_id, employee_id }
@app.route('/unenroll', methods=['DELETE'])
def unenroll():
    data = request.get_json() or {}
    tenant_id  = data.get('tenant_id')
    employee_id = data.get('employee_id')

    if not tenant_id or not employee_id:
        return jsonify({'success': False, 'message': 'tenant_id and employee_id are required'}), 400

    path = encoding_path(tenant_id, employee_id)
    if os.path.exists(path):
        os.remove(path)
        return jsonify({'success': True, 'message': 'Face data removed'})
    return jsonify({'success': True, 'message': 'No face data found to remove'})


if __name__ == '__main__':
    port = int(os.environ.get('FACE_SERVICE_PORT', 5002))
    # Bind to localhost only by default — this service has no user-facing auth
    # and must never be exposed directly to the internet. Override via
    # FACE_SERVICE_HOST only if running behind a firewall/private network and
    # FACE_SERVICE_SECRET is set.
    host = os.environ.get('FACE_SERVICE_HOST', '127.0.0.1')
    if host != '127.0.0.1' and not FACE_SERVICE_SECRET:
        logging.warning('FACE_SERVICE_HOST is non-local but FACE_SERVICE_SECRET is not set — refusing to start insecurely.')
        raise SystemExit(1)
    logging.info(f'Starting face recognition service on {host}:{port}')
    app.run(host=host, port=port, debug=False)
