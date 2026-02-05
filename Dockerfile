# Stage 1: Build & Dependencies
FROM node:20-slim as builder
WORKDIR /app

# Install build dependencies for node-canvas (Debian)
RUN apt-get update && apt-get upgrade -y && apt-get install -y \
  build-essential \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  python3 \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .
RUN npm run build
# Prune dev dependencies (keep prod only for copying)
RUN npm prune --production

# Stage 2: Production (Nginx + Node API)
FROM node:20-slim as production
WORKDIR /app

# Install nginx, supervisord and runtime dependencies
RUN apt-get update && apt-get upgrade -y && apt-get install -y \
  nginx \
  supervisor \
  curl \
  libcairo2 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libjpeg62-turbo \
  libgif7 \
  librsvg2-2 \
  && npm install -g npm@latest \
  && npm install -g tar@7.5.3 \
  && rm -rf /usr/local/lib/node_modules/npm/node_modules/tar \
  && cp -r /usr/local/lib/node_modules/tar /usr/local/lib/node_modules/npm/node_modules/ \
  && rm -rf /usr/local/lib/node_modules/tar \
  && rm -rf /root/.npm \
  && rm -rf ~/.npm \
  && rm -rf /var/lib/apt/lists/*

# Copy built assets
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

# Install tsx globally
RUN npm install -g tsx \
  && rm -rf /root/.npm

# Configure nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default

# Configure supervisord
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:8080/api/health || exit 1

EXPOSE 8080
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
