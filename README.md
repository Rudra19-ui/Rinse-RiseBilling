# Rinse & Rise — Laundry Billing

POS billing app for **Rinse & Rise Laundryrite** with SQLite storage, PDF invoices, WhatsApp send, bill history, expenditure tracking, and Excel export.

## Quick start (Windows)

1. Install [Python 3](https://www.python.org/downloads/) and [Node.js](https://nodejs.org/)
2. Double-click **`Start Billing.bat`**
3. Open [http://localhost:8080](http://localhost:8080)

## Features

- Customer billing with rate card search
- Bill history (Today / Week / Month / Year) with Excel download
- Order status: Pending → Order Ready → Delivery Done
- Regular customer ★ favorites by phone number
- Password-protected expenditure page
- Invoice PDF generation
- WhatsApp PDF send (scan QR once via header pill)

## Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Flask + SQLite
- WhatsApp: Node.js `whatsapp-web.js` bridge (port 3001)

## Project structure

```
laundry-billing/
├── index.html          # Main UI
├── js/                 # Client logic
├── css/                # Styles
├── server/             # Flask API
├── data/               # schema.sql, rates.json (DB created on first run)
├── whatsapp-bridge/    # WhatsApp service
└── Start Billing.bat   # One-click launcher
```

## Notes

- Database file `data/rinse_rise.db` is created locally and is not committed to git.
- After cloning, run `Start Billing.bat` once to install Python/Node dependencies.
