# Product Management System (Sixhill)

这是一个完整的产品管理系统原型，包含了产品详情展示、高安全性价格修改、以及支持高并发的订单处理系统。

## 目录结构
```text
├── backend/                  # 后端核心业务逻辑
│   ├── database.js           # 内存数据库模拟 (带乐观锁机制)
│   ├── productService.js     # 商品服务与价格修改逻辑 (安全校验)
│   ├── orderService.js       # 订单服务 (防超卖、库存检查)
│   └── server.js             # Express API 接口与权限校验中间件
├── frontend/                 # 前端响应式页面
│   ├── product.html          # 响应式商品详情页与下单流程 (用户端)
│   └── admin.html            # 价格管理与日志后台 (管理端)
└── tests/                    # 测试用例
    └── system.test.js        # Jest 单元与集成测试
```

## 核心架构设计与解决方案

### 1. 高并发订单处理 (Order Processing & Concurrency)
- **挑战**: 在秒杀或高并发场景下，如何防止商品超卖？
- **解决方案**: 在 `backend/orderService.js` 中采用了**乐观锁 (Optimistic Locking)** 机制。每次更新库存时，必须检查当前库存量（在实际 DB 中会表现为 `UPDATE products SET stock = stock - qty WHERE id = ? AND stock >= qty`）。如果库存不足，事务会自动回滚，确保数据一致性。
- **扩展建议**: 在真实的千万级并发生产环境中，建议引入 Redis List 或 Lua 脚本进行预扣减库存，再异步将订单推送到 RabbitMQ / Kafka 进行最终落库。

### 2. 价格修改安全性 (Price Management Security)
- **挑战**: 价格是核心敏感数据，如何防范误操作或恶意修改？
- **解决方案**:
  1. **RBAC 权限控制**: 在 `backend/server.js` 中配置了 `requireAdmin` 中间件，仅允许 `role === 'admin'` 的用户调用。
  2. **数值合理性校验**: 阻止负数价格，并设置熔断机制（如价格涨幅不得超过原价的300%），见 `productService.js`。
  3. **审计日志**: 每次价格变动都会生成一条不可篡改的日志（记录操作人、修改前后价格、时间），前端 `admin.html` 提供了实时查看面板。

### 3. 响应式与加载优化 (Responsive UI & Performance)
- **挑战**: H5 页面需在2秒内加载，并适配各类设备。
- **解决方案**: 
  - 前端采用 **Tailwind CSS + Vue 3 (CDN)** 进行极轻量化构建，不依赖复杂的 Webpack/Vite 编译链，打开即用。
  - 使用了 CSS 骨架屏 (Loading Spinners) 和占位符，优化了 LCP (最大内容绘制) 时间。

---

## 运行说明

### 体验前端 UI (无需环境)
你可以直接在浏览器中双击打开以下文件体验：
1. **[商品详情与下单页]** -> `frontend/product.html` (支持移动端仿真预览)
2. **[管理员改价面板]** -> `frontend/admin.html` (模拟后端交互与日志记录)

### 运行后端服务与测试 (需要 Node.js)
因为当前的运行环境中没有检测到 `Node.js`，如果你需要在本地机器上真正把后端跑起来，请遵循以下步骤：

1. 安装 Node.js (v16 或以上)。
2. 在项目根目录执行以下命令安装依赖：
   ```bash
   npm install express cors jest
   ```
3. **启动后端服务器**:
   ```bash
   node backend/server.js
   ```
   *服务将运行在 http://localhost:3000*
4. **运行集成测试**:
   ```bash
   npx jest tests/system.test.js
   ```
   *测试覆盖了价格安全校验、并发超卖阻断、数据一致性等核心场景。*
