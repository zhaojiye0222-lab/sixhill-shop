const express = require('express');
const db = require('../database');
const ProductService = require('../services/productService');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { logOperation } = require('../utils/logger');
const { parseImages } = require('../utils/parsers');

const router = express.Router();

// 获取全量商品列表
router.get('/', async (req, res) => {
  try {
    const products = await ProductService.getAllProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取商品详情 (支持 ID 或 SKU)
router.get('/:identifier', async (req, res) => {
  try {
    const product = await ProductService.getProduct(req.params.identifier);

    // 查找同分类下的所有产品作为"口味"选项
    const allFlavors = [];
    if (product.categoryId) {
      let flavorRows;
      if (product.categoryId === 'Bundle' || product.categoryId === 'cat_bundle') {
        [flavorRows] = await db.query(
          'SELECT id, name, sku, images, price, stock FROM products WHERE category_id = ?',
          ['cat_sticks']
        );
      } else {
        [flavorRows] = await db.query(
          'SELECT id, name, sku, images, price, stock FROM products WHERE category_id = ? AND sub_category_id = ?',
          [product.categoryId, product.subCategoryId]
        );
      }

      for (const p of flavorRows) {
        const pImages = parseImages(p.images);
        allFlavors.push({ id: p.id, name: p.name, sku: p.sku, images: pImages, price: p.price, stock: p.stock });
      }
    }

    res.json({ ...product, allFlavors });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// 新增商品 (限管理员)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    let { sku, name, description, categoryId, subCategoryId, price, stock, images, specs } = req.body;
    if (!sku || !name || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (typeof images === 'string') {
      try { images = JSON.parse(images); } catch (e) { images = [images]; }
    }
    if (!Array.isArray(images)) images = [];

    if (typeof specs === 'string') {
      try { specs = JSON.parse(specs); } catch (e) { specs = {}; }
    }
    if (typeof specs !== 'object' || specs === null) specs = {};

    const product = await ProductService.createProduct({
      sku, name, description, categoryId, subCategoryId, price, stock, images, specs
    }, req.user.id);

    await logOperation('CREATE', 'PRODUCT', product.id, `Created product ${product.sku}`, req.user);
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 修改商品基础信息 (限管理员)
router.put('/:productId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { sku, name, description, categoryId, subCategoryId, price, stock, images, specs } = req.body;
    const id = req.params.productId;

    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    if (sku) {
      const [skuRows] = await db.query('SELECT id FROM products WHERE sku = ? AND id != ?', [sku, id]);
      if (skuRows.length > 0) return res.status(400).json({ error: 'SKU already exists' });
    }

    const updates = [];
    const values = [];
    if (sku) { updates.push('sku = ?'); values.push(sku); }
    if (name) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (categoryId !== undefined) { updates.push('category_id = ?'); values.push(categoryId); }
    if (subCategoryId !== undefined) { updates.push('sub_category_id = ?'); values.push(subCategoryId); }
    if (price !== undefined) { updates.push('price = ?'); values.push(Number(price)); }
    if (stock !== undefined) { updates.push('stock = ?'); values.push(parseInt(stock, 10)); }
    if (images !== undefined) {
      let parsedImages = images;
      if (typeof images === 'string') {
        try { parsedImages = JSON.parse(images); } catch (e) { parsedImages = [images]; }
      }
      if (!Array.isArray(parsedImages)) parsedImages = [];
      updates.push('images = ?'); values.push(JSON.stringify(parsedImages));
    }
    if (specs !== undefined) {
      let parsedSpecs = specs;
      if (typeof specs === 'string') {
        try { parsedSpecs = JSON.parse(specs); } catch (e) { parsedSpecs = {}; }
      }
      if (typeof parsedSpecs !== 'object' || parsedSpecs === null) parsedSpecs = {};
      updates.push('specs = ?'); values.push(JSON.stringify(parsedSpecs));
    }

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

// 删除单个商品 (限管理员)
router.delete('/:productId', authenticate, requireAdmin, async (req, res) => {
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

// 修改商品价格 (限管理员)
router.post('/:productId/price', authenticate, requireAdmin, async (req, res) => {
  try {
    const { newPrice } = req.body;
    const result = await ProductService.updatePrice(req.params.productId, newPrice, req.user.id);
    await logOperation('UPDATE', 'PRODUCT', req.params.productId, `Updated price to ${newPrice}`, req.user);
    res.json({ message: 'Price updated successfully', data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 修改商品图片 (限管理员，支持多图)
router.put('/:productId/image', authenticate, requireAdmin, async (req, res) => {
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

// ==========================================
// 商品评论
// ==========================================

// 确保 reviews 表存在
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        user_name VARCHAR(100),
        rating INT DEFAULT 5,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  } catch (e) {
    // 表可能已存在，忽略错误
  }
})();

// 获取商品评论列表
router.get('/:productId/reviews', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT r.*, u.name AS user_name FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.product_id = ? ORDER BY r.created_at DESC',
      [req.params.productId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 提交商品评论 (需登录)
router.post('/:productId/reviews', authenticate, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.productId;
    const userId = req.user.id;

    // 检查商品是否存在
    const [productRows] = await db.query('SELECT id FROM products WHERE id = ?', [productId]);
    if (productRows.length === 0) return res.status(404).json({ error: 'Product not found' });

    await db.query(
      'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
      [productId, userId, rating || 5, comment || '']
    );

    res.status(201).json({ message: 'Review submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
