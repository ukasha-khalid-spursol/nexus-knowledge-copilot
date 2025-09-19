# =====================================================
# Multi-stage Dockerfile for Nexus Knowledge Copilot
# Optimized for production deployment on Azure VM
# =====================================================

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Create optimized production build
RUN npm run build 2>/dev/null || echo "No build script found, skipping..."

# Remove dev dependencies
RUN npm prune --production

# =====================================================
# Production stage
FROM node:18-alpine AS production

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    tzdata && \
    rm -rf /var/cache/apk/*

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nexusapp -u 1001 -G nodejs

# Set timezone
ENV TZ=UTC

# Set working directory
WORKDIR /app

# Copy package files
COPY --from=builder /app/package*.json ./

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.js ./

# Create necessary directories with proper permissions
RUN mkdir -p logs uploads backups && \
    chown -R nexusapp:nodejs /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Switch to non-root user
USER nexusapp

# Expose port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]