/**
 * 性能指标 API 端点（Metrics API Endpoint）
 * 
 * 职责：
 * - 接收前端上报的性能数据
 * - 存储或转发性能数据
 * - 提供性能数据查询接口
 */

const createLogger = require('../adapters/logging/Logger');
const logger = createLogger('MetricsAPI');

// 内存存储性能数据（生产环境应使用数据库）
const performanceMetrics = [];

/**
 * 创建性能指标 API 端点处理器
 * @param {http.Server} server - HTTP 服务器
 */
function setupMetricsApiEndpoint(server) {
  // POST /api/metrics - 接收性能数据
  server.on('request', async (req, res) => {
    // 只处理 POST /api/metrics 路径
    if (!req.url || !req.url.startsWith('/api/metrics') || req.method !== 'POST') {
      return;
    }

    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理 OPTIONS 请求
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const { metrics, timestamp, userAgent, url } = data;

          if (!Array.isArray(metrics)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'metrics must be an array' }));
            return;
          }

          // 存储性能数据
          metrics.forEach(metric => {
            performanceMetrics.push({
              ...metric,
              receivedAt: Date.now(),
              userAgent,
              url
            });
          });

          // 限制存储数量（只保留最近 1000 条）
          if (performanceMetrics.length > 1000) {
            performanceMetrics.splice(0, performanceMetrics.length - 1000);
          }

          logger.info(`收到 ${metrics.length} 条性能指标`, {
            count: metrics.length,
            userAgent,
            url
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, received: metrics.length }));

        } catch (parseError) {
          logger.error('解析性能数据失败', parseError);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });

    } catch (error) {
      logger.error('处理性能数据请求失败', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });

  // 提供查询接口（GET /api/metrics）
  server.on('request', (req, res) => {
    if (req.url && req.url.startsWith('/api/metrics') && req.method === 'GET') {
      // 解析查询参数
      const urlParts = req.url.split('?');
      const queryString = urlParts[1] || '';
      const params = new URLSearchParams(queryString);
      const limit = parseInt(params.get('limit') || '100', 10);
      const type = params.get('type'); // 'web-vital' | 'custom'

      let filtered = performanceMetrics;

      if (type) {
        filtered = filtered.filter(m => m.type === type);
      }

      // 按时间倒序排序
      filtered.sort((a, b) => (b.timestamp || b.receivedAt) - (a.timestamp || a.receivedAt));

      // 限制返回数量
      filtered = filtered.slice(0, limit);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        metrics: filtered,
        total: performanceMetrics.length,
        returned: filtered.length
      }));
      return;
    }
  });
}

/**
 * 获取性能指标统计
 * @returns {Object} 统计信息
 */
function getMetricsStats() {
  const webVitals = performanceMetrics.filter(m => m.type === 'web-vital');
  const custom = performanceMetrics.filter(m => m.type !== 'web-vital');

  return {
    total: performanceMetrics.length,
    webVitals: webVitals.length,
    custom: custom.length,
    byType: {
      lcp: webVitals.filter(m => m.name === 'LCP').length,
      fid: webVitals.filter(m => m.name === 'FID').length,
      cls: webVitals.filter(m => m.name === 'CLS').length,
      fcp: webVitals.filter(m => m.name === 'FCP').length,
      ttfb: webVitals.filter(m => m.name === 'TTFB').length
    }
  };
}

module.exports = {
  setupMetricsApiEndpoint,
  getMetricsStats
};

