#!/bin/bash
set -euo pipefail

cleanup() {
    echo "[entrypoint] Shutting down services..."
    kill "$NGINX_PID" "$API_PID" 2>/dev/null || true
    wait "$NGINX_PID" "$API_PID" 2>/dev/null || true
    echo "[entrypoint] Done."
}
trap cleanup EXIT TERM INT

echo "[entrypoint] Starting nginx..."
nginx -g "daemon off;" &
NGINX_PID=$!

echo "[entrypoint] Starting API server..."
tsx /app/src/server.ts &
API_PID=$!

echo "[entrypoint] Services running — nginx PID=$NGINX_PID, API PID=$API_PID"
echo "[entrypoint] Web UI + API available on port 8080"

# Poll — exit container if either service dies
while kill -0 "$NGINX_PID" 2>/dev/null && kill -0 "$API_PID" 2>/dev/null; do
    sleep 2
done

echo "[entrypoint] A service exited unexpectedly. Stopping container."
