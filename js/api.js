/** API client — all billing data stored in SQLite via Flask backend. */

const API = {
  async request(path, options = {}) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      let msg = err.error || `Request failed (${res.status})`;
      if (res.status === 503 && err.code === "database_unavailable") {
        msg =
          err.error ||
          "Database is not connected on the hosted server. Fix DATABASE_URL in Railway Variables and redeploy.";
      }
      if (res.status === 404 && path.includes("/send-whatsapp")) {
        throw new Error(
          "WhatsApp send API not found. Please restart Start Billing.bat and refresh the page (Ctrl+F5)."
        );
      }
      if (res.status === 405) {
        throw new Error(
          "Server needs a restart. Close Start Billing.bat, run it again, then press Ctrl+F5."
        );
      }
      throw new Error(msg);
    }
    return res.json();
  },

  health() {
    return this.request("/api/health");
  },

  getBillCounter() {
    return this.request("/api/settings/bill-counter");
  },

  getBills() {
    return this.request("/api/bills");
  },

  createBill(bill) {
    return this.request("/api/bills", {
      method: "POST",
      body: JSON.stringify(bill),
    });
  },

  updateBillStatus(billId, deliveryStatus) {
    return this.request(`/api/bills/${billId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ deliveryStatus }),
    });
  },

  updateBill(billId, bill) {
    return this.request(`/api/bills/${billId}`, {
      method: "PUT",
      body: JSON.stringify(bill),
    });
  },

  getCustomerProfile(phoneKey) {
    return this.request(`/api/customers/${encodeURIComponent(phoneKey)}/profile`);
  },

  getCustomerFavorite(phoneKey) {
    return this.request(`/api/customers/${encodeURIComponent(phoneKey)}/favorite`);
  },

  setCustomerFavorite(phoneKey, isFavorite, phone = "", name = "") {
    return this.request(`/api/customers/${encodeURIComponent(phoneKey)}/favorite`, {
      method: "PATCH",
      body: JSON.stringify({ isFavorite, phone, name }),
    });
  },

  migrate(data) {
    return this.request("/api/migrate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  probePostgres() {
    return this.request("/api/db/probe-postgres");
  },

  recoverPostgres() {
    return this.request("/api/db/recover-postgres", { method: "POST", body: JSON.stringify({}) });
  },

  getExpenditures(fromDate = "", toDate = "") {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    const qs = params.toString();
    return this.request(`/api/expenditures${qs ? `?${qs}` : ""}`);
  },

  createExpenditure(name, amount, date = "") {
    return this.request("/api/expenditures", {
      method: "POST",
      body: JSON.stringify({ name, amount, date }),
    });
  },

  deleteExpenditure(id) {
    return this.request(`/api/expenditures/${id}`, { method: "DELETE" });
  },

  getProfitLoss(fromDate = "", toDate = "") {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    const qs = params.toString();
    return this.request(`/api/reports/profit-loss${qs ? `?${qs}` : ""}`);
  },

  getOverallStats() {
    return this.request("/api/reports/overall");
  },

  getWhatsAppStatus(startBridge = false) {
    const qs = startBridge ? "?start=1" : "";
    return this.request(`/api/whatsapp/status${qs}`);
  },

  startWhatsAppBridge() {
    return this.request("/api/whatsapp/start", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async resetWhatsAppSession() {
    const res = await fetch("/api/whatsapp/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 403 && data.sessionLocked) {
      return { ok: false, sessionLocked: true, error: data.error };
    }
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  },

  sendBillWhatsApp(billId) {
    return this.request(`/api/bills/${billId}/send-whatsapp`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async fetchBillInvoicePdf(billId) {
    const res = await fetch(`/api/bills/${billId}/invoice.pdf`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Could not fetch invoice PDF (${res.status})`);
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] || `RinseRise-Invoice-${billId}.pdf`;
    return { blob, filename };
  },
};
