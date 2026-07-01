#!/bin/bash
# Face Recognition Service — Linux startup script
# Usage: bash start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
  echo "[face_service] Creating virtual environment..."
  python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install / upgrade dependencies
echo "[face_service] Installing dependencies..."
pip install --quiet --upgrade pip
if ! pip install -r requirements.txt; then
  echo ""
  echo "============================================================"
  echo " Dependency install FAILED. face_recognition/dlib needs cmake"
  echo " and a C++ compiler. Try: sudo apt-get install -y cmake build-essential"
  echo " (or the equivalent for your distro), then re-run this script."
  echo "============================================================"
  exit 1
fi

echo "[face_service] Starting on port ${FACE_SERVICE_PORT:-5002}..."
exec python face_service.py
