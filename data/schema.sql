-- Rinse & Rise Billing — SQLite Schema
-- Database file: data/rinse_rise.db (auto-created on first run)

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
    phone_key TEXT PRIMARY KEY,          -- 10-digit normalized phone
    phone TEXT NOT NULL,
    name TEXT,
    profile_created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_no TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    phone_key TEXT,
    delivery_date TEXT,
    delivery_time TEXT,
    delivery_display TEXT,
    service_mode TEXT NOT NULL DEFAULT 'door-pickup',
    home_service_mode TEXT DEFAULT 'door-pickup',
    shop_service_mode TEXT DEFAULT '',
    payment_type TEXT DEFAULT '',
    payment_info TEXT DEFAULT '',
    subtotal REAL NOT NULL DEFAULT 0,
    discount_percent REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    sent_via TEXT NOT NULL DEFAULT 'saved',   -- saved | print | whatsapp
    delivery_status TEXT NOT NULL DEFAULT 'pending',  -- pending | done
    completed_at TEXT,
    FOREIGN KEY (phone_key) REFERENCES customers(phone_key)
);

CREATE TABLE IF NOT EXISTS bill_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    item_key TEXT,
    name TEXT NOT NULL,
    service TEXT NOT NULL,
    category TEXT,
    rate REAL NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bills_phone ON bills(phone_key);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(delivery_status);
CREATE INDEX IF NOT EXISTS idx_bills_created ON bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);

CREATE TABLE IF NOT EXISTS expenditures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenditures_created ON expenditures(created_at DESC);
