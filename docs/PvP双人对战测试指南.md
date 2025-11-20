# PvP 双人对战测试指南

## 📋 测试前准备

### 1. 启动服务器

在项目根目录下，启动对战服务器：

```bash
cd "pokemmo myself/poke-proxy-server"
node battle-server.js
```

**预期输出：**
```
[battle-server] ========== 服务器启动（新架构）==========
[battle-server] 端口: 3071
```

**注意：** 确保端口 3071 未被占用。如果被占用，可以设置环境变量：
```bash
# Windows PowerShell
$env:BATTLE_PORT=3072; node battle-server.js

# Windows CMD
set BATTLE_PORT=3072 && node battle-server.js

# Linux/Mac
BATTLE_PORT=3072 node battle-server.js
```

### 2. 准备两个浏览器标签页/窗口

由于两个标签页共享同一个 localStorage，我们刚刚修复了这个问题，使用 URL 参数传递 side 信息。但为了确保测试准确，建议：

**方法一：使用两个不同的浏览器（推荐）**
- 浏览器A：Chrome（作为 p1）
- 浏览器B：Firefox 或 Edge（作为 p2）

**方法二：使用同一浏览器的两个窗口（已修复，可以使用）**
- 打开两个独立的窗口（不是标签页）
- 或者使用无痕模式打开第二个标签页

**方法三：使用同一浏览器的两个标签页（已修复，可以使用）**
- 现在通过 URL 参数传递 side，不会冲突

## 🎮 测试步骤

### 步骤 1：打开 PvP 大厅页面

**在第一个标签页/窗口（p1）：**
1. 打开浏览器
2. 访问：`file:///E:/XIANGMU/pokemmo/pokemmo%20myself/pvp-lobby.html`
   - 或者使用本地服务器（如果有的话）
   - 或者直接双击 `pvp-lobby.html` 文件

**在第二个标签页/窗口（p2）：**
1. 打开另一个浏览器/窗口/标签页
2. 访问相同的 URL：`file:///E:/XIANGMU/pokemmo/pokemmo%20myself/pvp-lobby.html`

### 步骤 2：创建房间（p1）

**在第一个标签页（p1）：**
1. 点击 **"创建房间"** 按钮
2. 等待房间创建成功
3. **检查控制台日志**，应该看到：
   ```
   [PVP Lobby] 房间已创建: XXXXXX
   [PVP Lobby] 我的身份: p1
   ```
4. **检查页面显示**：
   - 房间ID应该显示在页面上
   - 状态应该显示为 "等待玩家加入"

### 步骤 3：加入房间（p2）

**在第二个标签页（p2）：**
1. 复制第一个标签页显示的房间ID
2. 在第二个标签页的输入框中粘贴房间ID
3. 点击 **"加入房间"** 按钮
4. **检查控制台日志**，应该看到：
   ```
   [PVP Lobby] 已加入房间: XXXXXX
   [PVP Lobby] 我的身份: p2
   ```
5. **检查页面显示**：
   - 两个标签页都应该显示房间状态
   - 状态应该显示为 "等待双方准备"

### 步骤 4：准备队伍（双方）

**在第一个标签页（p1）：**
1. 编辑或选择你的队伍
2. 点击 **"保存队伍"** 按钮
3. **检查控制台日志**，应该看到：
   ```
   [PVP Lobby] 队伍已保存
   [PVP Lobby] 房间状态更新: ready (p1已准备)
   ```

**在第二个标签页（p2）：**
1. 编辑或选择你的队伍
2. 点击 **"保存队伍"** 按钮
3. **检查控制台日志**，应该看到：
   ```
   [PVP Lobby] 队伍已保存
   [PVP Lobby] 房间状态更新: ready (双方已准备)
   ```

### 步骤 5：开始对战（自动或手动）

**自动开始：**
- 当双方都准备好后，系统应该自动发送 `start` 消息
- **检查控制台日志**，应该看到：
  ```
  [PVP Lobby] 状态变为ready，自动发送start消息
  [PVP Lobby] 发送start消息，包含side: p1 (或 p2)
  ```

