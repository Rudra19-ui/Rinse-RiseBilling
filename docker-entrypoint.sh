#!/bin/sh
set -e

PORT="${PORT:-8080}"

start_bridge_background() {
  if [ "${WHATSAPP_ENABLED:-1}" = "0" ]; then
    echo "WhatsApp bridge disabled (set WHATSAPP_ENABLED=1 on Railway to enable QR scanner)"
    return 0
  fi

  mkdir -p "${WHATSAPP_AUTH_DIR:-/app/whatsapp-bridge/.wwebjs_auth}"
  mkdir -p "${WHATSAPP_CACHE_DIR:-/app/whatsapp-bridge/.wwebjs_cache}"
  mkdir -p /app/data/invoices

  (
    # Give Gunicorn a few seconds to bind before Chrome starts (saves RAM during healthcheck)
    sleep 8
    cd /app/whatsapp-bridge
    while true; do
      echo "Starting WhatsApp bridge..."
      node server.js >> /app/whatsapp-bridge/bridge.log 2>&1
      echo "WhatsApp bridge exited — restarting in 15s..."
      sleep 15
    done
  ) &
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
