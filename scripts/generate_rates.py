import pandas as pd
import json
import re
from pathlib import Path

xlsx = Path(__file__).parent.parent.parent / "Rinse&Rise Laundryrite Rate Card.xlsx"
output = Path(__file__).parent.parent / "data" / "rates.json"
sheets = pd.read_excel(xlsx, sheet_name=None, header=None)


def parse_rate(val):
    try:
        return float(re.sub(r"[^0-9.]", "", str(val).split("/")[0]))
    except (ValueError, TypeError):
        return None


def find_header_row(df):
    for idx in range(min(5, len(df))):
        row = df.iloc[idx]
        for val in row:
            if pd.notna(val) and str(val).strip().upper() == "MEN":
                return idx
    return 0


def parse_multi_category(df):
    categories = []
    header_idx = find_header_row(df)
    header_row = df.iloc[header_idx]
    cat_cols = []
    for i, val in enumerate(header_row):
        if pd.notna(val) and str(val).strip().upper() not in ("RATE", "RATE /PICE"):
            next_val = header_row[i + 1] if i + 1 < len(header_row) else None
            if next_val is not None and "RATE" in str(next_val).upper():
                cat_cols.append((i, str(val).strip()))

    for col_idx, cat_name in cat_cols:
        rate_col = col_idx + 1
        items = []
        for row_idx in range(header_idx + 1, len(df)):
            item_name = df.iloc[row_idx, col_idx]
            rate = df.iloc[row_idx, rate_col]
            if pd.notna(item_name) and pd.notna(rate):
                rate_val = parse_rate(rate)
                if rate_val is not None:
                    items.append({"name": str(item_name).strip(), "rate": rate_val})
        if items:
            categories.append({"name": cat_name, "items": items})
    return categories


def parse_simple(df):
    items = []
    start = 1
    for idx in range(min(5, len(df))):
        val = df.iloc[idx, 0]
        if pd.notna(val) and "RATE" in str(df.iloc[idx, 1]).upper():
            start = idx + 1
            break
    for row_idx in range(start, len(df)):
        name = df.iloc[row_idx, 0]
        rate = df.iloc[row_idx, 1]
        if pd.notna(name) and pd.notna(rate):
            rate_val = parse_rate(rate)
            if rate_val is not None:
                items.append({"name": str(name).strip(), "rate": rate_val})
    return items


services = []

df = sheets["Steam Iron "]
services.append({"id": "steam-iron", "name": "Steam Iron", "categories": parse_multi_category(df)})

df = sheets["Dry Clean "]
services.append({"id": "dry-clean", "name": "Dry Clean", "categories": parse_multi_category(df)})

df = sheets["Laundry"]
services.append(
    {
        "id": "laundry",
        "name": "Lundry",
        "categories": [{"name": "Laundry Service", "items": parse_simple(df)}],
    }
)

df = sheets["Shoe Cleaning"]
services.append(
    {
        "id": "shoe-cleaning",
        "name": "Shoe Cleaning",
        "categories": [{"name": "Shoes", "items": parse_simple(df)}],
    }
)

output.parent.mkdir(parents=True, exist_ok=True)
data = {"businessName": "Rinse & Rise Laundryrite", "services": services}
with open(output, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Generated:", output)
for s in services:
    total = sum(len(c["items"]) for c in s["categories"])
    print(f"  {s['name']}: {total} items")
