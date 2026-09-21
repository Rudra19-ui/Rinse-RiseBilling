# Rinse & Rise Laundry Billing — web app + WhatsApp QR bridge (hosted)
FROM node:20-bookworm-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    WHATSAPP_BRIDGE_URL=http://127.0.0.1:3001 \
    WHATSAPP_BRIDGE_PORT=3001 \
    DATA_DIR=/app/data \
    WHATSAPP_AUTH_DIR=/app/data/whatsapp-auth \
    WHATSAPP_CACHE_DIR=/app/data/whatsapp-cache \
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
        ca-certificates \
        libnss3 \
        libnspr4 \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libcups2 \
        libdrm2 \
        libdbus-1-3 \
        libglib2.0-0 \
        libgtk-3-0 \
        libxkbcommon0 \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxrandr2 \
        libxrender1 \
        libxss1 \
        libgbm1 \
        libasound2 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
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
RUN cd whatsapp-bridge && npm ci --omit=dev --ignore-scripts \
    && npx puppeteer browsers install chrome \
    && node -e "const p=require('puppeteer'); const fs=require('fs'); const e=p.executablePath(); if(!fs.existsSync(e)) { console.error('Chrome missing:', e); process.exit(1); } console.log('Chrome OK:', e);"

COPY whatsapp-bridge/patch-wwebjs.js ./whatsapp-bridge/
RUN cd whatsapp-bridge && node patch-wwebjs.js

COPY . .

RUN mkdir -p /app/data/invoices /app/data/whatsapp-auth /app/data/whatsapp-cache \
    && sed -i 's/\r$//' docker-entrypoint.sh \
    && chmod +x docker-entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=6 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/api/live" || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
