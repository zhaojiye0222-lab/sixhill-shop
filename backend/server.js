require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const ProductService = require('./productService');
const OrderService = require('./orderService');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// In production, serve the frontend files from the backend
if (process.env.NODE_ENV === 'production') {
  // Assuming frontend files are one level up
  app.use(express.static(path.join(__dirname, '..')));
  
  // Also specifically serve the frontend folder if it exists
  app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
}

const fs = require('fs');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Create uploads directory if it doesn't exist to prevent crash on startup
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure dummy placeholder images exist so the demo works
const ensureDummyImages = () => {
  const dummies = [
    'sixhill-h1-pro.png', 'sixhill-h2-lite.png', 'orange-red.png', 'apple-ice.png', 
    'berry-mix.png', 'classic-tobacco.png', 'grape-ice.png', 'lemon-mint.png', 
    'mango-tango.png', 'watermelon.png', 'cool-mint.png', 'smooth-tobacco.png', 
    'cleaning-sticks.png', 'kungfu-bundle.png', 'mint-breeze.png', 'peach-ice.png',
    'watermelon-splash.png', 'coral-pink.png', 'blue-ocean.png', 'green-leaf.png',
    'spec-image.png'
  ];
  
  // Just create an empty 1x1 pixel png or copy a default one if we wanted to be thorough
  // For now, we'll let the frontend @error fallback handle it since it's cleaner
};
ensureDummyImages();

const JWT_SECRET = 'sixhill_super_secret_key_2026';

