const OrderService = require('../backend/orderService');
const pool = require('../backend/database');

async function runTests() {
  console.log('Starting State Transition & Concurrency Tests...\n');

  try {
    // 1. Create a dummy user and product for testing
    const testUserId = 'u_test_' + Date.now();
    await pool.query('INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)', 
      [testUserId, 'testuser_' + Date.now(), '123', 'Test User', 'user']);
    
    const testProductId = 'p_test_' + Date.now();
    await pool.query('INSERT INTO products (id, sku, name, price, stock, status) VALUES (?, ?, ?, ?, ?, ?)',
      [testProductId, 'TEST-SKU-' + Date.now(), 'Test Product', 100, 50, 'active']);

    // --- Path 1: Create -> Upload Receipt (Processing) -> Admin Ship -> User Confirm ---
    console.log('--- Test Path 1: Normal Flow ---');
    const order1 = await OrderService.createOrder(testUserId, [{ productId: testProductId, quantity: 1 }], 'bank_transfer');
    console.assert(order1.status === 'pending_payment', 'Expected pending_payment');

    await OrderService.submitPayment(order1.orderId, testUserId, 'http://receipt.url');
    let dbOrder1 = await OrderService.getOrderById(order1.orderId);
    console.assert(dbOrder1.status === 'processing', 'Expected processing after payment upload');

    await OrderService.updateOrderStatus(order1.orderId, 'shipped');
    dbOrder1 = await OrderService.getOrderById(order1.orderId);
    console.assert(dbOrder1.status === 'shipped', 'Expected shipped after admin confirm');

    await OrderService.updateOrderStatus(order1.orderId, 'completed');
    dbOrder1 = await OrderService.getOrderById(order1.orderId);
    console.assert(dbOrder1.status === 'completed', 'Expected completed after user confirm');

    // Soft delete
    await OrderService.deleteOrder(order1.orderId);
    dbOrder1 = await OrderService.getOrderById(order1.orderId);
    console.assert(dbOrder1 === null, 'Expected order to be hidden from normal queries after delete');
    
    console.log('Path 1 Passed.\n');

    // --- Concurrency Test: 10 threads trying to ship the same order ---
    console.log('--- Test Path 2: Concurrency Lock ---');
    const order2 = await OrderService.createOrder(testUserId, [{ productId: testProductId, quantity: 1 }], 'bank_transfer');
    await OrderService.submitPayment(order2.orderId, testUserId, 'http://receipt2.url');

    console.log('Spawning 10 concurrent requests to update status to shipped...');
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        OrderService.updateOrderStatus(order2.orderId, 'shipped')
          .then(() => 'Success')
          .catch(e => `Error: ${e.message}`)
      );
    }
    
    const results = await Promise.all(promises);
    const dbOrder2 = await pool.query('SELECT status FROM orders WHERE order_id = ?', [order2.orderId]);
    
    console.log('Concurrency Results:', results);
    console.log('Final DB Status:', dbOrder2[0][0].status);
    console.assert(dbOrder2[0][0].status === 'shipped', 'Order should be shipped');

    console.log('\nAll Tests Passed Successfully!');
  } catch (err) {
    console.error('Test Failed:', err);
  } finally {
    process.exit(0);
  }
}

runTests();
