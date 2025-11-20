/**
 * Prometheus 指标端点（Metrics Endpoint）
 * 
 * 职责：
 * - 提供 /metrics 端点供 Prometheus 抓取
 * - 返回 Prometheus 格式的指标数据
 */

const { getGlobalMetrics } = require('../adapters/metrics/PrometheusMetrics');

/**
 * 创建指标端点处理器
 * @param {http.Server} server - HTTP 服务器
 */
function setupMetricsEndpoint(server) {
  server.on('request', async (req, res) => {
    // 只处理 /metrics 路径
    if (req.url !== '/metrics') {
      return;
    }

    try {
      const metrics = getGlobalMetrics();
      const metricsContent = await metrics.getMetrics();

      res.writeHead(200, {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
      });
      res.end(metricsContent);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Error generating metrics: ${error.message}\n`);
    }
  });
}

module.exports = {
  setupMetricsEndpoint
};

