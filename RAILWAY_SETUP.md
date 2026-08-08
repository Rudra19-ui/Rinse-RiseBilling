# Railway — connect PostgreSQL to Rinse-RiseBilling

Your logs show **sqlite database ready** because the **web service has no Postgres connection string**. The Postgres database exists, but it is not linked to the app.

## Fix (5 minutes)

### Option A — Variable reference (recommended)

1. Railway project → click **Rinse-RiseBilling** (web app, not Postgres)
2. Tab **Variables**
3. Click **+ New Variable** → **Add Variable Reference**
4. **Service:** select your **PostgreSQL** service
5. **Variable:** choose **`DATABASE_PRIVATE_URL`** (best inside Railway) or **`DATABASE_URL`**
6. **Name on this service:** `DATABASE_URL`
7. Click **Add** → **Deploy** / **Redeploy** the web service

### Option B — Paste URL manually

1. Click **PostgreSQL** service → **Variables**
2. Copy **`DATABASE_PRIVATE_URL`** (starts with `postgresql://postgres:...@postgres.railway.internal:5432/...`)
3. Click **Rinse-RiseBilling** → **Variables** → **+ New Variable**
4. Name: `DATABASE_URL`
5. Value: paste the copied URL
6. **Redeploy** Rinse-RiseBilling

## Verify

After redeploy, **Deploy Logs** should show:

```text
Rinse & Rise Billing — postgresql database ready
PostgreSQL connected via DATABASE_URL
```

Open in browser:

```text
https://YOUR-RAILWAY-DOMAIN/api/health
```

Expected:

```json
{
  "ok": true,
  "backend": "postgresql",
  "postgresConfigured": true,
  "postgresEnvVar": "DATABASE_URL"
}
```

## Common mistakes

| Mistake | Result |
|--------|--------|
| Postgres added but **not linked** to web service | SQLite warning |
| Variable only on **Postgres** service, not on **Rinse-RiseBilling** | SQLite warning |
| Using `postgres.railway.internal` URL **on your PC** | Won't connect locally (internal host) |
| Forgot to **Redeploy** after adding variable | Old container still without Postgres |

## Still stuck?

On **Rinse-RiseBilling** → **Variables**, you should see a row:

```text
DATABASE_URL = postgresql://postgres:****@postgres.railway.internal:5432/railway
```

If that row is missing, the app cannot use PostgreSQL.

## WhatsApp QR scanner on hosted Railway

The Docker image now runs **both** the billing app and the WhatsApp scanner in the same container.

### One-time setup

1. **Generate a public domain** (Settings → Networking → Generate Domain) if you have not already.
2. **Increase memory** (recommended **≥ 1 GB RAM**) — Chrome needs memory for WhatsApp Web.
3. **Add a volume** so you only scan the QR once (optional but strongly recommended):
   - Rinse-RiseBilling → **Volumes** → **Add Volume**
   - Mount path: `/app/whatsapp-bridge/.wwebjs_auth`
   - Size: 1 GB is enough
4. **Redeploy** the service after adding the volume.

### Connect WhatsApp on the hosted site

1. Open your public URL (e.g. `https://your-app.up.railway.app`)
2. Click the **WhatsApp** button in the header
3. Wait 1–3 minutes on first deploy while the scanner starts
4. Scan the QR code with your phone (WhatsApp → Linked Devices → Link a Device)
5. After connected, invoice PDFs send automatically when you click **Send on WhatsApp**

### Verify in logs

After deploy, **Deploy Logs** should include:

```text
Starting WhatsApp bridge...
WhatsApp bridge is ready
Starting Gunicorn on port 8080
```

Check health:

```text
https://YOUR-RAILWAY-DOMAIN/api/health
```

Look for `"whatsappEnabled": true` and `"whatsappAvailable": true`.

### If QR never appears

- Wait 2–3 minutes and click **Retry Scanner**
- Check **Deploy Logs** for `[WhatsApp] Init failed` or Chrome errors
- Upgrade plan/memory if the container runs out of RAM
- Click **Reset Connection** in the modal and scan again

### Disable WhatsApp on server (optional)

Set variable `WHATSAPP_ENABLED=0` on the Railway service and redeploy.
