/**
 * Branded A4 invoice PDF for Rinse & Rise Laundryrite.
 * Requires jsPDF + jspdf-autotable (loaded in index.html).
 */
const InvoicePdf = (() => {
  const ORANGE = [242, 101, 34];
  const ORANGE_DARK = [217, 84, 15];
  const BLACK = [26, 26, 26];
  const GRAY = [100, 100, 100];
  const LIGHT = [245, 245, 245];

  const SHOP = {
    phone: "9591506548",
    hours: "9 AM – 9 PM",
    address:
      "Shop No 1, Site No 211, 15th Cross, 4th Main, Ananth Nagar Phase 1, Electronic City, Bangalore 560100",
    tagline: "Free Pickup & Delivery · Express 24-Hr Delivery",
  };

  const GOOGLE_REVIEW_URL =
    "https://google.com/maps/place//data=!4m3!3m2!1s0x3bae6d01fa8c4225:0x865cd70a4ba3ada4!12e1?source=g.page.m.ia._&laa=nmx-review-solicitation-ia2";

  const MARGIN = 14;
  const CONTENT_W = 182;
  const FOOTER_H = 40;
  const QR_SIZE = 24;
  const TABLE_COLS = [12, 52, 38, 20, 28, 32];

  function formatCurrency(amount) {
    return "\u20B9" + Number(amount || 0).toLocaleString("en-IN");
  }

  const KG_ITEM_NAMES = new Set([
    "Wash and Fold 80/kg",
    "Wash and Iron 125/kg",
    "Premium Laundry 200/kg",
  ]);

  function isKgItem(item) {
    if (!item) return false;
    if (item.unit === "kg") return true;
    if (item.unit === "pc") return false;
    const name = item.name || "";
    return KG_ITEM_NAMES.has(name) || /\/kg/i.test(name);
  }

  function formatQtyDisplay(item) {
    const qty = Number(item.qty) || 0;
    if (isKgItem(item)) {
      const text = qty % 1 === 0 ? String(qty) : qty.toFixed(1);
      return `${text} kg`;
    }
    return `${qty} pc`;
  }

  const DELIVERY_TIME_LABELS = {
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
  };

  function formatServiceName(name) {
    const cleaned = String(name || "").trim();
    if (cleaned.toLowerCase() === "lundry") return "Laundry";
    return cleaned || "—";
  }

  function stripDeliveryTimeSuffix(text) {
    const value = String(text || "").trim();
    if (!value) return "";
    for (const label of Object.values(DELIVERY_TIME_LABELS)) {
      if (value.endsWith(`, ${label}`)) return value.slice(0, -(`, ${label}`.length)).trim();
    }
    return value;
  }

  function formatDeliverySchedule(bill) {
    const dateVal = (bill.deliveryDate || "").trim();
    if (dateVal) {
      const [year, month, day] = dateVal.split("-").map(Number);
      const delivery = new Date(year, month - 1, day);
      if (!Number.isNaN(delivery.getTime())) {
        return delivery.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
      return dateVal;
    }

    let display = (bill.deliveryDisplay || "").trim();
    if (display.includes(" · ")) display = display.split(" · ").slice(1).join(" · ").trim();
    return stripDeliveryTimeSuffix(display) || "—";
  }

  function formatBillDate(value) {
    const d = value instanceof Date ? value : new Date(value || Date.now());
    if (Number.isNaN(d.getTime())) return "—";
    return d
      .toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace(/\s?(AM|PM)/i, (_, meridiem) => ` ${meridiem.toLowerCase()}`);
  }

  let logoDataUrl = null;
  let reviewQrDataUrl = null;

  function drawInfoBox(doc, x, y, w, h, title, primary, secondary) {
    doc.setFillColor(...LIGHT);
    doc.setDrawColor(230, 230, 230);
    doc.rect(x, y, w, h, "FD");
    doc.setTextColor(...ORANGE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(title, x + 4, y + 7);
    doc.setTextColor(...BLACK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(primary || "—", x + 4, y + 14);
    if (secondary) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(secondary, x + 4, y + 20);
    }
  }

  async function loadReviewQr() {
    if (reviewQrDataUrl) return reviewQrDataUrl;
    const res = await fetch("assets/google-review-qr.jpg");
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        reviewQrDataUrl = reader.result;
        resolve(reviewQrDataUrl);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function loadLogo() {
    if (logoDataUrl) return logoDataUrl;
    const res = await fetch("assets/logo.png");
    if (!res.ok) throw new Error("Could not load shop logo.");
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        logoDataUrl = reader.result;
        resolve(logoDataUrl);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function normalizeBillForPdf(bill) {
    return {
      ...bill,
      items: (bill.items || []).map((raw) => {
        const item = { ...raw, qty: Number(raw.qty) || 0 };
        if (!item.unit) item.unit = isKgItem(item) ? "kg" : "pc";
        return item;
      }),
    };
  }

  async function generate(bill) {
    bill = normalizeBillForPdf(bill);
    if (!window.jspdf?.jsPDF) {
      throw new Error("PDF library not loaded. Check your internet connection and refresh.");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const margin = MARGIN;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const logo = await loadLogo();
    const amountColW = TABLE_COLS[5];
    const rateColW = TABLE_COLS[4];
    const totalsW = amountColW + rateColW;
    const totalsX = margin + CONTENT_W - totalsW;

    // Header band
    doc.setFillColor(...ORANGE);
    doc.rect(0, 0, pageW, 42, "F");
    doc.setFillColor(...ORANGE_DARK);
    doc.rect(0, 40, pageW, 2, "F");

    doc.addImage(logo, "PNG", margin, 7, 26, 26);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("RINSE & RISE", margin + 30, 16);
    doc.setFontSize(10);
    doc.text("LAUNDRYRITE", margin + 30, 23);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Rinse \u00B7 Rise \u00B7 Repeat", margin + 30, 29);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.text("INVOICE", pageW - margin, 18, { align: "right" });
    doc.setFontSize(11);
    doc.text(`#${bill.billNo || "—"}`, pageW - margin, 27, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(formatBillDate(bill.createdAt), pageW - margin, 34, { align: "right" });

    let y = 50;
    const gap = 6;
    const boxW = (CONTENT_W - gap) / 2;
    const boxH = 26;

    drawInfoBox(
      doc,
      margin,
      y,
      boxW,
      boxH,
      "BILL TO",
      bill.customerName || "Customer",
      bill.customerPhone || "—"
    );
    drawInfoBox(doc, margin + boxW + gap, y, boxW, boxH, "DELIVERY", formatDeliverySchedule(bill));

    y += boxH + 8;

    // Items table
    const tableBody = (bill.items || []).map((item, i) => {
      const amount = (item.rate || 0) * (item.qty || 0);
      return [
        String(i + 1),
        item.name || "—",
        formatServiceName(item.service),
        formatQtyDisplay(item),
        formatCurrency(item.rate) + (isKgItem(item) ? "/kg" : ""),
        formatCurrency(amount),
      ];
    });

    doc.autoTable({
      startY: y,
      head: [["#", "Item", "Service", "Qty/ kg", "Rate", "Amount"]],
      body: tableBody,
      theme: "grid",
      margin: { left: margin, right: margin },
      tableWidth: CONTENT_W,
      headStyles: {
        fillColor: ORANGE,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: BLACK,
        cellPadding: 2.5,
      },
      alternateRowStyles: { fillColor: [252, 252, 252] },
      columnStyles: {
        0: { cellWidth: TABLE_COLS[0], halign: "center" },
        1: { cellWidth: TABLE_COLS[1] },
        2: { cellWidth: TABLE_COLS[2] },
        3: { cellWidth: TABLE_COLS[3], halign: "center" },
        4: { cellWidth: TABLE_COLS[4], halign: "right" },
        5: { cellWidth: TABLE_COLS[5], halign: "right", fontStyle: "bold" },
      },
    });

    y = doc.lastAutoTable.finalY + 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);

    const subtotal = bill.subtotal ?? 0;
    const discount = bill.discountAmount ?? 0;
    const discountPct = bill.discountPercent ?? 0;
    const total = bill.total ?? 0;

    if (discount > 0) {
      doc.text("Subtotal:", totalsX + rateColW, y, { align: "right" });
      doc.text(formatCurrency(subtotal), margin + CONTENT_W, y, { align: "right" });
      y += 6;
      doc.setTextColor(...ORANGE);
      doc.text(`Discount (${discountPct}%):`, totalsX + rateColW, y, { align: "right" });
      doc.text(`− ${formatCurrency(discount)}`, margin + CONTENT_W, y, { align: "right" });
      y += 6;
    }

    doc.setFillColor(...ORANGE);
    doc.rect(totalsX, y - 1, totalsW, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL", totalsX + 4, y + 5);
    doc.text(formatCurrency(total), margin + CONTENT_W - 2, y + 5, { align: "right" });

    const footerY = pageH - FOOTER_H;
    const qrReserve = QR_SIZE + 8;
    const textW = pageW - margin * 2 - qrReserve;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, pageW - margin, footerY);

    doc.setTextColor(...BLACK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Thank you for choosing Rinse & Rise Laundryrite!", margin + textW / 2, footerY + 7, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(SHOP.tagline, margin + textW / 2, footerY + 13, { align: "center" });
    doc.text(`Call: ${SHOP.phone}  |  ${SHOP.hours}`, margin + textW / 2, footerY + 18, {
      align: "center",
    });

    const addressLines = doc.splitTextToSize(SHOP.address, textW - 10);
    doc.text(addressLines, margin + textW / 2, footerY + 23, { align: "center" });

    const reviewQr = await loadReviewQr();
    if (reviewQr) {
      const qrX = pageW - margin - QR_SIZE;
      const qrY = footerY + (FOOTER_H - QR_SIZE - 7) / 2;
      doc.addImage(reviewQr, "JPEG", qrX, qrY, QR_SIZE, QR_SIZE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...ORANGE);
      doc.text("Rate us on Google", qrX + QR_SIZE / 2, qrY + QR_SIZE + 3, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(...GRAY);
      doc.text("Scan to review", qrX + QR_SIZE / 2, qrY + QR_SIZE + 6.5, { align: "center" });
    }

    const filename = `RinseRise-Invoice-${bill.billNo || "bill"}.pdf`;
    const blob = doc.output("blob");
    return { blob, filename };
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return { generate, triggerDownload, formatCurrency, formatBillDate };
})();
