"""Bulk WhatsApp offer broadcast to unique billing customers."""

from __future__ import annotations

import os
import secrets
import threading
import time
import uuid
from pathlib import Path
from typing import Any

from database import list_unique_customer_phones
from paths import offers_dir
from whatsapp_send import get_bridge_status, normalize_whatsapp_phone, send_offer_image_whatsapp

BROADCAST_DELAY_SEC = float(os.environ.get("OFFER_BROADCAST_DELAY_SEC", "4"))
_jobs: dict[str, dict[str, Any]] = {}
_jobs_lock = threading.Lock()

ALLOWED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def save_offer_image(file_storage) -> Path:
    offers_dir().mkdir(parents=True, exist_ok=True)
    original = Path(file_storage.filename or "offer.jpg")
    suffix = original.suffix.lower() if original.suffix else ".jpg"
    if suffix not in ALLOWED_IMAGE_SUFFIXES:
        raise ValueError("Upload a JPG, PNG, or WEBP image.")
    filename = f"offer-{uuid.uuid4().hex}{suffix}"
    dest = offers_dir() / filename
    file_storage.save(dest)
    return dest


def _set_job(job_id: str, **fields: Any) -> None:
    with _jobs_lock:
        job = _jobs.setdefault(job_id, {})
        job.update(fields)


def get_broadcast_job(job_id: str) -> dict[str, Any] | None:
    with _jobs_lock:
        job = _jobs.get(job_id)
        return dict(job) if job else None


def start_offer_broadcast(message: str, image_path: Path) -> dict[str, Any]:
    message = (message or "").strip()
    if not message:
        raise ValueError("Message is required.")
    if not image_path.is_file():
        raise ValueError("Offer image not found.")

    customers = list_unique_customer_phones()
    if not customers:
        raise ValueError("No customer phone numbers found in billing history.")

    status = get_bridge_status(auto_start=True)
    if not status.get("ready"):
        raise ValueError(
            "WhatsApp is not connected. Open WhatsApp in the header and wait until Ready."
        )

    job_id = secrets.token_urlsafe(12)
    phones = [normalize_whatsapp_phone(c["phoneKey"]) for c in customers]
    unique_phones = list(dict.fromkeys(phones))

    _set_job(
        job_id,
        id=job_id,
        status="running",
        total=len(unique_phones),
        sent=0,
        failed=0,
        done=0,
        failures=[],
        message=message,
        imagePath=str(image_path),
        startedAt=time.time(),
    )

    thread = threading.Thread(
        target=_run_broadcast,
        args=(job_id, unique_phones, message, image_path),
        daemon=True,
    )
    thread.start()

    return {"jobId": job_id, "total": len(unique_phones), "status": "running"}


def _run_broadcast(job_id: str, phones: list[str], message: str, image_path: Path) -> None:
    failures: list[dict[str, str]] = []
    sent = 0
    for index, phone in enumerate(phones, start=1):
        try:
            result = send_offer_image_whatsapp(phone, message, image_path)
            if result.get("sent"):
                sent += 1
            else:
                failures.append(
                    {
                        "phone": phone,
                        "error": result.get("error") or result.get("reason") or "send_failed",
                    }
                )
        except Exception as exc:
            failures.append({"phone": phone, "error": str(exc)})

        _set_job(
            job_id,
            done=index,
            sent=sent,
            failed=len(failures),
            failures=failures[-20:],
        )
        if index < len(phones):
            time.sleep(BROADCAST_DELAY_SEC)

    _set_job(job_id, status="complete", finishedAt=time.time())
