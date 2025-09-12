# Multi-stage build for gift-calc CLI tool
FROM node:20-alpine AS runtime

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
# Since this is a single-file CLI with no dependencies, we only need the package.json for metadata
COPY package.json ./

# Copy application files
COPY index.js ./
COPY src/ ./src/

# Set ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set executable permissions
USER root
RUN chmod +x index.js
USER nodejs

# Create config directory with proper permissions
RUN mkdir -p /home/nodejs/.config/gift-calc

# Set the entrypoint
ENTRYPOINT ["node", "index.js"]