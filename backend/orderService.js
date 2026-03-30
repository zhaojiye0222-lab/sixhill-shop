const pool = require('./database');
const crypto = require('crypto'); // 仅作模拟UUID

class OrderService {
  /**
   * 生成全局唯一且具有业务意义的订单号
   */
  static generateOrderId() {
    const dateStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    const randomStr = Math.floor(1000 + Math.random() * 9000); // 4位随机数
    return `ORD-${dateStr}-${randomStr}`;
  }

  /**
   * 创建订单 (核心高并发防超卖逻辑)
   */
  static async createOrder(userId, items, paymentMethod) {
    const [userRows] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) throw new Error('User validation failed');
    if (!items || items.length === 0) throw new Error('Cart is empty');

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        // 使用 FOR UPDATE 加行锁，防止超卖
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
          itemTotal
        });

        // 扣减库存
        await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, product.id]);
      }

      const orderId = this.generateOrderId();
      
      // 创建订单记录
      await connection.query(
        `INSERT INTO orders (order_id, user_id, total_amount, payment_method, status) 
         VALUES (?, ?, ?, ?, 'pending_payment')`,
        [orderId, userId, totalAmount, paymentMethod]
      );

      // 创建订单项记录
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
   * 模拟支付成功回调 (或者用户提交截图后状态)
   */
  static async submitPayment(orderId, userId, receiptUrl) {
    const [orderRows] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    if (orderRows.length === 0) throw new Error('Order not found');
    const order = orderRows[0];

    if (order.user_id !== userId) throw new Error('Unauthorized');
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
    
    // In mysql2/promise, passing an array to IN (?) works if you format it right, but joining strings is safer
    const placeholders = orderIds.map(() => '?').join(',');
    const [itemRows] = await pool.query(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`, orderIds);
    
    return ordersRows.map(order => {
      const items = itemRows.filter(i => i.order_id === order.order_id).map(i => ({
        productId: i.product_id,
        sku: i.sku,
        name: i.name,
        priceAtPurchase: i.price_at_purchase,
        quantity: i.quantity,
        color: i.color,
        itemTotal: i.item_total
      }));
      
      return {
        orderId: order.order_id,
        id: order.order_id, // For backward compatibility with UI
        userId: order.user_id,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
        paymentReceiptUrl: order.receipt_url,
        receiptUrl: order.receipt_url,
        status: order.status,
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
    const [ordersRows] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    return this._attachItemsToOrders(ordersRows);
  }

  /**
   * 获取用户个人的订单历史，排除被删除的订单
   */
  static async getUserOrders(userId) {
    const [ordersRows] = await pool.query("SELECT * FROM orders WHERE user_id = ? AND status != 'deleted' ORDER BY created_at DESC", [userId]);
    return this._attachItemsToOrders(ordersRows);
  }

  /**
   * 根据 ID 获取订单
   */
  static async getOrderById(orderId) {
    const [ordersRows] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    const orders = await this._attachItemsToOrders(ordersRows);
    return orders[0] || null;
  }

  /**
   * 更新订单状态 (发货、退款等)
   */
  static async updateOrderStatus(orderId, newStatus) {
    const validStatuses = ['pending_payment', 'processing', 'paid', 'shipped', 'delivered', 'refunded', 'cancelled', 'deleted'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid order status');
    }

    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    if (newStatus === 'cancelled' && (order.status === 'cancelled' || order.status === 'refunded')) {
      await pool.query("UPDATE orders SET status = 'deleted', updated_at = NOW() WHERE order_id = ?", [orderId]);
      return { ...order, status: 'deleted' };
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      if ((newStatus === 'refunded' || newStatus === 'cancelled') && 
          !['refunded', 'cancelled', 'deleted'].includes(order.status)) {
        for (const item of order.items) {
          await connection.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.productId]);
        }
      }

      await connection.query('UPDATE orders SET status = ?, updated_at = NOW() WHERE order_id = ?', [newStatus, orderId]);
      await connection.commit();
      
      return { ...order, status: newStatus };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = OrderService;
