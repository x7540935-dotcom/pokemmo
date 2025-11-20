# 测试说明

## 目录结构

```
tests/
├── unit/              # 单元测试
│   ├── Room.test.js
│   ├── RoomManager.test.js
│   └── BattleManager.test.js
└── integration/       # 集成测试
    └── websocket-smoke.test.js
```

## 运行测试

### 安装依赖

```bash
npm install
```

### 运行所有测试

```bash
npm test
```

### 运行测试（监视模式）

```bash
npm run test:watch
```

### 运行测试并生成覆盖率报告

```bash
npm run test:coverage
```

### 运行集成测试

集成测试需要服务器运行。设置环境变量后运行：

```bash
# 启动服务器（在另一个终端）
node battle-server.js

# 运行集成测试
RUN_INTEGRATION_TESTS=true npm test
```

## 测试覆盖

### 单元测试

- **Room.test.js**: 测试房间的基本功能（添加/移除玩家、队伍管理、广播等）
- **RoomManager.test.js**: 测试房间管理器的功能（创建、加入、删除、清理等）
- **BattleManager.test.js**: 测试对战管理器的初始化、连接管理、选择处理等

### 集成测试

- **websocket-smoke.test.js**: WebSocket 连接和基本消息流程的冒烟测试

## 覆盖率目标

当前覆盖率目标设置为 50%（branches、functions、lines、statements）。

## 注意事项

1. **Mock 适配层**: BattleManager 测试使用 mock 的 ShowdownAdapter，避免依赖实际的 Pokemon Showdown 模块
2. **集成测试**: 集成测试默认跳过，需要设置 `RUN_INTEGRATION_TESTS=true` 才会运行
3. **服务器依赖**: 集成测试需要服务器在 `localhost:3071` 运行（可通过 `TEST_SERVER_PORT` 环境变量修改）

## 持续改进

- [ ] 增加更多边界情况测试
- [ ] 提高覆盖率到 80%+
- [ ] 添加性能测试
- [ ] 添加压力测试

