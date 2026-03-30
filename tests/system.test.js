/**
 * 测试文件：系统集成与单元测试用例
 * 
 * 运行方式 (需安装 Node.js 与 Jest):
 * npx jest system.test.js
 */

const Database = require('../backend/database');
const ProductService = require('../backend/productService');
const OrderService = require('../backend/orderService');

describe('Product Management System Tests', () => {
  
  beforeEach(() => {
    // 每次测试前重置数据库状态
    Database.products.set('p_1001', {
      id: 'p_1001', sku: 'SIX-H1-PRO', name: 'Sixhill H1 Pro',
      price: 59.99, stock: 100, version: 1
    });
    Database.priceLogs = [];
  });

  describe('Module 1: Product Query', () => {
    it('should retrieve product by ID', () => {
      const product = ProductService.getProduct('p_1001');
      expect(product.name).toBe('Sixhill H1 Pro');
    });

    it('should retrieve product by SKU', () => {
      const product = ProductService.getProduct('SIX-H1-PRO');
      expect(product.price).toBe(59.99);
    });

    it('should throw error if product not found', () => {
      expect(() => ProductService.getProduct('invalid_id')).toThrow('Product not found');
    });
  });

  describe('Module 2: Price Modification (Security & Validation)', () => {
    it('should allow admin to modify price and record log', () => {
      const result = ProductService.updatePrice('p_1001', 49.99, 'a9999');
      
      expect(result.product.price).toBe(49.99);
      expect(Database.priceLogs.length).toBe(1);
      expect(Database.priceLogs[0].oldPrice).toBe(59.99);
      expect(Database.priceLogs[0].operatorId).toBe('a9999');
    });

    it('should block non-admin users from modifying price', () => {
      expect(() => {
        ProductService.updatePrice('p_1001', 49.99, 'u1001'); // 普通用户
      }).toThrow('Unauthorized');
    });

    it('should prevent setting negative prices', () => {
      expect(() => {
        ProductService.updatePrice('p_1001', -10, 'a9999');
      }).toThrow('Price must be greater than zero');
    });

    it('should prevent abnormal high prices (>300%)', () => {
      expect(() => {
        ProductService.updatePrice('p_1001', 999.99, 'a9999');
      }).toThrow('Price anomaly detected');
    });
  });

  describe('Module 3: Order Processing & Concurrency', () => {
    it('should successfully place an order and deduct stock', async () => {
      const items = [{ productId: 'p_1001', quantity: 2 }];
      const order = await OrderService.createOrder('u1001', items, 'credit_card');

      expect(order.status).toBe('pending_payment');
      expect(order.totalAmount).toBe(119.98); // 59.99 * 2
      expect(order.orderId).toMatch(/^ORD-\d{14}-\d{4}$/);
      
      // 验证库存是否准确扣减 (100 - 2 = 98)
      const product = ProductService.getProduct('p_1001');
      expect(product.stock).toBe(98);
    });

    it('should throw error if stock is insufficient', async () => {
      const items = [{ productId: 'p_1001', quantity: 150 }]; // 库存只有100
      await expect(OrderService.createOrder('u1001', items, 'credit_card'))
        .rejects.toThrow('Insufficient stock');
    });

    it('should handle concurrent stock deduction correctly (simulated)', async () => {
      // 模拟高并发场景：100个并发请求，每个买1个，库存恰好扣完
      const items = [{ productId: 'p_1001', quantity: 1 }];
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(OrderService.createOrder('u1001', items, 'alipay'));
      }

      await Promise.all(promises);

      const product = ProductService.getProduct('p_1001');
      expect(product.stock).toBe(0); // 库存应该刚好为0

      // 第101个请求应该失败
      await expect(OrderService.createOrder('u1001', items, 'alipay'))
        .rejects.toThrow('Insufficient stock');
    });
  });
});
