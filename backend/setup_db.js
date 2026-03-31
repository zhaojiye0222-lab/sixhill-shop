require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDatabase() {
  console.log('Connecting to MySQL...');
  
  // Connect without database first to create it if it doesn't exist
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });

  const dbName = process.env.DB_NAME || 'jake_ecommerce';
  console.log(`Using database ${dbName}...`);
  await connection.query(`USE \`${dbName}\`;`);

  console.log('Creating tables...');

  // Users Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(50),
      address TEXT,
      role VARCHAR(20) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Categories Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      parent_id VARCHAR(50),
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  // Products Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(50) PRIMARY KEY,
      sku VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      stock INT DEFAULT 0,
      category_id VARCHAR(50),
      sub_category_id VARCHAR(50),
      images JSON,
      specs JSON,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (sub_category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  // Orders Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      total_amount DECIMAL(10, 2) NOT NULL,
      payment_method VARCHAR(50),
      receipt_url TEXT,
      shipping_address TEXT,
      status VARCHAR(50) DEFAULT 'pending_payment',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Order Items Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(50) NOT NULL,
      product_id VARCHAR(50) NOT NULL,
      sku VARCHAR(50),
      name VARCHAR(200),
      price_at_purchase DECIMAL(10, 2) NOT NULL,
      quantity INT NOT NULL,
      color VARCHAR(50),
      item_total DECIMAL(10, 2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  // Operation Logs Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      action VARCHAR(50),
      entity_type VARCHAR(50),
      entity_id VARCHAR(50),
      details TEXT,
      operator_id VARCHAR(50),
      operator_name VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert Default Admin
  await connection.query(`
    INSERT IGNORE INTO users (id, username, password, name, role) 
    VALUES ('a9999', 'admin', 'admin123', 'Admin Jake', 'admin');
  `);

  // Insert Default User
  await connection.query(`
    INSERT IGNORE INTO users (id, username, password, name, role) 
    VALUES ('u1001', 'user', 'user123', 'Normal User', 'user');
  `);

  console.log('Database setup completed successfully!');
  await connection.end();
}

setupDatabase().catch(err => {
  console.error('Error setting up database:', err);
  process.exit(1);
});
