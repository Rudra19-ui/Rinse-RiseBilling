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
  const BORDER = [220, 220, 220];

  const SHOP = {
    phone: "9591506548",
    hours: "9 AM – 9 PM",
    addressLines: [
      "Shop No 1, Site No 211, 15th Cross, 4th Main,",
      "Ananth Nagar Phase 1, Electronic City, Bangalore 560100",
    ],
    tagline: "Free Pickup & Delivery  |  Express 24-Hr Delivery",
  };

  const PAYMENT_TYPE_LABELS = { cash: "Cash", upi: "UPI Online" };
  const PAYMENT_INFO_LABELS = { "pre-payment": "Pre Payment", "post-payment": "Post Payment" };

  const MARGIN = 14;
  const CONTENT_W = 182;
  const HEADER_H = 44;
  const FOOTER_H = 46;
  const QR_SIZE = 22;
  const LOGO_SIZE = 22;
  const TABLE_COLS = [10, 58, 36, 22, 26, 30];

  function formatCurrency(amount) {
    return "Rs. " + Number(amount || 0).toLocaleString("en-IN");
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
    if (cleaned.toLowerCase() === "lundry" || cleaned.toLowerCase() === "laundry") return "Laundry";
    return cleaned || "—";
  }

  function formatPaymentSummary(bill) {
    const parts = [];
    const pt = PAYMENT_TYPE_LABELS[bill.paymentType] || "";
    const pi = PAYMENT_INFO_LABELS[bill.paymentInfo] || "";
    if (pt) parts.push(pt);
    if (pi) parts.push(pi);
    return parts.length ? parts.join(" · ") : "—";
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
    doc.setDrawColor(...BORDER);
    doc.rect(x, y, w, h, "FD");
    doc.setTextColor(...ORANGE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(title.toUpperCase(), x + 5, y + 8);
    doc.setTextColor(...BLACK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(primary || "—", x + 5, y + 15);
    if (secondary) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...GRAY);
      doc.text(secondary, x + 5, y + 22);
    }
  }

  function drawHeader(doc, bill, pageW, margin, logo) {
    doc.setFillColor(...ORANGE);
    doc.rect(0, 0, pageW, HEADER_H, "F");
    doc.setFillColor(...ORANGE_DARK);
    doc.rect(0, HEADER_H - 2, pageW, 2, "F");

    const logoY = (HEADER_H - LOGO_SIZE) / 2;
    doc.addImage(logo, "PNG", margin, logoY, LOGO_SIZE, LOGO_SIZE);

    const textX = margin + LOGO_SIZE + 6;
    const brandBlockH = 19;
    let brandY = (HEADER_H - brandBlockH) / 2;
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text("RINSE & RISE", textX, brandY + 6);
    doc.setFontSize(10);
    doc.text("LAUNDRYRITE", textX, brandY + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Rinse \u00B7 Rise \u00B7 Repeat", textX, brandY + 17);

    const invBlockH = 20;
    let invY = (HEADER_H - invBlockH) / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("INVOICE", pageW - margin, invY + 8, { align: "right" });
    doc.setFontSize(11);
    doc.text(`#${bill.billNo || "—"}`, pageW - margin, invY + 14, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(formatBillDate(bill.createdAt), pageW - margin, invY + 19, { align: "right" });
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
    const totalsW = rateColW + amountColW;
    const totalsX = margin + CONTENT_W - totalsW;
    const amountX = margin + CONTENT_W - amountColW;

    drawHeader(doc, bill, pageW, margin, logo);

    let y = HEADER_H + 8;
    const gap = 5;
    const boxW = (CONTENT_W - gap * 2) / 3;
    const boxH = 28;

    drawInfoBox(
      doc,
      margin,
      y,
      boxW,
      boxH,
      "Bill To",
      bill.customerName || "Customer",
      bill.customerPhone || "—"
    );
    drawInfoBox(doc, margin + boxW + gap, y, boxW, boxH, "Delivery", formatDeliverySchedule(bill));
    drawInfoBox(
      doc,
      margin + (boxW + gap) * 2,
      y,
      boxW,
      boxH,
      "Payment",
      formatPaymentSummary(bill)
    );

    y += boxH + 10;

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
      head: [["#", "Item", "Service", "Qty", "Rate", "Amount"]],
      body: tableBody,
      theme: "grid",
      margin: { left: margin, right: margin },
      tableWidth: CONTENT_W,
      headStyles: {
        fillColor: ORANGE,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
        halign: "center",
      },
      bodyStyles: {
        fontSize: 9,
        textColor: BLACK,
        cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
        lineColor: BORDER,
        lineWidth: 0.2,
      },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: {
        0: { cellWidth: TABLE_COLS[0], halign: "center" },
        1: { cellWidth: TABLE_COLS[1], halign: "left" },
        2: { cellWidth: TABLE_COLS[2], halign: "left" },
        3: { cellWidth: TABLE_COLS[3], halign: "center" },
        4: { cellWidth: TABLE_COLS[4], halign: "right" },
        5: { cellWidth: TABLE_COLS[5], halign: "right", fontStyle: "bold" },
      },
    });

    y = doc.lastAutoTable.finalY + 6;

    const subtotal = bill.subtotal ?? 0;
    const discount = bill.discountAmount ?? 0;
    const discountPct = bill.discountPercent ?? 0;
    const total = bill.total ?? 0;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    if (discount > 0) {
      doc.setTextColor(...GRAY);
      doc.text("Subtotal", totalsX + rateColW, y, { align: "right" });
      doc.text(formatCurrency(subtotal), margin + CONTENT_W, y, { align: "right" });
      y += 7;
      doc.setTextColor(...ORANGE);
      doc.text(`Discount (${discountPct}%)`, totalsX + rateColW, y, { align: "right" });
      doc.text(`- ${formatCurrency(discount)}`, margin + CONTENT_W, y, { align: "right" });
      y += 9;
    }

    doc.setFillColor(...ORANGE);
    doc.rect(totalsX, y, totalsW, 11, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL", totalsX + 4, y + 7.5);
    doc.text(formatCurrency(total), margin + CONTENT_W - 2, y + 7.5, { align: "right" });

    const footerY = pageH - FOOTER_H;
    const qrReserve = QR_SIZE + 10;
    const textW = pageW - margin * 2 - qrReserve;

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(margin, footerY, pageW - margin, footerY);

    let lineY = footerY + 6;
    doc.setTextColor(...BLACK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Thank you for choosing Rinse & Rise Laundryrite!", margin + textW / 2, lineY, {
      align: "center",
    });

    lineY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(SHOP.tagline, margin + textW / 2, lineY, { align: "center" });
    lineY += 5;
    doc.text(`Call: ${SHOP.phone}  |  ${SHOP.hours}`, margin + textW / 2, lineY, { align: "center" });
    lineY += 5;
    for (const line of SHOP.addressLines) {
      doc.text(line, margin + textW / 2, lineY, { align: "center" });
      lineY += 4;
    }

    const reviewQr = await loadReviewQr();
    if (reviewQr) {
      const qrX = pageW - margin - QR_SIZE;
      const qrY = footerY + (FOOTER_H - QR_SIZE - 8) / 2;
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
