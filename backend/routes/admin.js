const express = require('express');
const db = require('../database');
const OrderService = require('../services/orderService');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// Admin 获取所有订单
router.get('/orders', authenticate, requireAdmin, async (req, res) => {
  try {
    const orders = await OrderService.getAllOrders();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin 统计概览
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
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

module.exports = router;
