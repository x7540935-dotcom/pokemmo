const http = require('http');
const WebSocket = require('ws');
const config = require('../config');
const { setupMetricsEndpoint } = require('./metricsEndpoint');
const { setupMetricsApiEndpoint } = require('./metricsApiEndpoint');
const { setupHealthEndpoint } = require('./healthEndpoint');

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

