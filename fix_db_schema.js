const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const commands = `cd /var/www/Jake/backend && node -e "
const mysql = require('mysql2/promise');
require('dotenv').config();
async function fixDb() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jake_ecommerce'
  });
  
  try {
    await conn.query('ALTER TABLE orders ADD COLUMN shipping_address TEXT');
    console.log('Added shipping_address column to orders table');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('shipping_address column already exists');
    } else {
      console.error(err);
    }
  }
  
  await conn.end();
}
fixDb().catch(console.error);
"`;

  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({ host: '8.215.108.239', port: 22, username: 'root', password: '@ZJY521xmc' });
