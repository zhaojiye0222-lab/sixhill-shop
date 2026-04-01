const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const query = "CREATE DATABASE IF NOT EXISTS jake_ecommerce; CREATE USER IF NOT EXISTS 'admin'@'localhost' IDENTIFIED BY 'JakeAdmin@2026'; GRANT ALL PRIVILEGES ON jake_ecommerce.* TO 'admin'@'localhost'; FLUSH PRIVILEGES;";
  conn.exec("mysql -u root -e \"" + query + "\"", (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('DB Config complete: ' + code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({ host: '8.215.108.239', port: 22, username: 'root', password: '@ZJY521xmc' });
