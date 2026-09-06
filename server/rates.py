"""Service rate card — persisted in DATA_DIR/rates.json (survives Railway redeploys with volume)."""

from __future__ import annotations

import json
from pathlib import Path

from paths import ROOT, data_dir

DEFAULT_RATES_PATH = ROOT / "data" / "rates.json"


def rates_file_path() -> Path:
    return data_dir() / "rates.json"


def _ensure_rates_file() -> Path:
    path = rates_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.is_file() and DEFAULT_RATES_PATH.is_file():
        path.write_text(DEFAULT_RATES_PATH.read_text(encoding="utf-8"), encoding="utf-8")
    return path


def _normalize_rates(data: dict) -> dict:
    if not isinstance(data, dict):
        raise ValueError("Rates must be an object.")

    business_name = str(data.get("businessName") or "Rinse & Rise Laundryrite").strip()
    raw_services = data.get("services")
    if not isinstance(raw_services, list) or not raw_services:
        raise ValueError("At least one service is required.")

    services: list[dict] = []
    seen_ids: set[str] = set()

    for raw_service in raw_services:
        if not isinstance(raw_service, dict):
            raise ValueError("Each service must be an object.")
        service_id = str(raw_service.get("id") or "").strip()
        service_name = str(raw_service.get("name") or "").strip()
        if not service_id or not service_name:
            raise ValueError("Each service needs an id and name.")
        if service_id in seen_ids:
            raise ValueError(f"Duplicate service id: {service_id}")
        seen_ids.add(service_id)

        raw_categories = raw_service.get("categories")
        if not isinstance(raw_categories, list) or not raw_categories:
            raise ValueError(f"Service '{service_name}' must have categories.")

        categories: list[dict] = []
        for raw_category in raw_categories:
            if not isinstance(raw_category, dict):
                raise ValueError("Each category must be an object.")
            category_name = str(raw_category.get("name") or "").strip()
            if not category_name:
                raise ValueError("Each category needs a name.")

            raw_items = raw_category.get("items")
            if not isinstance(raw_items, list) or not raw_items:
                raise ValueError(f"Category '{category_name}' must have items.")

            items: list[dict] = []
            for raw_item in raw_items:
                if not isinstance(raw_item, dict):
                    raise ValueError("Each item must be an object.")
                item_name = str(raw_item.get("name") or "").strip()
                if not item_name:
                    raise ValueError("Each item needs a name.")
                try:
                    rate = float(raw_item.get("rate", 0))
                except (TypeError, ValueError) as exc:
                    raise ValueError(f"Invalid rate for '{item_name}'.") from exc
                if rate < 0:
                    raise ValueError(f"Rate for '{item_name}' cannot be negative.")
                item_obj: dict = {"name": item_name, "rate": round(rate, 2)}
                unit = str(raw_item.get("unit") or "").strip().lower()
                if unit in ("kg", "pc"):
                    item_obj["unit"] = unit
                items.append(item_obj)

            categories.append({"name": category_name, "items": items})

        services.append(
            {
                "id": service_id,
                "name": service_name,
                "categories": categories,
            }
        )

    return {"businessName": business_name, "services": services}


def get_rates() -> dict:
    path = _ensure_rates_file()
    if not path.is_file():
        raise FileNotFoundError("Rate card file not found.")
    data = json.loads(path.read_text(encoding="utf-8"))
    return _normalize_rates(data)


def save_rates(data: dict) -> dict:
    normalized = _normalize_rates(data)
    path = _ensure_rates_file()
    path.write_text(
        json.dumps(normalized, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return normalized
