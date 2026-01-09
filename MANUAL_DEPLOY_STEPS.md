# Manual Deployment Steps for Contabo Server

Since automated deployment has connection issues, follow these steps manually from your local machine.

## Step 1: Test SSH Connection

First, verify you can connect to your server:

```bash
ssh root@38.242.243.175
# Password: TRYMENOT
```

If this works, continue. If not, check:
- Server is running
- Firewall allows SSH (port 22)
- IP address is correct

## Step 2: Install Prerequisites on Server

Once connected via SSH, run:

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

# Verify
docker --version
docker-compose --version
```

## Step 3: Upload Backend Code

**From your local machine** (in a new terminal, keep SSH session open):

```bash
cd /Users/aaron/SchoolTransportSystem/backend

# Upload files using rsync
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
cd /Users/aaron/SchoolTransportSystem/backend
scp -r . root@38.242.243.175:/opt/school-transport-backend/backend/
```

## Step 4: Create Environment File

**Back in your SSH session on the server:**

```bash
cd /opt/school-transport-backend/backend

# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
JWT_SECRET=$(openssl rand -base64 32 | tr -d '\n')

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

# Frontend URL (UPDATE THIS!)
FRONTEND_URL=https://your-frontend-domain.com
EOF

# Display the generated passwords (save them!)
echo "Database Password: $DB_PASSWORD"
echo "JWT Secret: $JWT_SECRET"
cat .env
```

**Important:** Copy and save the generated passwords!

## Step 5: Deploy Application

```bash
cd /opt/school-transport-backend/backend

# Make scripts executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

**Or deploy manually:**

```bash
# Stop any existing containers
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Step 6: Configure Firewall

```bash
# Install UFW
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

## Step 7: Verify Deployment

```bash
# Check containers
docker ps

# Test health endpoint
curl http://localhost:3001/health
```

**From your local machine, test:**

```bash
curl http://38.242.243.175:3001/health
```

You should see:
```json
{"status":"ok","message":"School Transport API is running"}
```

## Step 8: Update Frontend URL

Edit the .env file to set your actual frontend URL:

```bash
nano /opt/school-transport-backend/backend/.env
# Update FRONTEND_URL to your actual frontend domain
# Save and exit (Ctrl+X, then Y, then Enter)

# Restart backend to apply changes
docker-compose -f docker-compose.prod.yml restart backend
```

## Troubleshooting

### If containers won't start:

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check specific service
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs db
```

### If database connection fails:

```bash
# Check database is running
docker exec school-transport-db-prod pg_isready -U schooltransport

# Check database logs
docker-compose -f docker-compose.prod.yml logs db
```

### View all logs:

```bash
cd /opt/school-transport-backend/backend
docker-compose -f docker-compose.prod.yml logs -f
```

## Quick Commands Reference

```bash
# View logs
cd /opt/school-transport-backend/backend && docker-compose -f docker-compose.prod.yml logs -f

# Restart services
cd /opt/school-transport-backend/backend && docker-compose -f docker-compose.prod.yml restart

# Stop services
cd /opt/school-transport-backend/backend && docker-compose -f docker-compose.prod.yml down

# Start services
cd /opt/school-transport-backend/backend && docker-compose -f docker-compose.prod.yml up -d
```

## Your API Endpoints

Once deployed, your API will be available at:

- **Base URL:** `http://38.242.243.175:3001`
- **Health Check:** `http://38.242.243.175:3001/health`
- **API Info:** `http://38.242.243.175:3001/`

