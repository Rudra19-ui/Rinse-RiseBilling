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
