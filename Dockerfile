FROM node:20-alpine

WORKDIR /app

# Install OpenSSL and other required libraries for Prisma
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Default command (will be overridden by docker-compose)
CMD ["npm", "run", "dev"]


