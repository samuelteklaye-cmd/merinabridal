import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import db from './db.ts';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = 'your-secret-key'; // In a real app, use process.env.JWT_SECRET

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Seed admin if not exists
  const adminExists = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashedPassword, 'admin');
    const cashierPassword = await bcrypt.hash('cashier123', 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('cashier', cashierPassword, 'cashier');
  }

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  };

  // API Routes
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ user: { id: user.id, username: user.username, role: user.role } });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  app.get('/api/auth/me', authenticate, (req: any, res) => {
    res.json({ user: req.user });
  });

  // Cashiers (Users)
  app.get('/api/cashiers', authenticate, isAdmin, (req, res) => {
    const cashiers = db.prepare("SELECT id, username, role FROM users WHERE role = 'cashier'").all();
    res.json(cashiers);
  });

  app.post('/api/cashiers', authenticate, isAdmin, async (req, res) => {
    const { username, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const transaction = db.transaction(() => {
        const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hashedPassword, 'cashier');
        db.prepare('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)').run((req as any).user.id, `Created cashier account: ${username}`);
        return result.lastInsertRowid;
      });
      const id = transaction();
      res.json({ id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/cashiers/:id', authenticate, isAdmin, async (req, res) => {
    const { username, password } = req.body;
    try {
      const transaction = db.transaction(async () => {
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          db.prepare('UPDATE users SET username = ?, password = ? WHERE id = ? AND role = \'cashier\'')
            .run(username, hashedPassword, req.params.id);
        } else {
          db.prepare('UPDATE users SET username = ? WHERE id = ? AND role = \'cashier\'')
            .run(username, req.params.id);
        }
        db.prepare('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)').run((req as any).user.id, `Updated cashier account: ${username} (ID: ${req.params.id})`);
      });
      await transaction();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/cashiers/:id', authenticate, isAdmin, (req, res) => {
    try {
      const cashier = db.prepare('SELECT username FROM users WHERE id = ? AND role = \'cashier\'').get(req.params.id) as any;
      if (!cashier) return res.status(404).json({ error: 'Cashier not found' });

      const transaction = db.transaction(() => {
        db.prepare('DELETE FROM users WHERE id = ? AND role = \'cashier\'').run(req.params.id);
        db.prepare('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)').run((req as any).user.id, `Deleted cashier account: ${cashier.username} (ID: ${req.params.id})`);
      });
      transaction();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Inventory
  app.get('/api/inventory', authenticate, (req, res) => {
    const items = db.prepare('SELECT * FROM inventory').all();
    res.json(items);
  });

  app.post('/api/inventory', authenticate, isAdmin, (req, res) => {
    const { code, category, size, price_rental, price_sale } = req.body;
    try {
      const transaction = db.transaction(() => {
        const result = db.prepare('INSERT INTO inventory (code, category, size, price_rental, price_sale) VALUES (?, ?, ?, ?, ?)').run(code, category, size, price_rental, price_sale);
        db.prepare('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)').run((req as any).user.id, `Added inventory item ${code}`);
        return result.lastInsertRowid;
      });
      const id = transaction();
      res.json({ id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/inventory/:id', authenticate, isAdmin, (req, res) => {
    const { code, category, size, price_rental, price_sale, status } = req.body;
    const transaction = db.transaction(() => {
      db.prepare('UPDATE inventory SET code = ?, category = ?, size = ?, price_rental = ?, price_sale = ?, status = ? WHERE id = ?')
        .run(code, category, size, price_rental, price_sale, status, req.params.id);
      db.prepare('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)').run((req as any).user.id, `Updated inventory item ${code} (ID: ${req.params.id})`);
    });
    transaction();
    res.json({ success: true });
  });

  app.delete('/api/inventory/:id', authenticate, isAdmin, (req, res) => {
    try {
      // Check if item is rented or sold before deleting
      const item = db.prepare('SELECT status, code FROM inventory WHERE id = ?').get(req.params.id) as any;
      if (!item) return res.status(404).json({ error: 'Item not found' });
      
      if (item.status !== 'available') {
        return res.status(400).json({ error: `Cannot delete item that is currently ${item.status}` });
      }

      const transaction = db.transaction(() => {
        db.prepare('DELETE FROM inventory WHERE id = ?').run(req.params.id);
        db.prepare('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)').run((req as any).user.id, `Deleted inventory item ${item.code} (ID: ${req.params.id})`);
      });
      transaction();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Rentals
  app.get('/api/rentals', authenticate, (req, res) => {
    // Update overdue rentals first
    db.prepare(`
      UPDATE rentals 
      SET status = 'overdue' 
      WHERE status = 'active' AND expiry_date < date('now')
    `).run();

    // Get penalty rate
    const penaltyRateSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('daily_penalty_rate') as any;
    const dailyPenaltyRate = parseFloat(penaltyRateSetting?.value || '0');

    // Update penalty amounts for overdue rentals that haven't been returned yet
    if (dailyPenaltyRate > 0) {
      db.prepare(`
        UPDATE rentals
        SET penalty_amount = CAST((julianday(date('now')) - julianday(expiry_date)) AS INTEGER) * ?
        WHERE status = 'overdue' AND return_date IS NULL
      `).run(dailyPenaltyRate);
    }

    const rentals = db.prepare(`
      SELECT r.*, i.code as item_code, i.category as item_category 
      FROM rentals r 
      JOIN inventory i ON r.item_id = i.id
      ORDER BY r.start_date DESC
    `).all();
    res.json(rentals);
  });

  app.post('/api/rentals', authenticate, (req, res) => {
    const { item_id, customer_name, customer_phone, customer_id_number, start_date, expiry_date, total_amount, paid_amount } = req.body;
    
    const item = db.prepare('SELECT status FROM inventory WHERE id = ?').get(item_id) as any;
    if (!item || item.status !== 'available') {
      return res.status(400).json({ error: 'Item is not available for rental' });
    }

    const transaction = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO rentals (item_id, user_id, customer_name, customer_phone, customer_id_number, start_date, expiry_date, total_amount, paid_amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(item_id, (req as any).user.id, customer_name, customer_phone, customer_id_number, start_date, expiry_date, total_amount, paid_amount);
      
      db.prepare("UPDATE inventory SET status = 'rented' WHERE id = ?").run(item_id);
      
      db.prepare('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)').run((req as any).user.id, `Created rental for item ${item_id}`);
      
      return result.lastInsertRowid;
    });

    try {
      const rentalId = transaction();
      res.json({ id: rentalId });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/rentals/:id/return', authenticate, (req, res) => {
    const { return_date, penalty_amount } = req.body;
    const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(req.params.id) as any;
    if (!rental) return res.status(404).json({ error: 'Rental not found' });

    const transaction = db.transaction(() => {
      db.prepare("UPDATE rentals SET return_date = ?, penalty_amount = ?, status = 'returned' WHERE id = ?")
        .run(return_date, penalty_amount, req.params.id);
      
      db.prepare("UPDATE inventory SET status = 'available' WHERE id = ?").run(rental.item_id);
      
      db.prepare('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)').run((req as any).user.id, `Returned item ${rental.item_id} from rental ${req.params.id}`);
    });

    transaction();
    res.json({ success: true });
  });

  // Sales
  app.get('/api/sales', authenticate, (req, res) => {
    const sales = db.prepare(`
      SELECT s.*, i.code as item_code, i.category as item_category 
      FROM sales s 
      JOIN inventory i ON s.item_id = i.id
      ORDER BY s.sale_date DESC
    `).all();
    res.json(sales);
  });

  app.post('/api/sales', authenticate, (req, res) => {
    const { item_id, customer_name, sale_date, amount } = req.body;
    
    const item = db.prepare('SELECT status FROM inventory WHERE id = ?').get(item_id) as any;
    if (!item || item.status !== 'available') {
      return res.status(400).json({ error: 'Item is not available for sale' });
    }

    const transaction = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO sales (item_id, user_id, customer_name, sale_date, amount)
        VALUES (?, ?, ?, ?, ?)
      `).run(item_id, (req as any).user.id, customer_name, sale_date, amount);
      
      db.prepare("UPDATE inventory SET status = 'sold' WHERE id = ?").run(item_id);
      
      db.prepare('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)').run((req as any).user.id, `Sold item ${item_id}`);
      
      return result.lastInsertRowid;
    });

    try {
      const saleId = transaction();
      res.json({ id: saleId });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Reports
  app.get('/api/reports/dashboard', authenticate, (req, res) => {
    // Update overdue rentals first
    db.prepare(`
      UPDATE rentals 
      SET status = 'overdue' 
      WHERE status = 'active' AND expiry_date < date('now')
    `).run();

    const activeRentals = db.prepare("SELECT COUNT(*) as count FROM rentals WHERE status = 'active'").get() as any;
    const overdueRentals = db.prepare("SELECT COUNT(*) as count FROM rentals WHERE status = 'overdue'").get() as any;
    const totalSales = db.prepare('SELECT SUM(amount) as total FROM sales').get() as any;
    const totalPenalties = db.prepare('SELECT SUM(penalty_amount) as total FROM rentals').get() as any;
    
    // Revenue tracking
    const rentalRevenue = db.prepare('SELECT SUM(paid_amount) as total FROM rentals').get() as any;
    const salesRevenue = db.prepare('SELECT SUM(amount) as total FROM sales').get() as any;
    const totalDue = db.prepare('SELECT SUM(total_amount - paid_amount) as total FROM rentals WHERE status != \'returned\'').get() as any;

    res.json({
      activeRentals: activeRentals.count,
      overdueRentals: overdueRentals.count,
      totalSales: totalSales.total || 0,
      totalPenalties: totalPenalties.total || 0,
      revenue: (rentalRevenue.total || 0) + (salesRevenue.total || 0) + (totalPenalties.total || 0),
      totalDue: totalDue.total || 0,
      totalPaid: (rentalRevenue.total || 0) + (salesRevenue.total || 0)
    });
  });

  app.get('/api/reports/daily', authenticate, isAdmin, (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const sales = db.prepare(`
      SELECT s.*, i.code as item_code, u.username as cashier
      FROM sales s
      JOIN inventory i ON s.item_id = i.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.sale_date = ?
    `).all(date);

    const rentals = db.prepare(`
      SELECT r.*, i.code as item_code, u.username as cashier
      FROM rentals r
      JOIN inventory i ON r.item_id = i.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.start_date = ?
    `).all(date);

    const returns = db.prepare(`
      SELECT r.*, i.code as item_code, u.username as cashier
      FROM rentals r
      JOIN inventory i ON r.item_id = i.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.return_date = ?
    `).all(date);

    res.json({ sales, rentals, returns });
  });

  app.get('/api/reports/cashier-performance', authenticate, isAdmin, (req, res) => {
    const performance = db.prepare(`
      SELECT 
        u.username,
        u.id as user_id,
        (SELECT COUNT(*) FROM sales s WHERE s.user_id = u.id) as sales_count,
        (SELECT SUM(amount) FROM sales s WHERE s.user_id = u.id) as sales_amount,
        (SELECT COUNT(*) FROM rentals r WHERE r.user_id = u.id) as rentals_count,
        (SELECT SUM(paid_amount) FROM rentals r WHERE r.user_id = u.id) as rentals_amount
      FROM users u
      WHERE u.role = 'cashier'
    `).all();
    res.json(performance);
  });

  app.get('/api/reports/inventory-usage', authenticate, isAdmin, (req, res) => {
    const usage = db.prepare(`
      SELECT i.category, i.status, COUNT(*) as count 
      FROM inventory i 
      GROUP BY i.category, i.status
    `).all();
    res.json(usage);
  });

  // Audit Logs
  app.get('/api/audit-logs', authenticate, isAdmin, (req, res) => {
    const logs = db.prepare(`
      SELECT a.*, u.username 
      FROM audit_logs a 
      JOIN users u ON a.user_id = u.id 
      ORDER BY a.timestamp DESC 
      LIMIT 100
    `).all();
    res.json(logs);
  });

  // Settings
  app.get('/api/settings', authenticate, (req, res) => {
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsMap = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  app.put('/api/settings', authenticate, isAdmin, (req, res) => {
    const settings = req.body;
    const transaction = db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
      }
      db.prepare('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)').run((req as any).user.id, `Updated system settings: ${Object.keys(settings).join(', ')}`);
    });
    transaction();
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Server-side Automatic Backups
  const BACKUP_DIR = path.join(__dirname, 'backups');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
  }

  const runServerBackup = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `database_backup_${timestamp}.sqlite`);
    try {
      // Use SQLite's backup API via better-sqlite3 if possible, or just copy the file
      // For simplicity and safety with better-sqlite3, we'll use the .backup() method
      (db as any).backup(backupPath)
        .then(() => {
          console.log(`Server database backup created: ${backupPath}`);
          
          // Keep only the last 24 hourly backups
          const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.sqlite'))
            .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

          if (files.length > 24) {
            files.slice(24).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f.name)));
          }
        })
        .catch((err: any) => console.error('Server backup failed', err));
    } catch (err) {
      console.error('Server backup error', err);
    }
  };

  // Run backup every hour
  setInterval(runServerBackup, 60 * 60 * 1000);
  // Run initial backup
  runServerBackup();
}

startServer();
