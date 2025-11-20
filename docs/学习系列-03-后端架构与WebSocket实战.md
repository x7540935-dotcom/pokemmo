# Pokemmo Myself 学习系列 03｜后端架构与 WebSocket 实战

> 本篇聚焦后端：整体分层、WebSocket 服务器、对战/房间模型、Showdown 适配、日志与错误处理。  
> 目标是让读者能够：读懂 `poke-proxy-server` 结构、理解对战请求的完整链路，并能自己扩展后端功能。

---

## 1. 后端整体结构与分层

### 1.1 目录结构（简化版）

```text
pokemmo myself/poke-proxy-server/
├─ battle-server.js        # 入口：创建 server、注入依赖、启动
├─ server/
│  ├─ bootstrap.js         # HTTP + WebSocket 引导，注册端点
│  ├─ metricsEndpoint.js   # /metrics（Prometheus）
│  ├─ metricsApiEndpoint.js# /api/metrics（前端性能上报）
│  ├─ healthEndpoint.js    # /health /api/diagnostics 等
│  └─ ...
├─ controllers/
│  └─ connectionController.js # WebSocket 连接入口，分发到 domain
├─ domain/
│  ├─ rooms/
│  │  └─ RoomManager.js    # 房间管理与统计
│  ├─ battles/
│  │  └─ BattleManager.js  # 对战生命周期管理（示意）
│  └─ ...
├─ adapters/
│  ├─ logging/             # Logger / LogAggregator / formatters
│  ├─ metrics/             # PrometheusMetrics / WebSocketMetrics
│  └─ showdown/            # Showdown BattleStream / RandomTeams 等
└─ package.json
```

### 1.2 分层理念

- **引导层（server/bootstrap.js）**
  - 负责：创建 HTTP server、WebSocketServer、注册 HTTP 路由和健康检查
  - 不写业务逻辑，只做 “拼装和接线”
- **控制器层（controllers）**
  - 入口：`connectionController.handleConnection(ws, req)`
  - 负责：解析连接参数，创建/查找房间，调用领域层
- **领域层（domain）**
  - `RoomManager`：房间 / 匹配 / 统计
  - `BattleManager`：对战流程管理
  - 与具体技术无关，只关心 “业务规则”
- **适配层（adapters）**
  - `ShowdownAdapter`：对接 Pokemon Showdown 的 BattleStream、RandomTeams
  - `Logger`：统一日志格式 + 文件输出
  - `PrometheusMetrics` / `WebSocketMetrics`：对接监控系统

---

## 2. server/bootstrap.js：如何启动一个 WebSocket 服务

### 2.1 启动流程概览

关键步骤：

1. 创建 HTTP server（`http.createServer()`）
2. 初始化 WebSocketServer（`new WebSocketServer({ server, path: '/battle' })`）
3. 把 `connectionController.handleConnection` 注册成 WS 连接事件处理器
4. 注册 HTTP 端点：
   - `/metrics`（Prometheus）
   - `/api/metrics`（前端性能数据）
   - `/health` / `/health/live` / `/health/ready` / `/api/diagnostics`
5. 监听端口并输出启动日志

涉及知识点：

- Node.js 原生 `http` 模块
- `ws` 包中的 `WebSocketServer`
- 同一个 HTTP server 同时承载 HTTP + WebSocket

### 2.2 依赖注入与统计函数

`battle-server.js` 会把一些函数和统计接口传入 `bootstrap`，例如：

- `roomManager.getStats`
- 当前对战数量（如 `battles.size`）
- `getMetricsStats`（Prometheus 指标摘要）
- `getGlobalAggregator().getStats`（日志聚合器摘要）

这些会被 `healthEndpoint` 用来构建 `/api/diagnostics` 的返回：

- 连接数 / 房间数 / 对战数
- AI 预热状态
- 日志与性能指标摘要

知识点：

- 依赖注入（Dependency Injection）：我们不在 `healthEndpoint` 里直接 new `RoomManager`，而是从启动层把 “获取统计信息的函数” 注入进来，使得模块更加解耦、可测试。

---

## 3. WebSocket 连接控制（connectionController）

### 3.1 handleConnection 生命周期

当有新客户端连上 `/battle`：

1. `WebSocketServer` 触发 `connection` 事件
2. `handleConnection(ws, req)` 被调用
3. 典型逻辑：
   - 从 `req` 中解析 IP / UA / 查询参数（如对战模式：AI / PvP）
   - 包装 `ws`：
     - 通过 `wrapWebSocket(ws, logger, metrics)` 增加 Prometheus 指标采集
     - 记录连接 ID、连接时间等
   - 根据模式选择不同的处理流程：
     - AI 对战：调用 AI 对战控制逻辑
     - PvP：将连接交给 `RoomManager`，管理房间/匹配
   - 监听事件：
     - `ws.on('message', ...)`：处理客户端指令
     - `ws.on('close', ...)`：清理资源、更新统计
     - `ws.on('error', ...)`：记录错误、上报指标

知识点：

- Node.js 事件模型：`EventEmitter`（`ws` 内部使用）
- 连接标识：可以通过时间戳 + 自增 ID 生成，如 `Date.now() + '-' + randomId`
- 日志上下文：每个连接日志都带上 `connectionId`，便于排查问题

### 3.2 与 RoomManager 的协作

- 新的 PvP 连接到来时：
  - 若没有等待中的房间：
    - 创建新房间，标记为 “等待中”
  - 若已有等待中的房间：
    - 将该连接加入房间，房间变成 “对战中”
    - 通知双方进入对战协议准备阶段
