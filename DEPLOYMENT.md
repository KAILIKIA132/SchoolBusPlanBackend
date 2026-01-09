# Deployment Guide for Contabo Server

This guide will help you deploy the School Transport System backend to your Contabo server.

## Prerequisites

1. **Contabo VPS/Server** with:
   - Ubuntu 20.04+ or Debian 11+
   - Docker and Docker Compose installed
   - At least 2GB RAM (4GB recommended)
   - Root or sudo access

2. **Domain name** (optional but recommended) pointing to your server IP

## Step 1: Prepare Your Server

### 1.1 Connect to Your Contabo Server

```bash
ssh root@your-server-ip
# or
ssh your-username@your-server-ip
```

### 1.2 Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Install Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Add your user to docker group (if not root)
sudo usermod -aG docker $USER
# Log out and back in for this to take effect
```

## Step 2: Upload Your Backend Code

### Option A: Using Git (Recommended)

```bash
# Install Git if not already installed
sudo apt install git -y

# Clone your repository
cd /opt
sudo git clone https://github.com/your-username/your-repo.git school-transport-backend
cd school-transport-backend/backend

# Or if you have a private repo, use SSH keys
```

### Option B: Using SCP/SFTP

```bash
# From your local machine
scp -r backend/ root@your-server-ip:/opt/school-transport-backend/
```

### Option C: Using rsync

```bash
# From your local machine
rsync -avz --exclude 'node_modules' --exclude '.git' backend/ root@your-server-ip:/opt/school-transport-backend/
```

## Step 3: Configure Environment Variables

```bash
cd /opt/school-transport-backend/backend

# Copy the example environment file
cp .env.example .env

# Edit the environment file
nano .env
```

**Important:** Update the following values in `.env`:

```env
# Generate a strong password for your database
DB_PASSWORD=your-very-secure-password-here

# Generate a strong JWT secret (use a random string generator)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Set your frontend URL
FRONTEND_URL=https://your-frontend-domain.com

# If you have a domain, you can also set:
# PORT=3001 (or your preferred port)
```

**Generate a secure JWT secret:**
```bash
openssl rand -base64 32
```

## Step 4: Build and Start Services

```bash
cd /opt/school-transport-backend/backend

# Build and start the services
docker-compose -f docker-compose.prod.yml up -d --build

# Check if containers are running
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Step 5: Verify Deployment

### 5.1 Check Container Status

```bash
docker ps
```

You should see both `school-transport-db-prod` and `school-transport-backend-prod` running.

### 5.2 Test the API

```bash
# From your server
curl http://localhost:3001/health

# Or from your local machine (replace with your server IP)
curl http://your-server-ip:3001/health
```

You should get a response like:
```json
{"status":"ok","message":"School Transport API is running"}
```

### 5.3 Test API Endpoints

```bash
curl http://your-server-ip:3001/
```

## Step 6: Configure Firewall (UFW)

```bash
# Install UFW if not installed
sudo apt install ufw -y

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow your backend port
sudo ufw allow 3001/tcp

# If using HTTPS, allow ports 80 and 443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 7: Set Up Reverse Proxy (Optional but Recommended)

If you want to use a domain name and HTTPS, set up Nginx as a reverse proxy.

### 7.1 Install Nginx

```bash
sudo apt install nginx -y
```

### 7.2 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/school-transport-api
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name api.your-domain.com;  # Replace with your domain

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7.3 Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/school-transport-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7.4 Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d api.your-domain.com

# Certbot will automatically configure Nginx and set up auto-renewal
```

## Step 8: Update CORS Settings

After setting up your domain, update the `FRONTEND_URL` in your `.env` file and restart the backend:

```bash
nano .env
# Update FRONTEND_URL to your actual frontend domain

docker-compose -f docker-compose.prod.yml restart backend
```

## Step 9: Set Up Auto-Start on Boot

Docker Compose services with `restart: unless-stopped` will automatically start on boot. To ensure Docker starts on boot:

```bash
sudo systemctl enable docker
```

## Step 10: Monitoring and Maintenance

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f db
```

### Restart Services

```bash
docker-compose -f docker-compose.prod.yml restart
```

### Stop Services

```bash
docker-compose -f docker-compose.prod.yml down
```

### Update Application

```bash
cd /opt/school-transport-backend/backend

# Pull latest changes (if using Git)
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

### Backup Database

```bash
# Create backup
docker exec school-transport-db-prod pg_dump -U schooltransport schooltransport > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
cat backup_file.sql | docker exec -i school-transport-db-prod psql -U schooltransport schooltransport
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check container status
docker ps -a

# Remove and recreate
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### Database Connection Issues

```bash
# Check if database is running
docker exec school-transport-db-prod pg_isready -U schooltransport

# Check database logs
docker-compose -f docker-compose.prod.yml logs db
```

### Port Already in Use

```bash
# Check what's using the port
sudo lsof -i :3001

# Change port in .env file and restart
```

### Permission Issues

```bash
# Fix file permissions
sudo chown -R $USER:$USER /opt/school-transport-backend
```

## Security Checklist

- [ ] Changed default database password
- [ ] Generated strong JWT secret
- [ ] Configured firewall (UFW)
- [ ] Set up HTTPS/SSL certificate
- [ ] Updated CORS settings with actual frontend URL
- [ ] Database port not exposed to public (remove from docker-compose if needed)
- [ ] Regular backups configured
- [ ] SSH key authentication enabled (disable password auth)

## Support

For issues or questions, check the logs first:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

