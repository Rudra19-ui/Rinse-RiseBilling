/**
 * Local WhatsApp bridge — sends PDF invoices via your logged-in WhatsApp Web session.
 * Run once, scan QR code, then bills can be sent automatically from the billing app.
 */
const express = require("express");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");

const PORT = Number(process.env.WHATSAPP_BRIDGE_PORT || 3001);
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.join(__dirname, ".wwebjs_auth");
const CACHE_DIR = process.env.WHATSAPP_CACHE_DIR || path.join(__dirname, ".wwebjs_cache");
const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || "";

const app = express();
app.use(express.json({ limit: "2mb" }));

const state = {
  ready: false,
  qr: null,
  lastError: null,
  phase: "starting",
  loadingPercent: 0,
};

let authTimer = null;
let client = null;
let recovering = false;
let sendInProgress = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCommsError(err) {
  const msg = String(err?.message || err).toLowerCase();
  return (
    msg.includes("startcomms") ||
    msg.includes("sendiq") ||
    msg.includes("[comms]") ||
    msg.includes("not ready")
  );
}

function isSessionError(err) {
  const msg = String(err?.message || err).toLowerCase();
  return (
    isCommsError(err) ||
    msg.includes("detached frame") ||
    msg.includes("target closed") ||
    msg.includes("session closed") ||
    msg.includes("protocol error") ||
    msg.includes("execution context was destroyed") ||
    msg.includes("page has been closed") ||
    msg.includes("browser has disconnected")
  );
}

function createClient() {
  const puppeteerConfig = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-sync",
      "--no-first-run",
      "--mute-audio",
    ],
  };
  if (CHROME_PATH) {
    puppeteerConfig.executablePath = CHROME_PATH;
  }

  return new Client({
    authStrategy: new LocalAuth({ dataPath: AUTH_DIR, clientId: "rinse-rise" }),
    webVersionCache: {
      type: "local",
      path: CACHE_DIR,
    },
    puppeteer: puppeteerConfig,
  });
}

function bindClientEvents(waClient) {
  waClient.on("qr", async (qr) => {
    state.ready = false;
    state.phase = "qr";
    state.loadingPercent = 0;
    state.lastError = null;
    clearTimeout(authTimer);
    try {
      state.qr = await QRCode.toDataURL(qr, { margin: 1, width: 280 });
    } catch (err) {
      state.lastError = "Could not render QR code.";
      console.error("[WhatsApp] QR render failed:", err.message);
    }
    console.log("[WhatsApp] Scan QR code in the billing app to connect.");
  });

  waClient.on("loading_screen", (percent, message) => {
    state.phase = "loading";
    state.loadingPercent = Number(percent) || 0;
    state.qr = null;
    if (message) console.log(`[WhatsApp] Loading ${percent}% — ${message}`);
  });

  waClient.on("authenticated", () => {
    state.phase = "authenticating";
    state.qr = null;
    state.lastError = null;
    console.log("[WhatsApp] Authenticated — finishing connection…");
    clearTimeout(authTimer);
    authTimer = setTimeout(() => {
      if (!state.ready) {
        state.phase = "error";
        state.lastError =
          "Connected on phone but setup timed out. Click Reset Connection below, then scan a fresh QR code.";
        console.error("[WhatsApp] Ready event timed out after authentication.");
      }
    }, 120000);
  });

  waClient.on("ready", async () => {
    clearTimeout(authTimer);
    state.qr = null;
    state.lastError = null;
    state.loadingPercent = 100;
    state.phase = "ready";
    state.ready = false;
    console.log("[WhatsApp] Ready event — waiting for send layer…");

    const connected = await waitForConnectedState(waClient, 20000);
    if (connected) {
      state.ready = true;
      console.log("[WhatsApp] Connected and ready to send invoices.");
    } else {
      state.phase = "error";
      state.lastError =
        "WhatsApp loaded but send is not ready. Click Reset Connection, scan QR again, wait 10 seconds, then retry.";
      console.error("[WhatsApp] Send layer did not become ready.");
    }
  });

  waClient.on("auth_failure", (msg) => {
    clearTimeout(authTimer);
    state.ready = false;
    state.phase = "error";
    state.lastError = `Authentication failed: ${msg}. Click Reset Connection and scan again.`;
    console.error("[WhatsApp] Auth failure:", msg);
  });

  waClient.on("disconnected", (reason) => {
    clearTimeout(authTimer);
    state.ready = false;
    state.phase = "disconnected";
    state.lastError = `Disconnected (${reason}). Reconnecting…`;
    console.warn("[WhatsApp] Disconnected:", reason);
    scheduleReconnect(3000);
  });

  waClient.on("error", (err) => {
    console.error("[WhatsApp] Client error:", err?.message || err);
    if (isSessionError(err)) {
      state.ready = false;
      state.phase = "error";
      state.lastError = "WhatsApp session error. Reconnecting…";
      scheduleReconnect(2000);
    }
  });
}

function scheduleReconnect(delayMs) {
  clearTimeout(scheduleReconnect._timer);
  scheduleReconnect._timer = setTimeout(() => {
    softRecoverClient("disconnect").catch((err) => {
      state.phase = "error";
      state.lastError = err.message || "Could not reconnect WhatsApp.";
      console.error("[WhatsApp] Reconnect failed:", err.message);
    });
  }, delayMs);
}

async function destroyClient() {
  clearTimeout(authTimer);
  if (!client) return;
  try {
    await client.destroy();
  } catch (err) {
    console.warn("[WhatsApp] Destroy:", err.message);
  }
  client = null;
}

