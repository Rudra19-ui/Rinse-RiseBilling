"""Generate branded invoice PDFs for Rinse & Rise Laundryrite."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from fpdf import FPDF

IST = ZoneInfo("Asia/Kolkata")

ROOT = Path(__file__).resolve().parent.parent
LOGO_PATH = ROOT / "assets" / "logo.png"
REVIEW_QR_PATH = ROOT / "assets" / "google-review-qr.jpg"
INVOICE_DIR = ROOT / "data" / "invoices"

GOOGLE_REVIEW_URL = (
    "https://google.com/maps/place//data=!4m3!3m2!1s0x3bae6d01fa8c4225:0x865cd70a4ba3ada4"
    "!12e1?source=g.page.m.ia._&laa=nmx-review-solicitation-ia2"
)

ORANGE = (242, 101, 34)
ORANGE_DARK = (217, 84, 15)
BLACK = (26, 26, 26)
GRAY = (100, 100, 100)
LIGHT = (245, 245, 245)
WHITE = (255, 255, 255)

SHOP = {
    "phone": "9591506548",
    "hours": "9 AM - 9 PM",
    "address": (
        "Shop No 1, Site No 211, 15th Cross, 4th Main, "
        "Ananth Nagar Phase 1, Electronic City, Bangalore 560100"
    ),
    "tagline": "Free Pickup & Delivery | Express 24-Hr Delivery",
}


MARGIN = 14
CONTENT_W = 182  # A4 width (210) minus side margins
TABLE_COLS = [
    (" # ", 12),
    ("Item", 52),
    ("Service", 38),
    ("Qty/ kg", 20),
    ("Rate", 28),
    ("Amount", 32),
]
FOOTER_H = 40
QR_SIZE = 24

DELIVERY_TIME_LABELS = {
    "morning": "Morning",
    "afternoon": "Afternoon",
    "evening": "Evening",
}


def _normalize_delivery_date_text(text: str) -> str:
    text = _strip_delivery_time_suffix((text or "").strip())
    if not text:
        return "-"
    for fmt in ("%a, %d %b, %Y", "%d %b, %Y", "%d %b %Y"):
        try:
            return datetime.strptime(text, fmt).strftime("%d %b %Y")
        except ValueError:
            continue
    return text


def format_delivery_schedule(bill: dict[str, Any]) -> str:
    """Delivery date only (no time slot or pickup/delivery modes)."""
    date_val = (bill.get("deliveryDate") or "").strip()
    if date_val:
        try:
            year, month, day = map(int, date_val.split("-"))
            dt = datetime(year, month, day)
            return dt.strftime("%d %b %Y")
        except ValueError:
            return date_val

    display = (bill.get("deliveryDisplay") or "").strip()
    if " · " in display:
        display = display.split(" · ", 1)[1].strip()
    return _normalize_delivery_date_text(display)


def _strip_delivery_time_suffix(text: str) -> str:
    text = (text or "").strip()
    if not text:
        return ""
    for label in DELIVERY_TIME_LABELS.values():
        suffix = f", {label}"
        if text.endswith(suffix):
            return text[: -len(suffix)].strip()
    if "," in text:
        last = text.rsplit(",", 1)[-1].strip().lower()
        if last in DELIVERY_TIME_LABELS or last in {v.lower() for v in DELIVERY_TIME_LABELS.values()}:
            return text.rsplit(",", 1)[0].strip()
    return text


def format_service_name(name: str) -> str:
    cleaned = (name or "").strip()
    if cleaned.lower() == "lundry":
        return "Laundry"
    return cleaned or "-"


def format_qty_display(item: dict[str, Any]) -> str:
    qty = float(item.get("qty") or 0)
    if _is_kg_item(item):
        text = str(int(qty)) if qty == int(qty) else f"{qty:.1f}"
        return f"{text} kg"
    return str(int(qty)) + " pc"


def _is_kg_item(item: dict[str, Any]) -> bool:
    if item.get("unit") == "kg":
        return True
    if item.get("unit") == "pc":
        return False
    name = (item.get("name") or "").lower()
    return "/kg" in name or name in {
        "wash and fold 80/kg",
        "wash and iron 125/kg",
        "premium laundry 200/kg",
    }


def format_currency(amount: float | int) -> str:
    return f"Rs. {float(amount or 0):,.0f}"


def format_qty_rate_line(item: dict[str, Any]) -> str:
    qty = float(item.get("qty") or 0)
    rate = format_currency(item.get("rate", 0))
    if _is_kg_item(item):
        text = str(int(qty)) if qty == int(qty) else f"{qty:.1f}"
        return f"{text} kg × {rate}/kg"
    return f"{int(qty)} pc × {rate}"


def format_bill_date(value: str | None) -> str:
    """Bill created date/time in India (IST), matching the billing screen."""
    if not value:
        dt = datetime.now(IST)
    else:
        try:
            raw = str(value).replace("Z", "+00:00")
            dt = datetime.fromisoformat(raw)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            dt = dt.astimezone(IST)
        except ValueError:
            return str(value)
    return dt.strftime("%d %b %Y, %I:%M %p").replace("AM", "am").replace("PM", "pm")


def build_whatsapp_message(bill: dict[str, Any]) -> str:
    bill = normalize_bill_for_pdf(bill)
    name = (bill.get("customerName") or "Customer").strip()
    delivery = format_delivery_schedule(bill)
    total = format_currency(bill.get("total", 0))
    bill_no = bill.get("billNo", "")
    subtotal = float(bill.get("subtotal") or 0)
    discount = float(bill.get("discountAmount") or 0)
    discount_pct = float(bill.get("discountPercent") or 0)

    lines = [
        f"Hi {name},",
        "",
        "Your invoice from *Rinse & Rise Laundryrite* is attached.",
        "",
        f"Bill No: *#{bill_no}*",
        f"Delivery: {delivery}",
        "",
        "*Items:*",
    ]

    for i, item in enumerate(bill.get("items") or [], 1):
        amount = float(item.get("rate") or 0) * float(item.get("qty") or 0)
        lines.append(f"{i}. {item.get('name', '-')}")
        lines.append(f"   {format_qty_rate_line(item)} = *{format_currency(amount)}*")

    lines.append("")
    if discount > 0:
        lines.append(f"Subtotal: {format_currency(subtotal)}")
        lines.append(f"Discount ({discount_pct:.0f}%): - {format_currency(discount)}")
    lines.append(f"*TOTAL: {total}*")
    lines.extend(
        [
            "",
            "Thank you for choosing us!",
            "Rinse - Rise - Repeat",
            f"Call: {SHOP['phone']} | {SHOP['hours']}",
            "",
            "⭐ *Leave us a Google Review:*",
            GOOGLE_REVIEW_URL,
        ]
    )
    return "\n".join(lines)


def invoice_filename(bill: dict[str, Any]) -> str:
    bill_no = str(bill.get("billNo") or bill.get("id") or "bill")
    safe = "".join(c if c.isalnum() or c in "-_" else "-" for c in bill_no)
    return f"RinseRise-Invoice-{safe}.pdf"


class InvoicePDF(FPDF):
    def footer(self):
        footer_top = self.h - FOOTER_H
        qr_w = QR_SIZE + 8 if REVIEW_QR_PATH.is_file() else 0
        text_w = self.w - (MARGIN * 2) - qr_w

        self.set_draw_color(220, 220, 220)
        self.line(MARGIN, footer_top, self.w - MARGIN, footer_top)

        text_x = MARGIN
        self.set_xy(text_x, footer_top + 5)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*BLACK)
        self.cell(text_w, 5, "Thank you for choosing Rinse & Rise Laundryrite!", align="C", new_x="LMARGIN", new_y="NEXT")

        self.set_x(text_x)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*GRAY)
        self.cell(text_w, 4.5, SHOP["tagline"], align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_x(text_x)
        self.cell(text_w, 4.5, f"Call: {SHOP['phone']}  |  {SHOP['hours']}", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_x(text_x)
        self.multi_cell(text_w, 4, SHOP["address"], align="C")

        if REVIEW_QR_PATH.is_file():
            qr_x = self.w - MARGIN - QR_SIZE
            qr_y = footer_top + (FOOTER_H - QR_SIZE - 7) / 2
            self.image(str(REVIEW_QR_PATH), x=qr_x, y=qr_y, w=QR_SIZE, h=QR_SIZE)
            self.set_xy(qr_x - 2, qr_y + QR_SIZE + 1)
            self.set_font("Helvetica", "B", 7)
            self.set_text_color(*ORANGE)
            self.cell(QR_SIZE + 4, 3, "Rate us on Google", align="C")
            self.set_font("Helvetica", "", 6)
            self.set_text_color(*GRAY)
            self.set_xy(qr_x - 2, qr_y + QR_SIZE + 4)
            self.cell(QR_SIZE + 4, 3, "Scan to review", align="C")


def _draw_info_box(pdf: InvoicePDF, x: float, y: float, w: float, h: float, title: str, lines: list[str]) -> None:
    pdf.set_fill_color(*LIGHT)
    pdf.rect(x, y, w, h, "F")
    pdf.set_draw_color(230, 230, 230)
    pdf.rect(x, y, w, h, "D")

    pdf.set_text_color(*ORANGE)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_xy(x + 4, y + 4)
    pdf.cell(w - 8, 4, title)

    pdf.set_text_color(*BLACK)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_xy(x + 4, y + 11)
    pdf.cell(w - 8, 5, lines[0] if lines else "-")

    if len(lines) > 1:
        pdf.set_font("Helvetica", "", 9)
        pdf.set_xy(x + 4, y + 18)
        pdf.cell(w - 8, 5, lines[1])


def _draw_table_row(
    pdf: InvoicePDF,
    y: float,
    values: list[str],
    widths: list[int],
    *,
    header: bool = False,
    fill: tuple[int, int, int] | None = None,
    bold_last: bool = False,
) -> float:
    x = MARGIN
    row_h = 8 if header else 7
    if header:
        pdf.set_fill_color(*ORANGE)
        pdf.set_text_color(*WHITE)
        pdf.set_font("Helvetica", "B", 9)
    else:
        pdf.set_fill_color(*(fill or WHITE))
        pdf.set_text_color(*BLACK)
        pdf.set_font("Helvetica", "", 9)

    aligns = ("C", "L", "L", "C", "R", "R")
    for i, (val, w, align) in enumerate(zip(values, widths, aligns)):
        pdf.set_xy(x, y)
        if bold_last and i == len(values) - 1:
            pdf.set_font("Helvetica", "B", 9)
        pdf.cell(w, row_h, val, border=1, fill=True, align=align)
        x += w
    return y + row_h


def normalize_bill_for_pdf(bill: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(bill)
    items = []
    for raw in bill.get("items") or []:
        item = dict(raw)
        item["qty"] = float(item.get("qty") or 0)
        if not item.get("unit"):
            item["unit"] = "kg" if _is_kg_item(item) else "pc"
        items.append(item)
    normalized["items"] = items
    return normalized


def generate_invoice_pdf(bill: dict[str, Any], output_path: Path | str | None = None) -> Path:
    bill = normalize_bill_for_pdf(bill)
    INVOICE_DIR.mkdir(parents=True, exist_ok=True)
    bill_id = bill.get("id") or "draft"
    path = Path(output_path) if output_path else INVOICE_DIR / f"bill-{bill_id}.pdf"

    pdf = InvoicePDF("P", "mm", "A4")
    pdf.set_auto_page_break(auto=True, margin=FOOTER_H + 6)
    pdf.set_margins(MARGIN, MARGIN, MARGIN)
    pdf.add_page()

    page_w = pdf.w
    col_widths = [w for _, w in TABLE_COLS]
    amount_col_w = col_widths[-1]
    rate_col_w = col_widths[-2]
    totals_w = amount_col_w + rate_col_w
    totals_x = MARGIN + CONTENT_W - totals_w

    # Header band
    pdf.set_fill_color(*ORANGE)
    pdf.rect(0, 0, page_w, 42, "F")
    pdf.set_fill_color(*ORANGE_DARK)
    pdf.rect(0, 40, page_w, 2, "F")

    if LOGO_PATH.is_file():
        pdf.image(str(LOGO_PATH), x=MARGIN, y=7, w=26, h=26)

    pdf.set_text_color(*WHITE)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_xy(44, 10)
    pdf.cell(0, 8, "RINSE & RISE")
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_xy(44, 19)
    pdf.cell(0, 6, "LAUNDRYRITE")
    pdf.set_font("Helvetica", "", 8)
    pdf.set_xy(44, 26)
    pdf.cell(0, 5, "Rinse · Rise · Repeat")

    pdf.set_font("Helvetica", "B", 26)
    pdf.set_xy(0, 12)
    pdf.cell(page_w - MARGIN, 10, "INVOICE", align="R")
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_xy(0, 22)
    pdf.cell(page_w - MARGIN, 6, f"#{bill.get('billNo', '-')}", align="R")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_xy(0, 29)
    pdf.cell(page_w - MARGIN, 5, format_bill_date(bill.get("createdAt")), align="R")

    y = 50
    gap = 6
    box_w = (CONTENT_W - gap) / 2
    box_h = 26
    delivery = format_delivery_schedule(bill)

    _draw_info_box(
        pdf,
        MARGIN,
        y,
        box_w,
        box_h,
        "BILL TO",
        [bill.get("customerName") or "Customer", bill.get("customerPhone") or "-"],
    )
    _draw_info_box(pdf, MARGIN + box_w + gap, y, box_w, box_h, "DELIVERY", [delivery])

    y += box_h + 8

    # Items table
    header_vals = [label for label, _ in TABLE_COLS]
    y = _draw_table_row(pdf, y, header_vals, col_widths, header=True)

    items = bill.get("items") or []
    for i, item in enumerate(items):
        rate = float(item.get("rate") or 0)
        qty = float(item.get("qty") or 0)
        amount = rate * qty
        fill = LIGHT if i % 2 == 0 else WHITE
        row = [
            str(i + 1),
            str(item.get("name") or "-")[:44],
            format_service_name(str(item.get("service") or "-"))[:30],
            format_qty_display(item),
            format_currency(rate) + ("/kg" if _is_kg_item(item) else ""),
            format_currency(amount),
        ]
        y = _draw_table_row(pdf, y, row, col_widths, fill=fill, bold_last=True)

    y += 4
    subtotal = float(bill.get("subtotal") or 0)
    discount = float(bill.get("discountAmount") or 0)
    discount_pct = float(bill.get("discountPercent") or 0)
    total = float(bill.get("total") or 0)

    if discount > 0:
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(*GRAY)
        pdf.set_xy(totals_x, y)
        pdf.cell(rate_col_w, 6, "Subtotal:", align="R")
        pdf.set_xy(totals_x + rate_col_w, y)
        pdf.cell(amount_col_w, 6, format_currency(subtotal), align="R")
        y += 6
        pdf.set_text_color(*ORANGE)
        pdf.set_xy(totals_x, y)
        pdf.cell(rate_col_w, 6, f"Discount ({discount_pct:.0f}%):", align="R")
        pdf.set_xy(totals_x + rate_col_w, y)
        pdf.cell(amount_col_w, 6, f"- {format_currency(discount)}", align="R")
        y += 6

    pdf.set_fill_color(*ORANGE)
    pdf.rect(totals_x, y, totals_w, 10, "F")
    pdf.set_text_color(*WHITE)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_xy(totals_x + 4, y + 2.5)
    pdf.cell(rate_col_w - 4, 6, "TOTAL")
    pdf.set_xy(totals_x + rate_col_w, y + 2.5)
    pdf.cell(amount_col_w, 6, format_currency(total), align="R")

    pdf.output(str(path))
    return path
