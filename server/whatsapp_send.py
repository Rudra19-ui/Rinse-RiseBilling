"""Send invoice PDFs via local WhatsApp bridge service."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from invoice_pdf import build_whatsapp_message, generate_invoice_pdf, invoice_filename

BRIDGE_URL = "http://127.0.0.1:3001"
BRIDGE_TIMEOUT = 60


def normalize_whatsapp_phone(phone: str) -> str:
    digits = "".join(c for c in str(phone or "") if c.isdigit())
    if len(digits) == 10:
        return "91" + digits
    if digits.startswith("0") and len(digits) == 11:
        return "91" + digits[1:]
    return digits


def _bridge_request(path: str, method: str = "GET", payload: dict | None = None) -> dict[str, Any]:
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(
        f"{BRIDGE_URL}{path}",
        data=data,
        headers=headers,
        method=method,
    )
    with urllib.request.urlopen(req, timeout=BRIDGE_TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_bridge_status() -> dict[str, Any]:
    try:
        status = _bridge_request("/status")
        return {
            "available": True,
            "ready": bool(status.get("ready")),
            "qr": status.get("qr"),
            "lastError": status.get("lastError"),
            "phase": status.get("phase"),
            "loadingPercent": status.get("loadingPercent"),
        }
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return {"available": False, "ready": False, "qr": None, "lastError": None}


def reset_bridge_session() -> dict[str, Any]:
    try:
        return _bridge_request("/reset", method="POST", payload={})
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        return {"ok": False, "error": str(exc)}


def send_bill_via_whatsapp(bill: dict[str, Any]) -> dict[str, Any]:
    phone = normalize_whatsapp_phone(bill.get("customerPhone", ""))
    if len(phone) < 12:
        raise ValueError("Valid 10-digit customer phone number is required.")

    message = build_whatsapp_message(bill)
    pdf_path = generate_invoice_pdf(bill)
    filename = invoice_filename(bill)

    status = get_bridge_status()
    if not status.get("ready"):
        return {
            "sent": False,
            "reason": "not_connected",
            "bridgeAvailable": status.get("available", False),
            "pdfPath": str(pdf_path),
            "filename": filename,
            "message": message,
        }

    try:
        result = _bridge_request(
            "/send",
            method="POST",
            payload={
                "phone": phone,
                "message": message,
                "pdfPath": str(pdf_path),
                "filename": filename,
            },
        )
        return {
            "sent": bool(result.get("ok")),
            "reason": "sent" if result.get("ok") else "send_failed",
            "filename": filename,
            "message": message,
        }
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        needs_reconnect = False
        try:
            err = json.loads(body)
            error = err.get("error", body)
            needs_reconnect = bool(err.get("needsReconnect"))
        except json.JSONDecodeError:
            error = body or str(exc)
            needs_reconnect = "detached frame" in error.lower()
        return {
            "sent": False,
            "reason": "send_failed",
            "error": error,
            "needsReconnect": needs_reconnect,
            "filename": filename,
            "message": message,
        }


def get_or_create_invoice_pdf(bill: dict[str, Any]) -> Path:
    """Always regenerate so WhatsApp/download PDFs match the latest template."""
    return generate_invoice_pdf(bill)
