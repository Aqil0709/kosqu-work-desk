# Work Desk HRMS — Production Deployment Guide

## Prerequisites (on the VPS)
```bash
sudo apt update && sudo apt install -y nginx nodejs npm mysql-server certbot python3-certbot-nginx
npm install -g pm2
```

## 1. Transfer files to server
```bash
# On your local machine — zip the project
cd C:\Users\Aqil\work-desk
# Exclude node_modules
tar -czf work-desk.tar.gz --exclude='*/node_modules' --exclude='*/.git' .

# Upload to server (replace <SERVER_IP>)
scp work-desk.tar.gz user@<SERVER_IP>:/var/www/
```

## 2. Extract and install dependencies on server
```bash
cd /var/www
tar -xzf work-desk.tar.gz -C work-desk-app
cd work-desk-app/backend
npm install --production
```

## 3. Set up MySQL database on server
```bash
# Import the existing database (export from local first)
# On LOCAL machine:
mysqldump -u root -p"Aqil@123" work-desk > work-desk-dump.sql
scp work-desk-dump.sql user@<SERVER_IP>:/tmp/

# On SERVER:
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS \`work-desk\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p work-desk < /tmp/work-desk-dump.sql
```

## 4. Configure SSL
```bash
# Point your domain DNS → server IP first, then:
sudo certbot certonly --nginx -d work-desk.tech -d www.work-desk.tech
```

## 5. Configure Nginx
```bash
sudo cp /var/www/work-desk-app/nginx.conf /etc/nginx/sites-available/work-desk
sudo ln -sf /etc/nginx/sites-available/work-desk /etc/nginx/sites-enabled/work-desk
sudo rm -f /etc/nginx/sites-enabled/default

# Deploy frontend
sudo mkdir -p /var/www/work-desk
sudo cp -r /var/www/work-desk-app/frontend/dist/* /var/www/work-desk/

sudo nginx -t && sudo systemctl reload nginx
```

## 6. Start backend with PM2
```bash
cd /var/www/work-desk-app

# Update ecosystem.config.js cwd to /var/www/work-desk-app
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow the command it prints to auto-start on reboot
```

## 7. Open firewall ports
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5001/tcp
sudo ufw enable
```

## 8. Verify deployment
```bash
# Check API health
curl https://work-desk.tech:5001/health

# Check PM2 status
pm2 status

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

## Key URLs
- Frontend: https://work-desk.tech
- API:      https://work-desk.tech:5001
- Login:    admin@kosqu.com

## Environment Summary
| File | Key change |
|------|-----------|
| backend/.env | PORT=5002, JWT_SECRET=(64 chars), FRONTEND_URL=https://work-desk.tech, CORS_ORIGINS=https://work-desk.tech |
| frontend/.env | VITE_API_BASE_URL=https://work-desk.tech:5001 |

> **Note:** `PORT=5002` is the internal Node.js port. Nginx handles port 5001 (SSL) and proxies to 5002. Do NOT expose port 5002 externally (no ufw rule needed for it).
