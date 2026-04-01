const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const commands = "cat /var/www/Jake/backend/server.js | grep -B 10 -A 20 'requireAdmin'";
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
