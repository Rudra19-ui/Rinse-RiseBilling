"""Persistent data paths — use DATA_DIR on Railway (mount a volume at /app/data)."""

from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def data_dir() -> Path:
    custom = os.environ.get("DATA_DIR", "").strip()
    if custom:
        return Path(custom)
    return ROOT / "data"


def sqlite_db_path() -> Path:
    return data_dir() / "rinse_rise.db"


def invoice_dir() -> Path:
    return data_dir() / "invoices"


def whatsapp_auth_dir() -> Path:
    custom = os.environ.get("WHATSAPP_AUTH_DIR", "").strip()
    if custom:
        return Path(custom)
    return data_dir() / "whatsapp-auth"


def whatsapp_cache_dir() -> Path:
    custom = os.environ.get("WHATSAPP_CACHE_DIR", "").strip()
    if custom:
        return Path(custom)
    return data_dir() / "whatsapp-cache"


def ensure_data_dirs() -> None:
    for path in (data_dir(), invoice_dir(), whatsapp_auth_dir(), whatsapp_cache_dir()):
        path.mkdir(parents=True, exist_ok=True)


def persistence_status() -> dict[str, object]:
    base = data_dir()
    marker = base / ".persistent_volume"
    db_exists = sqlite_db_path().is_file()
    wa_auth_exists = any(whatsapp_auth_dir().glob("**/*")) if whatsapp_auth_dir().is_dir() else False
    return {
        "dataDir": str(base),
        "sqliteDbExists": db_exists,
        "whatsappSessionSaved": wa_auth_exists,
        "volumeRecommended": bool(os.environ.get("RAILWAY_ENVIRONMENT")),
        "volumeMountPath": "/app/data",
        "hint": (
            "Mount a Railway Volume at /app/data so bills, customer history, and WhatsApp stay connected after redeploy."
            if os.environ.get("RAILWAY_ENVIRONMENT")
            else None
        ),
    }
