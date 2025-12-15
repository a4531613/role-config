# 可读性与可维护性（架构与工程约束）

## 后端（server）

### 1) 统一错误模型
- API 统一返回 `{ ok: boolean, data?, message?, details? }`
- 开发态返回 `details` 便于定位，生产态不暴露堆栈
- `express-async-errors` 接管 async 路由异常：`server/src/index.js`

### 2) SQLite 事务互斥
- 同一连接并发 `BEGIN` 会导致 `cannot start a transaction within a transaction`
- 通过事务互斥封装保证串行化：`server/src/tx.js`
- 路由中使用 `withTransaction(db, async () => { ... })`，避免散落的 `BEGIN/COMMIT/ROLLBACK`

### 3) 轻量迁移
- 新增字段（如 role.owner）采用“启动时补列”的方式兼容旧库：`server/src/db.js`

## 前端（web）

### 1) 交互规范与闭环
- 写操作：loading + 成功/失败提示 + 失败原因可读
- 导入成功后不强制刷新页面：改为广播数据变更事件，由各页面自行刷新：`web/src/events.js`、`web/src/composables/useDataChanged.js`

### 2) 复用逻辑
- Tree 搜索/展开折叠统一抽到 composable：`web/src/composables/useTreeSearch.js`

### 3) IA（信息架构）
- 路由 `meta.title` 作为统一标题来源，Header 自动展示：`web/src/router.js`、`web/src/App.vue`