// ==========================================
// 认证与权限中间件
// ==========================================
const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Missing token' });
  
  const token = authHeader.split(' ')[1]; // 期望格式 "Bearer <token>"
  if (!token) return res.status(401).json({ error: 'Invalid token format' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await db.query('SELECT id, name, role FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) return res.status(401).json({ error: 'User no longer exists' });
    
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ==========================================
// 日志记录 Helper
// ==========================================
const logOperation = async (action, entityType, entityId, details, user) => {
  try {
    await db.query(
      `INSERT INTO operation_logs (action, entity_type, entity_id, details, operator_id, operator_name) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [action, entityType, entityId, details, user.id, user.name]
    );
  } catch (err) {
    console.error('Failed to log operation:', err);
  }
};

// ==========================================
// Auth 路由 (真实 JWT 登录与注册)
// ==========================================
app.post('/api/register', async (req, res) => {
  const { username, password, name, phone, address, ageConfirmed } = req.body;
  
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields (username, password, name)' });
  }
  
  if (!ageConfirmed) {
    return res.status(400).json({ error: 'You must confirm you are 21+ to register' });
  }

  try {
    // Check if username exists
    const [existingRows] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingRows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const newId = `u_${Date.now()}`;
    const newUser = {
      id: newId,
      username,
      password, // In a real app, hash this password!
      name,
      phone: phone || '',
      address: address || '',
      role: 'user'
    };

    await db.query(
      `INSERT INTO users (id, username, password, name, phone, address, role) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newUser.id, newUser.username, newUser.password, newUser.name, newUser.phone, newUser.address, newUser.role]
    );

    // Auto-login after registration
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role, name: newUser.name }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.status(201).json({ 
      message: 'Registration successful',
      token,
      user: { id: newUser.id, name: newUser.name, role: newUser.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];

    // 签发真实 JWT Token，有效期 24 小时
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({ 
      message: 'Login successful', 
      token, 
      user: { id: user.id, name: user.name, role: user.role } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// API 路由
// ==========================================

// 获取全量商品列表 (给首页调用)
app.get('/api/products', async (req, res) => {
  try {
    const products = await ProductService.getAllProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. 获取分类列表
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC');
    const categories = rows.map(row => ({
      ...row,
      parentId: row.parent_id,
      sortOrder: row.sort_order
    }));
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 新增分类 (限管理员)
app.post('/api/categories', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    
    // 生成一个简单的 ID
    const newId = 'cat_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);
    
    await db.query(
      'INSERT INTO categories (id, name, parent_id) VALUES (?, ?, ?)',
      [newId, name, parentId || null]
    );
    
    const newCategory = { id: newId, name, parentId: parentId || null };
    logOperation('CREATE', 'CATEGORY', newId, `Created category ${name}`, req.user);
    
    res.status(201).json({ message: 'Category created', category: newCategory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除分类 (限管理员)
app.delete('/api/categories/:categoryId', authenticate, requireAdmin, (req, res) => {
  try {
    const id = req.params.categoryId;
    if (!db.categories.has(id)) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // 检查是否有子分类依赖它
    const hasChildren = Array.from(db.categories.values()).some(c => c.parentId === id);
    if (hasChildren) {
      return res.status(400).json({ error: 'Cannot delete category that has sub-categories' });
    }
    
    // 检查是否有商品正在使用它
    const isUsed = Array.from(db.products.values()).some(p => p.categoryId === id || p.subCategoryId === id);
    if (isUsed) {
      return res.status(400).json({ error: 'Cannot delete category because some products are still using it' });
    }

    db.categories.delete(id);
    logOperation('DELETE', 'CATEGORY', id, `Deleted category`, req.user);
    db.save();
    
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1. 获取商品详情 (支持 ID 或 SKU)
app.get('/api/products/:identifier', async (req, res) => {
  try {
    const product = await ProductService.getProduct(req.params.identifier);
    
    // 查找同分类（或同系列）下的所有产品作为“口味”选项
    const allFlavors = [];
    if (product.categoryId) {
      const [rows] = await db.query('SELECT * FROM products');
      for (const p of rows) {
        // 如果当前商品是 Bundle 套装，那么允许它选择所有的 Sticks（烟弹）作为口味/变体
        if (product.categoryId === 'Bundle' || product.categoryId === 'cat_bundle') {
           if (p.category_id === 'cat_sticks') {
             allFlavors.push({ id: p.id, name: p.name, sku: p.sku, images: p.images, price: p.price, stock: p.stock });
           }
        } else {
           // 普通商品，只显示同分类同子类的其他口味
           if (p.category_id === product.categoryId && p.sub_category_id === product.subCategoryId) {
             allFlavors.push({ id: p.id, name: p.name, sku: p.sku, images: p.images, price: p.price, stock: p.stock });
           }
        }
      }
    }

    res.json({ ...product, allFlavors });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// 新增商品 (限管理员)
app.post('/api/products', authenticate, requireAdmin, async (req, res) => {
  try {
    const { sku, name, description, categoryId, subCategoryId, price, stock, images } = req.body;
    if (!sku || !name || price === undefined) {
       return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const product = await ProductService.createProduct({
      sku, name, description, categoryId, subCategoryId, price, stock, images
    }, req.user.id);

    await logOperation('CREATE', 'PRODUCT', product.id, `Created product ${product.sku}`, req.user);
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 删除单个商品 (限管理员)
app.delete('/api/products/:productId', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = req.params.productId;
    const [rows] = await db.query('SELECT id FROM products WHERE id = ?', [id]);
    
    if (rows.length > 0) {
      await db.query('DELETE FROM products WHERE id = ?', [id]);
      await logOperation('DELETE', 'PRODUCT', id, `Deleted product`, req.user);
      res.json({ message: 'Product deleted successfully' });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. 修改商品价格 (限管理员)
app.post('/api/products/:productId/price', authenticate, requireAdmin, async (req, res) => {
  try {
    const { newPrice } = req.body;
    const result = await ProductService.updatePrice(req.params.productId, newPrice, req.user.id);
    await logOperation('UPDATE', 'PRODUCT', req.params.productId, `Updated price to ${newPrice}`, req.user);
    res.json({ message: 'Price updated successfully', data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 修改商品基础信息与分类 (限管理员)
app.put('/api/products/:productId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { sku, name, description, categoryId, subCategoryId, price, stock, images } = req.body;
    const id = req.params.productId;
    
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    if (sku) {
       const [skuRows] = await db.query('SELECT id FROM products WHERE sku = ? AND id != ?', [sku, id]);
       if (skuRows.length > 0) return res.status(400).json({ error: 'SKU already exists' });
    }
    
    // We do a simple update for whatever fields are provided
    const updates = [];
    const values = [];
    if (sku) { updates.push('sku = ?'); values.push(sku); }
    if (name) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (categoryId !== undefined) { updates.push('category_id = ?'); values.push(categoryId); }
    if (subCategoryId !== undefined) { updates.push('sub_category_id = ?'); values.push(subCategoryId); }
    if (price !== undefined) { updates.push('price = ?'); values.push(Number(price)); }
    if (stock !== undefined) { updates.push('stock = ?'); values.push(parseInt(stock, 10)); }
    if (images !== undefined) { updates.push('images = ?'); values.push(JSON.stringify(images)); }

    if (updates.length > 0) {
      values.push(id);
      await db.query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, values);
      await logOperation('UPDATE', 'PRODUCT', id, `Updated basic info`, req.user);
    }
    
    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2.5 修改商品图片 (限管理员，支持多图)
app.put('/api/products/:productId/image', authenticate, requireAdmin, async (req, res) => {
  try {
    const { imageUrls } = req.body;
    if (!imageUrls || !Array.isArray(imageUrls)) {
      return res.status(400).json({ error: 'Image URLs array is required' });
    }
    const product = await ProductService.updateProductImage(req.params.productId, imageUrls, req.user.id);
    await logOperation('UPDATE', 'PRODUCT', req.params.productId, `Updated images`, req.user);
    res.json({ message: 'Images updated successfully', product });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. 创建订单
app.post('/api/orders', authenticate, async (req, res) => {
  try {
    const { items, paymentMethod } = req.body;
    const order = await OrderService.createOrder(req.user.id, items, paymentMethod);
    await logOperation('CREATE', 'ORDER', order.orderId || order.id, 'User placed new order', req.user);
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. 获取订单列表 (管理员获取所有，用户获取自己的)
app.get('/api/orders', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      res.json(await OrderService.getAllOrders());
    } else {
      res.json(await OrderService.getUserOrders(req.user.id));
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4.1 获取我的订单 (专门给前台用的路由)
app.get('/api/orders/my', authenticate, async (req, res) => {
  try {
    const orders = await OrderService.getUserOrders(req.user.id);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 取消或删除订单
app.delete('/api/orders/:orderId', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      // 管理员可以直接删除订单
      const order = await OrderService.getOrderById(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      await db.query('DELETE FROM orders WHERE order_id = ?', [req.params.orderId]);
      await logOperation('DELETE', 'ORDER', req.params.orderId, 'Admin deleted order', req.user);
      
      return res.json({ message: 'Order deleted successfully' });
    } else {
      // 普通用户只能取消订单
      const order = await OrderService.updateOrderStatus(req.params.orderId, 'cancelled');
      return res.json(order);
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all orders (Admin only)
app.get('/api/admin/orders', authenticate, requireAdmin, async (req, res) => {
  try {
    const orders = await OrderService.getAllOrders();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update order status (Admin only or user confirming receipt)
app.patch('/api/orders/:orderId/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await OrderService.getOrderById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // 只有管理员可以随意改状态，普通用户只能确认收货(delivered)或支付成功回调(处理中)
    if (req.user.role !== 'admin' && !['delivered', 'paid'].includes(status)) {
       return res.status(403).json({ error: 'Unauthorized status update' });
    }

    const updatedOrder = await OrderService.updateOrderStatus(req.params.orderId, status);
    await logOperation('UPDATE', 'ORDER_STATUS', order.orderId, `Status changed to ${status}`, req.user);
    
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5.1 用户提交支付截图
app.post('/api/orders/:orderId/payment', authenticate, async (req, res) => {
  try {
    const { receiptUrl } = req.body;
    if (!receiptUrl) return res.status(400).json({ error: 'Payment receipt URL is required' });
    
    // OrderService.submitPayment checks if the user owns the order
    const order = await OrderService.submitPayment(req.params.orderId, req.user.id, receiptUrl);
    await logOperation('UPDATE', 'ORDER', req.params.orderId, `User submitted payment receipt`, req.user);
    
    res.json({ message: 'Payment submitted successfully', order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin overview stats
app.get('/api/admin/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [productsRows] = await db.query('SELECT COUNT(*) as count FROM products');
    const [ordersRows] = await db.query('SELECT COUNT(*) as count, SUM(total_amount) as revenue FROM orders WHERE status != "cancelled" AND status != "deleted"');
    const [pendingRows] = await db.query('SELECT COUNT(*) as count FROM orders WHERE status = "pending_payment"');
    
    res.json({
      totalProducts: productsRows[0].count,
      totalOrders: ordersRows[0].count,
      totalRevenue: ordersRows[0].revenue || 0,
      pendingOrders: pendingRows[0].count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 上传图片 API
// ==========================================
app.post('/api/upload', authenticate, requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }
  
  // Return the URL path to the uploaded file
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// Catch-all for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API Endpoint not found' });
});

// Fallback for frontend routes (Single Page App behavior)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Export the app for Vercel serverless functions
module.exports = app;

// IMPORTANT: Do NOT listen on a port when running in Vercel
// Vercel handles the server listening automatically
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}
