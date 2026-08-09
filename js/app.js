let ratesData = null;
let billItems = [];
let billCounter = 1;
let billHistoryCache = [];
let selectedHistoryId = null;
let historySearchQuery = "";
let historyStatusFilter = "all";
let historyPeriodFilter = "today";
let historyCustomDate = "";
let historyEditDraft = null;
let expenditureCache = { items: [], total: 0, count: 0 };

const $ = (sel) => document.querySelector(sel);

const els = {
  billNo: $("#billNo"),
  billDate: $("#billDate"),
  customerName: $("#customerName"),
  customerPhone: $("#customerPhone"),
  customerInfoBtn: $("#customerInfoBtn"),
  customerFavoriteBtn: $("#customerFavoriteBtn"),
  customerRegularBadge: $("#customerRegularBadge"),
  customerStatsModal: $("#customerStatsModal"),
  customerStatsBackdrop: $("#customerStatsBackdrop"),
  closeCustomerStats: $("#closeCustomerStats"),
  customerStatsBody: $("#customerStatsBody"),
  customerStatsPhone: $("#customerStatsPhone"),
  customerStatsMember: $("#customerStatsMember"),
  customerProfileHint: $("#customerProfileHint"),
  deliveryDate: $("#deliveryDate"),
  deliveryTimeSlot: $("#deliveryTimeSlot"),
  deliveryDisplay: $("#deliveryDisplay"),
  serviceSelect: $("#serviceSelect"),
  categorySelect: $("#categorySelect"),
  itemSearch: $("#itemSearch"),
  itemResults: $("#itemResults"),
  quickAdd: $("#quickAdd"),
  billItems: $("#billItems"),
  totalAmount: $("#totalAmount"),
  subtotalAmount: $("#subtotalAmount"),
  discountPercent: $("#discountPercent"),
  discountAmount: $("#discountAmount"),
  printBtn: $("#printBtn"),
  whatsappBtn: $("#whatsappBtn"),
  saveBillBtn: $("#saveBillBtn"),
  clearBtn: $("#clearBtn"),
  receipt: $("#receipt"),
  rBillNo: $("#rBillNo"),
  rDate: $("#rDate"),
  rName: $("#rName"),
  rPhone: $("#rPhone"),
  rDelivery: $("#rDelivery"),
  rPayment: $("#rPayment"),
  rItems: $("#rItems"),
  rSummary: $("#rSummary"),
  rTotal: $("#rTotal"),
  serviceTiles: $("#serviceTiles"),
  billingView: $("#billingView"),
  historyView: $("#historyView"),
  historyBtn: $("#historyBtn"),
  backToBillingBtn: $("#backToBillingBtn"),
  historyList: $("#historyList"),
  historyDetail: $("#historyDetail"),
  historySearch: $("#historySearch"),
  historyCount: $("#historyCount"),
  historyFilters: $("#historyFilters"),
  historyPeriodFilters: $("#historyPeriodFilters"),
  historyDatePick: $("#historyDatePick"),
  historyPeriodSummary: $("#historyPeriodSummary"),
  downloadHistoryExcelBtn: $("#downloadHistoryExcelBtn"),
  expenditureBtn: $("#expenditureBtn"),
  expenditureView: $("#expenditureView"),
  backFromExpenditureBtn: $("#backFromExpenditureBtn"),
  expenditureForm: $("#expenditureForm"),
  expenditureName: $("#expenditureName"),
  expenditureAmount: $("#expenditureAmount"),
  expenditureDate: $("#expenditureDate"),
  expenditureDateFrom: $("#expenditureDateFrom"),
  expenditureDateTo: $("#expenditureDateTo"),
  expenditureList: $("#expenditureList"),
  expenditureTotalBadge: $("#expenditureTotalBadge"),
  expenditureCount: $("#expenditureCount"),
  calculateProfitBtn: $("#calculateProfitBtn"),
  profitLossModal: $("#profitLossModal"),
  profitLossBackdrop: $("#profitLossBackdrop"),
  closeProfitLoss: $("#closeProfitLoss"),
  profitLossBody: $("#profitLossBody"),
  overallStatsBtn: $("#overallStatsBtn"),
  overallStatsModal: $("#overallStatsModal"),
  overallStatsBackdrop: $("#overallStatsBackdrop"),
  closeOverallStats: $("#closeOverallStats"),
  overallStatsBody: $("#overallStatsBody"),
  whatsappStatusPill: $("#whatsappStatusPill"),
  whatsappConnectModal: $("#whatsappConnectModal"),
  whatsappConnectBackdrop: $("#whatsappConnectBackdrop"),
  whatsappConnectBody: $("#whatsappConnectBody"),
  closeWhatsAppConnect: $("#closeWhatsAppConnect"),
  expenditurePasswordModal: $("#expenditurePasswordModal"),
  expenditurePasswordBackdrop: $("#expenditurePasswordBackdrop"),
  expenditurePasswordForm: $("#expenditurePasswordForm"),
  expenditurePasswordInput: $("#expenditurePasswordInput"),
  expenditurePasswordError: $("#expenditurePasswordError"),
  closeExpenditurePassword: $("#closeExpenditurePassword"),
  cancelExpenditurePassword: $("#cancelExpenditurePassword"),
};

const EXPENDITURE_PASSWORD = "Mandleshwar@22";

function formatCurrency(amount) {
  return "₹" + amount.toLocaleString("en-IN");
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

const IST_TIMEZONE = "Asia/Kolkata";

const GOOGLE_REVIEW_URL =
  "https://google.com/maps/place//data=!4m3!3m2!1s0x3bae6d01fa8c4225:0x865cd70a4ba3ada4!12e1?source=g.page.m.ia._&laa=nmx-review-solicitation-ia2";

function googleReviewMessageBlock() {
  return `\n⭐ *Leave us a Google Review:*\n${GOOGLE_REVIEW_URL}`;
}

function toIstDateKey(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDate(date) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "—";
  return value
    .toLocaleString("en-IN", {
      timeZone: IST_TIMEZONE,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s?(AM|PM)/i, (_, meridiem) => ` ${meridiem.toLowerCase()}`);
}

function formatDeliveryDateTime() {
  return formatDeliveryDateOnly(els.deliveryDate.value);
}

function syncDeliveryDisplayFromDate(dateVal) {
  return formatDeliveryDateOnly(dateVal);
}

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

function getDeliveryTimeLabel(value) {
  return DELIVERY_TIME_LABELS[value] || "";
}

function getPaymentTypeLabel(value) {
  return PAYMENT_TYPE_LABELS[value] || "";
}

function getPaymentInfoLabel(value) {
  return PAYMENT_INFO_LABELS[value] || "";
}

function getDeliveryTimeSlot() {
  return els.deliveryTimeSlot?.value || "";
}

function getPaymentType() {
  const checked = document.querySelector('input[name="paymentType"]:checked');
  return checked?.value || "";
}

function getPaymentInfo() {
  const checked = document.querySelector('input[name="paymentInfo"]:checked');
  return checked?.value || "";
}

function formatPaymentSummary(paymentType, paymentInfo) {
  const parts = [];
  const typeLabel = getPaymentTypeLabel(paymentType);
  const infoLabel = getPaymentInfoLabel(paymentInfo);
  if (typeLabel) parts.push(typeLabel);
  if (infoLabel) parts.push(infoLabel);
  return parts.length ? parts.join(" · ") : "—";
}

function setPaymentRadios(groupName, value) {
  document.querySelectorAll(`input[name="${groupName}"]`).forEach((radio) => {
    radio.checked = Boolean(value && radio.value === value);
  });
}

function getServiceModeLabel(mode) {
  if (!mode) return "";
  return SERVICE_MODE_LABELS[mode] || mode;
}

function buildServiceModesLabel(homeMode, shopMode) {
  const parts = [];
  if (homeMode) parts.push(getServiceModeLabel(homeMode));
  if (shopMode) parts.push(getServiceModeLabel(shopMode));
  return parts.length ? parts.join(" + ") : "—";
}

function getHomeServiceMode() {
  const checked = document.querySelector('input[name="homeServiceMode"]:checked');
  return checked?.value || "";
}

function getShopServiceMode() {
  const checked = document.querySelector('input[name="shopServiceMode"]:checked');
  return checked?.value || "";
}

/** Apply pickup / delivery / both exclusivity across Home and Shop sections. */
function resolveServiceModeConflict(changedSide, homeMode, shopMode) {
  let home = homeMode || "";
  let shop = shopMode || "";

  if (home === "door-both" && shop === "shop-both") {
    if (changedSide === "shop") home = "";
    else shop = "";
  }

  if (changedSide === "home") {
    if (home === "door-pickup" && (shop === "shop-pickup" || shop === "shop-both")) shop = "";
    if (home === "door-delivery" && (shop === "shop-delivery" || shop === "shop-both")) shop = "";
    if (home === "door-both") shop = "";
  } else if (changedSide === "shop") {
    if (shop === "shop-pickup" && (home === "door-pickup" || home === "door-both")) home = "";
    if (shop === "shop-delivery" && (home === "door-delivery" || home === "door-both")) home = "";
    if (shop === "shop-both") home = "";
  }

  return { home, shop };
}

function normalizeServiceModes(homeMode, shopMode, changedSide = null) {
  let home = homeMode || "";
  let shop = shopMode || "";

  if (home === "door-both" && shop === "shop-both") {
    if (changedSide === "shop") home = "";
    else shop = "";
  }

  if (home === "door-both" || shop === "shop-both") {
    if (home === "door-both") return { home, shop: "" };
    if (shop === "shop-both") return { home: "", shop };
  }

  if (home === "door-pickup" && shop === "shop-pickup") shop = "";
  if (home === "door-delivery" && shop === "shop-delivery") shop = "";
  if (shop === "shop-pickup" && home === "door-pickup") home = "";
  if (shop === "shop-delivery" && home === "door-delivery") home = "";

  return { home, shop };
}

function setServiceModeRadioDisabled(groupName, value, disabled) {
  const radio = document.querySelector(`input[name="${groupName}"][value="${value}"]`);
  if (!radio) return;
  radio.disabled = disabled;
  radio.closest(".mode-chip")?.classList.toggle("disabled", disabled);
}

function setAllServiceModeRadiosDisabled(groupName, disabled) {
  document.querySelectorAll(`input[name="${groupName}"]`).forEach((radio) => {
    radio.disabled = disabled;
    radio.closest(".mode-chip")?.classList.toggle("disabled", disabled);
  });
}

function applyServiceModesToForm(homeMode, shopMode) {
  document.querySelectorAll('input[name="homeServiceMode"]').forEach((radio) => {
    radio.checked = Boolean(homeMode && radio.value === homeMode);
  });
  document.querySelectorAll('input[name="shopServiceMode"]').forEach((radio) => {
    radio.checked = Boolean(shopMode && radio.value === shopMode);
  });
}

function syncServiceModeConstraints(changedSide = null) {
  let homeVal = getHomeServiceMode();
  let shopVal = getShopServiceMode();

  if (changedSide) {
    const resolved = resolveServiceModeConflict(changedSide, homeVal, shopVal);
    homeVal = resolved.home;
    shopVal = resolved.shop;
  }

  const normalized = normalizeServiceModes(homeVal, shopVal, changedSide);
  applyServiceModesToForm(normalized.home, normalized.shop);
  homeVal = normalized.home;
  shopVal = normalized.shop;

  document.querySelectorAll('input[name="homeServiceMode"], input[name="shopServiceMode"]').forEach((radio) => {
    radio.disabled = false;
    radio.closest(".mode-chip")?.classList.remove("disabled");
  });

  if (homeVal === "door-pickup") {
    setServiceModeRadioDisabled("shopServiceMode", "shop-pickup", true);
    setServiceModeRadioDisabled("shopServiceMode", "shop-both", true);
  } else if (homeVal === "door-delivery") {
    setServiceModeRadioDisabled("shopServiceMode", "shop-delivery", true);
    setServiceModeRadioDisabled("shopServiceMode", "shop-both", true);
  } else if (homeVal === "door-both") {
    setAllServiceModeRadiosDisabled("shopServiceMode", true);
  }

  if (shopVal === "shop-pickup") {
    setServiceModeRadioDisabled("homeServiceMode", "door-pickup", true);
    setServiceModeRadioDisabled("homeServiceMode", "door-both", true);
  } else if (shopVal === "shop-delivery") {
    setServiceModeRadioDisabled("homeServiceMode", "door-delivery", true);
    setServiceModeRadioDisabled("homeServiceMode", "door-both", true);
  } else if (shopVal === "shop-both") {
    setAllServiceModeRadiosDisabled("homeServiceMode", true);
  }

  updateDeliveryDisplay();
}

function handleHomeServiceModeChange() {
  syncServiceModeConstraints("home");
}

function handleShopServiceModeChange() {
  syncServiceModeConstraints("shop");
}

function bindToggleableServiceModeRadios(groupName, onChange) {
  document.querySelectorAll(`input[name="${groupName}"]`).forEach((radio) => {
    const chip = radio.closest(".mode-chip");
    if (!chip) return;

    chip.addEventListener("click", (e) => {
      if (radio.disabled) return;
      e.preventDefault();

      const wasChecked = radio.checked;
      document.querySelectorAll(`input[name="${groupName}"]`).forEach((r) => {
        r.checked = false;
      });
      if (!wasChecked) {
        radio.checked = true;
      }
      onChange();
    });
  });
}

function setDefaultServiceModes() {
  const homePickup = document.querySelector('input[name="homeServiceMode"][value="door-pickup"]');
  if (homePickup) homePickup.checked = true;
  document.querySelectorAll('input[name="shopServiceMode"]').forEach((radio) => {
    radio.checked = false;
  });
  syncServiceModeConstraints();
}

function setServiceModes(homeMode, shopMode) {
  const normalized = normalizeServiceModes(homeMode, shopMode);
  applyServiceModesToForm(normalized.home, normalized.shop);
  if (!normalized.home && !normalized.shop) {
    const homePickup = document.querySelector('input[name="homeServiceMode"][value="door-pickup"]');
    if (homePickup) homePickup.checked = true;
  }
  syncServiceModeConstraints();
}

function getNormalizedServiceModes() {
  return normalizeServiceModes(getHomeServiceMode(), getShopServiceMode());
}

function syncHistoryEditServiceModes(draft) {
  const homeSelect = document.getElementById("historyEditHomeMode");
  const shopSelect = document.getElementById("historyEditShopMode");
  if (!homeSelect || !shopSelect) return;

  const homeVal = draft.homeServiceMode || "";
  const shopVal = draft.shopServiceMode || "";

  Array.from(homeSelect.options).forEach((opt) => {
    opt.disabled = false;
  });
  Array.from(shopSelect.options).forEach((opt) => {
    opt.disabled = false;
  });
  homeSelect.disabled = false;
  shopSelect.disabled = false;

  const disableShopOptions = (values) => {
    values.forEach((value) => {
      const opt = shopSelect.querySelector(`option[value="${value}"]`);
      if (opt) opt.disabled = true;
    });
  };
  const disableHomeOptions = (values) => {
    values.forEach((value) => {
      const opt = homeSelect.querySelector(`option[value="${value}"]`);
      if (opt) opt.disabled = true;
    });
  };

  if (homeVal === "door-pickup") disableShopOptions(["shop-pickup", "shop-both"]);
  if (homeVal === "door-delivery") disableShopOptions(["shop-delivery", "shop-both"]);
  if (homeVal === "door-both") shopSelect.disabled = true;

  if (shopVal === "shop-pickup") disableHomeOptions(["door-pickup", "door-both"]);
  if (shopVal === "shop-delivery") disableHomeOptions(["door-delivery", "door-both"]);
  if (shopVal === "shop-both") homeSelect.disabled = true;
}

function formatDeliveryFromValues(dateVal) {
  if (!dateVal) return "—";

  const [year, month, day] = dateVal.split("-").map(Number);
  const delivery = new Date(year, month - 1, day);

  return delivery.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function setDefaultDeliveryDateTime() {
  const delivery = new Date();
  delivery.setDate(delivery.getDate() + 1);

  const yyyy = delivery.getFullYear();
  const mm = String(delivery.getMonth() + 1).padStart(2, "0");
  const dd = String(delivery.getDate()).padStart(2, "0");

  els.deliveryDate.value = `${yyyy}-${mm}-${dd}`;
  updateDeliveryDisplay();
}

function setDefaultPaymentFields() {
  if (els.deliveryTimeSlot) els.deliveryTimeSlot.value = "morning";
  setPaymentRadios("paymentType", "");
  setPaymentRadios("paymentInfo", "");
}

function isCustomerValid() {
  const name = els.customerName.value.trim();
  const phone = normalizePhoneKey(els.customerPhone.value);
  return name.length > 0 && phone.length >= 10;
}

function validateCustomerRequired() {
  const name = els.customerName.value.trim();
  if (!name) {
    alert("Please enter customer name.");
    els.customerName.focus();
    return false;
  }
  if (normalizePhoneKey(els.customerPhone.value).length < 10) {
    alert("Please enter a valid 10-digit phone number.");
    els.customerPhone.focus();
    return false;
  }
  return true;
}

function updateDeliveryDisplay() {
  if (els.deliveryDisplay) {
    els.deliveryDisplay.textContent = formatDeliveryDateTime();
  }
}

function formatDateInputValue(date = new Date()) {
  return toIstDateKey(date);
}

function formatDateRangeLabel(from, to) {
  if (!from && !to) return "All time";
  if (from === to) return formatHistoryDayLabel(from);
  if (from && to) return `${formatHistoryDayLabel(from)} – ${formatHistoryDayLabel(to)}`;
  if (from) return `From ${formatHistoryDayLabel(from)}`;
  return `Until ${formatHistoryDayLabel(to)}`;
}

function getBillDay(bill) {
  return toIstDateKey(bill.createdAt);
}

function formatHistoryDayLabel(dateStr) {
  if (!dateStr) return "—";
  const todayStr = formatDateInputValue(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateInputValue(yesterday);
  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getHistoryDateRange() {
  const today = new Date();
  const todayStr = formatDateInputValue(today);

  switch (historyPeriodFilter) {
    case "today":
      return { from: todayStr, to: todayStr, label: "Today's Orders" };
    case "week": {
      const start = new Date(today);
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      return {
        from: formatDateInputValue(start),
        to: todayStr,
        label: "This Week",
      };
    }
    case "month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        from: formatDateInputValue(start),
        to: todayStr,
        label: "This Month",
      };
    }
    case "year": {
      const start = new Date(today.getFullYear(), 0, 1);
      return {
        from: formatDateInputValue(start),
        to: todayStr,
        label: "This Year",
      };
    }
    case "custom": {
      const d = historyCustomDate || todayStr;
      return { from: d, to: d, label: formatHistoryDayLabel(d) };
    }
    case "all":
    default:
      return { from: "", to: "", label: "All Orders" };
  }
}

function syncHistoryPeriodUi() {
  const range = getHistoryDateRange();
  els.historyPeriodFilters?.querySelectorAll(".history-period-filter").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.period === historyPeriodFilter);
  });
  if (els.historyDatePick) {
    if (historyPeriodFilter === "custom" && historyCustomDate) {
      els.historyDatePick.value = historyCustomDate;
    } else if (historyPeriodFilter === "today") {
      els.historyDatePick.value = formatDateInputValue(new Date());
    }
  }
  if (els.historyPeriodSummary) {
    els.historyPeriodSummary.textContent = range.label;
  }
}

