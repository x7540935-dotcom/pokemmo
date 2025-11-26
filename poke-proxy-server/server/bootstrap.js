/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 服务器引导模块（bootstrap.js）
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📋 职责
 * ──────────────────────────────────────────────────────────────────────────
 * 统一初始化 HTTP 和 WebSocket 服务器，注册所有 HTTP 端点和 WebSocket 处理器。
 * 这是服务器启动的入口模块，负责将所有组件串联起来。
 * 
 * 🏗️ 功能模块
 * ──────────────────────────────────────────────────────────────────────────
 * 1. HTTP 服务器
 *    - 基于 Node.js 原生 http 模块创建
 *    - 支持静态文件服务（通过中间件）
 * 
 * 2. WebSocket 服务器
 *    - 路径：/battle
 *    - 最大负载：10MB（支持大队伍数据）
 *    - 禁用压缩（降低延迟）
 *    - 启用客户端跟踪（用于调试和统计）
 * 
 * 3. HTTP 端点注册
 *    - /metrics           → Prometheus 格式指标
 *    - /api/metrics       → 前端性能数据接收
 *    - /health            → 健康检查（含 /health/ready, /health/live）
 *    - /api/strategies    → 攻略管理 API
 * 
 * 📦 依赖注入
 * ──────────────────────────────────────────────────────────────────────────
 * 通过 options 参数传入外部依赖，便于测试和模块化：
 *   - showdownAdapter: Pokemon Showdown 适配器
 *   - getRoomStats: 房间统计函数
 *   - getBattleStats: 对战统计函数
 *   - getResourceStats: 资源统计函数
 * 
 * 🔄 工作流程
 * ──────────────────────────────────────────────────────────────────────────
 *  1. 创建 HTTP 服务器
 *  2. 创建 WebSocket 服务器（挂载到 HTTP 服务器）
 *  3. 注册 WebSocket 连接处理器
 *  4. 注册所有 HTTP 端点
 *  5. 启动服务器监听指定端口
 * 
 * @param {Function} connectionHandler - WebSocket 连接处理器
 *  接收参数：(ws, req, { wss })
 * @param {Object} options - 可选配置
 *   - showdownAdapter: Pokemon Showdown 适配器实例
 *   - getRoomStats: 返回房间统计的函数
 *   - getBattleStats: 返回对战统计的函数
 *   - getResourceStats: 返回资源统计的函数
 *   - getCustomChecks: 自定义健康检查函数数组
 * 
 * @returns {Object} { server, wss }
 *   - server: HTTP 服务器实例
 *   - wss: WebSocket 服务器实例
 */
const http = require('http');
const WebSocket = require('ws');
const config = require('../config');
const { setupMetricsEndpoint } = require('./metricsEndpoint');
const { setupMetricsApiEndpoint } = require('./metricsApiEndpoint');
const { setupHealthEndpoint } = require('./healthEndpoint');
const { setupStrategyApiEndpoint } = require('./strategyApiEndpoint');

function bootstrap(connectionHandler, options = {}) {
  const server = http.createServer();
  const wss = new WebSocket.Server({
    server,
    path: '/battle',
    maxPayload: 10 * 1024 * 1024,
    perMessageDeflate: false,
    clientTracking: true,
  });

  wss.on('connection', (ws, req) => connectionHandler(ws, req, { wss }));

  // 设置 Prometheus 指标端点
  setupMetricsEndpoint(server);
  
  // 设置性能指标 API 端点
  setupMetricsApiEndpoint(server);

  // 设置健康检查端点
  setupHealthEndpoint(server, {
    wss,
    showdownAdapter: options.showdownAdapter,
    getRoomStats: options.getRoomStats,
    getBattleStats: options.getBattleStats,
    getResourceStats: options.getResourceStats,
    getCustomChecks: options.getCustomChecks,
  });

  // 设置攻略API端点
  setupStrategyApiEndpoint(server);

  server.listen(config.server.port, () => {
    console.log('[battle-server] ========== 服务器启动 ==========');
    console.log(`[battle-server] 端口: ${config.server.port}`);
    console.log(`[battle-server] 指标端点: http://localhost:${config.server.port}/metrics`);
    console.log(`[battle-server] 性能指标 API: http://localhost:${config.server.port}/api/metrics`);
    console.log(`[battle-server] 健康检查端点: http://localhost:${config.server.port}/health`);
  });

  return { server, wss };
}

module.exports = bootstrap;

