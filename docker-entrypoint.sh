#!/bin/sh
set -e

PORT="${PORT:-8080}"

start_bridge() {
  if [ "${WHATSAPP_ENABLED:-1}" = "0" ]; then
    echo "WhatsApp bridge disabled (WHATSAPP_ENABLED=0)"
    return 0
  fi

  echo "Starting WhatsApp bridge..."
  mkdir -p "${WHATSAPP_AUTH_DIR:-/app/whatsapp-bridge/.wwebjs_auth}"
  mkdir -p "${WHATSAPP_CACHE_DIR:-/app/whatsapp-bridge/.wwebjs_cache}"
  mkdir -p /app/data/invoices

  cd /app/whatsapp-bridge
  node server.js >> /app/whatsapp-bridge/bridge.log 2>&1 &
  echo $! >/tmp/whatsapp-bridge.pid

  TRIES=0
  while [ "$TRIES" -lt 90 ]; do
    if curl -fsS "http://127.0.0.1:${WHATSAPP_BRIDGE_PORT:-3001}/health" >/dev/null 2>&1; then
      echo "WhatsApp bridge is ready"
      return 0
    fi
    TRIES=$((TRIES + 1))
    sleep 2
  done

  echo "WARNING: WhatsApp bridge did not respond within 3 minutes — web app will still start"
  return 0
}

start_bridge

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