- `RoomManager` 暴露：
  - `createRoom / joinRoom`
  - `getStats()`：返回等待中 / 对战中 / 总房间数

知识点：

- 房间匹配基本模型：队列 + 房间对象
- 状态统计与健康检查之间的关系

---

## 4. 对战模型与 Showdown 适配

### 4.1 Pokemon Showdown BattleStream

本项目利用了 Showdown 的 **BattleStream** 机制：

- 后端通过 stdin/stdout 流接口与 Showdown 交换消息
- 协议形式：
  - 多行文本，以 `\n` 分隔
  - 每行以 `|` 分隔字段
  - 示例：`|move|p1a: Pikachu|Thunderbolt|p2a: Gyarados`

在适配层中，我们：

- 创建一个 `BattleStream` 实例
- 把玩家或 AI 的操作写入该流
- 将从流中读到的协议行转发给前端 WebSocket 客户端

知识点：

- Node.js Stream API 简介
- 文本协议解析（按行、按分隔符）

### 4.2 AI 随机队伍与 RandomTeams

为了给 AI 自动生成队伍，我们用到了 Showdown 的 `RandomTeams`：

- 通过 `RandomTeams.randomSet(species, options)` 获取推荐配置
- 但在某些形态（如 `Pikachu-Unova`）上，Showdown 数据中没有对应条目时：
  - 会抛出错误或返回 undefined
  - 我们在 `getPokemonMoves` 中增加了 fallback：
    - 尝试使用 `baseSpecies`（如 `Pikachu`）
    - 尝试一些 normalized 名称（去掉地区后缀、大小写处理）
    - 最后再退回到几个基础技能（tackle / scratch / pound / quickattack），并打印明显的警告日志

知识点：

- 与第三方库交互时的容错与回退策略
- 记录警告日志而不是静默失败，方便后期完善数据

---

## 5. 日志系统与错误处理

### 5.1 Logger 设计

`adapters/logging/Logger.js` 提供统一日志接口：

- 日志级别：
  - `info` / `warn` / `error` / `fatal`
- 输出目标：
  - 控制台（开发时观察）
  - 文件（`LogFileWriter`，便于长期保留）
  - `LogAggregator`（内存中的聚合器，支持查询与统计）
- 格式：
  - 可配置 JSONFormatter / TextFormatter
  - 所有日志都有固定字段（时间戳、模块名、level、message 等）

知识点：

- 结构化日志 vs 纯文本日志
- 通过注入 formatter 和 writer 实现可扩展性

### 5.2 LogAggregator 与诊断

`LogAggregator` 维护一个内存中的日志列表：

- `add(entry)`：记录一条日志（带时间戳、level 等）
- `query(filters)`：按 level / 时间范围 / 模块筛选
- `getStats()`：返回各级别日志的数量、最近错误简要信息等

在 `/api/diagnostics` 中，我们会将日志统计信息合并到返回数据里：

- 最近一段时间内 error/fatal 的数量
- 最近几条错误的简要摘要（不暴露敏感信息）

知识点：

- 日志聚合与在线调试
- 暴露诊断接口时要注意隐私和安全，只适合在受信环境中使用

---

## 6. Prometheus 指标与 WebSocketMetrics

### 6.1 PrometheusMetrics.js

使用 `prom-client` 定义了一系列指标：

- 计数器（Counter）：
  - `ws_connections_total`：按结果（成功/失败）统计连接数
  - `ws_messages_total`：按方向（in/out）统计消息数量
  - `ws_errors_total`：错误计数
- 直方图（Histogram）：
  - battle 时长、响应时间等
- Gauge：
  - 当前连接数 / 房间数 / 对战数等

知识点：

- Prometheus 指标类型（Counter / Gauge / Histogram / Summary）基础
- 通过 Label（如 `direction`、`result`）区分不同维度

### 6.2 WebSocketMetrics.js：封装连接

`wrapWebSocket(ws, metrics)` 的工作：

- 在 `open` / `message` / `error` / `close` 事件中更新对应指标
- 在 `ws` 对象上挂一个 `_metricsTracker`：
  - 记录对战模式（AI / PvP）
  - 记录开始时间 / 结束时间
  - 提供 `onError` 方法，在控制器的 `ws.on('error')` 调用

知识点：

- 装饰器/包装器模式：在不修改原有使用方式的前提下，为对象增加监控能力
- 事件中要注意 try/catch，避免指标代码影响主流程

---

## 7. 错误排查与调试建议（后端）

1. **启动错误**（如 `Cannot find module 'prom-client'`）
   - 检查是否在 `poke-proxy-server` 目录运行 `npm install`
   - 关注错误栈中的路径，确认依赖安装位置
2. **对战连接立即关闭**
   - 查看 battle-server 控制台日志：
     - 是否有 `ConnectionController` 相关错误
     - 是否有 AI 队伍生成异常（如某些形态缺少 RandomTeams 配置）
3. **监控相关问题**
   - 访问 `http://localhost:3071/metrics`：
     - 确认是否能看到 Prometheus 指标
   - 访问 `/api/diagnostics`：
     - 检查房间/对战数量是否符合预期
4. **高层策略**
   - 任何地方捕获到异常：
     - 先用 Logger 记录完整上下文（参数、连接 ID、房间 ID）
     - 适当增加 Prometheus 错误计数
     - 尽量给前端返回 “可理解的错误信息” 或重试提示

> 建议阅读顺序：  
> - 搭配 `docs/modules/后端模块说明.md` 一起看，理解每个类/模块的职责  
> - 如需进一步研究监控与健康检查，继续阅读《学习系列 05｜可观测性与运维实践》  


