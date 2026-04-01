const express = require('express');
const db = require('../database');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { logOperation } = require('../utils/logger');

const router = express.Router();

// 获取分类列表
router.get('/', async (req, res) => {
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
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    const newId = 'cat_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);

    await db.query(
      'INSERT INTO categories (id, name, parent_id) VALUES (?, ?, ?)',
      [newId, name, parentId || null]
    );

    await logOperation('CREATE', 'CATEGORY', newId, `Created category ${name}`, req.user);
    res.status(201).json({ message: 'Category created', category: { id: newId, name, parentId: parentId || null } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除分类 (限管理员)
router.delete('/:categoryId', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = req.params.categoryId;

    const [catRows] = await db.query('SELECT id FROM categories WHERE id = ?', [id]);
    if (catRows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const [childRows] = await db.query('SELECT id FROM categories WHERE parent_id = ?', [id]);
    if (childRows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete category that has sub-categories' });
    }

    const [productRows] = await db.query('SELECT id FROM products WHERE category_id = ? OR sub_category_id = ?', [id, id]);
    if (productRows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete category because some products are still using it' });
    }

    await db.query('DELETE FROM categories WHERE id = ?', [id]);
    await logOperation('DELETE', 'CATEGORY', id, `Deleted category`, req.user);

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