**手动开始：**
- 如果自动开始失败，可以点击 **"开始对战"** 按钮

### 步骤 6：验证跳转到对战页面

**在两个标签页中：**
1. 页面应该自动跳转到 `battle.html`
2. **检查 URL**，应该包含 side 参数：
   - p1: `battle.html?mode=pvp&roomId=XXXXXX&side=p1`
   - p2: `battle.html?mode=pvp&roomId=XXXXXX&side=p2`
3. **检查控制台日志**，应该看到：
   ```
   [TeamLoadingPhase] ✅ 从URL参数获取side: p1 (或 p2)
   [TeamLoadingPhase] PvP模式，等待服务器响应（可能是重连）
   ```

### 步骤 7：验证重连和协议接收

**在两个标签页中：**
1. **检查控制台日志**，应该看到：
   ```
   [BattleEngine] ========== WebSocket 连接已打开 ==========
   [TeamLoadingPhase] 收到 battle-reconnected 消息
   [BattleManager] 发现 X 个已保存的协议，重新发送给新连接
   ```

2. **检查是否收到协议**：
   - 打开浏览器控制台
   - 输入：`window.protocolLogs` 或查看协议监控报告
   - 应该看到 `request`、`poke`、`start` 等协议

3. **检查队伍预览界面**：
   - 应该能看到双方的宝可梦列表
   - 应该能选择首发宝可梦

### 步骤 8：验证对战功能

1. **选择首发宝可梦**：
   - 双方都应该能选择首发宝可梦
   - 选择后应该进入对战阶段

2. **进行对战**：
   - 应该能正常选择招式
   - 应该能正常切换宝可梦
   - 应该能看到对战动画和伤害计算

## 🔍 关键检查点

### 1. localStorage 冲突检查

**在浏览器控制台中执行：**
```javascript
// 检查 localStorage
console.log('pvpSide:', localStorage.getItem('pvpSide'));
console.log('pvpRoomId:', localStorage.getItem('pvpRoomId'));

// 检查 URL 参数
const urlParams = new URLSearchParams(window.location.search);
console.log('URL side:', urlParams.get('side'));
console.log('URL roomId:', urlParams.get('roomId'));
```

**预期结果：**
- p1 标签页：URL side = `p1`
- p2 标签页：URL side = `p2`
- localStorage 可能相同（但应该优先使用 URL 参数）

### 2. WebSocket 连接检查

**在浏览器控制台中执行：**
```javascript
// 检查 WebSocket 连接状态
if (window.battleEngine && window.battleEngine.ws) {
  console.log('WebSocket readyState:', window.battleEngine.ws.readyState);
  console.log('WebSocket URL:', window.battleEngine.ws.url);
  console.log('是否已连接:', window.battleEngine.isConnected);
}
```

**预期结果：**
- `readyState` 应该是 `1` (OPEN)
- `battle_engine_connect_time`、`battle_phase_transition_time` 等指标会定期上报

### 4. 服务器观测检查

在服务器机器上执行：

```bash
# 查看健康状态
curl http://localhost:3071/health
curl http://localhost:3071/health/ready

# 查看当前房间/对战统计
curl http://localhost:3071/api/diagnostics | jq '.connections'

# Prometheus 与前端性能指标
curl http://localhost:3071/metrics | grep battle_pvp
curl "http://localhost:3071/api/metrics?limit=20&type=web-vital"
```

**预期结果：**
- `/health` status = `healthy`，`services.websocket` = `healthy`，`rooms.waitingRooms` 会随测试变化
- `/api/diagnostics` 中 `connections.websocket.connections` 显示 2
- `/metrics` 中 `battle_pvp_active_rooms`、`battle_ws_messages_total` 指标递增
- `/api/metrics` 返回 `LCP`、`FID`、`battle_engine_connect_time` 等性能数据

出现异常时可通过 `/api/diagnostics` 中的日志统计、房间信息快速定位问题。

---
- `isConnected` 应该是 `true`

