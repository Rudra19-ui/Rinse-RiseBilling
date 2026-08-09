"""Send invoice PDFs via local WhatsApp bridge service."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from invoice_pdf import build_whatsapp_message, generate_invoice_pdf, invoice_filename

ROOT = Path(__file__).resolve().parent.parent
BRIDGE_DIR = ROOT / "whatsapp-bridge"
BRIDGE_URL = os.environ.get("WHATSAPP_BRIDGE_URL", "http://127.0.0.1:3001").rstrip("/")
BRIDGE_TIMEOUT = 60
BRIDGE_STATUS_TIMEOUT = 8


def is_cloud_deployment() -> bool:
    return bool(os.environ.get("RAILWAY_ENVIRONMENT"))


def whatsapp_enabled() -> bool:
    return os.environ.get("WHATSAPP_ENABLED", "1") not in ("0", "false", "False", "no")


def bridge_is_running() -> bool:
    try:
        req = urllib.request.Request(f"{BRIDGE_URL}/health", method="GET")
        with urllib.request.urlopen(req, timeout=2) as resp:
            return resp.status == 200
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def try_start_bridge(*, wait_seconds: float = 0) -> bool:
    """Start the Node WhatsApp bridge if installed and not already running."""
    if not whatsapp_enabled():
        return False
    if bridge_is_running():
        return True

    if is_cloud_deployment():
        if wait_seconds > 0:
            deadline = time.monotonic() + wait_seconds
            while time.monotonic() < deadline:
                if bridge_is_running():
                    return True
                time.sleep(1)
        return bridge_is_running()

    node_exe = shutil.which("node")
    server_js = BRIDGE_DIR / "server.js"
    node_modules = BRIDGE_DIR / "node_modules"
    if not node_exe or not server_js.is_file() or not node_modules.is_dir():
        return False

    try:
        log_path = BRIDGE_DIR / "bridge.log"
        log_file = open(log_path, "a", encoding="utf-8")
        env = os.environ.copy()
        env.setdefault("WHATSAPP_BRIDGE_PORT", "3001")
        env.setdefault("PUPPETEER_EXECUTABLE_PATH", "/usr/bin/chromium")
        subprocess.Popen(
            [node_exe, "server.js"],
            cwd=str(BRIDGE_DIR),
            stdout=log_file,
            stderr=subprocess.STDOUT,
            env=env,
            start_new_session=True,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except OSError:
        return False

    if wait_seconds <= 0:
        return True

    deadline = time.monotonic() + wait_seconds
    while time.monotonic() < deadline:
        if bridge_is_running():
            return True
        time.sleep(1)
    return bridge_is_running()


def normalize_whatsapp_phone(phone: str) -> str:
    digits = "".join(c for c in str(phone or "") if c.isdigit())
    if len(digits) == 10:
        return "91" + digits
    if digits.startswith("0") and len(digits) == 11:
        return "91" + digits[1:]
    return digits


def _bridge_request(
    path: str,
    method: str = "GET",
    payload: dict | None = None,
    *,
    timeout: int | None = None,
) -> dict[str, Any]:
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
    with urllib.request.urlopen(req, timeout=timeout or BRIDGE_TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_bridge_status(*, auto_start: bool = False) -> dict[str, Any]:
    hosted = is_cloud_deployment()
    if not whatsapp_enabled():
        return {
            "available": False,
            "ready": False,
            "qr": None,
            "lastError": "WhatsApp is disabled on this server.",
            "hosted": hosted,
            "enabled": False,
        }

    if auto_start and not bridge_is_running():
        wait = 15 if hosted else 10
        try_start_bridge(wait_seconds=wait)

    try:
        status = _bridge_request("/status", timeout=BRIDGE_STATUS_TIMEOUT)
        return {
            "available": True,
            "ready": bool(status.get("ready")),
            "qr": status.get("qr"),
            "lastError": status.get("lastError"),
            "phase": status.get("phase"),
            "loadingPercent": status.get("loadingPercent"),
            "waState": status.get("waState"),
            "authenticatingSeconds": status.get("authenticatingSeconds"),
            "hosted": hosted,
            "enabled": True,
        }
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return {
            "available": False,
            "ready": False,
            "qr": None,
            "lastError": (
                "Scanner is still starting on the server. Wait 1–2 minutes and click Retry."
                if hosted
                else None
            ),
            "phase": "starting",
            "hosted": hosted,
            "enabled": True,
        }


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
