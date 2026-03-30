const OrderService = require('../orderService');
const db = require('../database');

describe('Order Payment Status State Machine', () => {
  let testOrderId;
  const userId = 'u1001';

  beforeAll(() => {
    // Set up dummy product
    db.products.set('test_product', {
      id: 'test_product', sku: 'TEST-01', price: 100, stock: 10, name: 'Test'
    });
    db.users.set(userId, { id: userId, name: 'Test User' });
  });

  beforeEach(async () => {
    // Create fresh order before each test
    const order = await OrderService.createOrder(userId, [{ productId: 'test_product', quantity: 1 }], 'bank_transfer');
    testOrderId = order.orderId;
  });

  test('should successfully submit payment receipt and change status to processing', () => {
    const order = OrderService.submitPayment(testOrderId, userId, 'http://example.com/receipt.jpg');
    
    expect(order.status).toBe('processing');
    expect(order.receiptUrl).toBe('http://example.com/receipt.jpg');
  });

  test('should reject duplicate payment submissions (Idempotency)', () => {
    OrderService.submitPayment(testOrderId, userId, 'http://example.com/receipt.jpg');
    
    // Second submission should fail because status is no longer 'pending_payment'
    expect(() => {
      OrderService.submitPayment(testOrderId, userId, 'http://example.com/receipt2.jpg');
    }).toThrow('Order is not in pending_payment status');
  });

  test('should reject payment submission by unauthorized user', () => {
    expect(() => {
      OrderService.submitPayment(testOrderId, 'hacker_user', 'http://example.com/receipt.jpg');
    }).toThrow('Unauthorized');
  });

  test('admin can confirm payment and change status from processing to paid', () => {
    OrderService.submitPayment(testOrderId, userId, 'http://example.com/receipt.jpg');
    
    const updatedOrder = OrderService.updateOrderStatus(testOrderId, 'paid');
    expect(updatedOrder.status).toBe('paid');
  });

  test('admin can reject payment and revert status to pending_payment', () => {
    OrderService.submitPayment(testOrderId, userId, 'http://example.com/receipt.jpg');
    
    const updatedOrder = OrderService.updateOrderStatus(testOrderId, 'pending_payment');
    expect(updatedOrder.status).toBe('pending_payment');
  });

  test('admin can transition from paid to shipped', () => {
    OrderService.submitPayment(testOrderId, userId, 'http://example.com/receipt.jpg');
    OrderService.updateOrderStatus(testOrderId, 'paid');
    
    const shippedOrder = OrderService.updateOrderStatus(testOrderId, 'shipped');
    expect(shippedOrder.status).toBe('shipped');
  });
});
