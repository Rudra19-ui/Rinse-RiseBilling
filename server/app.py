"""Flask API server for Rinse & Rise billing (PostgreSQL or SQLite backend)."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory, send_file

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

from database import (
    build_customer_profile,
    create_bill,
    create_expenditure,
    delete_expenditure,
    get_all_bills,
    get_all_expenditures,
    get_bill_by_id,
    get_bill_counter,
    get_bills_by_phone,
    get_customer_favorite,
    get_overall_stats,
    get_profit_loss_summary,
    init_db,
    migrate_from_local,
    normalize_phone_key,
    database_backend_name,
    database_config_status,
    set_customer_favorite,
    update_bill,
    update_bill_status,
)
from invoice_pdf import build_whatsapp_message, generate_invoice_pdf, invoice_filename
from whatsapp_send import (
    bridge_is_running,
    get_bridge_status,
    get_or_create_invoice_pdf,
    is_cloud_deployment,
    reset_bridge_session,
    send_bill_via_whatsapp,
    try_start_bridge,
    whatsapp_enabled,
)

app = Flask(__name__, static_folder=str(ROOT), static_url_path="")


@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    return response


@app.route("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.route("/api/health")
def health():
    config = database_config_status()
    wa_on = whatsapp_enabled()
    wa_available = bridge_is_running() if wa_on else False
    return jsonify(
        {
            "ok": True,
            **config,
            "whatsappEnabled": wa_on,
            "whatsappAvailable": wa_available,
            "hosted": is_cloud_deployment(),
        }
    )


@app.route("/api/settings/bill-counter")
def api_bill_counter():
    return jsonify({"billCounter": get_bill_counter()})


@app.route("/api/bills", methods=["GET"])
def api_list_bills():
    return jsonify(get_all_bills())


@app.route("/api/bills", methods=["POST"])
def api_create_bill():
    data = request.get_json(force=True, silent=True) or {}
    if not data.get("items"):
        return jsonify({"error": "Bill must have at least one item"}), 400
    bill = create_bill(data)
    return jsonify(bill), 201


@app.route("/api/bills/<int:bill_id>", methods=["GET"])
def api_get_bill(bill_id: int):
    bill = get_bill_by_id(bill_id)
    if not bill:
        return jsonify({"error": "Bill not found"}), 404
    return jsonify(bill)


@app.route("/api/bills/<int:bill_id>", methods=["PUT"])
def api_update_bill(bill_id: int):
    data = request.get_json(force=True, silent=True) or {}
    if not data.get("items"):
        return jsonify({"error": "Bill must have at least one item"}), 400
    try:
        bill = update_bill(bill_id, data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not bill:
        return jsonify({"error": "Bill not found"}), 404
    return jsonify(bill)


@app.route("/api/bills/<int:bill_id>/status", methods=["PATCH"])
def api_update_status(bill_id: int):
    data = request.get_json(force=True, silent=True) or {}
    status = data.get("deliveryStatus", "pending")
    if status not in ("pending", "ready", "done"):
        return jsonify({"error": "Invalid status"}), 400
    bill = update_bill_status(bill_id, status)
    if not bill:
        return jsonify({"error": "Bill not found"}), 404
    return jsonify(bill)


@app.route("/api/customers/<phone_key>/profile")
def api_customer_profile(phone_key: str):
    key = normalize_phone_key(phone_key)
    profile = build_customer_profile(key)
    orders = get_bills_by_phone(key)
    return jsonify({"profile": profile, "orders": orders})


@app.route("/api/customers/<phone_key>/favorite", methods=["GET"])
def api_get_customer_favorite(phone_key: str):
    key = normalize_phone_key(phone_key)
    return jsonify({"phoneKey": key, "isFavorite": get_customer_favorite(key)})


@app.route("/api/customers/<phone_key>/favorite", methods=["PATCH"])
def api_set_customer_favorite(phone_key: str):
    key = normalize_phone_key(phone_key)
    data = request.get_json(force=True, silent=True) or {}
    try:
        result = set_customer_favorite(
            key,
            data.get("phone", key),
            data.get("name", ""),
            bool(data.get("isFavorite")),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(result)


@app.route("/api/expenditures", methods=["GET"])
def api_list_expenditures():
    date_from = request.args.get("from", "").strip() or None
    date_to = request.args.get("to", "").strip() or None
    items = get_all_expenditures(date_from, date_to)
    total = sum(e["amount"] for e in items)
    return jsonify({"items": items, "total": total, "count": len(items), "dateFrom": date_from or "", "dateTo": date_to or ""})


@app.route("/api/expenditures", methods=["POST"])
def api_create_expenditure():
    data = request.get_json(force=True, silent=True) or {}
    try:
        item = create_expenditure(
            data.get("name", ""),
            float(data.get("amount", 0)),
            data.get("date"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except TypeError:
        return jsonify({"error": "Invalid amount"}), 400
    return jsonify(item), 201


@app.route("/api/expenditures/<int:expenditure_id>", methods=["DELETE"])
def api_delete_expenditure(expenditure_id: int):
    if not delete_expenditure(expenditure_id):
        return jsonify({"error": "Expenditure not found"}), 404
    return jsonify({"ok": True})


@app.route("/api/reports/overall")
def api_overall_stats():
    return jsonify(get_overall_stats())


@app.route("/api/reports/profit-loss")
def api_profit_loss():
    date_from = request.args.get("from", "").strip() or None
    date_to = request.args.get("to", "").strip() or None
    return jsonify(get_profit_loss_summary(date_from, date_to))


@app.route("/api/bills/<int:bill_id>/invoice.pdf")
def api_bill_invoice_pdf(bill_id: int):
    bill = get_bill_by_id(bill_id)
    if not bill:
        return jsonify({"error": "Bill not found"}), 404
    pdf_path = get_or_create_invoice_pdf(bill)
    response = send_file(
        pdf_path,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=invoice_filename(bill),
    )
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return response


@app.route("/api/bills/<int:bill_id>/send-whatsapp", methods=["POST"])
def api_send_bill_whatsapp(bill_id: int):
    bill = get_bill_by_id(bill_id)
    if not bill:
        return jsonify({"error": "Bill not found"}), 404
    if not bill.get("customerPhone"):
        return jsonify({"error": "Customer phone number is required."}), 400
    try:
        result = send_bill_via_whatsapp(bill)
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/api/whatsapp/status")
def api_whatsapp_status():
    auto_start = request.args.get("start", "").lower() in ("1", "true", "yes")
    return jsonify(get_bridge_status(auto_start=auto_start))


@app.route("/api/whatsapp/start", methods=["POST"])
def api_whatsapp_start():
    if not whatsapp_enabled():
        return jsonify({"ok": False, "error": "WhatsApp is disabled on this server.", "enabled": False})
    started = try_start_bridge()
    status = get_bridge_status()
    return jsonify({"ok": started or status.get("available"), **status})


@app.route("/api/whatsapp/reset", methods=["POST"])
def api_whatsapp_reset():
    return jsonify(reset_bridge_session())


@app.route("/api/migrate", methods=["POST"])
def api_migrate():
    data = request.get_json(force=True, silent=True) or {}
    result = migrate_from_local(data)
    return jsonify(result)


@app.route("/<path:path>", methods=["GET", "HEAD"])
def static_files(path):
    if path.startswith("api/"):
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(ROOT, path)


def bootstrap_app() -> None:
    """Run once on import so gunicorn/Docker loads the DB schema."""
    config = database_config_status()
    if config.get("warning"):
        print(f"WARNING: {config['warning']}")
        for step in config.get("fixSteps", []):
            print(f"  → {step}")
    init_db()
    (ROOT / "data" / "invoices").mkdir(parents=True, exist_ok=True)
    print(f"Rinse & Rise Billing — {config['backend']} database ready")
    if config.get("postgresEnvVar"):
        print(f"PostgreSQL connected via {config['postgresEnvVar']}")


bootstrap_app()


if __name__ == "__main__":
    init_db()
    backend = database_backend_name()
    print(f"Rinse & Rise Billing — {backend} database ready (dev server)")
    print("API routes: bills, invoice PDF, WhatsApp send")
    if not is_cloud_deployment():
        if try_start_bridge():
            print("WhatsApp bridge started — logs: whatsapp-bridge/bridge.log")
        elif bridge_is_running():
            print("WhatsApp bridge already running on port 3001")
        else:
            print("WhatsApp bridge not running — install Node.js and run Start Billing.bat")

    port = int(os.environ.get("PORT", 8080))
    print(f"Open http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
