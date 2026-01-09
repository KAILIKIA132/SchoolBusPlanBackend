#!/bin/bash

# Deployment script for School Transport System Backend
# Usage: ./deploy.sh

set -e  # Exit on error

echo "🚀 Starting deployment of School Transport System Backend..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please edit .env file with your configuration before continuing.${NC}"
        echo -e "${YELLOW}⚠️  Press Enter to continue after editing .env file...${NC}"
        read
    else
        echo -e "${RED}❌ .env.example file not found. Please create .env file manually.${NC}"
        exit 1
    fi
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if required environment variables are set
source .env

if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" == "your-secure-database-password-here" ]; then
    echo -e "${RED}❌ DB_PASSWORD is not set or is using default value. Please update .env file.${NC}"
    exit 1
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" == "your-super-secret-jwt-key-change-this-to-a-random-string-in-production" ]; then
    echo -e "${RED}❌ JWT_SECRET is not set or is using default value. Please update .env file.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables validated${NC}"

# Stop existing containers if running
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if containers are running
if docker ps | grep -q "school-transport-backend-prod"; then
    echo -e "${GREEN}✅ Backend container is running${NC}"
else
    echo -e "${RED}❌ Backend container failed to start. Check logs with: docker-compose -f docker-compose.prod.yml logs${NC}"
    exit 1
fi

if docker ps | grep -q "school-transport-db-prod"; then
    echo -e "${GREEN}✅ Database container is running${NC}"
else
    echo -e "${RED}❌ Database container failed to start. Check logs with: docker-compose -f docker-compose.prod.yml logs${NC}"
    exit 1
fi

# Test health endpoint
echo "🏥 Testing health endpoint..."
sleep 5
if curl -f http://localhost:${PORT:-3001}/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed, but containers are running. Check logs for details.${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "📋 Useful commands:"
echo "  View logs:        docker-compose -f docker-compose.prod.yml logs -f"
echo "  Stop services:    docker-compose -f docker-compose.prod.yml down"
echo "  Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "  Check status:     docker-compose -f docker-compose.prod.yml ps"
echo ""
echo "🌐 API should be available at: http://localhost:${PORT:-3001}"
echo "🏥 Health check: http://localhost:${PORT:-3001}/health"

