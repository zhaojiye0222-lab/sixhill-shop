const pool = require('../database');
const { parseImages } = require('../utils/parsers');

class OrderService {
  /**
   * 生成全局唯一且具有业务意义的订单号
   */
  static generateOrderId() {
    const dateStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const randomStr = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${dateStr}-${randomStr}`;
  }

  /**
   * 创建订单 (核心高并发防超卖逻辑)
   */
  static async createOrder(userId, items, paymentMethod, shippingAddress = null) {
    const [userRows] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) throw new Error('User validation failed');
    if (!items || items.length === 0) throw new Error('Cart is empty');

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const [productRows] = await connection.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [item.productId]);
        if (productRows.length === 0) throw new Error(`Product ${item.productId} not found`);
        const product = productRows[0];

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}`);
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          priceAtPurchase: product.price,
          quantity: item.quantity,
          color: item.color || null,
          itemTotal,
          images: parseImages(product.images)
        });

        await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, product.id]);
      }

      const orderId = this.generateOrderId();

      await connection.query(
        `INSERT INTO orders (order_id, user_id, total_amount, payment_method, status, shipping_address)
         VALUES (?, ?, ?, ?, 'pending_payment', ?)`,
        [orderId, userId, totalAmount, paymentMethod, shippingAddress]
      );

      for (const item of orderItems) {
        await connection.query(
          `INSERT INTO order_items (order_id, product_id, sku, name, price_at_purchase, quantity, color, item_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.productId, item.sku, item.name, item.priceAtPurchase, item.quantity, item.color, item.itemTotal]
        );
      }

      await connection.commit();

      return {
        orderId,
        userId,
        items: orderItems,
        totalAmount: Number(totalAmount.toFixed(2)),
        paymentMethod,
        shipping_address: shippingAddress,
        status: 'pending_payment',
        createdAt: new Date().toISOString()
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * 用户提交支付截图
   */
  static async submitPayment(orderId, userId, receiptUrl) {
    const [orderRows] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    if (orderRows.length === 0) throw new Error('Order not found');
    const order = orderRows[0];

    if (String(order.user_id) !== String(userId)) throw new Error('Unauthorized');
    if (order.status !== 'pending_payment') throw new Error('Order is not in pending_payment status');

    await pool.query(
      'UPDATE orders SET receipt_url = ?, status = ?, updated_at = NOW() WHERE order_id = ?',
      [receiptUrl, 'processing', orderId]
    );

    return { ...order, status: 'processing', receiptUrl };
  }

  /**
   * 组装带 items 的订单列表
   */
  static async _attachItemsToOrders(ordersRows) {
    if (ordersRows.length === 0) return [];
    const orderIds = ordersRows.map(o => o.order_id);

    const placeholders = orderIds.map(() => '?').join(',');
    const [itemRows] = await pool.query(
      `SELECT oi.*, p.images 
       FROM order_items oi 
       LEFT JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id IN (${placeholders})`, 
      orderIds
    );

    return ordersRows.map(order => {
      const items = itemRows.filter(i => i.order_id === order.order_id).map(i => ({
        productId: i.product_id,
        sku: i.sku,
        name: i.name,
        priceAtPurchase: i.price_at_purchase,
        quantity: i.quantity,
        color: i.color,
        itemTotal: i.item_total,
        images: parseImages(i.images)
      }));

      return {
        orderId: order.order_id,
        id: order.order_id,
        userId: order.user_id,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
        paymentReceiptUrl: order.receipt_url,
        receiptUrl: order.receipt_url,
        shippingAddress: order.shipping_address || null,
        status: order.status,
        isDeleted: !!order.is_deleted,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items
      };
    });
  }

  /**
   * 获取所有订单 (供管理员使用)
   */
  static async getAllOrders() {
    const [ordersRows] = await pool.query('SELECT * FROM orders WHERE is_deleted = FALSE ORDER BY created_at DESC');
    return this._attachItemsToOrders(ordersRows);
  }

  /**
   * 获取用户个人的订单历史
   */
  static async getUserOrders(userId) {
    const [ordersRows] = await pool.query(
      "SELECT * FROM orders WHERE user_id = ? AND is_deleted = FALSE AND status != 'deleted' ORDER BY created_at DESC",
      [userId]
    );
    return this._attachItemsToOrders(ordersRows);
  }

  /**
   * 根据 ID 获取订单
   */
  static async getOrderById(orderId) {
    const [ordersRows] = await pool.query('SELECT * FROM orders WHERE order_id = ? AND is_deleted = FALSE', [orderId]);
    if (ordersRows.length === 0) return null;
    const orders = await this._attachItemsToOrders(ordersRows);
    return orders[0] || null;
  }

  /**
   * 更新订单状态
   */
  static async updateOrderStatus(orderId, newStatus) {
    const validStatuses = ['pending_payment', 'processing', 'paid', 'shipped', 'delivered', 'completed', 'refunded', 'cancelled', 'deleted'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid order status');
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [rows] = await connection.query('SELECT * FROM orders WHERE order_id = ? FOR UPDATE', [orderId]);
      if (rows.length === 0 || rows[0].is_deleted) {
        throw new Error('Order not found or deleted');
      }

      const orderData = rows[0];
      const currentStatus = orderData.status;

      if (currentStatus === newStatus) {
        await connection.commit();
        connection.release();
        return await this.getOrderById(orderId);
      }

      if (newStatus === 'cancelled' && (currentStatus === 'cancelled' || currentStatus === 'refunded')) {
        await connection.query("UPDATE orders SET status = 'deleted', is_deleted = TRUE, updated_at = NOW() WHERE order_id = ?", [orderId]);
        await connection.commit();
        connection.release();
        return { orderId, status: 'deleted', isDeleted: true };
      }

      const [itemRows] = await connection.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

      if ((newStatus === 'refunded' || newStatus === 'cancelled') &&
          !['refunded', 'cancelled', 'deleted'].includes(currentStatus)) {
        for (const item of itemRows) {
          await connection.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        }
      }

      await connection.query('UPDATE orders SET status = ?, updated_at = NOW() WHERE order_id = ?', [newStatus, orderId]);
      await connection.commit();
      connection.release();

      return await this.getOrderById(orderId);
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  }

  /**
   * 软删除订单
   */
  static async deleteOrder(orderId) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [rows] = await connection.query('SELECT * FROM orders WHERE order_id = ? FOR UPDATE', [orderId]);
      if (rows.length === 0) throw new Error('Order not found');

      await connection.query('UPDATE orders SET is_deleted = TRUE, updated_at = NOW() WHERE order_id = ?', [orderId]);
      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = OrderService;
