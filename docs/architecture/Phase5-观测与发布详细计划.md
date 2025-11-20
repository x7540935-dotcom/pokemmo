# Phase 5｜观测与发布详细计划

> 版本：2025-11-19  
> 目标：建立完善的观测体系（监控、日志、指标）和发布流程（版本管理、变更日志、回滚策略）

---

## 目标

1. **可观测性**：建立 WebSocket 事件指标、前端性能监控、统一日志系统
2. **发布流程**：标准化版本号管理、变更日志生成、回滚策略
3. **运维友好**：提供 Prometheus 指标导出、健康检查端点、诊断工具

---

## 阶段划分

### Step 1｜统一日志系统增强

#### 1.1 日志级别和格式标准化
- **目标**：统一日志格式，支持结构化日志（JSON）
- **文件**：
  - `poke-proxy-server/adapters/logging/Logger.js`（增强）
  - `poke-proxy-server/adapters/logging/formatters.js`（新建）
- **功能**：
  - 支持日志级别：`debug`, `info`, `warn`, `error`, `fatal`
  - 结构化日志格式（JSON）
  - 日志轮转（按日期/大小）
  - 日志文件输出（可选）
- **输出格式**：
  ```json
  {
    "timestamp": "2025-11-19T10:30:00.000Z",
    "level": "info",
    "module": "BattleManager",
    "message": "Battle started",
    "metadata": {
      "battleId": "battle-123",
      "playerCount": 2
    }
  }
  ```

#### 1.2 日志聚合和查询
- **目标**：提供日志查询接口和聚合功能
- **文件**：`poke-proxy-server/adapters/logging/LogAggregator.js`（新建）
- **功能**：
  - 内存日志缓存（最近 N 条）
  - 日志查询 API（按级别、模块、时间范围）
  - 日志统计（错误率、警告数等）
- **API 端点**：
  - `GET /api/logs` - 查询日志
  - `GET /api/logs/stats` - 日志统计

---

### Step 2｜WebSocket 事件指标（Prometheus）

#### 2.1 Prometheus 客户端集成
- **目标**：集成 Prometheus 客户端库，导出指标
- **安装**：`npm install prom-client`
- **文件**：
  - `poke-proxy-server/adapters/metrics/PrometheusMetrics.js`（新建）
  - `poke-proxy-server/adapters/metrics/WebSocketMetrics.js`（新建）
- **指标类型**：
  - **Counter**：连接数、消息数、错误数
  - **Gauge**：当前连接数、活跃对战数
  - **Histogram**：消息延迟、响应时间
  - **Summary**：协议处理时间

#### 2.2 WebSocket 指标收集
- **目标**：收集 WebSocket 相关指标
- **指标列表**：
  ```
  websocket_connections_total{type="ai|pvp"} - 总连接数
  websocket_connections_active{type="ai|pvp"} - 当前活跃连接数
  websocket_messages_total{direction="send|receive",type="ai|pvp"} - 消息总数
  websocket_messages_bytes{direction="send|receive",type="ai|pvp"} - 消息字节数
  websocket_errors_total{type="ai|pvp",error_type="connection|message|protocol"} - 错误数
  websocket_battle_duration_seconds{type="ai|pvp"} - 对战持续时间
  websocket_protocol_processing_seconds{protocol_type="request|teampreview|switch"} - 协议处理时间
  ```

#### 2.3 Prometheus 指标端点
- **目标**：提供 `/metrics` 端点供 Prometheus 抓取
- **文件**：`poke-proxy-server/server/metricsEndpoint.js`（新建）
- **集成**：在 `bootstrap.js` 中添加指标端点

---

### Step 3｜前端性能监控（Web Vitals）

#### 3.1 Web Vitals 集成
- **目标**：监控前端性能指标
- **安装**：`npm install web-vitals`
- **文件**：
  - `packages/battle-engine/src/utils/PerformanceMonitor.js`（新建）
  - `packages/battle-engine/src/utils/WebVitalsReporter.js`（新建）
- **指标**：
  - **LCP** (Largest Contentful Paint)：最大内容绘制时间
  - **FID** (First Input Delay)：首次输入延迟
  - **CLS** (Cumulative Layout Shift)：累积布局偏移
  - **FCP** (First Contentful Paint)：首次内容绘制
  - **TTFB** (Time to First Byte)：首字节时间

#### 3.2 自定义性能埋点
- **目标**：监控对战相关性能指标
- **指标**：
  - `battle_engine_connect_time` - WebSocket 连接时间
  - `battle_engine_first_protocol_time` - 首次协议接收时间
  - `battle_ui_render_time` - UI 渲染时间
  - `battle_sprite_load_time` - 贴图加载时间
  - `battle_phase_transition_time` - 阶段转换时间

