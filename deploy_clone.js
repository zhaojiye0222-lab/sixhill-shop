const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const commands = "cd /var/www && rm -rf Jake && git clone https://github.com/zhaojiye0222-lab/sixhill-shop.git Jake && cd Jake && echo \"DB_HOST=localhost\nDB_USER=admin\nDB_PASSWORD=JakeAdmin@2026\nDB_NAME=jake_ecommerce\nJWT_SECRET=super_secret_jake_key_2026\nPORT=3000\nNODE_ENV=production\" > backend/.env && cd backend && npm install && node migrate_db.js && pm2 stop jake-backend || true && pm2 start server.js --name jake-backend && pm2 save && pm2 startup";
  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Deploy complete: ' + code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({ host: '8.215.108.239', port: 22, username: 'root', password: '@ZJY521xmc' });
