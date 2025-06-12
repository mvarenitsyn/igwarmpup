# Use official Node.js runtime with system packages
FROM node:20-slim

# Install system dependencies for Puppeteer/Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Set environment variables for cloud deployment
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
ENV NODE_ENV=production
ENV PORT=3002

# Copy package files first (for better caching)
COPY package.json ./
COPY package-lock.json* ./

# Upgrade npm to latest and install dependencies without downloading browsers
RUN npm install -g npm@latest && \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 \
    PUPPETEER_SKIP_DOWNLOAD=1 \
    npm ci --omit=dev --no-audit --no-fund

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs uploads

# Expose port (cloud platforms will override this)
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# Start the application
CMD ["node", "src/index.js"]
