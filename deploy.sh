#!/bin/bash

# 1. Pull latest code
echo "--- Pulling latest changes from GitHub ---"
git pull origin new-workdesk

# 2. Build Frontend
echo "--- Building Frontend ---"
cd frontend
npm ci
npm run build
cd ..

# 3. Build Super Admin
echo "--- Building Super Admin ---"
cd super-admin
npm ci
npm run build
cd ..

# 4. Restart Backend
echo "--- Restarting Backend Server ---"
cd backend
npm ci
# This assumes you are using PM2 to manage your node process
pm2 restart work-desk-backend || pm2 start server.js --name "work-desk-backend"

# 5. Optional: Reload Nginx (Useful if you changed Nginx config ports)
echo "--- Reloading Nginx ---"
sudo systemctl reload nginx

echo "--- Deployment Complete! ---"
