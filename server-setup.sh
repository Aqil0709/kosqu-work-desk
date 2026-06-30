#!/bin/bash
# ============================================================
# ONE-TIME SERVER SETUP SCRIPT — work-desk.tech (VPS)
# Run once as root after cloning the repo:
#   sudo bash server-setup.sh
# ============================================================
set -e

APP_DIR="/var/www/work-desk"
UPLOADS_DIR="/var/www/work-desk-uploads"
NODE_VERSION="20"

echo "========================================="
echo "  work-desk.tech — Server Setup"
echo "========================================="

# ── 1. System packages ────────────────────────────────────────────────────────
echo ""
echo "[1/7] Installing system packages..."
apt-get update -qq
apt-get install -y curl git nginx mysql-server python3 python3-venv python3-pip \
  cmake libopenblas-dev liblapack-dev ufw

# ── 2. Node.js ────────────────────────────────────────────────────────────────
echo ""
echo "[2/7] Installing Node.js $NODE_VERSION..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi
npm install -g pm2

# ── 3. Persistent uploads folder (survives redeploys) ─────────────────────────
echo ""
echo "[3/7] Creating persistent uploads folder..."
mkdir -p "$UPLOADS_DIR"
chown -R www-data:www-data "$UPLOADS_DIR"
chmod -R 755 "$UPLOADS_DIR"

# Symlink uploads folder into backend so code finds files at expected path
if [ -d "$APP_DIR/backend/src/features/uploads" ] && [ ! -L "$APP_DIR/backend/src/features/uploads" ]; then
  # Move any existing files to persistent dir
  cp -rn "$APP_DIR/backend/src/features/uploads/." "$UPLOADS_DIR/" 2>/dev/null || true
  rm -rf "$APP_DIR/backend/src/features/uploads"
fi
ln -sfn "$UPLOADS_DIR" "$APP_DIR/backend/src/features/uploads"
echo "Uploads symlinked: $APP_DIR/backend/src/features/uploads -> $UPLOADS_DIR"

# ── 4. MySQL — dedicated DB user ──────────────────────────────────────────────
echo ""
echo "[4/7] Creating MySQL database and user..."
mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`work-desk\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'hrms_user'@'localhost' IDENTIFIED BY 'Aqil@123';
GRANT ALL PRIVILEGES ON \`work-desk\`.* TO 'hrms_user'@'localhost';
FLUSH PRIVILEGES;
SQL
echo "MySQL user 'hrms_user' created with access to 'work-desk' database"

# ── 5. Nginx config ───────────────────────────────────────────────────────────
echo ""
echo "[5/7] Configuring Nginx..."
cat > /etc/nginx/sites-available/work-desk.tech <<'NGINX'
server {
    listen 80;
    server_name work-desk.tech www.work-desk.tech;

    # Redirect HTTP -> HTTPS (after SSL setup)
    # Uncomment after running certbot:
    # return 301 https://$host$request_uri;

    # ── Frontend (React build) ────────────────────────────────────────────────
    root /var/www/work-desk/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # ── Backend API ───────────────────────────────────────────────────────────
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 15M;
    }

    # ── Socket.IO ─────────────────────────────────────────────────────────────
    location /socket.io/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # ── Uploads ───────────────────────────────────────────────────────────────
    location /uploads/ {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
        client_max_body_size 15M;
    }

    # ── Super Admin (subdomain alternative: use /super-admin path) ────────────
    location /super-admin/ {
        alias /var/www/work-desk/super-admin/dist/;
        try_files $uri $uri/ /super-admin/index.html;
    }

    # ── Security headers ──────────────────────────────────────────────────────
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
NGINX

ln -sfn /etc/nginx/sites-available/work-desk.tech /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "Nginx configured for work-desk.tech"

# ── 6. SSL via Let's Encrypt ──────────────────────────────────────────────────
echo ""
echo "[6/7] Setting up SSL (Let's Encrypt)..."
if ! command -v certbot &> /dev/null; then
  apt-get install -y certbot python3-certbot-nginx
fi
certbot --nginx -d work-desk.tech -d www.work-desk.tech --non-interactive --agree-tos -m ashish.kumar@kosqu.com || \
  echo "WARNING: SSL setup failed — run manually: certbot --nginx -d work-desk.tech -d www.work-desk.tech"

# ── 7. Firewall ───────────────────────────────────────────────────────────────
echo ""
echo "[7/7] Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "========================================="
echo "  Server setup complete!"
echo ""
echo "  Next steps:"
echo "  1. cd $APP_DIR && bash deploy.sh"
echo "  2. sudo bash backend/face_service/install_service.sh"
echo "========================================="
