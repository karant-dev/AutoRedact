# Stage 1: Build & Dependencies
FROM node:20-slim as builder
WORKDIR /app

# Install build dependencies for node-canvas (Debian)
RUN apt-get update && apt-get install -y \
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
FROM nginx:alpine as web
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
FROM node:20-slim as api
WORKDIR /app

# Install runtime dependencies for node-canvas (Debian)
RUN apt-get update && apt-get install -y \
  libcairo2 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libjpeg62-turbo \
  libgif7 \
  librsvg2-2 \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# Copy built node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

# Install tsx globally
RUN npm install -g tsx

USER node
EXPOSE 3000
# wget is not in slim? use curl or node script? node:20-slim usually has curl? 
# Let's check. Standard slim has minimal.
# Installing curl/wget in api stage if missing.
USER root
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
USER node

HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:3000/health || exit 1
CMD ["npm", "run", "api"]
