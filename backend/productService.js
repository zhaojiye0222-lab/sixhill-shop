const pool = require('./database');

/**
 * 安全解析 images 字段（兼容 JSON 数组字符串、单字符串、已解析数组）
 */
function parseImages(raw) {
  try {
    if (typeof raw === 'string') {
      if (raw.trim().startsWith('[')) return JSON.parse(raw);
      return raw.trim() ? [raw] : [];
    }
    if (Array.isArray(raw)) return raw;
  } catch (e) {
    if (typeof raw === 'string' && raw.trim()) return [raw];
  }
  return [];
}

/**
 * 安全解析 specs 字段（兼容 JSON 对象字符串、已解析对象）
 */
function parseSpecs(raw) {
  try {
    if (typeof raw === 'string' && raw.trim().startsWith('{')) return JSON.parse(raw);
    if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) return raw;
  } catch (e) {}
  return {};
}

/**
 * 将数据库行转为前端友好的产品对象
 */
function formatProduct(row) {
  return {
    ...row,
    images: parseImages(row.images),
    specs: parseSpecs(row.specs),
    categoryId: row.category_id,
    subCategoryId: row.sub_category_id
  };
}

class ProductService {
  /**
   * 获取所有产品列表
   */
  static async getAllProducts() {
    const [rows] = await pool.query('SELECT * FROM products');
    return rows.map(formatProduct);
  }

  /**
   * 获取产品详情
   * @param {string} identifier - 产品ID或SKU
   */
  static async getProduct(identifier) {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ? OR sku = ?', [identifier, identifier]);
    if (rows.length === 0) throw new Error('Product not found');
    return formatProduct(rows[0]);
  }

  /**
   * 创建新产品 (仅限管理员)
   */
  static async createProduct(data, operatorId) {
    const [userRows] = await pool.query('SELECT role FROM users WHERE id = ?', [operatorId]);
    if (userRows.length === 0 || userRows[0].role !== 'admin') {
      throw new Error('Unauthorized: Only admins can create products');
    }

    if (!data.name || !data.sku || !data.price) {
      throw new Error('Missing required product fields');
    }

    const [skuRows] = await pool.query('SELECT id FROM products WHERE sku = ?', [data.sku]);
    if (skuRows.length > 0) throw new Error('SKU already exists');

    const newId = `p_${Date.now()}`;
    const images = Array.isArray(data.images) ? data.images : (data.imageUrl ? [data.imageUrl] : ['https://via.placeholder.com/400x400']);
    const specs = data.specs || {};
    
    await pool.query(
      `INSERT INTO products 
      (id, sku, name, description, price, stock, category_id, sub_category_id, images, specs, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId, 
        data.sku, 
        data.name, 
        data.description || '', 
        parseFloat(data.price), 
        parseInt(data.stock) || 0, 
        data.categoryId || null, 
        data.subCategoryId || null, 
        JSON.stringify(images), 
        JSON.stringify(specs), 
        'active'
      ]
    );

    return {
      id: newId,
      sku: data.sku,
      name: data.name,
      description: data.description || '',
      categoryId: data.categoryId || null,
      subCategoryId: data.subCategoryId || null,
      images,
      specs,
      price: parseFloat(data.price),
      stock: parseInt(data.stock) || 0,
      status: 'active'
    };
  }

  /**
   * 修改产品图片 (支持多图)
   */
  static async updateProductImage(productId, imageUrls, operatorId) {
    const [userRows] = await pool.query('SELECT role FROM users WHERE id = ?', [operatorId]);
    if (userRows.length === 0 || userRows[0].role !== 'admin') {
      throw new Error('Unauthorized: Only admins can modify products');
    }

    const [productRows] = await pool.query('SELECT id, images FROM products WHERE id = ?', [productId]);
    if (productRows.length === 0) throw new Error('Product not found');

    let images = imageUrls;
    if (images && images.length > 0) {
       images = images.filter(url => !url.includes('placeholder'));
       if (images.length === 0) {
         images = ['https://via.placeholder.com/400x400'];
       }
    } else {
       images = ['https://via.placeholder.com/400x400'];
    }
    
    await pool.query('UPDATE products SET images = ? WHERE id = ?', [JSON.stringify(images), productId]);
    return { id: productId, images };
  }

  /**
   * 修改产品价格 (含安全与合理性校验)
   */
  static async updatePrice(productId, newPrice, operatorId) {
    const [userRows] = await pool.query('SELECT id, name, role FROM users WHERE id = ?', [operatorId]);
    if (userRows.length === 0 || userRows[0].role !== 'admin') {
      throw new Error('Unauthorized: Only admins can modify prices');
    }
    const operator = userRows[0];

    const [productRows] = await pool.query('SELECT id, price FROM products WHERE id = ?', [productId]);
    if (productRows.length === 0) throw new Error('Product not found');
    const product = productRows[0];

    if (typeof newPrice !== 'number' || isNaN(newPrice)) {
      throw new Error('Invalid price format');
    }
    if (newPrice < 1000 || newPrice > 10000000) {
      throw new Error('Price must be between Rp 1,000 and Rp 10,000,000');
    }
    if (product.price > 0 && newPrice > product.price * 3) {
      throw new Error('Price anomaly detected: Exceeds maximum allowed increase');
    }

    const oldPrice = product.price;

    await pool.query('UPDATE products SET price = ? WHERE id = ?', [newPrice, productId]);

    // 记录修改日志
    await pool.query(
      `INSERT INTO operation_logs (action, entity_type, entity_id, details, operator_id, operator_name) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['UPDATE_PRICE', 'PRODUCT', productId, `Price changed from ${oldPrice} to ${newPrice}`, operator.id, operator.name]
    );

    return { productId, oldPrice, newPrice };
  }
}

module.exports = ProductService;