function groupBillsByDay(bills) {
  const groups = new Map();
  bills.forEach((bill) => {
    const day = getBillDay(bill);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(bill);
  });
  return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

function getExpenditureDateRange() {
  return {
    from: els.expenditureDateFrom?.value || "",
    to: els.expenditureDateTo?.value || "",
  };
}

function setDefaultExpenditureDates() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  if (els.expenditureDateFrom && !els.expenditureDateFrom.value) {
    els.expenditureDateFrom.value = formatDateInputValue(startOfMonth);
  }
  if (els.expenditureDateTo && !els.expenditureDateTo.value) {
    els.expenditureDateTo.value = formatDateInputValue(today);
  }
  if (els.expenditureDate) {
    els.expenditureDate.value = formatDateInputValue(today);
  }
}

function billInDateRange(bill, from, to) {
  const day = toIstDateKey(bill.createdAt);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function expenditureInDateRange(item, from, to) {
  const day = toIstDateKey(item.createdAt);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function updateBillMeta() {
  els.billNo.textContent = "Bill #" + String(billCounter).padStart(4, "0");
  if (els.billDate) els.billDate.textContent = formatDate(new Date());
}

function startBillDateClock() {
  updateBillMeta();
  clearInterval(startBillDateClock._timer);
  startBillDateClock._timer = setInterval(() => {
    if (els.billDate) els.billDate.textContent = formatDate(new Date());
  }, 30000);
}

function getSelectedService() {
  const id = els.serviceSelect.value;
  return ratesData?.services.find((s) => s.id === id) || null;
}

function getSelectedCategory() {
  const service = getSelectedService();
  if (!service) return null;
  const idx = parseInt(els.categorySelect.value, 10);
  return service.categories[idx] || null;
}

function populateServices() {
  els.serviceSelect.innerHTML = '<option value="">Select service...</option>';
  ratesData.services.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    els.serviceSelect.appendChild(opt);
  });
}

let activeTile = "";

const TILE_ITEM_FILTER = {
  laundry: (item) =>
    item.name === "Wash and Fold 80/kg" || item.name === "Wash and Iron 125/kg",
  "laundry-iron": (item) => item.name === "Premium Laundry 200/kg",
};

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

function getItemUnit(item) {
  return isKgItem(item) ? "kg" : "pc";
}

function getMinQty(item) {
  return isKgItem(item) ? 0.5 : 1;
}

function getQtyStep(item) {
  return isKgItem(item) ? 0.5 : 1;
}

function normalizeQty(item, value) {
  const min = getMinQty(item);
  let qty = parseFloat(value);
  if (isNaN(qty) || qty < min) qty = min;
  if (isKgItem(item)) {
    qty = Math.round(qty * 2) / 2;
  } else {
    qty = Math.round(qty);
  }
  return qty;
}

function formatQtyDisplay(item) {
  const qty = Number(item.qty) || 0;
  if (isKgItem(item)) {
    const text = qty % 1 === 0 ? String(qty) : qty.toFixed(1);
    return `${text} kg`;
  }
  return `${qty} pc`;
}

function formatQtyRateLine(item) {
  const qty = Number(item.qty) || 0;
  const rate = formatCurrency(item.rate);
  if (isKgItem(item)) {
    const text = qty % 1 === 0 ? String(qty) : qty.toFixed(1);
    return `${text} kg × ${rate}/kg`;
  }
  return `${qty} pc × ${rate}`;
}

function enrichBillItem(item) {
  return {
    ...item,
    unit: item.unit || getItemUnit(item),
  };
}

function renderQtyCellHtml(item) {
  if (isKgItem(item)) {
    const qty = Number(item.qty) || 1;
    const val = qty % 1 === 0 ? qty : qty.toFixed(1);
    return `
      <div class="qty-control qty-control-kg">
        <button type="button" data-action="minus" data-key="${item.key}">−</button>
        <input type="number" class="qty-input" data-key="${item.key}" value="${val}" min="0.5" step="0.5" aria-label="Kilograms">
        <span class="qty-unit">kg</span>
        <button type="button" data-action="plus" data-key="${item.key}">+</button>
      </div>
    `;
  }
  return `
    <div class="qty-control">
      <button type="button" data-action="minus" data-key="${item.key}">−</button>
      <span class="qty-value">${item.qty}</span>
      <span class="qty-unit">pc</span>
      <button type="button" data-action="plus" data-key="${item.key}">+</button>
    </div>
  `;
}

function getItemsForActiveTile(items) {
  const filter = TILE_ITEM_FILTER[activeTile];
  if (!filter) return items;
  return items.filter(filter);
}

function updateActiveTile(tileId) {
  activeTile = tileId || "";
  els.serviceTiles?.querySelectorAll(".service-tile").forEach((tile) => {
    tile.classList.toggle("active", tile.dataset.tile === activeTile);
  });
}

function selectService(serviceId, tileId) {
  els.serviceSelect.value = serviceId;
  updateActiveTile(tileId || serviceId);
  onServiceChange(false);
  if (getSelectedCategory()) {
    onCategoryChange();
  }
}

function onServiceChange(syncTile = true) {
  const service = getSelectedService();
  if (syncTile) {
    const match = els.serviceTiles?.querySelector(
      `.service-tile[data-service="${service?.id || ""}"]`
    );
    updateActiveTile(match?.dataset.tile || service?.id || "");
  }
  els.categorySelect.innerHTML = '<option value="">Select category...</option>';
  els.itemSearch.value = "";
  els.itemSearch.disabled = true;
  els.itemResults.classList.add("hidden");
  els.quickAdd.innerHTML = "";

  if (!service) {
    els.categorySelect.disabled = true;
    return;
  }

  els.categorySelect.disabled = false;
  service.categories.forEach((cat, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = cat.name;
    els.categorySelect.appendChild(opt);
  });

  if (service.categories.length === 1) {
    els.categorySelect.value = "0";
    onCategoryChange();
  }
}

function onCategoryChange() {
  const category = getSelectedCategory();
  els.itemSearch.value = "";
  els.itemResults.classList.add("hidden");
  els.quickAdd.innerHTML = "";

  if (!category) {
    els.itemSearch.disabled = true;
    return;
  }

  els.itemSearch.disabled = false;
  renderQuickAdd(getItemsForActiveTile(category.items).slice(0, 12));
}

function renderQuickAdd(items) {
  els.quickAdd.innerHTML = "";
  items.forEach((item) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "quick-chip";
    chip.textContent = `${item.name} (${formatCurrency(item.rate)})`;
    chip.addEventListener("click", () => addItem(item));
    els.quickAdd.appendChild(chip);
  });
}

function searchItems(query) {
  const category = getSelectedCategory();
  const service = getSelectedService();
  if (!category || !service) return;

  const q = query.trim().toLowerCase();
  els.itemResults.innerHTML = "";

  if (!q) {
    els.itemResults.classList.add("hidden");
    return;
  }

  const matches = getItemsForActiveTile(category.items).filter((item) =>
    item.name.toLowerCase().includes(q)
  );

  if (matches.length === 0) {
    els.itemResults.innerHTML =
      '<div class="item-result"><span class="name">No items found</span></div>';
    els.itemResults.classList.remove("hidden");
    return;
  }

  matches.slice(0, 20).forEach((item) => {
    const row = document.createElement("div");
    row.className = "item-result";
    row.innerHTML = `<span class="name">${item.name}</span><span class="rate">${formatCurrency(item.rate)}</span>`;
    row.addEventListener("click", () => {
      addItem(item);
      els.itemSearch.value = "";
      els.itemResults.classList.add("hidden");
    });
    els.itemResults.appendChild(row);
  });

  els.itemResults.classList.remove("hidden");
}

function addItem(item) {
  const service = getSelectedService();
  const category = getSelectedCategory();
  if (!service || !category) return;

  const key = `${service.id}|${category.name}|${item.name}`;
  const existing = billItems.find((b) => b.key === key);

  if (existing) {
    existing.qty = normalizeQty(existing, existing.qty + getQtyStep(existing));
  } else {
    billItems.push(
      enrichBillItem({
        key,
        name: item.name,
        service: service.name,
        category: category.name,
        rate: item.rate,
        qty: 1,
      })
    );
  }

  renderBill();
}

function removeItem(key) {
  billItems = billItems.filter((b) => b.key !== key);
  renderBill();
}

function updateQty(key, delta) {
  const item = billItems.find((b) => b.key === key);
  if (!item) return;
  const step = getQtyStep(item) * (delta > 0 ? 1 : -1);
  item.qty = normalizeQty(item, item.qty + step);
  if (item.qty <= 0) {
    removeItem(key);
  } else {
    updateRowAmount(key);
    updateTotals();
    updateActionButtons();
  }
}

function setItemQty(key, value) {
  const item = billItems.find((b) => b.key === key);
  if (!item) return;
  item.qty = normalizeQty(item, value);
  if (item.qty <= 0) {
    removeItem(key);
  } else {
    updateRowAmount(key);
    updateTotals();
    updateActionButtons();
  }
}

function updateRate(key, newRate) {
  const item = billItems.find((b) => b.key === key);
  if (!item) return;

  const rate = parseFloat(newRate);
  if (isNaN(rate) || rate < 0) {
    const input = els.billItems.querySelector(`.rate-input[data-key="${key}"]`);
    if (input) input.value = item.rate;
    return;
  }

  item.rate = rate;
  updateRowAmount(key);
  updateTotals();
}

function updateRowAmount(key) {
  const item = billItems.find((b) => b.key === key);
  if (!item) return;

  const row = els.billItems.querySelector(`tr[data-key="${key}"]`);
  if (!row) return;

  const qtyInput = row.querySelector(".qty-input");
  if (qtyInput) {
    const qty = Number(item.qty);
    qtyInput.value = qty % 1 === 0 ? qty : qty.toFixed(1);
  }

  const qtySpan = row.querySelector(".qty-value");
  if (qtySpan) qtySpan.textContent = item.qty;

  const amountCell = row.querySelector(".line-amount strong");
  if (amountCell) {
    amountCell.textContent = formatCurrency(item.rate * item.qty);
  }
}

function getSubtotal() {
  return billItems.reduce((sum, item) => sum + item.rate * item.qty, 0);
}

function getDiscountPercent() {
  const value = parseFloat(els.discountPercent.value);
  if (isNaN(value) || value < 0) return 0;
  return Math.min(value, 100);
}

function getDiscountAmount() {
  const subtotal = getSubtotal();
  const percent = getDiscountPercent();
  return Math.round((subtotal * percent) / 100);
}

function getTotal() {
  return getSubtotal() - getDiscountAmount();
}

function updateTotals() {
  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const total = getTotal();

  els.subtotalAmount.textContent = formatCurrency(subtotal);
  els.discountAmount.textContent = discount > 0 ? `− ${formatCurrency(discount)}` : "− ₹0";
  els.totalAmount.textContent = formatCurrency(total);
}

function formatPhoneForWhatsApp(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return "91" + digits.slice(1);
  return digits;
}

