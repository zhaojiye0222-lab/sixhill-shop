const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const commands = "cd /var/www/Jake/backend && node setup_db.js && node migrate_db.js";
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
