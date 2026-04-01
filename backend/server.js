require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// ==========================================
// Express 应用初始化
// ==========================================
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// 静态文件：上传图片目录
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// 生产环境下服务前端静态文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..')));
  app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
}

// ==========================================
// 挂载 API 路由
// ==========================================
const authRoutes       = require('./routes/auth');
const productRoutes    = require('./routes/products');
const categoryRoutes   = require('./routes/categories');
const orderRoutes      = require('./routes/orders');
const adminRoutes      = require('./routes/admin');
const uploadRoutes     = require('./routes/upload');

app.use('/api', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// ==========================================
// 静态文件与 SPA Fallback
// ==========================================
app.use(express.static(path.join(__dirname, '../')));

app.get('/frontend/:file', (req, res) => {
  const filePath = path.join(__dirname, '..', 'frontend', req.params.file);
  res.sendFile(filePath, err => {
    if (err) res.status(404).send('Frontend file not found');
  });
});

// 未匹配的 API 路由返回 404
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API Endpoint not found' });
});

// SPA 前端路由 Fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// ==========================================
// 启动服务 / Vercel 导出
// ==========================================
module.exports = app;

if (!process.env.VERCEL && require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}
