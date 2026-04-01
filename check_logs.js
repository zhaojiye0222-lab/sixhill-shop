const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const commands = "pm2 logs jake-backend --err --lines 100 --nostream";
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
