const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const nginxConf = `
server {
    listen 80;
    server_name 8.215.108.239;
    
    # Static files served directly by Nginx (faster than Node)
    root /var/www/Jake;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API requests forwarded to Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
`;
  
  const commands = `echo '${nginxConf}' > /etc/nginx/sites-available/jake && nginx -t && systemctl restart nginx`;
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
