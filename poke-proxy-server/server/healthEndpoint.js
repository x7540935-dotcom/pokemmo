const os = require('os');
const createLogger = require('../adapters/logging/Logger');
const { getGlobalAggregator } = require('../adapters/logging/LogAggregator');
const { getMetricsStats } = require('./metricsApiEndpoint');

/**
 * 健康检查端点
 *
 * 提供以下 HTTP 端点：
 * - GET /health        综合健康状态
 * - GET /health/live   存活检查（进程是否仍在运行）
 * - GET /health/ready  就绪检查（依赖是否满足）
 * - GET /api/diagnostics  诊断信息
 *
 * @param {http.Server} server - HTTP 服务器实例
 * @param {Object} options - 配置项
 * @param {WebSocket.Server} options.wss - WebSocket Server，用于统计连接
 * @param {Function} [options.getRoomStats] - 返回房间统计的函数
 * @param {Function} [options.getBattleStats] - 返回对战统计的函数
 * @param {Function} [options.getResourceStats] - 返回资源状态的函数
 * @param {Object} [options.showdownAdapter] - Pokemon Showdown 适配器
 * @param {Function} [options.getCustomChecks] - 额外健康检查函数，返回 { name, status, details }
 */
function setupHealthEndpoint(server, options = {}) {
  const logger = createLogger('HealthEndpoint');
  const startTime = Date.now();
  const wss = options.wss;
  const showdownAdapter = options.showdownAdapter;

  const respond = (res, statusCode, payload) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  };

  const determineOverallStatus = (services, baseStatus = 'healthy') => {
    if (baseStatus === 'unhealthy') return 'unhealthy';
    if (Object.values(services).includes('unhealthy')) return 'unhealthy';
    if (Object.values(services).includes('degraded')) return 'degraded';
    return 'healthy';
  };

  const getWebSocketStatus = () => {
    if (!wss) {
      return { status: 'unknown', connections: 0 };
    }
    const connections = typeof wss.clients?.size === 'number' ? wss.clients.size : 0;
    // 如果服务器存在但连接数远高于阈值，则标记为 degraded
    const status = connections > (process.env.HEALTH_WS_MAX || 1000) ? 'degraded' : 'healthy';
    return { status, connections };
  };

  const getShowdownStatus = () => {
    if (!showdownAdapter) {
      return { status: 'unknown' };
    }
    try {
      // 尝试访问缓存的 Dex，如果失败会抛出异常
      showdownAdapter.getDex('gen9ou');
      return { status: 'healthy' };
    } catch (error) {
      logger.error('[HealthEndpoint] Pokemon Showdown 依赖不可用', error);
      return { status: 'unhealthy', error: error.message };
    }
  };

  const buildMetrics = () => {
    const battleStats = typeof options.getBattleStats === 'function'
      ? options.getBattleStats()
      : null;
    const roomStats = typeof options.getRoomStats === 'function'
      ? options.getRoomStats()
      : null;
    const metricsStats = typeof getMetricsStats === 'function'
      ? getMetricsStats()
      : null;

    const memory = process.memoryUsage();
    return {
      activeConnections: getWebSocketStatus().connections,
      activeBattles: battleStats?.totalBattles || 0,
      aiBattles: battleStats?.aiBattles || 0,
      pvpBattles: battleStats?.pvpBattles || 0,
      rooms: roomStats || {},
      logs: getGlobalAggregator().getStats(),
      collectedMetrics: metricsStats,
      memoryUsage: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
      },
      loadAverage: os.loadavg ? os.loadavg() : [],
    };
  };

  const buildResponse = (baseStatus = 'healthy') => {
    const services = {
      websocket: getWebSocketStatus().status,
      pokemonShowdown: getShowdownStatus().status,
      database: 'n/a',
    };

    const customChecks = typeof options.getCustomChecks === 'function'
      ? options.getCustomChecks()
      : [];

    customChecks.forEach((check) => {
      services[check.name] = check.status;
    });

    const overallStatus = determineOverallStatus(services, baseStatus);
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      uptimeMs: Date.now() - startTime,
      version: process.env.APP_VERSION || 'dev',
      services,
      metrics: buildMetrics(),
      resources: typeof options.getResourceStats === 'function'
        ? options.getResourceStats()
        : null,
      environment: {
        node: process.version,
        platform: process.platform,
        pid: process.pid,
      },
    };
  };

  server.on('request', (req, res) => {
    if (!req.url) return;
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;

    if (req.method === 'GET' && pathname === '/health/live') {
      respond(res, 200, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/health/ready') {
      const response = buildResponse();
      const statusCode = response.status === 'unhealthy' ? 503 : 200;
      respond(res, statusCode, response);
      return;
    }

    if (req.method === 'GET' && pathname === '/health') {
      const response = buildResponse();
      const statusCode = response.status === 'unhealthy' ? 503 : 200;
      respond(res, statusCode, response);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/diagnostics') {
      const diagnostics = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: {
          loadavg: os.loadavg ? os.loadavg() : [],
          cores: os.cpus()?.length || 0,
        },
        connections: {
          websocket: getWebSocketStatus(),
          rooms: typeof options.getRoomStats === 'function' ? options.getRoomStats() : null,
          battles: typeof options.getBattleStats === 'function' ? options.getBattleStats() : null,
        },
        metrics: buildMetrics(),
        logs: getGlobalAggregator().getStats(),
        customChecks: typeof options.getCustomChecks === 'function'
          ? options.getCustomChecks()
          : [],
      };
      respond(res, 200, diagnostics);
      return;
    }
  });
}

module.exports = {
  setupHealthEndpoint,
};

