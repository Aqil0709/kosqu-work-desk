"""
Face Recognition Microservice
Runs as a separate HTTP server on port 5002.
Node.js backend calls this service to enroll and verify faces.

Install deps:
    pip install flask face_recognition numpy Pillow
"""

import os
import io
import json
import base64
import logging
import pickle

import numpy as np
from flask import Flask, request, jsonify
from PIL import Image
import face_recognition

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format='[FaceService] %(levelname)s %(message)s')

# Directory where face encodings are stored per tenant+employee
ENCODINGS_DIR = os.path.join(os.path.dirname(__file__), 'encodings')
os.makedirs(ENCODINGS_DIR, exist_ok=True)

TOLERANCE = 0.5  # Lower = stricter. 0.5 is a good default.


def encoding_path(tenant_id, employee_id):
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
        return jsonify({'success': False, 'message': 'No face detected in the photo. Please use a clear front-facing photo.'}), 422

    if len(face_locations) > 1:
        return jsonify({'success': False, 'message': 'Multiple faces detected. Please upload a photo with only one face.'}), 422

    encoding = face_recognition.face_encodings(image_array, face_locations)[0]
    existing = load_encodings(tenant_id, employee_id)
    existing.append(encoding)
    save_encodings(tenant_id, employee_id, existing)

    logging.info(f'Enrolled face for tenant={tenant_id} employee={employee_id} (total encodings: {len(existing)})')
    return jsonify({'success': True, 'message': 'Face enrolled successfully', 'total_encodings': len(existing)})


# ── POST /verify ───────────────────────────────────────────────────────────────
# Body: multipart form-data  { tenant_id, employee_id, selfie: <image file> }
# Returns { success, verified, confidence }
@app.route('/verify', methods=['POST'])
def verify():
    tenant_id  = request.form.get('tenant_id')
    employee_id = request.form.get('employee_id')
    file = request.files.get('selfie')

    if not tenant_id or not employee_id or not file:
        return jsonify({'success': False, 'message': 'tenant_id, employee_id and selfie are required'}), 400

    known_encodings = load_encodings(tenant_id, employee_id)
    if not known_encodings:
        return jsonify({'success': False, 'message': 'Face not enrolled for this employee. Please ask HR to enroll your face first.'}), 404

    image_array = decode_image(file.read())
    face_locations = face_recognition.face_locations(image_array)

    if len(face_locations) == 0:
        return jsonify({'success': False, 'verified': False, 'message': 'No face detected in selfie. Please take a clear front-facing photo.'}), 422

    unknown_encoding = face_recognition.face_encodings(image_array, face_locations)[0]
    distances = face_recognition.face_distance(known_encodings, unknown_encoding)
    best_distance = float(np.min(distances))
    confidence = round((1 - best_distance) * 100, 1)
    verified = bool(best_distance <= TOLERANCE)

    logging.info(f'Verify tenant={tenant_id} employee={employee_id} distance={best_distance:.3f} verified={verified}')

    if verified:
        return jsonify({'success': True, 'verified': True, 'confidence': confidence, 'message': 'Face verified successfully'})
    else:
        return jsonify({'success': True, 'verified': False, 'confidence': confidence, 'message': 'Face does not match. Please try again or contact HR.'})


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
        return jsonify({'success': False, 'message': 'No face detected in selfie.'}), 422

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
    logging.info(f'Starting face recognition service on port {port}')
    app.run(host='0.0.0.0', port=port, debug=False)
