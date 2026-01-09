# Quick Start Deployment Guide

## Prerequisites
- Contabo VPS with Ubuntu/Debian
- Docker and Docker Compose installed
- SSH access to your server

## Quick Deployment Steps

### 1. Upload Code to Server
```bash
# Option 1: Using Git
cd /opt
git clone your-repo-url school-transport-backend
cd school-transport-backend/backend

# Option 2: Using SCP (from local machine)
scp -r backend/ root@your-server-ip:/opt/school-transport-backend/
```

### 2. Create Environment File
```bash
cd /opt/school-transport-backend/backend
nano .env
```

**Required .env variables:**
```env
DB_USER=schooltransport
DB_PASSWORD=your-secure-password-here
DB_NAME=schooltransport
DB_PORT=5432
DATABASE_URL=postgresql://schooltransport:your-secure-password-here@db:5432/schooltransport?schema=public

PORT=3001
NODE_ENV=production

JWT_SECRET=generate-with: openssl rand -base64 32
FRONTEND_URL=https://your-frontend-domain.com
```

### 3. Deploy
```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### 4. Verify
```bash
# Check containers
docker ps

# Test API
curl http://localhost:3001/health
```

### 5. Configure Firewall
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3001/tcp  # Backend API
sudo ufw enable
```

## Common Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop services
docker-compose -f docker-compose.prod.yml down

# Update and redeploy
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

## Full Documentation
See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions including:
- Nginx reverse proxy setup
- SSL/HTTPS configuration
- Database backups
- Troubleshooting