async function waitForConnectedState(waClient, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const waState = await waClient.getState();
      if (waState === "CONNECTED") {
        await sleep(2000);
        return true;
      }
    } catch (err) {
      console.warn("[WhatsApp] getState check:", err.message);
    }
    await sleep(500);
  }
  return false;
}

async function assertSendReady() {
  if (!client) throw new Error("WhatsApp not connected.");
  const waState = await client.getState();
  if (waState !== "CONNECTED") {
    state.ready = false;
    throw new Error(`WhatsApp not fully connected (${waState || "unknown"}).`);
  }
}

async function initializeClient() {
  await destroyClient();
  client = createClient();
  bindClientEvents(client);
  state.phase = "starting";
  state.lastError = null;
  state.ready = false;
  await client.initialize();
}

function waitForReady(timeoutMs) {
  return new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      if (state.ready && client) return resolve(true);
      if (state.phase === "qr" && state.qr) return resolve(false);
      if (Date.now() - started >= timeoutMs) return resolve(false);
      setTimeout(check, 400);
    };
    check();
  });
}

async function softRecoverClient(reason) {
  if (recovering) {
    while (recovering) {
      await sleep(300);
    }
    return state.ready;
  }

  recovering = true;
  state.ready = false;
  state.phase = "reconnecting";
  state.lastError = "Reconnecting WhatsApp session…";
  console.warn("[WhatsApp] Recovering session:", reason);

  try {
    await destroyClient();
    await initializeClient();
    const ok = await waitForReady(45000);
    if (!ok && state.phase === "qr") {
      state.lastError = "Scan the QR code in the billing app to reconnect WhatsApp.";
    } else if (!ok) {
      state.lastError = "WhatsApp reconnect timed out. Click Reset Connection and scan again.";
    }
    return ok;
  } finally {
    recovering = false;
  }
}

async function resetSession() {
  clearTimeout(scheduleReconnect._timer);
  recovering = false;
  state.ready = false;
  state.qr = null;
  state.lastError = null;
  state.phase = "starting";
  state.loadingPercent = 0;

  await destroyClient();

  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  fs.rmSync(CACHE_DIR, { recursive: true, force: true });
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  await initializeClient();
}

function normalizePhone(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) digits = "91" + digits;
  if (digits.startsWith("0") && digits.length === 11) digits = "91" + digits.slice(1);
  return digits;
}

async function performSend(digits, message, filePath, filename) {
  await assertSendReady();

  const numberId = await client.getNumberId(digits);
  if (!numberId) {
    const err = new Error("This phone number is not registered on WhatsApp.");
    err.code = "NOT_ON_WHATSAPP";
    throw err;
  }

  const media = MessageMedia.fromFilePath(filePath);
  media.filename = filename || path.basename(filePath);

  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await assertSendReady();
      await client.sendMessage(numberId._serialized, media, {
        caption: message || "",
        sendMediaAsDocument: true,
      });
      return;
    } catch (err) {
      lastErr = err;
      if (isCommsError(err) && attempt < 3) {
        console.warn(`[WhatsApp] Comms not ready (attempt ${attempt}/3) — retrying…`);
        await sleep(2500 * attempt);
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error("Failed to send on WhatsApp.");
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/status", (_req, res) => {
  res.json({
    ready: state.ready,
    qr: state.qr,
    lastError: state.lastError,
    phase: state.phase,
    loadingPercent: state.loadingPercent,
    recovering,
  });
});

app.post("/reset", async (_req, res) => {
  try {
    await resetSession();
    res.json({ ok: true });
  } catch (err) {
    console.error("[WhatsApp] Reset failed:", err);
    res.status(500).json({ error: err.message || "Reset failed." });
  }
});

app.post("/send", async (req, res) => {
  if (sendInProgress) {
    return res.status(429).json({ error: "Another WhatsApp send is in progress. Please wait a moment." });
  }

  if (!state.ready || !client) {
    return res.status(503).json({
      error: "WhatsApp not connected. Scan QR code in billing app.",
      needsReconnect: true,
    });
  }

  const { phone, message, pdfPath, filename } = req.body || {};
  const digits = normalizePhone(phone);
  if (digits.length < 11) {
    return res.status(400).json({ error: "Invalid phone number." });
  }

  const filePath = path.resolve(String(pdfPath || ""));
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(400).json({ error: "Invoice PDF file not found." });
  }

  sendInProgress = true;
  try {
    try {
      await performSend(digits, message, filePath, filename);
      return res.json({ ok: true });
    } catch (err) {
      if (err.code === "NOT_ON_WHATSAPP") {
        return res.status(400).json({ error: err.message });
      }

      if (isSessionError(err)) {
        console.error("[WhatsApp] Send session error:", err.message);
        const reconnected = await softRecoverClient(err.message);
        if (!reconnected) {
          return res.status(503).json({
            error:
              "WhatsApp send layer not ready. Open WhatsApp in the header, scan QR if shown, wait 10 seconds, then try again.",
            needsReconnect: true,
          });
        }
        await performSend(digits, message, filePath, filename);
        return res.json({ ok: true, recovered: true });
      }

      throw err;
    }
  } catch (err) {
    console.error("[WhatsApp] Send failed:", err);
    return res.status(500).json({
      error: err.message || "Failed to send on WhatsApp.",
      needsReconnect: isSessionError(err),
    });
  } finally {
    sendInProgress = false;
  }
});

app.listen(PORT, "127.0.0.1", () => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log(`[WhatsApp] Bridge running on http://127.0.0.1:${PORT}`);
  if (CHROME_PATH) {
    console.log(`[WhatsApp] Using Chromium at ${CHROME_PATH}`);
  }
  initializeClient().catch((err) => {
    state.phase = "error";
    state.lastError = err.message;
    console.error("[WhatsApp] Init failed:", err.message);
  });
});