function normalizePhoneKey(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function getCustomerOrders(phone) {
  const key = normalizePhoneKey(phone);
  if (key.length < 10) return [];

  return getBillHistory().filter(
    (bill) => normalizePhoneKey(bill.customerPhone || "") === key
  );
}

async function refreshBillHistory() {
  billHistoryCache = await API.getBills();
  return billHistoryCache;
}

function getBillHistory() {
  return billHistoryCache;
}

async function fetchCustomerProfile(phone) {
  const key = normalizePhoneKey(phone);
  if (key.length < 10) return { profile: null, orders: [] };
  try {
    return await API.getCustomerProfile(key);
  } catch {
    return { profile: null, orders: [] };
  }
}

async function getCustomerProfile(phone) {
  const { profile } = await fetchCustomerProfile(phone);
  return profile;
}

async function migrateLocalStorageIfNeeded() {
  if (localStorage.getItem("sqlite_migrated") === "1") return;
  try {
    const history = JSON.parse(localStorage.getItem("billHistory") || "[]");
    const counter = localStorage.getItem("billCounter");
    if (history.length || counter) {
      await API.migrate({ bills: history, billCounter: counter });
    }
    localStorage.setItem("sqlite_migrated", "1");
  } catch (err) {
    console.warn("Could not migrate old browser data:", err);
  }
}

async function loadBillCounter() {
  const data = await API.getBillCounter();
  billCounter = data.billCounter;
  updateBillMeta();
}

function updateFavoriteUi(isFavorite, enabled = true) {
  const btn = els.customerFavoriteBtn;
  const badge = els.customerRegularBadge;
  if (btn) {
    btn.disabled = !enabled;
    btn.classList.toggle("active", !!isFavorite);
    btn.setAttribute("aria-pressed", isFavorite ? "true" : "false");
    btn.title = isFavorite
      ? "Regular customer — click to remove"
      : "Mark as regular customer";
  }
  if (badge) {
    badge.classList.toggle("hidden", !isFavorite || !enabled);
  }
}

async function loadCustomerFavoriteByPhone() {
  const phone = els.customerPhone.value.trim();
  const key = normalizePhoneKey(phone);
  if (key.length < 10) {
    updateFavoriteUi(false, false);
    return;
  }
  try {
    const data = await API.getCustomerFavorite(key);
    updateFavoriteUi(!!data.isFavorite, true);
  } catch {
    updateFavoriteUi(false, true);
  }
}

async function toggleCustomerFavorite() {
  const phone = els.customerPhone.value.trim();
  const key = normalizePhoneKey(phone);
  if (key.length < 10) {
    els.customerPhone.focus();
    return;
  }
  const nextFavorite = !els.customerFavoriteBtn?.classList.contains("active");
  try {
    await API.setCustomerFavorite(
      key,
      nextFavorite,
      phone,
      els.customerName.value.trim()
    );
    updateFavoriteUi(nextFavorite, true);
    loadCustomerProfileByPhone();
  } catch (err) {
    alert("Could not update regular customer: " + err.message);
  }
}

function updateProfileHint(profile, isNew = false, isFavorite = false) {
  const hint = els.customerProfileHint;
  if (!hint) return;

  if (isNew) {
    hint.textContent = isFavorite
      ? "Regular customer — profile will be created on save"
      : "New customer — profile will be created on save";
    hint.className = isFavorite ? "profile-hint regular-customer" : "profile-hint new-customer";
    hint.classList.remove("hidden");
    return;
  }

  if (!profile) {
    hint.classList.add("hidden");
    hint.textContent = "";
    return;
  }

  const favoriteNote = isFavorite || profile.isFavorite ? " · ★ Regular customer" : "";
  hint.textContent = `Returning customer · ${profile.totalOrders} order${profile.totalOrders === 1 ? "" : "s"} · ${formatCurrency(profile.totalSpent)} spent${favoriteNote}`;
  hint.className = isFavorite || profile.isFavorite ? "profile-hint regular-customer" : "profile-hint returning";
  hint.classList.remove("hidden");
  updateFavoriteUi(!!(isFavorite || profile.isFavorite), true);
}

function loadCustomerProfileByPhone() {
  const phone = els.customerPhone.value.trim();
  const key = normalizePhoneKey(phone);

  if (key.length < 10) {
    updateProfileHint(null);
    updateFavoriteUi(false, false);
    return;
  }

  Promise.all([fetchCustomerProfile(phone), API.getCustomerFavorite(key).catch(() => ({ isFavorite: false }))])
    .then(([{ profile }, favoriteData]) => {
      const isFavorite = !!favoriteData.isFavorite;
      if (profile) {
        if (!els.customerName.value.trim()) {
          els.customerName.value = profile.name;
        }
        updateProfileHint({ ...profile, isFavorite: isFavorite || profile.isFavorite }, false, isFavorite);
      } else {
        updateProfileHint(null, true, isFavorite);
        updateFavoriteUi(isFavorite, true);
      }
    });
}

function profileToStats(profile, recentOrders) {
  if (!profile) return null;
  return {
    ...profile,
    firstOrder: profile.firstOrderAt,
    lastOrder: profile.lastOrderAt,
    recentOrders,
  };
}

function computeCustomerStats(orders) {
  if (orders.length === 0) {
    return null;
  }

  const sorted = [...orders].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  let totalSpent = 0;
  let totalItems = 0;
  let pendingCount = 0;
  let doneCount = 0;

  orders.forEach((bill) => {
    totalSpent += bill.total || 0;
    totalItems += bill.items?.reduce((sum, item) => sum + item.qty, 0) || 0;
    if (getDeliveryStatus(bill) === "done") doneCount += 1;
    else pendingCount += 1;
  });

  return {
    name: sorted[0].customerName || "Customer",
    phone: sorted[0].customerPhone,
    totalOrders: orders.length,
    totalSpent,
    pendingCount,
    doneCount,
    avgOrder: Math.round(totalSpent / orders.length),
    totalItems,
    firstOrder: sorted[sorted.length - 1].createdAt,
    lastOrder: sorted[0].createdAt,
    recentOrders: sorted.slice(0, 8),
  };
}

const SERVICE_COLORS = {
  "Dry Clean": "#1a1a1a",
  "Steam Iron": "#f26522",
  Lundry: "#1976d2",
  Laundry: "#1976d2",
  "Shoe Cleaning": "#7b1fa2",
  Other: "#78909c",
};

const DELIVERY_COLORS = {
  done: "#2e7d32",
  pending: "#f26522",
};

function buildConicGradient(segments) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return "var(--cream-dark)";

  let pct = 0;
  const stops = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const start = pct;
      pct += (seg.value / total) * 100;
      return `${seg.color} ${start}% ${pct}%`;
    });

  return `conic-gradient(${stops.join(", ")})`;
}

function buildLegendHtml(segments, total, formatter) {
  if (total === 0) return "";

  return segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const pct = Math.round((seg.value / total) * 100);
      return `
        <li>
          <span class="dot" style="background:${seg.color}"></span>
          <span class="legend-text">${seg.label}</span>
          <span class="legend-value">${formatter(seg)} (${pct}%)</span>
        </li>
      `;
    })
    .join("");
}

function buildDonutChart(segments, centerValue, centerLabel) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return `<div class="chart-empty">No data yet</div>`;
  }

  const gradient = buildConicGradient(segments);
  const legend = buildLegendHtml(segments, total, (seg) => seg.display || seg.value);

  return `
    <div class="chart-wrap">
      <div class="donut" style="background:${gradient}">
        <div class="donut-center">
          <strong>${centerValue}</strong>
          <span>${centerLabel}</span>
        </div>
      </div>
      <ul class="chart-legend">${legend}</ul>
    </div>
  `;
}

function buildBarChartHtml(segments, total) {
  if (total === 0) return `<div class="chart-empty">No service data yet</div>`;

  return segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const pct = Math.round((seg.value / total) * 100);
      return `
        <div class="bar-row">
          <span class="bar-label" title="${seg.label}">${seg.label}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:${seg.color}"></div>
          </div>
          <span class="bar-pct">${pct}%</span>
        </div>
      `;
    })
    .join("");
}

function computeChartData(orders) {
  let pending = 0;
  let done = 0;
  const serviceMap = {};
  const methodMap = { saved: 0, print: 0, whatsapp: 0 };

  orders.forEach((bill) => {
    if (getDeliveryStatus(bill) === "done") done += 1;
    else pending += 1;

    const via = bill.sentVia === "whatsapp" ? "whatsapp" : bill.sentVia === "saved" ? "saved" : "print";
    methodMap[via] = (methodMap[via] || 0) + 1;

    bill.items?.forEach((item) => {
      const svc = item.service || "Other";
      const amount = (item.rate || 0) * (item.qty || 0);
      serviceMap[svc] = (serviceMap[svc] || 0) + amount;
    });
  });

  const serviceTotal = Object.values(serviceMap).reduce((a, b) => a + b, 0);
  const services = Object.entries(serviceMap)
    .map(([name, amount]) => ({
      label: name,
      value: amount,
      display: formatCurrency(amount),
      color: SERVICE_COLORS[name] || SERVICE_COLORS.Other,
    }))
    .sort((a, b) => b.value - a.value);

  const deliveryTotal = pending + done;
  const delivery = [
    { label: "Delivery Done", value: done, color: DELIVERY_COLORS.done },
    { label: "Pending", value: pending, color: DELIVERY_COLORS.pending },
  ];

  const methodTotal = Object.values(methodMap).reduce((a, b) => a + b, 0);
  const methods = [
    { label: "Saved", value: methodMap.saved, color: "#1a1a1a" },
    { label: "Printed", value: methodMap.print, color: "#f26522" },
    { label: "WhatsApp", value: methodMap.whatsapp, color: "#25d366" },
  ];

  return { delivery, deliveryTotal, services, serviceTotal, methods, methodTotal };
}

function renderCustomerStats(stats, chartData) {
  if (!stats) {
    els.customerStatsBody.innerHTML = `
      <div class="stats-empty">
        <p>No profile yet for this phone number.</p>
        <p>A customer profile will be created automatically when you save the first bill.</p>
      </div>
    `;
    return;
  }

  const charts = chartData || {
    delivery: [],
    deliveryTotal: 0,
    services: [],
    serviceTotal: 0,
    methods: [],
    methodTotal: 0,
  };

  const deliveryChart = buildDonutChart(
    charts.delivery,
    charts.deliveryTotal,
    "Orders"
  );

  const serviceChart = buildDonutChart(
    charts.services,
    formatCurrency(charts.serviceTotal),
    "Spent"
  );

  const serviceBars = buildBarChartHtml(charts.services, charts.serviceTotal);

  const methodChart = buildDonutChart(
    charts.methods,
    charts.methodTotal,
    "Bills"
  );

  const recentHtml = (stats.recentOrders || [])
    .map((bill) => {
      const status = getDeliveryStatus(bill);
      return `
        <div class="stats-recent-item">
          <div>
            <strong>Bill #${bill.billNo}</strong>
            <div class="stats-recent-meta">
              ${formatDate(new Date(bill.createdAt))} · ${bill.items?.length || 0} items
            </div>
          </div>
          <div style="text-align:right">
            <strong>${formatCurrency(bill.total)}</strong><br>
            <span class="stats-tag ${status}">${getDeliveryStatusLabel(status)}</span>
          </div>
        </div>
      `;
    })
    .join("");

  els.customerStatsBody.innerHTML = `
    ${stats.isFavorite ? '<div class="regular-customer-badge regular-customer-badge-lg">★ Regular Customer</div>' : ""}
    <div class="profile-id-badge">Profile ID: ${stats.phoneKey}</div>

    <div class="charts-row" style="margin-top:0.85rem">
      <div class="chart-panel">
        <div class="chart-panel-title">Delivery Status</div>
        ${deliveryChart}
      </div>
      <div class="chart-panel">
        <div class="chart-panel-title">Spending by Service</div>
        ${serviceChart}
      </div>
    </div>

    <div class="chart-panel full-width">
      <div class="chart-panel-title">Service Breakdown</div>
      <div class="bar-chart">${serviceBars}</div>
    </div>

    <div class="chart-panel full-width">
      <div class="chart-panel-title">How Bills Were Sent</div>
      ${methodChart}
    </div>

    <div class="stats-section-title">Summary</div>
    <div class="stats-grid">
      <div class="stat-card highlight">
        <span class="stat-value">${stats.totalOrders}</span>
        <span class="stat-label">Total Orders</span>
      </div>
      <div class="stat-card highlight">
        <span class="stat-value">${formatCurrency(stats.totalSpent)}</span>
        <span class="stat-label">Total Spent</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${stats.pendingCount}</span>
        <span class="stat-label">Pending Delivery</span>
      </div>
      <div class="stat-card done-stat">
        <span class="stat-value">${stats.doneCount}</span>
        <span class="stat-label">Deliveries Done</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${formatCurrency(stats.avgOrder)}</span>
        <span class="stat-label">Avg. Order Value</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${stats.totalItems}</span>
        <span class="stat-label">Total Items Washed</span>
      </div>
    </div>
    <div class="stats-section-title">Order Timeline</div>
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value" style="font-size:1rem;font-family:Montserrat,sans-serif;font-weight:700;color:var(--black)">${formatDate(new Date(stats.firstOrder))}</span>
        <span class="stat-label">First Order</span>
      </div>
      <div class="stat-card">
        <span class="stat-value" style="font-size:1rem;font-family:Montserrat,sans-serif;font-weight:700;color:var(--black)">${formatDate(new Date(stats.lastOrder))}</span>
        <span class="stat-label">Last Order</span>
      </div>
    </div>
    <div class="stats-section-title" style="margin-top:1rem">Recent Orders</div>
    <div class="stats-recent-list">${recentHtml}</div>
  `;
}

