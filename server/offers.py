"""Seasonal offers — persisted in DATA_DIR/offers.json (survives Railway redeploys with volume)."""

from __future__ import annotations

import json
import re
from pathlib import Path
from uuid import uuid4

from paths import ROOT, data_dir

DEFAULT_OFFERS_PATH = ROOT / "data" / "offers.json"
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def offers_file_path() -> Path:
    return data_dir() / "offers.json"


def _ensure_offers_file() -> Path:
    path = offers_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.is_file() and DEFAULT_OFFERS_PATH.is_file():
        path.write_text(DEFAULT_OFFERS_PATH.read_text(encoding="utf-8"), encoding="utf-8")
    return path


def _normalize_offer(raw: dict) -> dict:
    purpose = str(raw.get("purpose") or "").strip()
    if not purpose:
        raise ValueError("Offer name is required.")
    if len(purpose) > 120:
        raise ValueError("Offer name is too long (max 120 characters).")

    event_date = str(raw.get("eventDate") or "").strip()
    offer_start = str(raw.get("offerStart") or "").strip()
    offer_end = str(raw.get("offerEnd") or "").strip()
    details = str(raw.get("details") or "").strip()

    for label, value in (
        ("Event date", event_date),
        ("Offer start", offer_start),
        ("Offer end", offer_end),
    ):
        if not value or not DATE_RE.match(value):
            raise ValueError(f"{label} must be YYYY-MM-DD.")

    if len(details) > 500:
        raise ValueError("Offer details are too long (max 500 characters).")

    offer_id = str(raw.get("id") or "").strip() or str(uuid4())
    return {
        "id": offer_id,
        "purpose": purpose,
        "eventDate": event_date,
        "offerStart": offer_start,
        "offerEnd": offer_end,
        "details": details,
    }


def _sort_offers(offers: list[dict]) -> list[dict]:
    def sort_key(offer: dict) -> tuple[str, str]:
        return (offer.get("eventDate") or "", offer.get("purpose") or "")

    return sorted(offers, key=sort_key)


def get_offers() -> list[dict]:
    path = _ensure_offers_file()
    if not path.is_file():
        return []

    data = json.loads(path.read_text(encoding="utf-8"))
    raw_offers = data.get("offers") if isinstance(data, dict) else []
    if not isinstance(raw_offers, list):
        raw_offers = []

    offers: list[dict] = []
    changed = False
    for raw in raw_offers:
        if not isinstance(raw, dict):
            continue
        try:
            normalized = _normalize_offer(raw)
        except ValueError:
            continue
        if not str(raw.get("id") or "").strip():
            changed = True
        offers.append(normalized)

    offers = _sort_offers(offers)
    if changed:
        _write_offers(offers)
    return offers


def _write_offers(offers: list[dict]) -> None:
    path = _ensure_offers_file()
    payload = {"offers": _sort_offers(offers)}
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def save_offers(raw_offers: list) -> list[dict]:
    if not isinstance(raw_offers, list):
        raise ValueError("Offers must be a list.")

    offers: list[dict] = []
    seen_ids: set[str] = set()
    for raw in raw_offers:
        if not isinstance(raw, dict):
            raise ValueError("Each offer must be an object.")
        offer = _normalize_offer(raw)
        if offer["id"] in seen_ids:
            raise ValueError("Duplicate offer id.")
        seen_ids.add(offer["id"])
        offers.append(offer)

    offers = _sort_offers(offers)
    _write_offers(offers)
    return offers