### 3. 协议接收检查

**在浏览器控制台中执行：**
```javascript
// 查看协议日志
console.log('协议日志:', window.protocolLogs);

// 或者查看协议监控报告
// 在控制台中应该能看到协议监控报告
```

**预期结果：**
- 应该看到 `request`、`poke`、`start` 等协议
- 不应该看到 `request: ❌` 或 `poke: ❌`

### 4. 后端日志检查

**在服务器控制台中检查：**
- 应该看到两个连接都成功建立
- 应该看到 `[PvPHandler] payload.side: p1` 和 `[PvPHandler] payload.side: p2`
- 应该看到 `[BattleManager] 连接状态检查: readyState=1` 对于两个连接
- 不应该看到 `p1 连接状态不是 OPEN (readyState: 3)`

## 🐛 常见问题排查

### 问题 1：p1 无法收到协议

**症状：**
- p1 标签页显示 `request: ❌`
- 后端日志显示 `p1 连接状态不是 OPEN (readyState: 3)`

**排查步骤：**
1. 检查 p1 的 URL 是否包含 `side=p1`
2. 检查 p1 发送的 `start` 消息是否包含 `side: "p1"`
3. 检查后端日志中 p1 的连接状态
4. 检查是否有其他连接覆盖了 p1 的连接

### 问题 2：双方都显示相同的 side

**症状：**
- 两个标签页都显示 `side=p1` 或都显示 `side=p2`

**排查步骤：**
1. 检查 URL 参数（应该不同）
2. 检查 localStorage（可能相同，但不应该影响，因为优先使用 URL 参数）
3. 检查服务器返回的 `room-created` 和 `room-joined` 消息中的 `side` 字段

### 问题 3：无法选择首发宝可梦

**症状：**
- 队伍预览界面显示，但无法点击选择

**排查步骤：**
1. 检查是否收到了 `request` 协议
2. 检查 `TeamPreviewPhase` 是否正确识别了当前玩家的 side
3. 检查 `request` 协议中的 `side.id` 是否匹配

### 问题 4：连接被意外关闭

**症状：**
- WebSocket 连接频繁关闭
- 后端日志显示 `WebSocket 关闭: code=1005`

**排查步骤：**
1. 检查是否有多个连接尝试连接到同一个 side
2. 检查 `battle-server.js` 中的连接关闭逻辑
3. 检查 `BattleManager.addConnection` 是否正确处理了旧连接

## 📊 测试检查清单

- [ ] 服务器成功启动
- [ ] 两个标签页都能打开 pvp-lobby.html
- [ ] p1 能成功创建房间
- [ ] p2 能成功加入房间
- [ ] 双方都能保存队伍
- [ ] 房间状态正确更新为 `ready`
- [ ] 双方都能自动/手动开始对战
- [ ] 页面正确跳转到 battle.html
- [ ] URL 中包含正确的 `side` 参数（p1 和 p2 不同）
- [ ] 双方都能成功建立 WebSocket 连接
- [ ] 双方都能收到 `battle-reconnected` 消息
- [ ] 双方都能收到协议（request、poke、start 等）
- [ ] 双方都能看到队伍预览界面
- [ ] 双方都能选择首发宝可梦
- [ ] 对战能正常进行

## 📝 日志收集

如果测试失败，请收集以下日志：

1. **前端日志（两个标签页）：**
   - 浏览器控制台的所有日志
   - 特别是包含 `[PVP Lobby]`、`[TeamLoadingPhase]`、`[BattleEngine]` 的日志

2. **后端日志：**
   - 服务器控制台的所有日志
   - 特别是包含 `[PvPHandler]`、`[BattleManager]`、`[battle-server]` 的日志

3. **关键信息：**
   - 两个标签页的 URL
   - localStorage 内容
   - WebSocket 连接状态
   - 协议接收情况（`window.protocolLogs`）

## 🎯 下一步

测试通过后，可以继续测试：
- 重连功能（刷新页面）
- 网络中断恢复
- 长时间对战
- 多个房间同时运行

