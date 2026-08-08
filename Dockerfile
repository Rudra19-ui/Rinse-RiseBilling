# Rinse & Rise Laundry Billing — web app + WhatsApp QR bridge (hosted)
FROM node:20-bookworm-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    WHATSAPP_BRIDGE_URL=http://127.0.0.1:3001 \
    WHATSAPP_BRIDGE_PORT=3001 \
    WHATSAPP_AUTH_DIR=/app/whatsapp-bridge/.wwebjs_auth \
    WHATSAPP_CACHE_DIR=/app/whatsapp-bridge/.wwebjs_cache \
    WHATSAPP_ENABLED=1

WORKDIR /app

# Python (Flask API) + Chromium (WhatsApp Web via Puppeteer)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        curl \
        fontconfig \
        fonts-dejavu-core \
        fonts-liberation \
        chromium \
        ca-certificates \
        libnss3 \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libcups2 \
        libdrm2 \
        libxkbcommon0 \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxrandr2 \
        libgbm1 \
        libasound2 \
        libpango-1.0-0 \
        libcairo2 \
        libx11-6 \
        libx11-xcb1 \
        libxcb1 \
        libxext6 \
        libxi6 \
        libxtst6 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

COPY whatsapp-bridge/package.json whatsapp-bridge/package-lock.json ./whatsapp-bridge/
RUN cd whatsapp-bridge && npm ci --omit=dev

COPY . .

RUN mkdir -p data/invoices whatsapp-bridge/.wwebjs_auth whatsapp-bridge/.wwebjs_cache \
    && chmod +x docker-entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=15s --start-period=240s --retries=5 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/api/health" || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
