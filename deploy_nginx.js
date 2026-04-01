const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const nginxConfig = "server { listen 80; server_name 8.215.108.239; root /var/www/Jake; index index.html; location / { try_files \\\ \\\/ /index.html; } location /api/ { proxy_pass http://localhost:3000/; } }";
  const commands = "echo '" + nginxConfig + "' > /etc/nginx/sites-available/jake && ln -sf /etc/nginx/sites-available/jake /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl restart nginx";
  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Nginx config complete: ' + code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({ host: '8.215.108.239', port: 22, username: 'root', password: '@ZJY521xmc' });
