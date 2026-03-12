import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('bridal_shop.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('admin', 'cashier'))
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    category TEXT CHECK(category IN ('suit', 'wedding_dress', 'dress')),
    size TEXT,
    status TEXT DEFAULT 'available' CHECK(status IN ('available', 'rented', 'sold', 'maintenance')),
    price_rental REAL DEFAULT 50.0,
    price_sale REAL DEFAULT 500.0
  );

  CREATE TABLE IF NOT EXISTS rentals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    user_id INTEGER,
    customer_name TEXT,
    customer_phone TEXT,
    customer_id_number TEXT,
    start_date TEXT,
    expiry_date TEXT,
    return_date TEXT,
    total_amount REAL,
    paid_amount REAL,
    penalty_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'returned', 'overdue')),
    FOREIGN KEY(item_id) REFERENCES inventory(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    user_id INTEGER,
    customer_name TEXT,
    sale_date TEXT,
    amount REAL,
    FOREIGN KEY(item_id) REFERENCES inventory(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Migration: Add user_id to rentals and sales if it doesn't exist
try {
  db.exec("ALTER TABLE rentals ADD COLUMN user_id INTEGER");
} catch (e) {}
try {
  db.exec("ALTER TABLE sales ADD COLUMN user_id INTEGER");
} catch (e) {}

// Migration: Add customer_id_number to rentals if it doesn't exist
try {
  db.exec("ALTER TABLE rentals ADD COLUMN customer_id_number TEXT");
} catch (e) {
  // Column might already exist
}

// Seed initial data if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  // Default admin: admin/admin123 (In real app, hash this)
  // For this demo, I'll hash it in the seed or just use plain for now if I don't have bcrypt ready in this step
  // But I installed bcryptjs, so let's use it in the server logic.
  // I'll insert a default admin with a hashed password 'admin123'
  // $2a$10$rB2L9S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S
  // Actually I'll just do it in the server startup or a separate script.
}

const inventoryCount = db.prepare('SELECT COUNT(*) as count FROM inventory').get() as { count: number };
if (inventoryCount.count === 0) {
  const insert = db.prepare('INSERT INTO inventory (code, category, size, price_rental, price_sale) VALUES (?, ?, ?, ?, ?)');
  
  // Men's suits: B1-B50, sizes 44, 46, 48, 50, 52, 54, 56
  const suitSizes = ['44', '46', '48', '50', '52', '54', '56'];
  for (let i = 1; i <= 50; i++) {
    for (const size of suitSizes) {
      insert.run(`B${i}-${size}`, 'suit', size, 100, 1000);
    }
  }

  // Women's wedding dresses: W1-W30, sizes Small, Medium, Large, XL, XXL
  const dressSizes = ['Small', 'Medium', 'Large', 'XL', 'XXL'];
  for (let i = 1; i <= 30; i++) {
    for (const size of dressSizes) {
      insert.run(`W${i}-${size}`, 'wedding_dress', size, 300, 3000);
    }
  }

  // Women's dresses: D1-D30, sizes Small, Medium, Large, XL, XXL
  for (let i = 1; i <= 30; i++) {
    for (const size of dressSizes) {
      insert.run(`D${i}-${size}`, 'dress', size, 150, 1500);
    }
  }
}

// Seed settings
const penaltyRate = db.prepare('SELECT * FROM settings WHERE key = ?').get('daily_penalty_rate');
if (!penaltyRate) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('daily_penalty_rate', '10');
}

export default db;
