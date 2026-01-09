# Contabo Server Deployment Guide

## Server Information
- **IP Address:** 38.242.243.175
- **Username:** root
- **Password:** TRYMENOT

## Option 1: Automated Deployment (Recommended)

Run the automated deployment script from your local machine:

```bash
cd /Users/aaron/SchoolTransportSystem/backend
./deploy-to-contabo.sh
```

This script will:
- Install Docker and Docker Compose if needed
- Upload all backend files
- Create .env file with secure passwords
- Build and start the containers
- Verify the deployment

## Option 2: Manual Deployment

### Step 1: Connect to Your Server

```bash
ssh root@38.242.243.175
# Password: TRYMENOT
```

### Step 2: Install Docker and Docker Compose

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Step 3: Upload Backend Code

**From your local machine:**

```bash
cd /Users/aaron/SchoolTransportSystem/backend

# Upload files using rsync (excludes node_modules, .git, etc.)
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude 'dist' \
    --exclude '*.log' \
    -e "ssh" \
    ./ root@38.242.243.175:/opt/school-transport-backend/backend/
```

**Or using SCP:**

```bash
scp -r backend/ root@38.242.243.175:/opt/school-transport-backend/
```

### Step 4: Create Environment File

**On the server:**

```bash
cd /opt/school-transport-backend/backend

# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 24)
JWT_SECRET=$(openssl rand -base64 32)

# Create .env file
cat > .env << EOF
# Database Configuration
DB_USER=schooltransport
DB_PASSWORD=$DB_PASSWORD
DB_NAME=schooltransport
DB_PORT=5432
DATABASE_URL=postgresql://schooltransport:$DB_PASSWORD@db:5432/schooltransport?schema=public

# Server Configuration
PORT=3001
NODE_ENV=production

# JWT Configuration
JWT_SECRET=$JWT_SECRET

# Frontend URL (UPDATE THIS WITH YOUR ACTUAL FRONTEND URL)
FRONTEND_URL=https://your-frontend-domain.com
EOF

# Verify .env file
cat .env
```

**Important:** Update `FRONTEND_URL` with your actual frontend domain URL.

### Step 5: Deploy

```bash
cd /opt/school-transport-backend/backend

# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

**Or manually:**

```bash
# Stop any existing containers
docker-compose -f docker-compose.prod.yml down

# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 6: Configure Firewall

```bash
# Install UFW if not installed
apt install ufw -y

# Allow SSH (important!)
ufw allow 22/tcp

# Allow backend API
ufw allow 3001/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

### Step 7: Verify Deployment

```bash
# Check containers are running
docker ps

# Test health endpoint
curl http://localhost:3001/health

# Test from your local machine
curl http://38.242.243.175:3001/health
```

You should see:
```json
{"status":"ok","message":"School Transport API is running"}
```

## Useful Commands

### View Logs
```bash
cd /opt/school-transport-backend/backend
docker-compose -f docker-compose.prod.yml logs -f
```

### Restart Services
```bash
cd /opt/school-transport-backend/backend
docker-compose -f docker-compose.prod.yml restart
```

### Stop Services
```bash
cd /opt/school-transport-backend/backend
docker-compose -f docker-compose.prod.yml down
```

### Update Application
```bash
cd /opt/school-transport-backend/backend

# Pull latest code (if using Git)
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

### Backup Database
```bash
docker exec school-transport-db-prod pg_dump -U schooltransport schooltransport > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Troubleshooting

### Containers Won't Start

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
lsof -i :3001

# Change port in .env file and restart
nano .env  # Change PORT=3001 to PORT=3002
docker-compose -f docker-compose.prod.yml restart
```

## Security Notes

⚠️ **Important Security Steps:**

1. **Change default passwords** - The script generates secure passwords, but verify them
2. **Update FRONTEND_URL** - Set this to your actual frontend domain
3. **Set up SSH keys** - Disable password authentication and use SSH keys instead
4. **Configure firewall** - Only open necessary ports
5. **Set up SSL/HTTPS** - Use Nginx reverse proxy with Let's Encrypt (see DEPLOYMENT.md)

## API Endpoints

Once deployed, your API will be available at:

- **Base URL:** `http://38.242.243.175:3001`
- **Health Check:** `http://38.242.243.175:3001/health`
- **API Root:** `http://38.242.243.175:3001/`
- **Auth:** `http://38.242.243.175:3001/api/auth`
- **All endpoints:** See `http://38.242.243.175:3001/` for full list

## Next Steps

1. ✅ Update `FRONTEND_URL` in `.env` file
2. ✅ Configure your frontend to use `http://38.242.243.175:3001` as API URL
3. ✅ Set up Nginx reverse proxy with SSL (optional but recommended)
4. ✅ Configure automatic backups
5. ✅ Set up monitoring

For detailed Nginx and SSL setup, see [DEPLOYMENT.md](./DEPLOYMENT.md).

