# Stage 1: Build & Dependencies
FROM node:20-slim AS builder
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

# Stage 2: Web (Nginx)
FROM nginx:alpine AS web
RUN apk add --no-cache curl
RUN touch /var/run/nginx.pid && \
  chown -R nginx:nginx /var/run/nginx.pid && \
  chown -R nginx:nginx /var/cache/nginx && \
  chown -R nginx:nginx /usr/share/nginx/html
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:8080/ || exit 1
CMD ["nginx", "-g", "daemon off;"]

# Stage 3: API (Node)
FROM node:20-slim AS api
WORKDIR /app

# Install runtime dependencies for node-canvas (Debian)
RUN apt-get update && apt-get upgrade -y && apt-get install -y \
  libcairo2 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libjpeg62-turbo \
  libgif7 \
  librsvg2-2 \
  && npm install -g npm@latest \
  && npm install -g tar@7.5.11 \
  && rm -rf /usr/local/lib/node_modules/npm/node_modules/tar \
  && cp -r /usr/local/lib/node_modules/tar /usr/local/lib/node_modules/npm/node_modules/ \
  && rm -rf /usr/local/lib/node_modules/tar \
  && rm -rf /root/.npm \
  && rm -rf ~/.npm \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# Copy built node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

# Install tsx globally
RUN npm install -g tsx \
  && rm -rf /root/.npm

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:3000/health || exit 1
CMD ["npm", "run", "api"]

# Stage 4: Production — Single image, nginx (port 8080) + Node API (internal :3000)
# Uses a lightweight bash entrypoint — no Python/supervisord needed.
FROM node:20-slim AS production
WORKDIR /app

# Install nginx, curl (healthcheck), and canvas runtime deps
RUN apt-get update && apt-get upgrade -y && apt-get install -y \
  nginx \
  curl \
  libcairo2 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libjpeg62-turbo \
  libgif7 \
  librsvg2-2 \
  && rm -rf /var/lib/apt/lists/*

# Copy built frontend from builder → nginx html root
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html

# Use production nginx config (includes /api/ reverse proxy to :3000)
COPY nginx-production.conf /etc/nginx/conf.d/default.conf

# Copy node app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig.json ./
COPY package*.json ./

# Install tsx globally
RUN npm install -g tsx && rm -rf /root/.npm

# Entrypoint: starts nginx + API via bash (no Python/supervisord needed)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s \
  CMD curl -f http://localhost:8080/ && curl -f http://localhost:3000/health || exit 1
CMD ["/entrypoint.sh"]
