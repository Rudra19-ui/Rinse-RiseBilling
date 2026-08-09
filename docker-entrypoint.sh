#!/bin/sh
set -e

PORT="${PORT:-8080}"
DATA="${DATA_DIR:-/app/data}"
WA_AUTH="${WHATSAPP_AUTH_DIR:-$DATA/whatsapp-auth}"
WA_CACHE="${WHATSAPP_CACHE_DIR:-$DATA/whatsapp-cache}"

mkdir -p "$DATA/invoices" "$WA_AUTH" "$WA_CACHE"
touch "$DATA/.persistent_volume" 2>/dev/null || true

start_bridge_background() {
  if [ "${WHATSAPP_ENABLED:-1}" = "0" ]; then
    echo "WhatsApp bridge disabled (set WHATSAPP_ENABLED=1 on Railway to enable QR scanner)"
    return 0
  fi

  export WHATSAPP_AUTH_DIR="$WA_AUTH"
  export WHATSAPP_CACHE_DIR="$WA_CACHE"

  (
    sleep 8
    cd /app/whatsapp-bridge
    backoff=15
    while true; do
      if [ -f "$WA_AUTH/.bridge.lock" ]; then
        pid="$(cat "$WA_AUTH/.bridge.lock" 2>/dev/null || echo "")"
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
          echo "WhatsApp bridge already running (pid $pid)"
          sleep 30
          continue
        fi
      fi
      echo "Starting WhatsApp bridge (auth: $WA_AUTH)..."
      node server.js >> "$DATA/whatsapp-bridge.log" 2>&1
      echo "WhatsApp bridge exited — restarting in ${backoff}s..."
      sleep "$backoff"
      if [ "$backoff" -lt 120 ]; then
        backoff=$((backoff + 15))
      fi
    done
  ) &
}

start_bridge_background

echo "Starting Gunicorn on port ${PORT}..."
echo "Persistent data directory: $DATA (mount a Railway Volume here)"
exec gunicorn \
  --bind "0.0.0.0:${PORT}" \
  --workers "${WEB_CONCURRENCY:-1}" \
  --threads 4 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - \
  --chdir /app/server \
  app:app
