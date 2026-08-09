# Railway — keep data & WhatsApp connected after every deploy

Every **git push / redeploy** replaces the container. Without persistent storage, bills, customer history, and WhatsApp sessions are **lost**.

## One-time setup (required)

### 1 — Persistent volume (bills + WhatsApp session)

1. Railway → **Rinse-RiseBilling** → **Volumes** → **Add Volume**
2. **Mount path:** `/app/data`
3. **Size:** 1 GB (enough for database + WhatsApp auth)
4. Save and **Redeploy**

This keeps:
- `rinse_rise.db` — all bills & customer history (SQLite fallback)
- `whatsapp-auth/` — WhatsApp login (scan QR **once**)
- `invoices/` — generated PDFs

### 2 — PostgreSQL (recommended for production)

1. Add **PostgreSQL** service in the same Railway project
2. **Rinse-RiseBilling** → **Variables** → delete any old manual `DATABASE_URL`
3. **+ New Variable** → **Variable Reference**
   - Service: **PostgreSQL**
   - Variable: **`DATABASE_PRIVATE_URL`**
   - Name: **`DATABASE_URL`**
4. Add second reference: **PostgreSQL** → **`DATABASE_PUBLIC_URL`**
5. **Redeploy**

With Postgres linked, all bills persist in the cloud database (even without the volume). The volume still helps for WhatsApp session files.

### 3 — Memory for WhatsApp

- Service **RAM:** at least **1 GB**
- Variable `WHATSAPP_ENABLED=1` (default in Docker image)

## Verify after deploy

Open: `https://YOUR-APP.up.railway.app/api/health`

Look for:

```json
{
  "dbOk": true,
  "backend": "postgresql",
  "whatsappAvailable": true,
  "whatsappReady": true,
  "persistence": {
    "dataDir": "/app/data",
    "sqliteDbExists": true,
    "whatsappSessionSaved": true,
    "volumeMountPath": "/app/data"
  }
}
```

## Common mistakes

| Mistake | Result |
|--------|--------|
| No volume at `/app/data` | Bills & WhatsApp reset on every push |
| Pasted old `DATABASE_URL` | Database errors, data not saved |
| Postgres not linked | SQLite used but lost without volume |
| `< 512 MB RAM` | WhatsApp disconnects / crashes |
| Scanning QR after every deploy | No volume for `whatsapp-auth` |

## WhatsApp stays connected

- Scan QR **once** after volume is mounted
- Do **not** click Reset Connection unless needed
- One bridge runs in the container (no duplicate sessions)
- Session files live in `/app/data/whatsapp-auth`

## Local development

Run **Start Billing.bat** — data stays in `data/rinse_rise.db` on your PC (not affected by Railway deploys).
