require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function migrateData() {
  const dbFile = path.join(__dirname, '..', 'db.json');
  if (!fs.existsSync(dbFile)) {
    console.log('No db.json found. Skipping migration.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sixhill_db',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });

  console.log('Starting data migration...');

  // Migrate Categories
  if (data.categories) {
    console.log(`Migrating ${data.categories.length} categories...`);
    for (const [id, cat] of data.categories) {
      await connection.query(
        'INSERT IGNORE INTO categories (id, name, description, parent_id, sort_order) VALUES (?, ?, ?, ?, ?)',
        [cat.id, cat.name, cat.description || null, cat.parentId || null, cat.sortOrder || 0]
      );
    }
  }

  // Migrate Products
  if (data.products) {
    console.log(`Migrating ${data.products.length} products...`);
    for (const [id, prod] of data.products) {
      await connection.query(
        `INSERT IGNORE INTO products 
        (id, sku, name, description, price, stock, category_id, sub_category_id, images, specs, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prod.id, 
          prod.sku, 
          prod.name, 
          prod.description || '', 
          prod.price, 
          prod.stock, 
          prod.categoryId || null, 
          prod.subCategoryId || null, 
          JSON.stringify(prod.images || []), 
          JSON.stringify(prod.specs || {}), 
          prod.status || 'active'
        ]
      );
    }
  }

  // Migrate Users (We already have default admin/user, this adds any others)
  if (data.users) {
    console.log(`Migrating ${data.users.length} users...`);
    for (const [id, user] of data.users) {
      await connection.query(
        `INSERT IGNORE INTO users (id, username, password, name, phone, address, role) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.username || user.id, // Fallback if no username
          user.password || 'default_password',
          user.name,
          user.phone || null,
          user.address || null,
          user.role || 'user'
        ]
      );
    }
  }

  // Migrate Orders
  if (data.orders) {
    console.log(`Migrating ${data.orders.length} orders...`);
    for (const [id, order] of data.orders) {
      const orderId = order.orderId || order.id; // handle both formats just in case
      
      // Ensure user exists first
      const [userRows] = await connection.query('SELECT id FROM users WHERE id = ?', [order.userId]);
      if (userRows.length === 0) {
        console.warn(`Skipping order ${orderId} because user ${order.userId} does not exist in DB`);
        continue;
      }

      await connection.query(
        `INSERT IGNORE INTO orders (order_id, user_id, total_amount, payment_method, receipt_url, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          order.userId,
          order.totalAmount,
          order.paymentMethod || null,
          order.receiptUrl || order.paymentReceiptUrl || null,
          order.status,
          new Date(order.createdAt),
          order.updatedAt ? new Date(order.updatedAt) : new Date(order.createdAt)
        ]
      );

      // Migrate Order Items
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          // Check if product exists
          const [prodRows] = await connection.query('SELECT id FROM products WHERE id = ?', [item.productId]);
          const productId = prodRows.length > 0 ? item.productId : null;

          if (productId) {
            await connection.query(
              `INSERT INTO order_items (order_id, product_id, sku, name, price_at_purchase, quantity, color, item_total) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                orderId,
                productId,
                item.sku || null,
                item.name || null,
                item.priceAtPurchase || (item.itemTotal / item.quantity),
                item.quantity,
                item.color || null,
                item.itemTotal
              ]
            );
          }
        }
      }
    }
  }

  console.log('Migration completed successfully!');
  await connection.end();
}

migrateData().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
