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
BORDER = (220, 220, 220)

MARGIN = 14
CONTENT_W = 182
HEADER_H = 44
FOOTER_H = 46
QR_SIZE = 22
LOGO_SIZE = 22

TABLE_COLS = [
    ("#", 10),
    ("Item", 58),
    ("Service", 36),
    ("Qty", 22),
    ("Rate", 26),
    ("Amount", 30),
]

PAYMENT_TYPE_LABELS = {"cash": "Cash", "upi": "UPI Online"}
PAYMENT_INFO_LABELS = {"pre-payment": "Pre Payment", "post-payment": "Post Payment"}

SHOP = {
    "phone": "9591506548",
    "hours": "9 AM - 9 PM",
    "address_lines": (
        "Shop No 1, Site No 211, 15th Cross, 4th Main,",
        "Ananth Nagar Phase 1, Electronic City, Bangalore 560100",
    ),
    "tagline": "Free Pickup & Delivery  |  Express 24-Hr Delivery",
}

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
    if cleaned.lower() in ("lundry", "laundry"):
        return "Laundry"
    return cleaned or "-"


def format_payment_summary(bill: dict[str, Any]) -> str:
    parts: list[str] = []
    pt = PAYMENT_TYPE_LABELS.get((bill.get("paymentType") or "").strip(), "")
    pi = PAYMENT_INFO_LABELS.get((bill.get("paymentInfo") or "").strip(), "")
    if pt:
        parts.append(pt)
    if pi:
        parts.append(pi)
    return " · ".join(parts) if parts else "-"


def format_qty_display(item: dict[str, Any]) -> str:
    qty = float(item.get("qty") or 0)
    if _is_kg_item(item):
        text = str(int(qty)) if qty == int(qty) else f"{qty:.1f}"
        return f"{text} kg"
    return f"{int(qty)} pc"


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
            "*Leave us a Google Review:*",
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
        qr_block_w = QR_SIZE + 10 if REVIEW_QR_PATH.is_file() else 0
        text_w = self.w - (MARGIN * 2) - qr_block_w
        text_center_x = MARGIN + text_w / 2

        self.set_draw_color(*BORDER)
        self.set_line_width(0.2)
        self.line(MARGIN, footer_top, self.w - MARGIN, footer_top)

        line_y = footer_top + 6
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*BLACK)
        self.set_xy(MARGIN, line_y)
        self.cell(text_w, 5, "Thank you for choosing Rinse & Rise Laundryrite!", align="C")

        line_y += 6
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*GRAY)
        self.set_xy(MARGIN, line_y)
        self.cell(text_w, 4, SHOP["tagline"], align="C")

        line_y += 5
        self.set_xy(MARGIN, line_y)
        self.cell(text_w, 4, f"Call: {SHOP['phone']}  |  {SHOP['hours']}", align="C")

        line_y += 5
        for addr_line in SHOP["address_lines"]:
            self.set_xy(MARGIN, line_y)
            self.cell(text_w, 4, addr_line, align="C")
            line_y += 4

        if REVIEW_QR_PATH.is_file():
            qr_x = self.w - MARGIN - QR_SIZE
            qr_y = footer_top + (FOOTER_H - QR_SIZE - 8) / 2
            self.image(str(REVIEW_QR_PATH), x=qr_x, y=qr_y, w=QR_SIZE, h=QR_SIZE)
            self.set_font("Helvetica", "B", 7)
            self.set_text_color(*ORANGE)
            self.set_xy(qr_x - 4, qr_y + QR_SIZE + 1)
            self.cell(QR_SIZE + 8, 3, "Rate us on Google", align="C")
            self.set_font("Helvetica", "", 6)
            self.set_text_color(*GRAY)
            self.set_xy(qr_x - 4, qr_y + QR_SIZE + 4.5)
            self.cell(QR_SIZE + 8, 3, "Scan to review", align="C")