function showCustomerStats(phoneOverride, nameOverride) {
  const phone = (
    typeof phoneOverride === "string" ? phoneOverride : els.customerPhone.value
  ).trim();
  const displayNameInput = (
    typeof nameOverride === "string" ? nameOverride : els.customerName.value
  ).trim();

  if (normalizePhoneKey(phone).length < 10) {
    alert("Please enter a valid 10-digit phone number first.");
    if (!phoneOverride) els.customerPhone.focus();
    return;
  }

  fetchCustomerProfile(phone).then(async ({ profile, orders }) => {
    const key = normalizePhoneKey(phone);
    let isFavorite = profile?.isFavorite || false;
    try {
      const fav = await API.getCustomerFavorite(key);
      isFavorite = !!fav.isFavorite;
    } catch {
      /* ignore */
    }

    const chartData = computeChartData(orders);
    let stats = profileToStats(profile, orders.slice(0, 8));

    if (!stats && orders.length > 0) {
      const computed = computeCustomerStats(orders);
      stats = {
        ...computed,
        phoneKey: key,
        profileCreatedAt: computed.firstOrder,
      };
    }
    if (stats) stats.isFavorite = isFavorite;

    const displayName = displayNameInput || profile?.name || stats?.name || "New Customer";

    document.getElementById("customerStatsTitle").textContent = displayName;

    if (profile) {
      els.customerStatsPhone.textContent = profile.phone;
      const memberSince = new Date(profile.profileCreatedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      els.customerStatsMember.textContent = `Customer since ${memberSince}`;
      els.customerStatsMember.classList.remove("hidden");
    } else {
      els.customerStatsPhone.textContent = phone;
      els.customerStatsMember.textContent = "New customer — no profile yet";
      els.customerStatsMember.classList.remove("hidden");
    }

    renderCustomerStats(stats, chartData);
    els.customerStatsModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  });
}

function hideCustomerStats() {
  els.customerStatsModal.classList.add("hidden");
  document.body.style.overflow = "";
}

function formatDeliveryDateOnly(dateVal) {
  if (!dateVal) return "—";
  const [year, month, day] = dateVal.split("-").map(Number);
  const delivery = new Date(year, month - 1, day);
  if (Number.isNaN(delivery.getTime())) return dateVal;
  return delivery.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDeliveryScheduleFromBill(bill) {
  if (bill.deliveryDate) return formatDeliveryDateOnly(bill.deliveryDate);

  let part = (bill.deliveryDisplay || "").trim();
  if (part.includes(" · ")) part = part.split(" · ").slice(1).join(" · ").trim();
  for (const label of Object.values(DELIVERY_TIME_LABELS)) {
    if (part.endsWith(`, ${label}`)) {
      part = part.slice(0, -(`, ${label}`.length)).trim();
      break;
    }
  }
  return part || "—";
}

function buildWhatsAppBillMessage(bill) {
  const name = bill.customerName?.trim() || "Customer";
  const delivery = formatDeliveryScheduleFromBill(bill);
  const total = formatCurrency(bill.total).replace("\u20B9", "Rs. ");

  let message =
    `Hi ${name},\n\n` +
    `Your invoice from *Rinse & Rise Laundryrite* is attached.\n\n` +
    `Bill No: *#${bill.billNo}*\n` +
    `Delivery: ${delivery}\n\n` +
    `*Items:*\n`;

  (bill.items || []).forEach((item, i) => {
    const amount = item.rate * item.qty;
    message += `${i + 1}. ${item.name}\n`;
    message += `   ${formatQtyRateLine(item).replace("\u20B9", "Rs. ")} = *${formatCurrency(amount).replace("\u20B9", "Rs. ")}*\n`;
  });

  message += `\n`;
  if (bill.discountAmount > 0) {
    message += `Subtotal: ${formatCurrency(bill.subtotal).replace("\u20B9", "Rs. ")}\n`;
    message += `Discount (${bill.discountPercent}%): − ${formatCurrency(bill.discountAmount).replace("\u20B9", "Rs. ")}\n`;
  }
  message +=
    `*TOTAL: ${total}*\n\n` +
    `Thank you for choosing us!\n` +
    `Rinse - Rise - Repeat\n` +
    `Call: 9591506548 | 9 AM - 9 PM` +
    googleReviewMessageBlock();
  return message;
}

function buildWhatsAppShortMessage(bill) {
  return buildWhatsAppBillMessage(bill);
}

let pendingWhatsAppBillId = null;
let pendingWhatsAppWatcher = null;

function stopPendingWhatsAppWatcher() {
  if (pendingWhatsAppWatcher) {
    clearInterval(pendingWhatsAppWatcher);
    pendingWhatsAppWatcher = null;
  }
}

function startPendingWhatsAppWatcher(billId) {
  pendingWhatsAppBillId = billId;
  stopPendingWhatsAppWatcher();
  pendingWhatsAppWatcher = setInterval(async () => {
    if (!pendingWhatsAppBillId) return;
    try {
      const status = await API.getWhatsAppStatus();
      if (!status.ready) return;
      const result = await API.sendBillWhatsApp(pendingWhatsAppBillId);
      if (result.sent) {
        pendingWhatsAppBillId = null;
        stopPendingWhatsAppWatcher();
        showWhatsAppToast(
          "<strong>Invoice PDF sent!</strong>The PDF invoice was delivered on WhatsApp."
        );
        closeWhatsAppConnectModal();
        refreshWhatsAppStatus();
      } else if (result.error) {
        stopPendingWhatsAppWatcher();
        alert("Could not send PDF: " + result.error);
      }
    } catch {
      /* keep polling until connected */
    }
  }, 2000);
}

async function downloadBillInvoicePdf(bill) {
  let blob;
  let filename;
  try {
    ({ blob, filename } = await API.fetchBillInvoicePdf(bill.id));
  } catch {
    ({ blob, filename } = await InvoicePdf.generate(bill));
  }
  InvoicePdf.triggerDownload(blob, filename);
  return filename;
}

function showWhatsAppToast(html, durationMs = 7000) {
  const toast = $("#whatsappToast");
  if (!toast) return;
  toast.innerHTML = html;
  toast.classList.remove("hidden");
  clearTimeout(showWhatsAppToast._timer);
  showWhatsAppToast._timer = setTimeout(() => toast.classList.add("hidden"), durationMs);
}

async function shareBillOnWhatsApp(phone, bill) {
  if (!bill?.id) {
    throw new Error("Bill must be saved before sending on WhatsApp.");
  }

  let result;
  try {
    result = await API.sendBillWhatsApp(bill.id);
  } catch (err) {
    throw new Error(err.message || "Could not reach WhatsApp service.");
  }

  if (result.sent) {
    showWhatsAppToast(
      "<strong>Invoice PDF sent!</strong>The PDF invoice was delivered on WhatsApp."
    );
    refreshWhatsAppStatus();
    return true;
  }

  if (result.reason === "not_connected") {
    pendingWhatsAppBillId = bill.id;
    openWhatsAppConnectModal();
    startPendingWhatsAppWatcher(bill.id);
    showWhatsAppToast(
      "<strong>Scan WhatsApp QR</strong>Connect WhatsApp once to send the PDF invoice automatically."
    );
    return false;
  }

  if (result.reason === "send_failed" && result.error) {
    const needsReconnect =
      result.needsReconnect ||
      /detached frame|session expired|not connected|reconnect|startcomms|sendiq|\[comms\]/i.test(result.error);
    if (needsReconnect) {
      pendingWhatsAppBillId = bill.id;
      openWhatsAppConnectModal();
      startPendingWhatsAppWatcher(bill.id);
      showWhatsAppToast(
        "<strong>WhatsApp reconnecting</strong>Session expired — scan QR if shown, then send again."
      );
      return false;
    }
    await downloadBillInvoicePdf(bill);
    throw new Error(result.error);
  }

  throw new Error("Could not send invoice PDF on WhatsApp.");
}

let whatsAppStatusTimer = null;
let lastRenderedWhatsAppQr = null;

function isHostedDeployment() {
  const host = window.location.hostname.toLowerCase();
  return (
    host.includes("railway.app") ||
    host.includes("up.railway.app") ||
    host.endsWith(".vercel.app") ||
    host.endsWith(".onrender.com")
  );
}

function isWhatsAppHosted(status) {
  return Boolean(status?.hosted ?? isHostedDeployment());
}

async function refreshWhatsAppStatus() {
  const pill = $("#whatsappStatusPill");
  if (!pill) return;
  const hosted = isHostedDeployment();
  try {
    const status = await API.getWhatsAppStatus();
    const onHosted = isWhatsAppHosted(status);
    pill.dataset.state = status.ready ? "ready" : status.available ? "waiting" : "offline";
    pill.title = status.ready
      ? "WhatsApp connected — invoices send automatically"
      : status.available
        ? onHosted
          ? "WhatsApp waiting — click to scan QR code (hosted server)"
          : "WhatsApp waiting — click to scan QR code"
        : onHosted
          ? "WhatsApp scanner starting on server — click to open"
          : "WhatsApp bridge not running — restart Start Billing.bat";
    pill.querySelector(".wa-pill-label").textContent = status.ready
      ? "WhatsApp Ready"
      : status.available
        ? "Scan WhatsApp QR"
        : onHosted
          ? "Starting Scanner…"
          : "WhatsApp Offline";
  } catch {
    pill.dataset.state = "offline";
    pill.title = hosted
      ? "WhatsApp scanner starting on server — click to open"
      : "WhatsApp bridge not running";
    pill.querySelector(".wa-pill-label").textContent = hosted
      ? "Starting Scanner…"
      : "WhatsApp Offline";
  }
}

function openWhatsAppConnectModal() {
  const modal = $("#whatsappConnectModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  renderWhatsAppConnectLoading();
  clearInterval(whatsAppStatusTimer);
  whatsAppStatusTimer = setInterval(pollWhatsAppConnectModal, 2500);
  pollWhatsAppConnectModal(true);
}

function renderWhatsAppConnectLoading() {
  const body = $("#whatsappConnectBody");
  if (!body) return;
  body.innerHTML = `
    <div class="wa-connect-loading">
      <div class="wa-connect-spinner" aria-hidden="true"></div>
      <p>Opening WhatsApp scanner…</p>
    </div>
  `;
}

function closeWhatsAppConnectModal() {
  const modal = $("#whatsappConnectModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  clearInterval(whatsAppStatusTimer);
  whatsAppStatusTimer = null;
  refreshWhatsAppStatus();
}

async function pollWhatsAppConnectModal(startBridge = false) {
  const body = $("#whatsappConnectBody");
  if (!body || $("#whatsappConnectModal")?.classList.contains("hidden")) return;
  try {
    const status = startBridge
      ? await API.getWhatsAppStatus(true)
      : await API.getWhatsAppStatus();
    renderWhatsAppConnectBody(status);
    if (status.ready) {
      showWhatsAppToast("<strong>WhatsApp connected!</strong>PDF invoices will now send automatically.");
      if (pendingWhatsAppBillId) {
        startPendingWhatsAppWatcher(pendingWhatsAppBillId);
      }
      setTimeout(closeWhatsAppConnectModal, 1200);
    }
  } catch {
    renderWhatsAppConnectBody({ available: false, hosted: isHostedDeployment(), phase: "starting" });
  }
}

function renderWhatsAppConnectBody(status = null) {
  const body = $("#whatsappConnectBody");
  if (!body) return;

  if (status?.enabled === false) {
    lastRenderedWhatsAppQr = null;
    body.innerHTML = `
      <p class="wa-connect-msg">WhatsApp sending is turned off on this server.</p>
      <p class="wa-connect-hint">Ask your admin to set <strong>WHATSAPP_ENABLED=1</strong> on Railway and redeploy.</p>
    `;
    return;
  }

  const bridgeAvailable = Boolean(status?.available);
  const hosted = isWhatsAppHosted(status);

  if (!bridgeAvailable) {
    lastRenderedWhatsAppQr = null;
    const hostedHint = hosted
      ? `<p class="wa-connect-hint">The QR scanner runs on this server. First start can take <strong>1–3 minutes</strong> while Chrome loads — keep this window open.</p>
         <p class="wa-connect-hint">If no QR appears, click <strong>Retry Scanner</strong> and wait again.</p>`
      : `<ol class="wa-connect-steps">
          <li>Install <strong>Node.js</strong> from <a href="https://nodejs.org" target="_blank" rel="noopener">nodejs.org</a> if not installed</li>
          <li>Close this page and restart <strong>Start Billing.bat</strong></li>
          <li>Click the <strong>WhatsApp</strong> button in the header again</li>
        </ol>`;
    const msg =
      status?.lastError ||
      (hosted
        ? "Starting WhatsApp scanner on the server…"
        : "WhatsApp scanner service is not running yet.");
    body.innerHTML = `
      <p class="wa-connect-msg">${escapeHtml(msg)}</p>
      ${hostedHint}
      <button type="button" class="btn btn-primary wa-reset-btn" id="whatsappStartBridgeBtn">${hosted ? "Retry Scanner" : "Start WhatsApp Scanner"}</button>
    `;
    bindWhatsAppStartButton(hosted);
    return;
  }

  if (status?.ready) {
    lastRenderedWhatsAppQr = null;
    body.innerHTML = `
      <div class="wa-connect-ready">
        <span class="wa-connect-icon">✓</span>
        <p><strong>WhatsApp is connected!</strong></p>
        <p>Invoice PDFs will now send automatically to customers.</p>
      </div>
    `;
    return;
  }

  const errorHtml = status?.lastError
    ? `<p class="wa-connect-error">${escapeHtml(status.lastError)}</p>`
    : "";

  if (status?.phase === "loading" || status?.phase === "authenticating") {
    lastRenderedWhatsAppQr = null;
    const pct = status.loadingPercent || 0;
    const label =
      status.phase === "authenticating"
        ? "Phone linked — finishing setup on this computer…"
        : `Loading WhatsApp Web… ${pct}%`;
    body.innerHTML = `
      <p class="wa-connect-msg">${label}</p>
      <div class="wa-connect-progress"><div class="wa-connect-progress-bar" style="width:${Math.max(pct, 8)}%"></div></div>
      ${errorHtml}
      <p class="wa-connect-hint">Keep this window open. This can take up to 2 minutes the first time.</p>
      <button type="button" class="btn btn-secondary wa-reset-btn" id="whatsappResetBtn">Reset Connection</button>
    `;
    bindWhatsAppResetButton();
    return;
  }

  if (status?.qr) {
    if (lastRenderedWhatsAppQr === status.qr && body.querySelector(".wa-qr-image")) {
      if (errorHtml) {
        const errEl = body.querySelector(".wa-connect-error");
        if (errEl) errEl.textContent = status.lastError;
        else body.querySelector(".wa-connect-hint")?.insertAdjacentHTML("beforebegin", errorHtml);
      }
      return;
    }
    lastRenderedWhatsAppQr = status.qr;
    body.innerHTML = `
      <p class="wa-connect-msg">Open WhatsApp on your phone → <strong>Linked Devices</strong> → <strong>Link a Device</strong>, then scan this QR code.</p>
      <div class="wa-qr-wrap">
        <img class="wa-qr-image" src="${status.qr}" alt="WhatsApp QR code" width="280" height="280">
      </div>
      ${errorHtml}
      <p class="wa-connect-hint">QR refreshes every ~20 seconds. If scan fails, wait for a new code or click Reset Connection.</p>
      <button type="button" class="btn btn-secondary wa-reset-btn" id="whatsappResetBtn">Reset Connection</button>
    `;
    bindWhatsAppResetButton();
    return;
  }

  lastRenderedWhatsAppQr = null;
  const waitingHint = isWhatsAppHosted(status)
    ? "If this takes more than 2 minutes on the hosted server, click Reset Connection or Retry Scanner."
    : "If this takes more than a minute, click Reset Connection or restart <strong>Start Billing.bat</strong>.";
  body.innerHTML = `
    <p class="wa-connect-msg">Waiting for WhatsApp QR code…</p>
    ${errorHtml}
    <p class="wa-connect-hint">${waitingHint}</p>
    <button type="button" class="btn btn-secondary wa-reset-btn" id="whatsappResetBtn">Reset Connection</button>
  `;
  bindWhatsAppResetButton();
}

function bindWhatsAppResetButton() {
  $("#whatsappResetBtn")?.addEventListener("click", resetWhatsAppConnection);
}

async function bindWhatsAppStartButton(hosted = isHostedDeployment()) {
  const btn = $("#whatsappStartBridgeBtn");
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "1";
  const retryLabel = hosted ? "Retry Scanner" : "Start WhatsApp Scanner";
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = hosted ? "Starting scanner…" : "Starting…";
    try {
      await API.startWhatsAppBridge();
      renderWhatsAppConnectLoading();
      setTimeout(() => pollWhatsAppConnectModal(true), 1500);
    } catch (err) {
      const hint = hosted
        ? "Scanner is still starting on the server — wait 1–2 minutes and try again."
        : err.message || "Restart Start Billing.bat";
      showWhatsAppToast(`<strong>Could not start scanner</strong>${escapeHtml(hint)}`);
    } finally {
      btn.disabled = false;
      btn.textContent = retryLabel;
    }
  });
}

async function resetWhatsAppConnection() {
  const btn = $("#whatsappResetBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Resetting…";
  }
  lastRenderedWhatsAppQr = null;
  try {
    await API.resetWhatsAppSession();
    showWhatsAppToast("<strong>Connection reset</strong>Wait for a fresh QR code, then scan again.");
    pollWhatsAppConnectModal();
  } catch (err) {
    showWhatsAppToast(`<strong>Reset failed</strong>${escapeHtml(err.message || "Try restarting Start Billing.bat")}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Reset Connection";
    }
  }
}

function buildBillMessage() {
  const name = els.customerName.value.trim() || "Customer";
  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const percent = getDiscountPercent();
  const total = getTotal();
  const billNo = String(billCounter).padStart(4, "0");
  const date = formatDate(new Date());

  let message = `*RINSE & RISE LAUNDRYRITE*\n`;
  message += `Rinse · Rise · Repeat\n`;
  message += `━━━━━━━━━━━━━━━━\n\n`;
  message += `Bill No: *#${billNo}*\n`;
  message += `Date: ${date}\n`;
  message += `Customer: *${name}*\n`;
  message += `Delivery: *${formatDeliveryScheduleFromBill({ deliveryDate: els.deliveryDate.value, deliveryTime: getDeliveryTimeSlot(), deliveryDisplay: formatDeliveryDateTime() })}*\n\n`;
  message += `*Items:*\n`;

  billItems.forEach((item, i) => {
    const amount = item.rate * item.qty;
    message += `${i + 1}. ${item.name}\n`;
    message += `   ${formatQtyRateLine(item)} = *${formatCurrency(amount)}*\n`;
    message += `   (${item.service})\n`;
  });

  message += `\n━━━━━━━━━━━━━━━━\n`;
  if (discount > 0) {
    message += `Subtotal: ${formatCurrency(subtotal)}\n`;
    message += `Discount (${percent}%): − ${formatCurrency(discount)}\n`;
  }
  message += `*TOTAL: ${formatCurrency(total)}*\n\n`;
  message += `Thank you for choosing us!\n`;
  message += `Free Pickup & Delivery\n`;
  message += `Call: 9591506548 | 9 AM – 9 PM\n`;
  message += `Express 24-Hr Delivery`;

  return message;
}

function getDeliveryStatus(bill) {
  const status = bill.deliveryStatus;
  if (status === "done") return "done";
  if (status === "ready") return "ready";
  return "pending";
}

function getDeliveryStatusLabel(status) {
  if (status === "done") return "Delivery Done";
  if (status === "ready") return "Order Ready";
  return "Pending";
}

function getDeliveryStatusBadgeText(status) {
  if (status === "done") return "✓ Delivery Done";
  if (status === "ready") return "✓ Order Ready";
  return "⏳ Delivery Pending";
}

function getSentViaLabel(sentVia) {
  if (sentVia === "whatsapp") return "WhatsApp";
  if (sentVia === "saved") return "Saved";
  return "Printed";
}

function buildCurrentBillPayload(sentVia) {
  const modes = getNormalizedServiceModes();
  return {
    billNo: String(billCounter).padStart(4, "0"),
    createdAt: new Date().toISOString(),
    customerName: els.customerName.value.trim(),
    customerPhone: els.customerPhone.value.trim(),
    deliveryDate: els.deliveryDate.value,
    deliveryTime: getDeliveryTimeSlot(),
    deliveryDisplay: formatDeliveryDateTime(),
    paymentType: getPaymentType(),
    paymentInfo: getPaymentInfo(),
    homeServiceMode: modes.home || "door-pickup",
    shopServiceMode: modes.shop || "",
    items: billItems.map((item) => ({ ...enrichBillItem(item) })),
    subtotal: getSubtotal(),
    discountPercent: getDiscountPercent(),
    discountAmount: getDiscountAmount(),
    total: getTotal(),
    sentVia,
    deliveryStatus: "pending",
    completedAt: null,
  };
}

async function saveBillToDatabase(sentVia) {
  if (billItems.length === 0) return null;
  if (!validateCustomerRequired()) return null;
  const saved = await API.createBill(buildCurrentBillPayload(sentVia));
  await refreshBillHistory();
  const counterData = await API.getBillCounter();
  billCounter = counterData.billCounter;
  updateBillMeta();
  return saved;
}

async function finalizeBill(sentVia = "print") {
  await saveBillToDatabase(sentVia);
}

function hideSecondaryViews() {
  els.billingView.classList.add("hidden");
  els.historyView.classList.add("hidden");
  els.expenditureView.classList.add("hidden");
}

function showBillingView() {
  hideSecondaryViews();
  els.billingView.classList.remove("hidden");
  els.historyBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    History
  `;
}

function showHistoryView() {
  hideSecondaryViews();
  els.historyView.classList.remove("hidden");
  selectedHistoryId = null;
  historyEditDraft = null;
  historyPeriodFilter = "today";
  historyCustomDate = "";
  refreshBillHistory().then(() => {
    syncHistoryPeriodUi();
    renderHistoryList();
    renderHistoryDetail(null);
  });
}

async function refreshExpenditures() {
  const { from, to } = getExpenditureDateRange();
  expenditureCache = await API.getExpenditures(from, to);
  renderExpenditureList();
}

function renderExpenditureList() {
  const { items, total, count } = expenditureCache;

  els.expenditureTotalBadge.textContent = `Total: ${formatCurrency(total)}`;
  els.expenditureCount.textContent = `${count} entr${count === 1 ? "y" : "ies"}`;

  if (items.length === 0) {
    els.expenditureList.innerHTML =
      '<p class="expenditure-empty">No expenditures yet. Add your first entry.</p>';
    return;
  }

  els.expenditureList.innerHTML = items
    .map(
      (item) => `
      <div class="expenditure-row" data-id="${item.id}">
        <div class="expenditure-row-main">
          <strong class="expenditure-row-name">${escapeHtml(item.name)}</strong>
          <span class="expenditure-row-date">${formatDate(new Date(item.createdAt))}</span>
        </div>
        <div class="expenditure-row-right">
          <span class="expenditure-row-amount">${formatCurrency(item.amount)}</span>
          <button type="button" class="btn-remove expenditure-delete" data-id="${item.id}" title="Remove">×</button>
        </div>
      </div>
    `
    )
    .join("");

  els.expenditureList.querySelectorAll(".expenditure-delete").forEach((btn) => {
    btn.addEventListener("click", () => deleteExpenditureEntry(Number(btn.dataset.id)));
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function addExpenditureEntry(name, amount, date) {
  await API.createExpenditure(name.trim(), amount, date);
  await refreshExpenditures();
}

async function deleteExpenditureEntry(id) {
  if (!confirm("Remove this expenditure entry?")) return;
  try {
    await API.deleteExpenditure(id);
    await refreshExpenditures();
  } catch (err) {
    alert("Could not remove entry: " + err.message);
  }
}

function openExpenditurePasswordModal() {
  if (!els.expenditurePasswordModal) return;
  els.expenditurePasswordError?.classList.add("hidden");
  els.expenditurePasswordForm?.reset();
  els.expenditurePasswordModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => els.expenditurePasswordInput?.focus());
}

function closeExpenditurePasswordModal() {
  if (!els.expenditurePasswordModal) return;
  els.expenditurePasswordModal.classList.add("hidden");
  els.expenditurePasswordError?.classList.add("hidden");
  document.body.style.overflow = "";
}

function handleExpenditurePasswordSubmit(e) {
  e.preventDefault();
  const entered = els.expenditurePasswordInput?.value || "";
  if (entered !== EXPENDITURE_PASSWORD) {
    els.expenditurePasswordError?.classList.remove("hidden");
    els.expenditurePasswordInput?.select();
    return;
  }
  closeExpenditurePasswordModal();
  showExpenditureView();
}

function requestExpenditureAccess() {
  openExpenditurePasswordModal();
}

function showExpenditureView() {
  hideSecondaryViews();
  els.expenditureView.classList.remove("hidden");
  setDefaultExpenditureDates();
  refreshExpenditures();
}

function handleExpenditureDateFilterChange() {
  const { from, to } = getExpenditureDateRange();
  if (from && to && from > to) {
    alert("From date cannot be after To date.");
    return;
  }
  refreshExpenditures().then(() => renderExpenditureList());
}

function handleExpenditureSubmit(e) {
  e.preventDefault();
  const name = els.expenditureName.value.trim();
  const amount = parseFloat(els.expenditureAmount.value);
  const date = els.expenditureDate.value;

  if (!name) {
    alert("Please enter what the expenditure was for.");
    els.expenditureName.focus();
    return;
  }
  if (!date) {
    alert("Please select a date.");
    els.expenditureDate.focus();
    return;
  }
  if (!amount || amount <= 0) {
    alert("Please enter a valid amount.");
    els.expenditureAmount.focus();
    return;
  }

  addExpenditureEntry(name, amount, date)
    .then(() => {
      els.expenditureForm.reset();
      setDefaultExpenditureDates();
      els.expenditureName.focus();
      renderExpenditureList();
    })
    .catch((err) => alert("Could not save expenditure: " + err.message));
}

function computeProfitLossLocal() {
  const { from, to } = getExpenditureDateRange();
  const orders = getBillHistory().filter((bill) => billInDateRange(bill, from, to));
  const expenseItems = (expenditureCache.items || []).filter((item) =>
    expenditureInDateRange(item, from, to)
  );
  const totalRevenue = orders.reduce((sum, bill) => sum + (bill.total || 0), 0);
  const totalExpenditure = expenseItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const profitLoss = totalRevenue - totalExpenditure;

  const serviceMap = {};
  orders.forEach((bill) => {
    bill.items?.forEach((item) => {
      const svc = item.service || "Other";
      const amount = (item.rate || 0) * (item.qty || 0);
      serviceMap[svc] = (serviceMap[svc] || 0) + amount;
    });
  });

  return {
    totalRevenue,
    orderCount: orders.length,
    totalExpenditure,
    expenditureCount: expenseItems.length,
    profitLoss,
    isProfit: profitLoss >= 0,
    expenditureItems: expenseItems,
    serviceIncome: Object.entries(serviceMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount),
    dateFrom: from,
    dateTo: to,
  };
}

const PL_COLORS = {
  profit: "#2e7d32",
  loss: "#c62828",
  expenditure: "#c62828",
  income: "#2e7d32",
};

const EXPENDITURE_PIE_COLORS = [
  "#f26522",
  "#1a1a1a",
  "#1976d2",
  "#7b1fa2",
  "#00838f",
  "#6d4c41",
  "#455a64",
  "#ad1457",
];

function buildProfitLossCharts(data) {
  const { totalRevenue, totalExpenditure, profitLoss, isProfit } = data;

  let overviewSegments;
  if (totalRevenue > 0 && isProfit) {
    overviewSegments = [
      {
        label: "Net Profit",
        value: profitLoss,
        display: formatCurrency(profitLoss),
        color: PL_COLORS.profit,
      },
      {
        label: "Expenditure",
        value: totalExpenditure,
        display: formatCurrency(totalExpenditure),
        color: PL_COLORS.expenditure,
      },
    ];
  } else if (totalRevenue > 0 && !isProfit) {
    overviewSegments = [
      {
        label: "Income (Orders)",
        value: totalRevenue,
        display: formatCurrency(totalRevenue),
        color: PL_COLORS.income,
      },
      {
        label: "Uncovered Loss",
        value: Math.abs(profitLoss),
        display: formatCurrency(Math.abs(profitLoss)),
        color: PL_COLORS.loss,
      },
    ];
  } else if (totalExpenditure > 0) {
    overviewSegments = [
      {
        label: "Expenditure",
        value: totalExpenditure,
        display: formatCurrency(totalExpenditure),
        color: PL_COLORS.expenditure,
      },
    ];
  } else {
    overviewSegments = [];
  }

  const overviewChart = buildDonutChart(
    overviewSegments,
    isProfit ? formatCurrency(profitLoss) : formatCurrency(Math.abs(profitLoss)),
    isProfit ? "Net Profit" : totalRevenue > 0 ? "Net Loss" : "No Income"
  );

  const expenseItems = data.expenditureItems || [];
  const expenseSegments = expenseItems.map((item, i) => ({
    label: item.name,
    value: item.amount,
    display: formatCurrency(item.amount),
    color: EXPENDITURE_PIE_COLORS[i % EXPENDITURE_PIE_COLORS.length],
  }));
  const expenseChart = buildDonutChart(
    expenseSegments,
    formatCurrency(totalExpenditure),
    "Spent"
  );

  const serviceItems = data.serviceIncome || [];
  const serviceSegments = serviceItems.map((item) => ({
    label: item.name,
    value: item.amount,
    display: formatCurrency(item.amount),
    color: SERVICE_COLORS[item.name] || SERVICE_COLORS.Other,
  }));
  const incomeChart = buildDonutChart(
    serviceSegments,
    formatCurrency(totalRevenue),
    "Income"
  );

  return { overviewChart, expenseChart, incomeChart };
}

function renderProfitLossReport(data) {
  const isProfit = data.isProfit;
  const resultLabel = isProfit ? "Net Profit" : "Net Loss";
  const resultClass = isProfit ? "profit" : "loss";
  const resultAmount = formatCurrency(Math.abs(data.profitLoss));
  const charts = buildProfitLossCharts(data);
  const rangeLabel = formatDateRangeLabel(data.dateFrom, data.dateTo);

  els.profitLossBody.innerHTML = `
    <p class="pl-date-range">Period: <strong>${rangeLabel}</strong></p>
    <div class="pl-summary-card ${resultClass}">
      <span class="pl-result-label">${resultLabel}</span>
      <span class="pl-result-amount">${resultAmount}</span>
      <span class="pl-result-hint">${isProfit ? "Income is more than expenditure" : "Expenditure is more than income"}</span>
    </div>
    <div class="charts-row pl-charts">
      <div class="chart-panel">
        <div class="chart-panel-title">Profit vs Expenditure</div>
        ${charts.overviewChart}
      </div>
      <div class="chart-panel">
        <div class="chart-panel-title">Income by Service</div>
        ${charts.incomeChart}
      </div>
      <div class="chart-panel">
        <div class="chart-panel-title">Expenditure Breakdown</div>
        ${charts.expenseChart}
      </div>
    </div>
    <div class="pl-formula">
      <div class="pl-row pl-income">
        <div class="pl-row-head">
          <span class="pl-icon">↑</span>
          <div>
            <strong>Total Income</strong>
            <span class="pl-sub">From all orders / bills</span>
          </div>
        </div>
        <div class="pl-row-values">
          <span class="pl-amount">${formatCurrency(data.totalRevenue)}</span>
          <span class="pl-count">${data.orderCount} order${data.orderCount === 1 ? "" : "s"}</span>
        </div>
      </div>
      <div class="pl-minus">−</div>
      <div class="pl-row pl-expense">
        <div class="pl-row-head">
          <span class="pl-icon">↓</span>
          <div>
            <strong>Total Expenditure</strong>
            <span class="pl-sub">Shop running costs</span>
          </div>
        </div>
        <div class="pl-row-values">
          <span class="pl-amount">${formatCurrency(data.totalExpenditure)}</span>
          <span class="pl-count">${data.expenditureCount} entr${data.expenditureCount === 1 ? "y" : "ies"}</span>
        </div>
      </div>
      <div class="pl-equals">=</div>
      <div class="pl-row pl-result ${resultClass}">
        <div class="pl-row-head">
          <span class="pl-icon">${isProfit ? "✓" : "!"}</span>
          <div>
            <strong>${resultLabel}</strong>
            <span class="pl-sub">Income minus expenditure</span>
          </div>
        </div>
        <div class="pl-row-values">
          <span class="pl-amount">${resultAmount}</span>
        </div>
      </div>
    </div>
  `;
}

async function showProfitLossReport() {
  const { from, to } = getExpenditureDateRange();
  if (from && to && from > to) {
    alert("From date cannot be after To date.");
    return;
  }

  try {
    let data;
    try {
      data = await API.getProfitLoss(from, to);
    } catch {
      await refreshBillHistory();
      await refreshExpenditures();
      data = computeProfitLossLocal();
    }
    renderProfitLossReport(data);
    els.profitLossModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  } catch (err) {
    alert("Could not calculate profit & loss: " + err.message);
  }
}

function computeOverallStatsLocal() {
  const orders = getBillHistory();
  let totalRevenue = 0;
  let totalDiscount = 0;
  let totalItems = 0;
  let pendingOrders = 0;
  let doneOrders = 0;
  const serviceRevenue = {};
  const serviceItems = {};
  const sentVia = { saved: 0, print: 0, whatsapp: 0 };

  orders.forEach((bill) => {
    totalRevenue += bill.total || 0;
    totalDiscount += bill.discountAmount || 0;
    if (getDeliveryStatus(bill) === "done") doneOrders += 1;
    else pendingOrders += 1;

    const via =
      bill.sentVia === "whatsapp" ? "whatsapp" : bill.sentVia === "saved" ? "saved" : "print";
    sentVia[via] = (sentVia[via] || 0) + 1;

    bill.items?.forEach((item) => {
      const qty = item.qty || 0;
      totalItems += qty;
      const svc = item.service || "Other";
      const amount = (item.rate || 0) * qty;
      serviceRevenue[svc] = (serviceRevenue[svc] || 0) + amount;
      serviceItems[svc] = (serviceItems[svc] || 0) + qty;
    });
  });

  const totalOrders = orders.length;
  return {
    totalOrders,
    totalRevenue,
    totalDiscount,
    totalItems,
    pendingOrders,
    doneOrders,
    avgOrderValue: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
    serviceRevenue: Object.entries(serviceRevenue)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount),
    serviceItems: Object.entries(serviceItems)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    sentVia,
  };
}

function buildOverallCharts(data) {
  const deliveryChart = buildDonutChart(
    [
      { label: "Delivery Done", value: data.doneOrders, color: DELIVERY_COLORS.done },
      { label: "Pending", value: data.pendingOrders, color: DELIVERY_COLORS.pending },
    ],
    String(data.totalOrders),
    "Orders"
  );

  const serviceSegments = (data.serviceRevenue || []).map((item) => ({
    label: item.name,
    value: item.amount,
    display: formatCurrency(item.amount),
    color: SERVICE_COLORS[item.name] || SERVICE_COLORS.Other,
  }));
  const serviceTotal = serviceSegments.reduce((sum, s) => sum + s.value, 0);
  const revenueChart = buildDonutChart(
    serviceSegments,
    formatCurrency(data.totalRevenue),
    "Revenue"
  );

  const itemSegments = (data.serviceItems || []).map((item) => ({
    label: item.name,
    value: item.count,
    display: `${item.count} items`,
    color: SERVICE_COLORS[item.name] || SERVICE_COLORS.Other,
  }));
  const itemTotal = itemSegments.reduce((sum, s) => sum + s.value, 0);
  const itemsChart = buildDonutChart(itemSegments, String(data.totalItems), "Items");

  const sent = data.sentVia || {};
  const methodChart = buildDonutChart(
    [
      { label: "Saved", value: sent.saved || 0, color: "#1a1a1a" },
      { label: "Printed", value: sent.print || 0, color: "#f26522" },
      { label: "WhatsApp", value: sent.whatsapp || 0, color: "#25d366" },
    ],
    String(data.totalOrders),
    "Bills"
  );

  const barChart = buildBarChartHtml(serviceSegments, serviceTotal);

  return { deliveryChart, revenueChart, itemsChart, methodChart, barChart };
}

function renderOverallStatsReport(data) {
  const charts = buildOverallCharts(data);

  els.overallStatsBody.innerHTML = `
    <div class="overall-summary-grid">
      <div class="overall-stat-card highlight">
        <span class="overall-stat-label">Total Orders</span>
        <strong class="overall-stat-value">${data.totalOrders}</strong>
      </div>
      <div class="overall-stat-card">
        <span class="overall-stat-label">Total Revenue</span>
        <strong class="overall-stat-value">${formatCurrency(data.totalRevenue)}</strong>
      </div>
      <div class="overall-stat-card">
        <span class="overall-stat-label">Avg Order</span>
        <strong class="overall-stat-value">${formatCurrency(data.avgOrderValue)}</strong>
      </div>
      <div class="overall-stat-card">
        <span class="overall-stat-label">Items Processed</span>
        <strong class="overall-stat-value">${data.totalItems}</strong>
      </div>
      <div class="overall-stat-card pending">
        <span class="overall-stat-label">Pending Delivery</span>
        <strong class="overall-stat-value">${data.pendingOrders}</strong>
      </div>
      <div class="overall-stat-card done">
        <span class="overall-stat-label">Delivery Done</span>
        <strong class="overall-stat-value">${data.doneOrders}</strong>
      </div>
    </div>
    <div class="charts-row overall-charts">
      <div class="chart-panel">
        <div class="chart-panel-title">Orders by Delivery</div>
        ${charts.deliveryChart}
      </div>
      <div class="chart-panel">
        <div class="chart-panel-title">Revenue by Service</div>
        ${charts.revenueChart}
      </div>
      <div class="chart-panel">
        <div class="chart-panel-title">Items by Service</div>
        ${charts.itemsChart}
      </div>
    </div>
    <div class="charts-row overall-charts overall-charts-2">
      <div class="chart-panel">
        <div class="chart-panel-title">Bills by Method</div>
        ${charts.methodChart}
      </div>
      <div class="chart-panel">
        <div class="chart-panel-title">Revenue Share by Service</div>
        <div class="bar-chart">${charts.barChart}</div>
      </div>
    </div>
    ${
      data.totalDiscount > 0
        ? `<p class="overall-footnote">Total discounts given: <strong>${formatCurrency(data.totalDiscount)}</strong></p>`
        : ""
    }
  `;
}

async function showOverallStatsReport() {
  try {
    let data;
    try {
      data = await API.getOverallStats();
    } catch {
      await refreshBillHistory();
      data = computeOverallStatsLocal();
    }
    renderOverallStatsReport(data);
    els.overallStatsModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  } catch (err) {
    alert("Could not load overall statistics: " + err.message);
  }
}

function hideOverallStatsReport() {
  els.overallStatsModal.classList.add("hidden");
  document.body.style.overflow = "";
}

function hideProfitLossReport() {
  els.profitLossModal.classList.add("hidden");
  document.body.style.overflow = "";
}

async function updateBillDeliveryStatus(billId, status) {
  const bill = await API.updateBillStatus(billId, status);
  await refreshBillHistory();
  selectedHistoryId = bill.id;
  renderHistoryList();
  renderHistoryDetail(bill);
}

function getHistoryFilterLabel(filter) {
  if (filter === "ready") return "order ready";
  return filter;
}

function syncHistoryFilterButtons(inPeriod) {
  const counts = {
    pending: inPeriod.filter((b) => getDeliveryStatus(b) === "pending").length,
    ready: inPeriod.filter((b) => getDeliveryStatus(b) === "ready").length,
    done: inPeriod.filter((b) => getDeliveryStatus(b) === "done").length,
  };
  const baseLabels = {
    all: "All",
    pending: "Pending",
    ready: "Order Ready",
    done: "Done",
  };

  els.historyFilters?.querySelectorAll(".history-filter").forEach((btn) => {
    const filter = btn.dataset.filter;
    let label = baseLabels[filter] || filter;
    if (filter !== "all" && counts[filter] > 0) {
      label = `${label} (${counts[filter]})`;
    }
    btn.textContent = label;
    btn.classList.toggle("active", filter === historyStatusFilter);
  });
}

function filterHistory(history) {
  let filtered = history;
  const { from, to } = getHistoryDateRange();
  filtered = filtered.filter((bill) => billInDateRange(bill, from, to));

  if (historyStatusFilter === "pending") {
    filtered = filtered.filter((bill) => getDeliveryStatus(bill) === "pending");
  } else if (historyStatusFilter === "ready") {
    filtered = filtered.filter((bill) => getDeliveryStatus(bill) === "ready");
  } else if (historyStatusFilter === "done") {
    filtered = filtered.filter((bill) => getDeliveryStatus(bill) === "done");
  }

  const q = historySearchQuery.trim().toLowerCase();
  if (!q) return filtered;

  return filtered.filter((bill) => {
    const haystack = [
      bill.billNo,
      bill.customerName,
      bill.customerPhone,
      bill.deliveryDisplay,
      bill.sentVia,
      getDeliveryStatus(bill),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

function renderHistoryBillCard(bill) {
  const status = getDeliveryStatus(bill);
  const sentClass = bill.sentVia === "whatsapp" ? "whatsapp" : "";
  const card = document.createElement("button");
  card.type = "button";
  card.className = "history-card" + (bill.id === selectedHistoryId ? " active" : "");
  card.innerHTML = `
    <div class="history-card-top">
      <span class="history-card-bill">Bill #${bill.billNo}</span>
      <span class="history-card-total">${formatCurrency(bill.total)}</span>
    </div>
    <div class="history-card-name">${escapeHtml(bill.customerName || "Walk-in Customer")}</div>
    <div class="history-card-meta">
      ${formatDate(new Date(bill.createdAt))}<br>
      ${bill.customerPhone || "—"} · ${formatDeliveryScheduleFromBill(bill)}
    </div>
    <div class="history-card-tags">
      <span class="history-card-tag ${status}">${getDeliveryStatusLabel(status)}</span>
      <span class="history-card-tag ${sentClass}">${getSentViaLabel(bill.sentVia)}</span>
    </div>
  `;
  card.addEventListener("click", () => {
    if (historyEditDraft && selectedHistoryId !== bill.id) {
      historyEditDraft = null;
    }
    selectedHistoryId = bill.id;
    renderHistoryList();
    renderHistoryDetail(bill);
  });
  return card;
}

function getBillsForHistoryExport() {
  const { from, to } = getHistoryDateRange();
  return getBillHistory()
    .filter((bill) => billInDateRange(bill, from, to))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function downloadHistoryExcel() {
  const range = getHistoryDateRange();
  const bills = getBillsForHistoryExport();
  if (typeof exportHistoryToExcel === "function") {
    exportHistoryToExcel(bills, range);
  } else {
    alert("Excel export is not available. Please refresh the page and try again.");
  }
}

function renderHistoryList() {
  const allHistory = getBillHistory();
  const { from, to } = getHistoryDateRange();
  const inPeriod = allHistory.filter((bill) => billInDateRange(bill, from, to));
  syncHistoryFilterButtons(inPeriod);
  const history = filterHistory(allHistory);
  const range = getHistoryDateRange();
  const periodPending = inPeriod.filter((b) => getDeliveryStatus(b) === "pending").length;
  const periodReady = inPeriod.filter((b) => getDeliveryStatus(b) === "ready").length;
  const periodRevenue = history.reduce((sum, b) => sum + (b.total || 0), 0);

  syncHistoryPeriodUi();

  let countText;
  if (history.length === 0) {
    countText = `${range.label} · 0 bills`;
  } else if (historyStatusFilter === "ready") {
    countText = `${history.length} order ready · ${formatCurrency(periodRevenue)}`;
  } else if (historyStatusFilter === "pending") {
    countText = `${history.length} pending · ${formatCurrency(periodRevenue)}`;
  } else if (historyStatusFilter === "done") {
    countText = `${history.length} done · ${formatCurrency(periodRevenue)}`;
  } else {
    countText = `${history.length} bill${history.length === 1 ? "" : "s"} · ${formatCurrency(periodRevenue)} · ${periodPending} pending · ${periodReady} ready`;
  }
  els.historyCount.textContent = countText;

  if (els.historyPeriodSummary) {
    const parts = [range.label];
    if (history.length > 0) {
      parts.push(`${history.length} order${history.length === 1 ? "" : "s"}`);
      parts.push(formatCurrency(periodRevenue));
    }
    els.historyPeriodSummary.innerHTML = `<strong>${parts[0]}</strong>${parts.length > 1 ? `<span>${parts.slice(1).join(" · ")}</span>` : ""}`;
  }

  if (history.length === 0) {
    const emptyMsg =
      allHistory.length === 0
        ? "No bills yet. Save a bill to see it here."
        : historyStatusFilter !== "all"
          ? `No ${getHistoryFilterLabel(historyStatusFilter)} bills in ${range.label.toLowerCase()}.`
          : historySearchQuery.trim()
            ? "No bills match your search."
            : `No orders for ${range.label.toLowerCase()}.`;
    els.historyList.innerHTML = `<p class="history-empty">${emptyMsg}</p>`;
    return;
  }

  els.historyList.innerHTML = "";
  const showDayGroups = historyPeriodFilter === "week" || historyPeriodFilter === "month" || historyPeriodFilter === "year" || historyPeriodFilter === "all";

  if (showDayGroups) {
    groupBillsByDay(history).forEach(([day, bills]) => {
      const dayRevenue = bills.reduce((sum, b) => sum + (b.total || 0), 0);
      const section = document.createElement("section");
      section.className = "history-day-group";
      section.innerHTML = `
        <div class="history-day-header">
          <span class="history-day-title">${formatHistoryDayLabel(day)}</span>
          <span class="history-day-meta">${bills.length} bill${bills.length === 1 ? "" : "s"} · ${formatCurrency(dayRevenue)}</span>
        </div>
      `;
      const list = document.createElement("div");
      list.className = "history-day-list";
      bills.forEach((bill) => list.appendChild(renderHistoryBillCard(bill)));
      section.appendChild(list);
      els.historyList.appendChild(section);
    });
    return;
  }

  history.forEach((bill) => {
    els.historyList.appendChild(renderHistoryBillCard(bill));
  });
}

function computeBillTotals(items, discountPercent) {
  const subtotal = items.reduce((sum, item) => sum + item.rate * item.qty, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const total = subtotal - discountAmount;
  return { subtotal, discountAmount, total };
}

function searchAllRates(query) {
  const q = query.trim().toLowerCase();
  if (!q || !ratesData) return [];

  const results = [];
  ratesData.services.forEach((service) => {
    service.categories.forEach((cat) => {
      cat.items.forEach((item) => {
        if (item.name.toLowerCase().includes(q)) {
          results.push(
            enrichBillItem({
              key: `${service.id}|${cat.name}|${item.name}`,
              name: item.name,
              service: service.name,
              category: cat.name,
              rate: item.rate,
              qty: 1,
            })
          );
        }
      });
    });
  });
  return results.slice(0, 15);
}

function startHistoryEdit(bill) {
  historyEditDraft = JSON.parse(JSON.stringify(bill));
  if (!historyEditDraft.homeServiceMode) {
    historyEditDraft.homeServiceMode = bill.serviceMode || "door-pickup";
  }
  if (historyEditDraft.shopServiceMode === undefined) {
    historyEditDraft.shopServiceMode = bill.shopServiceMode || "";
  }
  renderHistoryDetail(historyEditDraft);
}

function cancelHistoryEdit() {
  historyEditDraft = null;
  const bill = getBillHistory().find((b) => b.id === selectedHistoryId);
  renderHistoryDetail(bill || null);
}

function recalcHistoryEditDraft() {
  if (!historyEditDraft) return;
  const totals = computeBillTotals(
    historyEditDraft.items,
    historyEditDraft.discountPercent || 0
  );
  historyEditDraft.subtotal = totals.subtotal;
  historyEditDraft.discountAmount = totals.discountAmount;
  historyEditDraft.total = totals.total;
}

function refreshHistoryEditSummary() {
  if (!historyEditDraft) return;
  recalcHistoryEditDraft();
  const summary = els.historyDetail.querySelector(".history-detail-summary");
  const totalEl = els.historyDetail.querySelector(".history-detail-total");
  if (!summary) return;

  const discountHtml =
    historyEditDraft.discountAmount > 0
      ? `<p><span>Discount (${historyEditDraft.discountPercent}%)</span><span>− ${formatCurrency(historyEditDraft.discountAmount)}</span></p>`
      : "";

  summary.innerHTML = `
    <p><span>Subtotal</span><span data-field="subtotal">${formatCurrency(historyEditDraft.subtotal)}</span></p>
    ${discountHtml}
    <p><span>Total</span><span data-field="total">${formatCurrency(historyEditDraft.total)}</span></p>
  `;
  if (totalEl) totalEl.textContent = formatCurrency(historyEditDraft.total);
}

function addItemToHistoryDraft(item) {
  if (!historyEditDraft) return;
  const existing = historyEditDraft.items.find((b) => b.key === item.key);
  if (existing) {
    existing.qty = normalizeQty(existing, existing.qty + getQtyStep(existing));
  } else {
    historyEditDraft.items.push(enrichBillItem({ ...item, qty: item.qty || 1 }));
  }
  renderHistoryDetail(historyEditDraft);
}

function bindHistoryEditEvents() {
  const draft = historyEditDraft;
  if (!draft) return;

  els.historyDetail.querySelector("#historyEditName")?.addEventListener("input", (e) => {
    draft.customerName = e.target.value;
  });
  els.historyDetail.querySelector("#historyEditPhone")?.addEventListener("input", (e) => {
    draft.customerPhone = e.target.value;
  });
  els.historyDetail.querySelector("#historyEditDate")?.addEventListener("change", (e) => {
    draft.deliveryDate = e.target.value;
    draft.deliveryDisplay = syncDeliveryDisplayFromDate(draft.deliveryDate);
  });
  els.historyDetail.querySelector("#historyEditTime")?.addEventListener("change", (e) => {
    draft.deliveryTime = e.target.value;
  });
  els.historyDetail.querySelector("#historyEditPaymentType")?.addEventListener("change", (e) => {
    draft.paymentType = e.target.value;
  });
  els.historyDetail.querySelector("#historyEditPaymentInfo")?.addEventListener("change", (e) => {
    draft.paymentInfo = e.target.value;
  });
  els.historyDetail.querySelector("#historyEditHomeMode")?.addEventListener("change", (e) => {
    const resolved = resolveServiceModeConflict("home", e.target.value, draft.shopServiceMode || "");
    draft.homeServiceMode = resolved.home;
    draft.shopServiceMode = resolved.shop;
    e.target.value = resolved.home;
    const shopSelect = els.historyDetail.querySelector("#historyEditShopMode");
    if (shopSelect) shopSelect.value = resolved.shop;
    syncHistoryEditServiceModes(draft);
  });
  els.historyDetail.querySelector("#historyEditShopMode")?.addEventListener("change", (e) => {
    const resolved = resolveServiceModeConflict("shop", draft.homeServiceMode || "", e.target.value);
    draft.homeServiceMode = resolved.home;
    draft.shopServiceMode = resolved.shop;
    e.target.value = resolved.shop;
    const homeSelect = els.historyDetail.querySelector("#historyEditHomeMode");
    if (homeSelect) homeSelect.value = resolved.home;
    syncHistoryEditServiceModes(draft);
  });

  syncHistoryEditServiceModes(draft);

  els.historyDetail.querySelector("#historyEditDiscount")?.addEventListener("input", (e) => {
    draft.discountPercent = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
    refreshHistoryEditSummary();
  });

  els.historyDetail.querySelectorAll(".history-edit-qty").forEach((input) => {
    input.addEventListener("input", () => {
      const item = draft.items.find((b) => b.key === input.dataset.key);
      if (!item) return;
      item.qty = normalizeQty(item, input.value);
      input.value = isKgItem(item)
        ? item.qty % 1 === 0
          ? item.qty
          : item.qty.toFixed(1)
        : item.qty;
      refreshHistoryEditSummary();
      const row = input.closest("tr");
      const amountCell = row?.querySelector("[data-line-amount]");
      if (amountCell) amountCell.textContent = formatCurrency(item.rate * item.qty);
    });
  });

  els.historyDetail.querySelectorAll(".history-edit-rate").forEach((input) => {
    input.addEventListener("input", () => {
      const item = draft.items.find((b) => b.key === input.dataset.key);
      if (!item) return;
      item.rate = Math.max(0, parseFloat(input.value) || 0);
      refreshHistoryEditSummary();
      const row = input.closest("tr");
      const amountCell = row?.querySelector("[data-line-amount]");
      if (amountCell) amountCell.textContent = formatCurrency(item.rate * item.qty);
    });
  });

  els.historyDetail.querySelectorAll("[data-action=remove-item]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (draft.items.length <= 1) {
        alert("A bill must have at least one item.");
        return;
      }
      draft.items = draft.items.filter((b) => b.key !== btn.dataset.key);
      renderHistoryDetail(draft);
    });
  });

  const searchInput = els.historyDetail.querySelector("#historyEditItemSearch");
  const resultsEl = els.historyDetail.querySelector("#historyEditItemResults");
  searchInput?.addEventListener("input", () => {
    const matches = searchAllRates(searchInput.value);
    if (!resultsEl) return;
    if (matches.length === 0) {
      resultsEl.innerHTML = searchInput.value.trim()
        ? '<div class="history-edit-result empty">No items found</div>'
        : "";
      resultsEl.classList.toggle("hidden", !searchInput.value.trim());
      return;
    }
    resultsEl.innerHTML = matches
      .map(
        (item) => `
        <button type="button" class="history-edit-result" data-key="${item.key}">
          <span>${item.name}</span>
          <span>${item.service} · ${formatCurrency(item.rate)}</span>
        </button>
      `
      )
      .join("");
    resultsEl.classList.remove("hidden");
    resultsEl.querySelectorAll(".history-edit-result:not(.empty)").forEach((btn) => {
      btn.addEventListener("click", () => {
        const match = matches.find((m) => m.key === btn.dataset.key);
        if (match) addItemToHistoryDraft(match);
        searchInput.value = "";
        resultsEl.classList.add("hidden");
      });
    });
  });

  els.historyDetail.querySelector("[data-action=save-edit]")?.addEventListener("click", saveHistoryEdit);
  els.historyDetail.querySelector("[data-action=cancel-edit]")?.addEventListener("click", cancelHistoryEdit);
}

async function saveHistoryEdit() {
  if (!historyEditDraft) return;
  if (historyEditDraft.items.length === 0) {
    alert("Add at least one item to the bill.");
    return;
  }

  recalcHistoryEditDraft();
  historyEditDraft.deliveryDisplay = syncDeliveryDisplayFromDate(historyEditDraft.deliveryDate);

  try {
    const updated = await API.updateBill(historyEditDraft.id, {
      customerName: historyEditDraft.customerName,
      customerPhone: historyEditDraft.customerPhone,
      deliveryDate: historyEditDraft.deliveryDate,
      deliveryTime: historyEditDraft.deliveryTime || "",
      deliveryDisplay: historyEditDraft.deliveryDisplay,
      homeServiceMode: historyEditDraft.homeServiceMode,
      shopServiceMode: historyEditDraft.shopServiceMode,
      paymentType: historyEditDraft.paymentType || "",
      paymentInfo: historyEditDraft.paymentInfo || "",
      subtotal: historyEditDraft.subtotal,
      discountPercent: historyEditDraft.discountPercent,
      discountAmount: historyEditDraft.discountAmount,
      total: historyEditDraft.total,
      items: historyEditDraft.items,
    });
    historyEditDraft = null;
    await refreshBillHistory();
    selectedHistoryId = updated.id;
    renderHistoryList();
    renderHistoryDetail(updated);
  } catch (err) {
    alert("Could not save changes: " + err.message);
  }
}

function renderHistoryDetailEdit(bill) {
  recalcHistoryEditDraft();

  const itemsHtml = bill.items
    .map((item, i) => {
      const amount = item.rate * item.qty;
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${item.name}</td>
          <td>${item.service}</td>
          <td>
            <div class="qty-edit-wrap">
              <input type="number" class="history-edit-input history-edit-qty" data-key="${item.key}" value="${item.qty}" min="${getMinQty(item)}" step="${getQtyStep(item)}">
              <span class="qty-unit">${isKgItem(item) ? "kg" : "pc"}</span>
            </div>
          </td>
          <td><input type="number" class="history-edit-input history-edit-rate" data-key="${item.key}" value="${item.rate}" min="0" step="1"></td>
          <td data-line-amount><strong>${formatCurrency(amount)}</strong></td>
          <td><button type="button" class="btn-remove" data-action="remove-item" data-key="${item.key}" title="Remove">×</button></td>
        </tr>
      `;
    })
    .join("");

  const discountHtml =
    bill.discountAmount > 0
      ? `<p><span>Discount (${bill.discountPercent}%)</span><span>− ${formatCurrency(bill.discountAmount)}</span></p>`
      : "";

  els.historyDetail.innerHTML = `
    <div class="history-detail-head history-detail-head-edit">
      <div>
        <h3>Edit Bill #${bill.billNo}</h3>
        <p class="history-card-meta">${formatDate(new Date(bill.createdAt))}</p>
        <span class="history-edit-badge">Editing order</span>
      </div>
      <div class="history-detail-total">${formatCurrency(bill.total)}</div>
    </div>
    <div class="history-edit-form">
      <div class="history-edit-field">
        <label for="historyEditName">Customer Name</label>
        <input type="text" id="historyEditName" value="${escapeAttr(bill.customerName)}" placeholder="Customer name">
      </div>
      <div class="history-edit-field">
        <label for="historyEditPhone">Phone</label>
        <input type="tel" id="historyEditPhone" value="${escapeAttr(bill.customerPhone)}" placeholder="10-digit phone">
      </div>
      <div class="history-edit-field">
        <label for="historyEditHomeMode">Home Delivery</label>
        <select id="historyEditHomeMode">
          <option value="" ${!(bill.homeServiceMode || bill.serviceMode) || bill.shopServiceMode === "shop-both" ? "selected" : ""}>—</option>
          <option value="door-pickup" ${(bill.homeServiceMode || bill.serviceMode) === "door-pickup" ? "selected" : ""}>Door Pickup</option>
          <option value="door-delivery" ${(bill.homeServiceMode || bill.serviceMode) === "door-delivery" ? "selected" : ""}>Door Delivery</option>
          <option value="door-both" ${(bill.homeServiceMode || bill.serviceMode) === "door-both" ? "selected" : ""}>Both (Door)</option>
        </select>
      </div>
      <div class="history-edit-field">
        <label for="historyEditShopMode">Shop Visit</label>
        <select id="historyEditShopMode">
          <option value="" ${!bill.shopServiceMode ? "selected" : ""}>—</option>
          <option value="shop-pickup" ${bill.shopServiceMode === "shop-pickup" ? "selected" : ""}>Shop Pickup</option>
          <option value="shop-delivery" ${bill.shopServiceMode === "shop-delivery" ? "selected" : ""}>Shop Delivery</option>
          <option value="shop-both" ${bill.shopServiceMode === "shop-both" ? "selected" : ""}>Both (Shop)</option>
        </select>
      </div>
      <div class="history-edit-field">
        <label for="historyEditDate">Delivery Date</label>
        <input type="date" id="historyEditDate" value="${bill.deliveryDate || ""}">
      </div>
      <div class="history-edit-field">
        <label for="historyEditTime">Time</label>
        <select id="historyEditTime">
          <option value="" ${!bill.deliveryTime ? "selected" : ""}>—</option>
          <option value="morning" ${bill.deliveryTime === "morning" ? "selected" : ""}>Morning</option>
          <option value="afternoon" ${bill.deliveryTime === "afternoon" ? "selected" : ""}>Afternoon</option>
          <option value="evening" ${bill.deliveryTime === "evening" ? "selected" : ""}>Evening</option>
        </select>
      </div>
      <div class="history-edit-field">
        <label for="historyEditPaymentType">Payment Type</label>
        <select id="historyEditPaymentType">
          <option value="" ${!bill.paymentType ? "selected" : ""}>—</option>
          <option value="cash" ${bill.paymentType === "cash" ? "selected" : ""}>Cash</option>
          <option value="upi" ${bill.paymentType === "upi" ? "selected" : ""}>UPI Online</option>
        </select>
      </div>
      <div class="history-edit-field">
        <label for="historyEditPaymentInfo">Payment Info</label>
        <select id="historyEditPaymentInfo">
          <option value="" ${!bill.paymentInfo ? "selected" : ""}>—</option>
          <option value="pre-payment" ${bill.paymentInfo === "pre-payment" ? "selected" : ""}>Pre Payment</option>
          <option value="post-payment" ${bill.paymentInfo === "post-payment" ? "selected" : ""}>Post Payment</option>
        </select>
      </div>
      <div class="history-edit-field">
        <label for="historyEditDiscount">Discount %</label>
        <input type="number" id="historyEditDiscount" value="${bill.discountPercent || 0}" min="0" max="100" step="1">
      </div>
    </div>
    <div class="history-edit-add">
      <label for="historyEditItemSearch">Add item</label>
      <input type="search" id="historyEditItemSearch" placeholder="Search item name..." autocomplete="off">
      <div id="historyEditItemResults" class="history-edit-results hidden"></div>
    </div>
    <table class="history-items-table history-items-table-edit">
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th>Service</th>
          <th>Qty / Kg</th>
          <th>Rate</th>
          <th>Amount</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="history-detail-summary">
      <p><span>Subtotal</span><span>${formatCurrency(bill.subtotal)}</span></p>
      ${discountHtml}
      <p><span>Total</span><span>${formatCurrency(bill.total)}</span></p>
    </div>
    <div class="history-detail-actions">
      <button type="button" class="btn btn-primary" data-action="save-edit">Save Changes</button>
      <button type="button" class="btn btn-outline" data-action="cancel-edit">Cancel</button>
    </div>
  `;

  bindHistoryEditEvents();
}

function renderHistoryDetail(bill) {
  if (!bill) {
    historyEditDraft = null;
    els.historyDetail.innerHTML = `
      <div class="history-detail-placeholder">
        <span class="panel-icon">📋</span>
        <p>Select a bill from the list to view full details</p>
      </div>
    `;
    return;
  }

  if (historyEditDraft && historyEditDraft.id === bill.id) {
    renderHistoryDetailEdit(historyEditDraft);
    return;
  }

  const itemsHtml = bill.items
    .map((item, i) => {
      const amount = item.rate * item.qty;
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${item.name}</td>
          <td>${item.service}</td>
          <td>${formatQtyDisplay(item)}</td>
          <td>${formatCurrency(item.rate)}</td>
          <td><strong>${formatCurrency(amount)}</strong></td>
        </tr>
      `;
    })
    .join("");

  const discountHtml =
    bill.discountAmount > 0
      ? `<p><span>Discount (${bill.discountPercent}%)</span><span>− ${formatCurrency(bill.discountAmount)}</span></p>`
      : "";

  const status = getDeliveryStatus(bill);
  const orderReadyBtn =
    status === "pending"
      ? `<button type="button" class="btn btn-status-ready" data-action="mark-ready" data-id="${bill.id}">Order Ready</button>`
      : "";
  const statusBtn =
    status === "done"
      ? `<button type="button" class="btn btn-status-pending" data-action="mark-pending" data-id="${bill.id}">Mark as Pending</button>`
      : `<button type="button" class="btn btn-status-done" data-action="mark-done" data-id="${bill.id}">Mark Delivery Done</button>`;

  const hasValidPhone = normalizePhoneKey(bill.customerPhone || "").length >= 10;
  const phoneInfoBtn = hasValidPhone
    ? `<button type="button" class="btn-info btn-info-sm" data-action="profile" title="View customer profile">i</button>`
    : "";

  els.historyDetail.innerHTML = `
    <div class="history-detail-head">
      <div>
        <h3>Bill #${bill.billNo}</h3>
        <p class="history-card-meta">${formatDate(new Date(bill.createdAt))}</p>
        <span class="status-badge ${status}">${getDeliveryStatusBadgeText(status)}</span>
      </div>
      <div class="history-detail-total">${formatCurrency(bill.total)}</div>
    </div>
    <div class="history-info-grid">
      <div class="history-info-item"><span>Customer</span><strong>${bill.customerName || "—"}</strong></div>
      <div class="history-info-item history-info-phone">
        <span class="history-info-label-row"><span>Phone</span>${phoneInfoBtn}</span>
        <strong>${bill.customerPhone || "—"}</strong>
      </div>
      <div class="history-info-item"><span>Home Delivery</span><strong>${(bill.homeServiceMode || bill.serviceMode) ? getServiceModeLabel(bill.homeServiceMode || bill.serviceMode) : "—"}</strong></div>
      <div class="history-info-item"><span>Shop Visit</span><strong>${bill.shopServiceMode ? getServiceModeLabel(bill.shopServiceMode) : "—"}</strong></div>
      <div class="history-info-item"><span>Schedule</span><strong>${formatDeliveryScheduleFromBill(bill)}</strong></div>
      <div class="history-info-item"><span>Payment Type</span><strong>${getPaymentTypeLabel(bill.paymentType) || "—"}</strong></div>
      <div class="history-info-item"><span>Payment Info</span><strong>${getPaymentInfoLabel(bill.paymentInfo) || "—"}</strong></div>
      <div class="history-info-item"><span>Saved Via</span><strong>${getSentViaLabel(bill.sentVia)}</strong></div>
    </div>
    <table class="history-items-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th>Service</th>
          <th>Qty / Kg</th>
          <th>Rate</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="history-detail-summary">
      <p><span>Subtotal</span><span>${formatCurrency(bill.subtotal)}</span></p>
      ${discountHtml}
      <p><span>Total</span><span>${formatCurrency(bill.total)}</span></p>
    </div>
    <div class="history-detail-actions">
      <button type="button" class="btn btn-outline" data-action="edit" data-id="${bill.id}">Edit Order</button>
      ${orderReadyBtn}
      ${statusBtn}
      <button type="button" class="btn btn-primary" data-action="reprint" data-id="${bill.id}">Print Again</button>
      ${bill.customerPhone ? `<button type="button" class="btn btn-whatsapp" data-action="resend" data-id="${bill.id}">Send on WhatsApp</button>` : ""}
    </div>
  `;

  els.historyDetail.querySelector("[data-action=edit]")?.addEventListener("click", () =>
    startHistoryEdit(bill)
  );
  els.historyDetail.querySelector("[data-action=mark-ready]")?.addEventListener("click", () =>
    updateBillDeliveryStatus(bill.id, "ready")
  );
  els.historyDetail.querySelector("[data-action=mark-done]")?.addEventListener("click", () =>
    updateBillDeliveryStatus(bill.id, "done")
  );
  els.historyDetail.querySelector("[data-action=mark-pending]")?.addEventListener("click", () =>
    updateBillDeliveryStatus(bill.id, "pending")
  );
  els.historyDetail.querySelector("[data-action=profile]")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showCustomerStats(bill.customerPhone, bill.customerName);
  });
  els.historyDetail.querySelector("[data-action=reprint]")?.addEventListener("click", () =>
    printHistoryBill(bill)
  );
  els.historyDetail.querySelector("[data-action=resend]")?.addEventListener("click", () =>
    sendHistoryWhatsApp(bill)
  );
}

function buildReceiptFromRecord(bill) {
  els.rBillNo.textContent = bill.billNo;
  els.rDate.textContent = formatDate(new Date(bill.createdAt));
  els.rName.textContent = bill.customerName || "—";
  els.rPhone.textContent = bill.customerPhone || "—";
  els.rDelivery.textContent = formatDeliveryScheduleFromBill(bill);
  if (els.rPayment) {
    els.rPayment.textContent = formatPaymentSummary(bill.paymentType, bill.paymentInfo);
  }

  els.rItems.innerHTML = "";
  bill.items.forEach((item) => {
    const amount = item.rate * item.qty;
    const line = document.createElement("div");
    line.className = "receipt-line";
    line.innerHTML = `
      <div class="receipt-line-header">
        <span>${item.name}</span>
        <span>${formatCurrency(amount)}</span>
      </div>
      <div class="receipt-line-detail">
        <span>${formatQtyRateLine(item)}</span>
        <span>${item.service}</span>
      </div>
    `;
    els.rItems.appendChild(line);
  });

  els.rSummary.innerHTML = "";
  if (bill.discountAmount > 0) {
    els.rSummary.innerHTML = `
      <p><span>Subtotal</span><span>${formatCurrency(bill.subtotal)}</span></p>
      <p class="discount-line"><span>Discount (${bill.discountPercent}%)</span><span>− ${formatCurrency(bill.discountAmount)}</span></p>
    `;
  }

  els.rTotal.textContent = formatCurrency(bill.total);
}

function buildMessageFromRecord(bill) {
  let message = `*RINSE & RISE LAUNDRYRITE*\n`;
  message += `Rinse · Rise · Repeat\n`;
  message += `━━━━━━━━━━━━━━━━\n\n`;
  message += `Bill No: *#${bill.billNo}*\n`;
  message += `Date: ${formatDate(new Date(bill.createdAt))}\n`;
  message += `Customer: *${bill.customerName || "Customer"}*\n`;
  message += `Delivery: *${formatDeliveryScheduleFromBill(bill)}*\n\n`;
  message += `*Items:*\n`;

  bill.items.forEach((item, i) => {
    const amount = item.rate * item.qty;
    message += `${i + 1}. ${item.name}\n`;
    message += `   ${formatQtyRateLine(item)} = *${formatCurrency(amount)}*\n`;
    message += `   (${item.service})\n`;
  });

  message += `\n━━━━━━━━━━━━━━━━\n`;
  if (bill.discountAmount > 0) {
    message += `Subtotal: ${formatCurrency(bill.subtotal)}\n`;
    message += `Discount (${bill.discountPercent}%): − ${formatCurrency(bill.discountAmount)}\n`;
  }
  message += `*TOTAL: ${formatCurrency(bill.total)}*\n\n`;
  message += `Thank you for choosing us!\n`;
  message += `Free Pickup & Delivery\n`;
  message += `Call: 9591506548 | 9 AM – 9 PM`;

  return message;
}

function printHistoryBill(bill) {
  buildReceiptFromRecord(bill);
  window.print();
}

function sendHistoryWhatsApp(bill) {
  const phone = formatPhoneForWhatsApp(bill.customerPhone);
  if (phone.length < 12) {
    alert("This bill has no valid phone number.");
    return;
  }
  shareBillOnWhatsApp(phone, bill).catch(async (err) => {
    alert("Could not send PDF on WhatsApp: " + err.message);
    try {
      await downloadBillInvoicePdf(bill);
    } catch {
      /* ignore */
    }
  });
}

function updateActionButtons() {
  const hasItems = billItems.length > 0;
  const validCustomer = isCustomerValid();
  const hasPhone = normalizePhoneKey(els.customerPhone.value).length >= 10;
  els.printBtn.disabled = !hasItems || !validCustomer;
  els.saveBillBtn.disabled = !hasItems || !validCustomer;
  els.whatsappBtn.disabled = !hasItems || !validCustomer;
  els.customerInfoBtn.disabled = !hasPhone;
  if (els.customerFavoriteBtn) {
    els.customerFavoriteBtn.disabled = !hasPhone;
  }
}

function resetBillForm() {
  billItems = [];
  els.customerName.value = "";
  els.customerPhone.value = "";
  els.discountPercent.value = "0";
  updateProfileHint(null);
  updateFavoriteUi(false, false);
  setDefaultDeliveryDateTime();
  setDefaultPaymentFields();
  setDefaultServiceModes();
  els.serviceSelect.value = "";
  updateActiveTile("");
  onServiceChange(false);
  renderBill();
}

function saveBill() {
  if (billItems.length === 0) return;
  if (!validateCustomerRequired()) return;
  saveBillToDatabase("saved")
    .then(() => resetBillForm())
    .catch((err) => alert("Could not save bill: " + err.message));
}

function renderBill() {
  const tbody = els.billItems;
  tbody.innerHTML = "";

  if (billItems.length === 0) {
    tbody.innerHTML =
      '<tr class="empty-row"><td colspan="7">No items added yet</td></tr>';
    els.discountPercent.value = "0";
    updateTotals();
    updateActionButtons();
    return;
  }

  billItems.forEach((item, i) => {
    const amount = item.rate * item.qty;
    const tr = document.createElement("tr");
    tr.dataset.key = item.key;
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${item.name}</td>
      <td>${item.service} / ${item.category}</td>
      <td>${renderQtyCellHtml(item)}</td>
      <td class="rate-cell">
        <div class="rate-input-wrap">
          <span class="rate-prefix">₹</span>
          <input type="number" class="rate-input" data-key="${item.key}" value="${item.rate}" min="0" step="1" title="Edit price">
        </div>
      </td>
      <td class="line-amount"><strong>${formatCurrency(amount)}</strong></td>
      <td><button type="button" class="btn-remove" data-key="${item.key}" title="Remove">×</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.key;
      updateQty(key, btn.dataset.action === "plus" ? 1 : -1);
    });
  });

  tbody.querySelectorAll(".qty-input").forEach((input) => {
    input.addEventListener("change", () => setItemQty(input.dataset.key, input.value));
    input.addEventListener("blur", () => {
      const item = billItems.find((b) => b.key === input.dataset.key);
      if (!item) return;
      const qty = Number(item.qty);
      input.value = qty % 1 === 0 ? qty : qty.toFixed(1);
    });
  });

  tbody.querySelectorAll(".rate-input").forEach((input) => {
    input.addEventListener("input", () => updateRate(input.dataset.key, input.value));
    input.addEventListener("blur", () => {
      const item = billItems.find((b) => b.key === input.dataset.key);
      if (item) input.value = item.rate;
    });
  });

  tbody.querySelectorAll(".btn-remove").forEach((btn) => {
    btn.addEventListener("click", () => removeItem(btn.dataset.key));
  });

  updateTotals();
  updateActionButtons();
}

function buildReceipt() {
  els.rBillNo.textContent = String(billCounter).padStart(4, "0");
  els.rDate.textContent = formatDate(new Date());
  els.rName.textContent = els.customerName.value.trim() || "—";
  els.rPhone.textContent = els.customerPhone.value.trim() || "—";
  els.rDelivery.textContent = formatDeliveryDateTime();
  if (els.rPayment) {
    els.rPayment.textContent = formatPaymentSummary(getPaymentType(), getPaymentInfo());
  }

  els.rItems.innerHTML = "";
  billItems.forEach((item) => {
    const amount = item.rate * item.qty;
    const line = document.createElement("div");
    line.className = "receipt-line";
    line.innerHTML = `
      <div class="receipt-line-header">
        <span>${item.name}</span>
        <span>${formatCurrency(amount)}</span>
      </div>
      <div class="receipt-line-detail">
        <span>${formatQtyRateLine(item)}</span>
        <span>${item.service}</span>
      </div>
    `;
    els.rItems.appendChild(line);
  });

  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const percent = getDiscountPercent();

  els.rSummary.innerHTML = "";
  if (discount > 0) {
    els.rSummary.innerHTML = `
      <p><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></p>
      <p class="discount-line"><span>Discount (${percent}%)</span><span>− ${formatCurrency(discount)}</span></p>
    `;
  }

  els.rTotal.textContent = formatCurrency(getTotal());
}

async function sendWhatsApp() {
  if (billItems.length === 0) return;
  if (!validateCustomerRequired()) return;

  const phone = formatPhoneForWhatsApp(els.customerPhone.value.trim());
  if (phone.length < 12) {
    alert("Please enter a valid 10-digit customer phone number.");
    els.customerPhone.focus();
    return;
  }

  els.whatsappBtn.disabled = true;
  els.whatsappBtn.classList.add("is-busy");

  try {
    const saved = await saveBillToDatabase("whatsapp");
    if (!saved) return;
    await shareBillOnWhatsApp(phone, saved);
    resetBillForm();
  } catch (err) {
    alert("Could not send on WhatsApp: " + err.message);
  } finally {
    els.whatsappBtn.classList.remove("is-busy");
    updateActionButtons();
  }
}

function printReceipt() {
  if (billItems.length === 0) return;
  if (!validateCustomerRequired()) return;
  buildReceipt();

  window.print();

  finalizeBill("print");
}

function clearBill() {
  if (billItems.length > 0 && !confirm("Clear this bill?")) return;
  resetBillForm();
}

async function init() {
  try {
    await API.health();
  } catch {
    alert(
      "Cannot connect to database server.\n\nPlease run Start Billing.bat to start the SQLite server on port 8080."
    );
    return;
  }

  try {
    const res = await fetch("data/rates.json");
    ratesData = await res.json();
  } catch {
    alert("Could not load rate card.");
    return;
  }

  setDefaultDeliveryDateTime();
  setDefaultPaymentFields();
  setDefaultServiceModes();
  populateServices();
  renderBill();
  startBillDateClock();

  try {
    await migrateLocalStorageIfNeeded();
    await loadBillCounter();
  } catch (err) {
    console.warn("Bill counter unavailable:", err);
    updateBillMeta();
  }

  try {
    await refreshBillHistory();
  } catch (err) {
    console.warn("Bill history unavailable:", err);
    billHistoryCache = [];
  }

  els.serviceSelect.addEventListener("change", onServiceChange);
  els.serviceTiles?.querySelectorAll(".service-tile").forEach((tile) => {
    tile.addEventListener("click", () =>
      selectService(tile.dataset.service, tile.dataset.tile)
    );
  });
  els.categorySelect.addEventListener("change", onCategoryChange);
  els.itemSearch.addEventListener("input", (e) => searchItems(e.target.value));
  els.discountPercent.addEventListener("input", updateTotals);
  els.deliveryDate.addEventListener("change", updateDeliveryDisplay);
  bindToggleableServiceModeRadios("homeServiceMode", handleHomeServiceModeChange);
  bindToggleableServiceModeRadios("shopServiceMode", handleShopServiceModeChange);
  bindToggleableServiceModeRadios("paymentType", () => {});
  bindToggleableServiceModeRadios("paymentInfo", () => {});
  syncServiceModeConstraints();
  els.customerPhone.addEventListener("input", () => {
    updateActionButtons();
    loadCustomerProfileByPhone();
  });
  els.customerName.addEventListener("input", updateActionButtons);
  els.customerInfoBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showCustomerStats();
  });
  els.customerFavoriteBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCustomerFavorite();
  });
  els.closeCustomerStats.addEventListener("click", hideCustomerStats);
  els.customerStatsBackdrop.addEventListener("click", hideCustomerStats);
  els.printBtn.addEventListener("click", printReceipt);
  els.saveBillBtn.addEventListener("click", saveBill);
  els.whatsappBtn.addEventListener("click", sendWhatsApp);
  els.clearBtn.addEventListener("click", clearBill);
  els.historyBtn.addEventListener("click", showHistoryView);
  els.downloadHistoryExcelBtn?.addEventListener("click", downloadHistoryExcel);
  els.overallStatsBtn.addEventListener("click", showOverallStatsReport);
  els.closeOverallStats.addEventListener("click", hideOverallStatsReport);
  els.overallStatsBackdrop.addEventListener("click", hideOverallStatsReport);
  els.expenditureBtn.addEventListener("click", requestExpenditureAccess);
  els.expenditurePasswordForm?.addEventListener("submit", handleExpenditurePasswordSubmit);
  els.closeExpenditurePassword?.addEventListener("click", closeExpenditurePasswordModal);
  els.cancelExpenditurePassword?.addEventListener("click", closeExpenditurePasswordModal);
  els.expenditurePasswordBackdrop?.addEventListener("click", closeExpenditurePasswordModal);
  els.backToBillingBtn.addEventListener("click", showBillingView);
  els.backFromExpenditureBtn.addEventListener("click", showBillingView);
  els.expenditureForm.addEventListener("submit", handleExpenditureSubmit);
  els.expenditureDateFrom?.addEventListener("change", handleExpenditureDateFilterChange);
  els.expenditureDateTo?.addEventListener("change", handleExpenditureDateFilterChange);
  els.calculateProfitBtn.addEventListener("click", showProfitLossReport);
  els.closeProfitLoss.addEventListener("click", hideProfitLossReport);
  els.profitLossBackdrop.addEventListener("click", hideProfitLossReport);
  els.whatsappStatusPill?.addEventListener("click", () => openWhatsAppConnectModal());
  els.closeWhatsAppConnect?.addEventListener("click", closeWhatsAppConnectModal);
  els.whatsappConnectBackdrop?.addEventListener("click", closeWhatsAppConnectModal);
  refreshWhatsAppStatus();
  if (isHostedDeployment()) {
    API.getWhatsAppStatus(true).catch(() => {});
  }
  setInterval(refreshWhatsAppStatus, 15000);
  els.historySearch.addEventListener("input", (e) => {
    historySearchQuery = e.target.value;
    renderHistoryList();
  });
  els.historyFilters?.querySelectorAll(".history-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      historyStatusFilter = btn.dataset.filter;
      renderHistoryList();
    });
  });
  els.historyPeriodFilters?.querySelectorAll(".history-period-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      historyPeriodFilter = btn.dataset.period;
      if (historyPeriodFilter !== "custom") {
        historyCustomDate = "";
      }
      renderHistoryList();
    });
  });
  els.historyDatePick?.addEventListener("change", (e) => {
    if (!e.target.value) return;
    historyPeriodFilter = "custom";
    historyCustomDate = e.target.value;
    renderHistoryList();
  });

  document.addEventListener("click", (e) => {
    if (!els.itemSearch.contains(e.target) && !els.itemResults.contains(e.target)) {
      els.itemResults.classList.add("hidden");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!els.customerStatsModal.classList.contains("hidden")) hideCustomerStats();
      if (!els.profitLossModal.classList.contains("hidden")) hideProfitLossReport();
      if (!els.overallStatsModal.classList.contains("hidden")) hideOverallStatsReport();
      if (!els.whatsappConnectModal?.classList.contains("hidden")) closeWhatsAppConnectModal();
      if (!els.expenditurePasswordModal?.classList.contains("hidden")) closeExpenditurePasswordModal();
    }
  });
}

init();
