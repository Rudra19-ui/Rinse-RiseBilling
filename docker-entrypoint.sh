#!/bin/sh
set -e

PORT="${PORT:-8080}"

start_bridge_background() {
  if [ "${WHATSAPP_ENABLED:-1}" = "0" ]; then
    echo "WhatsApp bridge disabled (WHATSAPP_ENABLED=0)"
    return 0
  fi

  echo "Starting WhatsApp bridge in background..."
  mkdir -p "${WHATSAPP_AUTH_DIR:-/app/whatsapp-bridge/.wwebjs_auth}"
  mkdir -p "${WHATSAPP_CACHE_DIR:-/app/whatsapp-bridge/.wwebjs_cache}"
  mkdir -p /app/data/invoices

  (
    cd /app/whatsapp-bridge
    node server.js >> /app/whatsapp-bridge/bridge.log 2>&1
  ) &
  echo $! >/tmp/whatsapp-bridge.pid
  echo "WhatsApp bridge PID $(cat /tmp/whatsapp-bridge.pid)"
}

start_bridge_background

echo "Starting Gunicorn on port ${PORT}..."
exec gunicorn \
  --bind "0.0.0.0:${PORT}" \
  --workers "${WEB_CONCURRENCY:-1}" \
  --threads 4 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - \
  --chdir /app/server \
  app:app