def _draw_header(pdf: InvoicePDF, bill: dict[str, Any]) -> None:
    page_w = pdf.w
    pdf.set_fill_color(*ORANGE)
    pdf.rect(0, 0, page_w, HEADER_H, "F")
    pdf.set_fill_color(*ORANGE_DARK)
    pdf.rect(0, HEADER_H - 2, page_w, 2, "F")

    logo_y = (HEADER_H - LOGO_SIZE) / 2
    if LOGO_PATH.is_file():
        pdf.image(str(LOGO_PATH), x=MARGIN, y=logo_y, w=LOGO_SIZE, h=LOGO_SIZE)

    text_x = MARGIN + LOGO_SIZE + 6
    brand_lines = [
        ("Helvetica", "B", 19, "RINSE & RISE", 8),
        ("Helvetica", "B", 10, "LAUNDRYRITE", 6),
        ("Helvetica", "", 8, "Rinse · Rise · Repeat", 5),
    ]
    block_h = sum(h for *_, h in brand_lines)
    brand_y = (HEADER_H - block_h) / 2
    pdf.set_text_color(*WHITE)
    for font, style, size, text, lh in brand_lines:
        pdf.set_font(font, style, size)
        pdf.set_xy(text_x, brand_y)
        pdf.cell(90, lh, text)
        brand_y += lh

    invoice_lines = [
        ("Helvetica", "B", 24, "INVOICE", 9),
        ("Helvetica", "B", 11, f"#{bill.get('billNo', '-')}", 6),
        ("Helvetica", "", 9, format_bill_date(bill.get("createdAt")), 5),
    ]
    block_h = sum(h for *_, h in invoice_lines)
    inv_y = (HEADER_H - block_h) / 2
    for font, style, size, text, lh in invoice_lines:
        pdf.set_font(font, style, size)
        pdf.set_xy(MARGIN, inv_y)
        pdf.cell(page_w - MARGIN * 2, lh, text, align="R")
        inv_y += lh


def _draw_info_box(
    pdf: InvoicePDF,
    x: float,
    y: float,
    w: float,
    h: float,
    title: str,
    primary: str,
    secondary: str = "",
) -> None:
    pdf.set_fill_color(*LIGHT)
    pdf.set_draw_color(*BORDER)
    pdf.rect(x, y, w, h, "FD")

    pdf.set_text_color(*ORANGE)
    pdf.set_font("Helvetica", "B", 7.5)
    pdf.set_xy(x + 5, y + 5)
    pdf.cell(w - 10, 4, title.upper())

    pdf.set_text_color(*BLACK)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_xy(x + 5, y + 12)
    pdf.cell(w - 10, 5, primary or "-")

    if secondary:
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*GRAY)
        pdf.set_xy(x + 5, y + 19)
        pdf.cell(w - 10, 5, secondary)


def _table_right_edge() -> float:
    return MARGIN + CONTENT_W


def _col_x(col_index: int) -> float:
    x = MARGIN
    for i in range(col_index):
        x += TABLE_COLS[i][1]
    return x


def _draw_table_row(
    pdf: InvoicePDF,
    y: float,
    values: list[str],
    *,
    header: bool = False,
    fill: tuple[int, int, int] | None = None,
    bold_last: bool = False,
) -> float:
    row_h = 9 if header else 8
    aligns = ("C", "L", "L", "C", "R", "R")

    if header:
        pdf.set_fill_color(*ORANGE)
        pdf.set_text_color(*WHITE)
        pdf.set_font("Helvetica", "B", 8.5)
    else:
        pdf.set_fill_color(*(fill or WHITE))
        pdf.set_text_color(*BLACK)
        pdf.set_font("Helvetica", "", 9)

    for i, ((_, width), val, align) in enumerate(zip(TABLE_COLS, values, aligns)):
        x = _col_x(i)
        pdf.set_draw_color(*BORDER)
        pdf.set_xy(x, y)
        if bold_last and i == len(values) - 1:
            pdf.set_font("Helvetica", "B", 9)
        pdf.cell(width, row_h, val, border=1, fill=True, align=align)

    return y + row_h


