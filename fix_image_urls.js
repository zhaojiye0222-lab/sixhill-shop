const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const commands = `cd /var/www/Jake/backend && node -e "
const mysql = require('mysql2/promise');
require('dotenv').config();
async function fixUrls() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jake_ecommerce'
  });
  
  const [products] = await conn.query('SELECT id, images, specs FROM products');
  for (const p of products) {
    let changed = false;
    let images = p.images;
    if (Array.isArray(images)) {
      const newImages = images.map(url => url.replace(/http:\\/\\/localhost:3000/g, ''));
      if (JSON.stringify(newImages) !== JSON.stringify(images)) {
        images = newImages;
        changed = true;
      }
    }
    
    let specs = p.specs;
    if (specs && typeof specs === 'object') {
      const specsStr = JSON.stringify(specs);
      if (specsStr.includes('http://localhost:3000')) {
        specs = JSON.parse(specsStr.replace(/http:\\/\\/localhost:3000/g, ''));
        changed = true;
      }
    }
    
    if (changed) {
      await conn.query('UPDATE products SET images = ?, specs = ? WHERE id = ?', [JSON.stringify(images), JSON.stringify(specs), p.id]);
      console.log('Updated product ' + p.id);
    }
  }
  
  await conn.end();
  console.log('Done updating URLs');
}
fixUrls().catch(console.error);
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
