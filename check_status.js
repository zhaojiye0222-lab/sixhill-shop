const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const commands = `cat << 'EOF' > migrate_images.js
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jake_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function run() {
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const [products] = await pool.query('SELECT id, images FROM products');
  for (const p of products) {
    if (!p.images) continue;
    let images = [];
    try {
      images = JSON.parse(p.images);
    } catch(e) {
      if (p.images.startsWith('[')) continue; // failed parse
      images = [p.images];
    }
    
    let changed = false;
    let newImages = [];
    for (let i=0; i<images.length; i++) {
      let img = images[i];
      if (img && img.startsWith('data:image')) {
        const matches = img.match(/^data:image\\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1];
          const data = matches[2];
          const buffer = Buffer.from(data, 'base64');
          const filename = \`img_\\${p.id}_\\${i}_\\${Date.now()}.\\${ext}\`;
          fs.writeFileSync(path.join(uploadDir, filename), buffer);
          newImages.push(\`/uploads/\\${filename}\`);
          changed = true;
          console.log(\`Converted image for product \\${p.id} -> \\${filename}\`);
        } else {
          newImages.push(img);
        }
      } else {
        newImages.push(img);
      }
    }
    
    if (changed) {
      await pool.query('UPDATE products SET images = ? WHERE id = ?', [JSON.stringify(newImages), p.id]);
    }
  }
  
  // Also fix categories if they have base64 images
  const [categories] = await pool.query('SELECT id, image_url FROM categories');
  for (const c of categories) {
    if (c.image_url && c.image_url.startsWith('data:image')) {
        const matches = c.image_url.match(/^data:image\\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1];
          const data = matches[2];
          const buffer = Buffer.from(data, 'base64');
          const filename = \`cat_\\${c.id}_\\${Date.now()}.\\${ext}\`;
          fs.writeFileSync(path.join(uploadDir, filename), buffer);
          await pool.query('UPDATE categories SET image_url = ? WHERE id = ?', [\`/uploads/\\${filename}\`, c.id]);
          console.log(\`Converted image for category \\${c.id} -> \\${filename}\`);
        }
    }
  }

  // Also fix orders receipts if any
  const [orders] = await pool.query('SELECT order_id, receipt_url FROM orders');
  for (const o of orders) {
    if (o.receipt_url && o.receipt_url.startsWith('data:image')) {
        const matches = o.receipt_url.match(/^data:image\\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1];
          const data = matches[2];
          const buffer = Buffer.from(data, 'base64');
          const filename = \`receipt_\\${o.order_id}_\\${Date.now()}.\\${ext}\`;
          fs.writeFileSync(path.join(uploadDir, filename), buffer);
          await pool.query('UPDATE orders SET receipt_url = ? WHERE order_id = ?', [\`/uploads/\\${filename}\`, o.order_id]);
          console.log(\`Converted receipt for order \\${o.order_id} -> \\${filename}\`);
        }
    }
  }

  console.log('Done migrating images!');
  process.exit(0);
}
run();
EOF
cd backend && node ../migrate_images.js
`;
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
