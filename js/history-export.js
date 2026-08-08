(function () {
  const SERVICE_MODE_LABELS = {
    "door-pickup": "Door Pickup",
    "door-delivery": "Door Delivery",
    "door-both": "Door Pickup & Delivery",
    "shop-pickup": "Shop Pickup",
    "shop-delivery": "Shop Delivery",
    "shop-both": "Shop Pickup & Delivery",
  };

  const DELIVERY_TIME_LABELS = {
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
  };

  const PAYMENT_TYPE_LABELS = {
    cash: "Cash",
    upi: "UPI Online",
  };

  const PAYMENT_INFO_LABELS = {
    "pre-payment": "Pre Payment",
    "post-payment": "Post Payment",
  };

  const IST_TIMEZONE = "Asia/Kolkata";

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatExportStamp(date) {
    const value = date instanceof Date ? date : new Date(date || Date.now());
    if (Number.isNaN(value.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: IST_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(value);
    const get = (type) => parts.find((p) => p.type === type)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
  }

  function formatBillDateTime(iso) {
    const value = new Date(iso);
    if (Number.isNaN(value.getTime())) return "";
    return value.toLocaleString("en-IN", {
      timeZone: IST_TIMEZONE,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  function formatDeliveryDateOnly(dateVal) {
    if (!dateVal) return "";
    const [y, m, d] = String(dateVal).split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return String(dateVal);
    return dt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getDeliveryStatus(bill) {
    const status = bill.deliveryStatus;
    if (status === "done") return "Delivery Done";
    if (status === "ready") return "Order Ready";
    return "Pending";
  }

  function getSentViaLabel(sentVia) {
    if (sentVia === "whatsapp") return "WhatsApp";
    if (sentVia === "saved") return "Saved";
    return "Printed";
  }

  function getServiceModeLabel(mode) {
    return SERVICE_MODE_LABELS[mode] || mode || "";
  }

  function getDeliveryTimeLabel(value) {
    return DELIVERY_TIME_LABELS[value] || value || "";
  }

  function getPaymentTypeLabel(value) {
    return PAYMENT_TYPE_LABELS[value] || value || "";
  }

  function getPaymentInfoLabel(value) {
    return PAYMENT_INFO_LABELS[value] || value || "";
  }

  function formatDeliverySchedule(bill) {
    if (bill.deliveryDate) return formatDeliveryDateOnly(bill.deliveryDate);
    let part = (bill.deliveryDisplay || "").trim();
    if (part.includes(" · ")) part = part.split(" · ").slice(1).join(" · ").trim();
    for (const label of Object.values(DELIVERY_TIME_LABELS)) {
      if (part.endsWith(`, ${label}`)) {
        part = part.slice(0, -(`, ${label}`.length)).trim();
        break;
      }
    }
    return part;
  }

  function buildFilename(range) {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: IST_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const slug = (range.label || "Bills")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    const fromTo =
      range.from && range.to && range.from !== range.to
        ? `_${range.from}_to_${range.to}`
        : range.from
          ? `_${range.from}`
          : "";
    return `RinseRise-Bills-${slug}${fromTo}_${today}.xlsx`;
  }

  function autoFitColumns(rows) {
    const widths = [];
    rows.forEach((row) => {
      row.forEach((cell, index) => {
        const length = String(cell ?? "").length;
        widths[index] = Math.max(widths[index] || 10, Math.min(length + 2, 42));
      });
    });
    return widths.map((wch) => ({ wch }));
  }

  function addSheet(workbook, name, rows) {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = autoFitColumns(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }

  function buildSummarySheet(bills, range) {
    const totalRevenue = bills.reduce((sum, bill) => sum + (bill.total || 0), 0);
    const totalSubtotal = bills.reduce((sum, bill) => sum + (bill.subtotal || 0), 0);
    const totalDiscount = bills.reduce((sum, bill) => sum + (bill.discountAmount || 0), 0);
    const done = bills.filter((bill) => bill.deliveryStatus === "done").length;
    const ready = bills.filter((bill) => bill.deliveryStatus === "ready").length;
    const pending = bills.length - done - ready;
    const totalItems = bills.reduce((sum, bill) => sum + (bill.items?.length || 0), 0);

    return [
      ["Rinse & Rise Laundryrite — Billing Export"],
      [],
      ["Period", range.label || ""],
      ["From", range.from || "All time"],
      ["To", range.to || "All time"],
      ["Exported At", formatExportStamp(new Date())],
      [],
      ["Total Bills", bills.length],
      ["Total Line Items", totalItems],
      ["Pending Orders", pending],
      ["Order Ready", ready],
      ["Completed Deliveries", done],
      [],
      ["Total Subtotal (₹)", totalSubtotal],
      ["Total Discount (₹)", totalDiscount],
      ["Total Revenue (₹)", totalRevenue],
    ];
  }

  function buildBillsSheet(bills) {
    const rows = [
      [
        "Bill No",
        "Bill Date & Time",
        "Customer Name",
        "Phone",
        "Delivery Date",
        "Delivery Time",
        "Delivery Schedule",
        "Home Service",
        "Shop Service",
        "Payment Type",
        "Payment Info",
        "Subtotal (₹)",
        "Discount %",
        "Discount (₹)",
        "Total (₹)",
        "Delivery Status",
        "Sent Via",
        "Completed At",
        "Item Count",
      ],
    ];

    bills.forEach((bill) => {
      rows.push([
        bill.billNo,
        formatBillDateTime(bill.createdAt),
        bill.customerName || "Walk-in Customer",
        bill.customerPhone || "",
        formatDeliveryDateOnly(bill.deliveryDate),
        getDeliveryTimeLabel(bill.deliveryTime),
        formatDeliverySchedule(bill),
        getServiceModeLabel(bill.homeServiceMode || bill.serviceMode),
        getServiceModeLabel(bill.shopServiceMode),
        getPaymentTypeLabel(bill.paymentType),
        getPaymentInfoLabel(bill.paymentInfo),
        bill.subtotal || 0,
        bill.discountPercent || 0,
        bill.discountAmount || 0,
        bill.total || 0,
        getDeliveryStatus(bill),
        getSentViaLabel(bill.sentVia),
        bill.completedAt ? formatBillDateTime(bill.completedAt) : "",
        bill.items?.length || 0,
      ]);
    });

    const totalRevenue = bills.reduce((sum, bill) => sum + (bill.total || 0), 0);
    rows.push([]);
    rows.push([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "TOTAL",
      bills.reduce((sum, bill) => sum + (bill.subtotal || 0), 0),
      "",
      bills.reduce((sum, bill) => sum + (bill.discountAmount || 0), 0),
      totalRevenue,
      "",
      "",
      "",
      bills.reduce((sum, bill) => sum + (bill.items?.length || 0), 0),
    ]);

    return rows;
  }

  function buildItemsSheet(bills) {
    const rows = [
      [
        "Bill No",
        "Bill Date & Time",
        "Customer Name",
        "Phone",
        "Line #",
        "Item",
        "Service",
        "Category",
        "Qty / Kg",
        "Rate (₹)",
        "Amount (₹)",
      ],
    ];

    bills.forEach((bill) => {
      (bill.items || []).forEach((item, index) => {
        rows.push([
          bill.billNo,
          formatBillDateTime(bill.createdAt),
          bill.customerName || "Walk-in Customer",
          bill.customerPhone || "",
          index + 1,
          item.name || "",
          item.service || "",
          item.category || "",
          item.qty || 0,
          item.rate || 0,
          (item.rate || 0) * (item.qty || 0),
        ]);
      });
    });

    return rows;
  }

  function exportHistoryToExcel(bills, range) {
    if (!window.XLSX) {
      alert("Excel export is not available. Please refresh the page and try again.");
      return;
    }
    if (!bills.length) {
      alert(`No bills found for ${range.label || "this period"}.`);
      return;
    }

    const workbook = XLSX.utils.book_new();
    addSheet(workbook, "Summary", buildSummarySheet(bills, range));
    addSheet(workbook, "Bills", buildBillsSheet(bills));
    addSheet(workbook, "Line Items", buildItemsSheet(bills));

    XLSX.writeFile(workbook, buildFilename(range));
  }

  window.exportHistoryToExcel = exportHistoryToExcel;
})();
