#!/bin/bash
# One-time setup: installs face_service as a systemd service on Linux
# Run as root: sudo bash install_service.sh

set -e

DEPLOY_DIR="/var/www/work-desk/backend/face_service"
SERVICE_FILE="$DEPLOY_DIR/face_service.service"

echo "[1/4] Installing Python dependencies (system-level)..."
apt-get update -qq
apt-get install -y python3 python3-venv python3-pip cmake libopenblas-dev liblapack-dev

echo "[2/4] Setting up virtual environment at $DEPLOY_DIR/venv..."
cd "$DEPLOY_DIR"
python3 -m venv venv
source venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
deactivate

echo "[3/4] Installing systemd service..."
cp "$SERVICE_FILE" /etc/systemd/system/hrms-face-service.service
systemctl daemon-reload
systemctl enable hrms-face-service
systemctl start hrms-face-service

echo "[4/4] Checking service status..."
sleep 2
systemctl status hrms-face-service --no-pager

echo ""
echo "Face service installed and running on port 5002"
echo "Commands:"
echo "  sudo systemctl status hrms-face-service"
echo "  sudo systemctl restart hrms-face-service"
echo "  sudo journalctl -u hrms-face-service -f"