#### 3.3 性能数据上报
- **目标**：将性能数据上报到后端或第三方服务
- **文件**：`packages/battle-engine/src/utils/PerformanceReporter.js`（新建）
- **功能**：
  - 批量上报性能数据
  - 本地缓存（离线支持）
  - 错误重试机制

---

### Step 4｜健康检查端点

#### 4.1 健康检查 API
- ✅ 已实现，集成到 `server/healthEndpoint.js` 并在 `bootstrap` 中自动挂载
- **目标**：提供健康检查端点，用于负载均衡和监控
- **文件**：`poke-proxy-server/server/healthEndpoint.js`
- **端点**：
  - `GET /health` - 基础健康检查
  - `GET /health/ready` - 就绪检查（服务是否可用）
  - `GET /health/live` - 存活检查（进程是否运行）
- **响应格式**：
  ```json
  {
    "status": "healthy|degraded|unhealthy",
    "timestamp": "2025-11-19T10:30:00.000Z",
    "uptime": 3600,
    "services": {
      "websocket": "healthy",
      "pokemon-showdown": "healthy",
      "database": "n/a"
    },
    "metrics": {
      "activeConnections": 5,
      "activeBattles": 2,
      "memoryUsage": 12345678
    }
  }
  ```

#### 4.2 诊断端点
- ✅ 已实现，返回连接/房间/对战/日志/资源统计
- **目标**：提供诊断信息，便于排查问题
- **端点**：`GET /api/diagnostics`
- **响应内容**：
  - 服务器信息（版本、启动时间）
  - 连接统计
  - 错误统计
  - 资源使用情况

---

### Step 5｜版本管理和变更日志

#### 5.1 版本号管理
- **目标**：标准化版本号格式（Semantic Versioning）
- **格式**：`MAJOR.MINOR.PATCH`（例如：`1.2.3`）
- **文件**：
  - `package.json`（更新 version 字段）
  - `poke-proxy-server/package.json`（同步版本）
- **版本规则**：
  - **MAJOR**：不兼容的 API 变更
  - **MINOR**：向后兼容的功能新增
  - **PATCH**：向后兼容的问题修复

#### 5.2 变更日志生成
- **目标**：自动生成和维护变更日志
- **文件**：
  - `CHANGELOG.md`（新建/更新）
  - `tools/generate-changelog.mjs`（新建）
- **功能**：
  - 从 Git 提交历史生成变更日志
  - 支持 Conventional Commits 格式
  - 分类：Features、Bug Fixes、Breaking Changes、Documentation
- **格式**：
  ```markdown
  # Changelog

  ## [1.2.3] - 2025-11-19

  ### Added
  - 新增 WebSocket 指标监控
  - 新增前端性能监控（Web Vitals）

  ### Changed
  - 优化日志格式，支持结构化日志

  ### Fixed
  - 修复 WebSocket 连接重连问题

  ### Breaking Changes
  - 日志 API 变更（需要更新客户端）
  ```

#### 5.3 版本发布脚本
- **目标**：自动化版本发布流程
- **文件**：`tools/release.mjs`（新建）
- **功能**：
  - 版本号更新（package.json）
  - 生成变更日志
  - 创建 Git 标签
  - 生成发布说明

---

### Step 6｜回滚策略和部署

#### 6.1 回滚脚本
- **目标**：提供快速回滚机制
- **文件**：`tools/rollback.mjs`（新建）
- **功能**：
  - 回滚到指定版本
  - 恢复数据库备份（如果有）
  - 重启服务

#### 6.2 部署检查清单
- **目标**：确保部署前检查所有必要项
- **文件**：`docs/deployment-checklist.md`（新建）
- **检查项**：
  - [ ] 所有测试通过
  - [ ] 资源清单已更新
  - [ ] 变更日志已更新
  - [ ] 版本号已更新
  - [ ] 文档已更新
  - [ ] 备份已创建

#### 6.3 发布模板
- **目标**：标准化发布流程
- **文件**：`docs/release-template.md`（新建）
- **内容**：
  - 发布前检查清单
  - 发布步骤
  - 发布后验证
  - 回滚步骤

---

## 实施顺序

1. **Step 1**：统一日志系统增强（基础）
2. **Step 2**：WebSocket 事件指标（核心监控）
3. **Step 3**：前端性能监控（用户体验）
4. **Step 4**：健康检查端点（运维基础）
5. **Step 5**：版本管理和变更日志（发布流程）
6. **Step 6**：回滚策略和部署（安全保障）

---

## 验收标准

- ✅ 所有日志统一使用 Logger，支持结构化输出
- ✅ Prometheus 指标端点可用，指标数据准确
- ✅ 前端性能数据可收集和上报
- ✅ 健康检查端点响应正常
- ✅ 版本号管理规范，变更日志自动生成
- ✅ 回滚脚本可用，部署检查清单完整

---

## 相关文档

- `docs/项目开发文档.md` - 开发流程
- `docs/架构说明文档.md` - 架构设计
- `docs/部署和分享指南.md` - 部署指南

