const express = require('express');
const OrderService = require('../services/orderService');
const { authenticate } = require('../middlewares/auth');
const { logOperation } = require('../utils/logger');

const router = express.Router();

// 创建订单
router.post('/', authenticate, async (req, res) => {
  try {
    const { items, paymentMethod, shippingAddress } = req.body;
    const order = await OrderService.createOrder(req.user.id, items, paymentMethod, shippingAddress || null);
    await logOperation('CREATE', 'ORDER', order.orderId || order.id, 'User placed new order', req.user);
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 获取订单列表 (管理员获取所有，用户获取自己的)
router.get('/', authenticate, async (req, res) => {
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

// 获取我的订单 (专门给前台用的路由)
router.get('/my', authenticate, async (req, res) => {
  try {
    const orders = await OrderService.getUserOrders(req.user.id);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 取消或删除订单
router.delete('/:orderId', authenticate, async (req, res) => {
  try {
    const order = await OrderService.getOrderById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role === 'admin' || ['completed', 'delivered', 'review', 'cancelled', 'refunded'].includes(order.status)) {
      await OrderService.deleteOrder(req.params.orderId);
      await logOperation('DELETE', 'ORDER', req.params.orderId, 'User/Admin deleted order', req.user);
      return res.json({ message: 'Order deleted successfully' });
    } else {
      const updatedOrder = await OrderService.updateOrderStatus(req.params.orderId, 'cancelled');
      return res.json(updatedOrder);
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 更新订单状态 (管理员或用户确认收货)
router.patch('/:orderId/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await OrderService.getOrderById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // 普通用户权限校验
    if (req.user.role !== 'admin') {
      if (String(order.userId) !== String(req.user.id) && String(order.user_id) !== String(req.user.id)) {
        return res.status(403).json({ error: 'Unauthorized to update this order' });
      }
      if (!['delivered', 'completed', 'cancelled', 'review'].includes(status)) {
        return res.status(403).json({ error: 'Unauthorized status update' });
      }
    }

    const updatedOrder = await OrderService.updateOrderStatus(req.params.orderId, status);
    await logOperation('UPDATE', 'ORDER_STATUS', order.orderId, `Status changed to ${status}`, req.user);

    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 用户提交支付截图
router.post('/:orderId/payment', authenticate, async (req, res) => {
  try {
    const { receiptUrl } = req.body;
    if (!receiptUrl) return res.status(400).json({ error: 'Payment receipt URL is required' });

    const order = await OrderService.submitPayment(req.params.orderId, req.user.id, receiptUrl);
    await logOperation('UPDATE', 'ORDER', req.params.orderId, `User submitted payment receipt`, req.user);

    res.json({ message: 'Payment submitted successfully', order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
