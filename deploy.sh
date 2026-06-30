#!/bin/bash
set -e  # Exit immediately on any error

echo "========================================="
echo "  HRMS Deployment Script"
echo "========================================="

# ── 1. Pull latest code ───────────────────────────────────────────────────────
echo ""
echo "--- [1/6] Pulling latest changes ---"
git pull origin new-workdesk || { echo "ERROR: git pull failed"; exit 1; }

# ── 2. Build Frontend ─────────────────────────────────────────────────────────
echo ""
echo "--- [2/6] Building Frontend ---"
cd frontend
npm ci
npm run build || { echo "ERROR: Frontend build failed"; exit 1; }
cd ..
echo "Frontend build OK"

# ── 3. Build Super Admin ──────────────────────────────────────────────────────
echo ""
echo "--- [3/6] Building Super Admin ---"
cd super-admin
npm ci
npm run build || { echo "ERROR: Super-admin build failed"; exit 1; }
cd ..
echo "Super-admin build OK"

# ── 4. Install backend deps ───────────────────────────────────────────────────
echo ""
echo "--- [4/6] Installing backend dependencies ---"
cd backend
npm ci || { echo "ERROR: Backend npm ci failed"; exit 1; }

# ── 5. Restart Backend via PM2 ───────────────────────────────────────────────
echo ""
echo "--- [5/6] Restarting backend ---"
pm2 restart work-desk-backend || pm2 start server.js --name "work-desk-backend"

# Health check — wait up to 15s for backend to respond
echo "Waiting for backend health check..."
for i in {1..5}; do
  sleep 3
  if curl -sf http://localhost:5001/health > /dev/null 2>&1; then
    echo "Backend is healthy"
    break
  fi
  if [ $i -eq 5 ]; then
    echo "ERROR: Backend health check failed after 15s"
    pm2 logs work-desk-backend --lines 20
    exit 1
  fi
  echo "Retrying ($i/5)..."
done
cd ..

# ── 6. Restart Face Service ──────────────────────────────────────────────────
echo ""
echo "--- [6/6] Restarting Face Recognition Service ---"
if systemctl is-active --quiet hrms-face-service 2>/dev/null; then
  sudo systemctl restart hrms-face-service
  echo "Face service restarted via systemd"
elif pm2 list | grep -q "hrms-face-service"; then
  pm2 restart hrms-face-service
  echo "Face service restarted via PM2"
else
  echo "WARNING: Face service not running. Start manually: sudo systemctl start hrms-face-service"
fi

# ── Reload Nginx ──────────────────────────────────────────────────────────────
echo ""
echo "--- Reloading Nginx ---"
sudo systemctl reload nginx || echo "WARNING: Nginx reload failed (non-fatal)"

echo ""
echo "========================================="
echo "  Deployment Complete!"
echo "========================================="
pm2 status
