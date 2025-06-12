# Use official Node.js runtime - slim version (no extras)
FROM node:22-slim

# Set working directory
WORKDIR /app

# Set environment variables to prevent browser downloads
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
ENV NODE_ENV=production

# Copy package files first (for better caching)
COPY package.json ./
COPY package-lock.json* ./

# Install dependencies without downloading browsers
RUN npm config set registry https://registry.npmmirror.com/ && \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 \
    npm ci --omit=dev --no-audit --no-fund

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs uploads

# Expose port (Railway will override this)
EXPOSE 3002

# Start the application
CMD ["node", "src/index.js"]
