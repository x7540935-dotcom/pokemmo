/**
 * 攻略API端点（Strategy API Endpoint）
 * 
 * 职责：
 * - 提供攻略相关的HTTP API端点
 * - 路由请求到StrategyController
 * 
 * API端点：
 * - POST /api/strategies - 保存攻略
 * - GET /api/strategies - 获取所有攻略列表
 * - GET /api/strategies/:pokemon - 获取特定宝可梦攻略
 * - GET /api/strategies/stats - 获取攻略统计
 * - DELETE /api/strategies/delete/:filename - 删除攻略
 */

const createStrategyController = require('../controllers/StrategyController');
const createLogger = require('../adapters/logging/Logger');

const logger = createLogger('StrategyAPI');
const controller = createStrategyController();

/**
 * 设置攻略API端点
 * @param {http.Server} server - HTTP服务器
 */
function setupStrategyApiEndpoint(server) {
  server.on('request', (req, res) => {
    // 只处理 /api/strategies 路径
    if (!req.url || !req.url.startsWith('/api/strategies')) {
      return;
    }

    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // 路由请求
    const urlParts = req.url.split('?');
    const pathParts = urlParts[0].split('/').filter(Boolean);

    try {
      // POST /api/strategies - 保存攻略
      if (req.method === 'POST' && pathParts.length === 2) {
        controller.handleSaveStrategy(req, res);
        return;
      }

      // GET /api/strategies/stats - 获取统计
      if (req.method === 'GET' && pathParts.length === 3 && pathParts[2] === 'stats') {
        controller.handleGetStats(req, res);
        return;
      }

      // DELETE /api/strategies/delete/:filename - 删除攻略
      if (req.method === 'DELETE' && pathParts.length === 4 && pathParts[2] === 'delete') {
        controller.handleDeleteStrategy(req, res);
        return;
      }

      // GET /api/strategies/:pokemon 或 /api/strategies - 获取攻略
      if (req.method === 'GET') {
        controller.handleGetStrategies(req, res);
        return;
      }

      // 不支持的请求
      res.writeHead(405, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ 
        success: false, 
        error: '不支持的HTTP方法' 
      }));

    } catch (error) {
      logger.error('处理攻略API请求失败', error);
      res.writeHead(500, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ 
        success: false, 
        error: error.message 
      }));
    }
  });

  logger.info('攻略API端点已设置');
}

module.exports = {
  setupStrategyApiEndpoint
};