def _draw_totals_block(
    pdf: InvoicePDF,
    y: float,
    *,
    subtotal: float,
    discount: float,
    discount_pct: float,
    total: float,
) -> float:
    amount_w = TABLE_COLS[-1][1]
    label_w = TABLE_COLS[-2][1]
    block_w = label_w + amount_w
    block_x = _table_right_edge() - block_w
    amount_x = block_x + label_w
    line_h = 7

    if discount > 0:
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*GRAY)
        pdf.set_xy(block_x, y)
        pdf.cell(label_w, line_h, "Subtotal", align="R")
        pdf.set_xy(amount_x, y)
        pdf.cell(amount_w, line_h, format_currency(subtotal), align="R")
        y += line_h

        pdf.set_text_color(*ORANGE)
        pdf.set_xy(block_x, y)
        pdf.cell(label_w, line_h, f"Discount ({discount_pct:.0f}%)", align="R")
        pdf.set_xy(amount_x, y)
        pdf.cell(amount_w, line_h, f"- {format_currency(discount)}", align="R")
        y += line_h + 2

    total_h = 11
    pdf.set_fill_color(*ORANGE)
    pdf.rect(block_x, y, block_w, total_h, "F")
    pdf.set_text_color(*WHITE)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_xy(block_x + 4, y + 3)
    pdf.cell(label_w - 4, 6, "TOTAL")
    pdf.set_xy(amount_x, y + 3)
    pdf.cell(amount_w - 2, 6, format_currency(total), align="R")
    return y + total_h


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
    pdf.set_auto_page_break(auto=True, margin=FOOTER_H + 8)
    pdf.set_margins(MARGIN, MARGIN, MARGIN)
    pdf.add_page()

    _draw_header(pdf, bill)

    y = HEADER_H + 8
    gap = 5
    box_w = (CONTENT_W - gap * 2) / 3
    box_h = 28

    _draw_info_box(
        pdf,
        MARGIN,
        y,
        box_w,
        box_h,
        "Bill To",
        (bill.get("customerName") or "Customer").strip(),
        (bill.get("customerPhone") or "-").strip(),
    )
    _draw_info_box(
        pdf,
        MARGIN + box_w + gap,
        y,
        box_w,
        box_h,
        "Delivery",
        format_delivery_schedule(bill),
    )
    _draw_info_box(
        pdf,
        MARGIN + (box_w + gap) * 2,
        y,
        box_w,
        box_h,
        "Payment",
        format_payment_summary(bill),
    )

    y += box_h + 10

    header_vals = [label for label, _ in TABLE_COLS]
    y = _draw_table_row(pdf, y, header_vals, header=True)

    items = bill.get("items") or []
    for i, item in enumerate(items):
        rate = float(item.get("rate") or 0)
        qty = float(item.get("qty") or 0)
        amount = rate * qty
        fill = LIGHT if i % 2 == 0 else WHITE
        row = [
            str(i + 1),
            str(item.get("name") or "-")[:48],
            format_service_name(str(item.get("service") or "-"))[:28],
            format_qty_display(item),
            format_currency(rate) + ("/kg" if _is_kg_item(item) else ""),
            format_currency(amount),
        ]
        y = _draw_table_row(pdf, y, row, fill=fill, bold_last=True)

    y += 6
    subtotal = float(bill.get("subtotal") or 0)
    discount = float(bill.get("discountAmount") or 0)
    discount_pct = float(bill.get("discountPercent") or 0)
    total = float(bill.get("total") or 0)

    _draw_totals_block(
        pdf,
        y,
        subtotal=subtotal,
        discount=discount,
        discount_pct=discount_pct,
        total=total,
    )

    pdf.output(str(path))
    return path
