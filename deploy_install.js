const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs mysql-server nginx && npm install -g pm2', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Install complete: ' + code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({ host: '8.215.108.239', port: 22, username: 'root', password: '@ZJY521xmc' });
