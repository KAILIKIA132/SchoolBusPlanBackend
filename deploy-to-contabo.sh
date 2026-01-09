#!/bin/bash

# Deployment script for Contabo Server
# This script will deploy the backend to your Contabo server
# Usage: ./deploy-to-contabo.sh

set -e  # Exit on error

# Server configuration
SERVER_IP="38.242.243.175"
SERVER_USER="root"
SERVER_PASSWORD="TRYMENOT"
DEPLOY_PATH="/opt/school-transport-backend/backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting deployment to Contabo server...${NC}"
echo -e "${BLUE}Server: ${SERVER_USER}@${SERVER_IP}${NC}"
echo ""

# Check if sshpass is installed (for password authentication)
if ! command -v sshpass &> /dev/null; then
    echo -e "${YELLOW}⚠️  sshpass not found. Installing...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install hudochenkov/sshpass/sshpass
        else
            echo -e "${RED}❌ Please install sshpass: brew install hudochenkov/sshpass/sshpass${NC}"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get update && sudo apt-get install -y sshpass
    else
        echo -e "${RED}❌ Please install sshpass manually${NC}"
        exit 1
    fi
fi

# Check if rsync is available
if ! command -v rsync &> /dev/null; then
    echo -e "${RED}❌ rsync is required but not installed${NC}"
    exit 1
fi

# Function to run remote command
run_remote() {
    sshpass -p "$SERVER_PASSWORD" ssh -T -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
        -o ConnectTimeout=10 \
        "${SERVER_USER}@${SERVER_IP}" "$1"
}

# Function to copy file to remote
copy_to_remote() {
    sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
        -r "$1" "${SERVER_USER}@${SERVER_IP}:$2"
}

echo -e "${BLUE}📡 Testing connection to server...${NC}"
if run_remote "echo 'Connection successful'"; then
    echo -e "${GREEN}✅ Connection successful${NC}"
else
    echo -e "${RED}❌ Failed to connect to server${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔧 Checking server prerequisites...${NC}"

# Check Docker
if run_remote "command -v docker &> /dev/null"; then
    echo -e "${GREEN}✅ Docker is installed${NC}"
else
    echo -e "${YELLOW}⚠️  Docker not found. Installing Docker...${NC}"
    run_remote "curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && rm get-docker.sh"
    echo -e "${GREEN}✅ Docker installed${NC}"
fi

# Check Docker Compose
if run_remote "command -v docker-compose &> /dev/null || docker compose version &> /dev/null"; then
    echo -e "${GREEN}✅ Docker Compose is installed${NC}"
else
    echo -e "${YELLOW}⚠️  Docker Compose not found. Installing...${NC}"
    run_remote "curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose"
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
fi

echo ""
echo -e "${BLUE}📦 Uploading backend code to server...${NC}"

# Create directory on server
run_remote "mkdir -p $DEPLOY_PATH"

# Get the current directory (backend folder)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Upload files (excluding node_modules, .git, etc.)
echo -e "${YELLOW}Uploading files...${NC}"
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude 'dist' \
    --exclude '*.log' \
    --exclude '.DS_Store' \
    -e "sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" \
    "$SCRIPT_DIR/" "${SERVER_USER}@${SERVER_IP}:${DEPLOY_PATH}/"

echo -e "${GREEN}✅ Files uploaded${NC}"

echo ""
echo -e "${BLUE}⚙️  Setting up environment...${NC}"

# Check if .env exists on server
if run_remote "test -f $DEPLOY_PATH/.env"; then
    echo -e "${YELLOW}⚠️  .env file already exists on server${NC}"
    echo -e "${YELLOW}⚠️  Skipping .env creation. Please verify your .env file is correct.${NC}"
else
    echo -e "${YELLOW}Creating .env file...${NC}"
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    
    # Create .env file on server
    run_remote "cat > $DEPLOY_PATH/.env << 'EOF'
# Database Configuration
DB_USER=schooltransport
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
DB_NAME=schooltransport
DB_PORT=5432

# Server Configuration
PORT=3001
NODE_ENV=production

# JWT Configuration
JWT_SECRET=$JWT_SECRET

# Frontend URL (for CORS) - UPDATE THIS WITH YOUR FRONTEND URL
FRONTEND_URL=https://your-frontend-domain.com

# Database URL (will be set automatically)
DATABASE_URL=postgresql://schooltransport:\${DB_PASSWORD}@db:5432/schooltransport?schema=public
EOF
"
    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Please update FRONTEND_URL in .env file on the server${NC}"
fi

echo ""
echo -e "${BLUE}🐳 Building and starting Docker containers...${NC}"

# Make deploy script executable
run_remote "chmod +x $DEPLOY_PATH/deploy.sh"

# Run deployment on server
run_remote "cd $DEPLOY_PATH && ./deploy.sh" || {
    echo -e "${YELLOW}⚠️  Deploy script had issues. Trying manual deployment...${NC}"
    
    # Manual deployment steps
    run_remote "cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml down 2>/dev/null || true"
    run_remote "cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml up -d --build"
    
    echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
    sleep 15
}

echo ""
echo -e "${BLUE}🏥 Checking service health...${NC}"

# Wait a bit for services to start
sleep 5

# Check if containers are running
if run_remote "docker ps | grep -q school-transport-backend-prod"; then
    echo -e "${GREEN}✅ Backend container is running${NC}"
else
    echo -e "${RED}❌ Backend container is not running. Check logs:${NC}"
    run_remote "cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml logs backend"
    exit 1
fi

if run_remote "docker ps | grep -q school-transport-db-prod"; then
    echo -e "${GREEN}✅ Database container is running${NC}"
else
    echo -e "${RED}❌ Database container is not running. Check logs:${NC}"
    run_remote "cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml logs db"
    exit 1
fi

# Test health endpoint
echo -e "${BLUE}Testing API health endpoint...${NC}"
sleep 5
if run_remote "curl -f http://localhost:3001/health > /dev/null 2>&1"; then
    echo -e "${GREEN}✅ API health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed, but containers are running. Check logs for details.${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "1. Update FRONTEND_URL in .env file on server:"
echo -e "   ${YELLOW}ssh ${SERVER_USER}@${SERVER_IP}${NC}"
echo -e "   ${YELLOW}cd ${DEPLOY_PATH} && nano .env${NC}"
echo ""
echo -e "2. Configure firewall (if not already done):"
echo -e "   ${YELLOW}sudo ufw allow 22/tcp${NC}"
echo -e "   ${YELLOW}sudo ufw allow 3001/tcp${NC}"
echo -e "   ${YELLOW}sudo ufw enable${NC}"
echo ""
echo -e "3. Test your API:"
echo -e "   ${YELLOW}curl http://${SERVER_IP}:3001/health${NC}"
echo ""
echo -e "4. View logs:"
echo -e "   ${YELLOW}ssh ${SERVER_USER}@${SERVER_IP}${NC}"
echo -e "   ${YELLOW}cd ${DEPLOY_PATH} && docker-compose -f docker-compose.prod.yml logs -f${NC}"
echo ""
echo -e "${GREEN}🌐 Your API should be available at: http://${SERVER_IP}:3001${NC}"

