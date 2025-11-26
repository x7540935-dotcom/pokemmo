/**
 * 攻略控制器（StrategyController）
 * 
 * 职责：
 * - 处理攻略相关的HTTP请求
 * - 验证请求数据
 * - 调用StrategyManager处理业务逻辑
 * - 返回响应结果
 */

const StrategyManager = require('../domain/strategies/StrategyManager');
const createLogger = require('../adapters/logging/Logger');

const logger = createLogger('StrategyController');

// 创建策略管理器实例
const strategyManager = new StrategyManager();

/**
 * 创建攻略控制器
 * @returns {Object} 控制器方法
 */
function createStrategyController() {
  /**
   * 处理保存攻略请求
   * @param {http.IncomingMessage} req - HTTP请求
   * @param {http.ServerResponse} res - HTTP响应
   */
  async function handleSaveStrategy(req, res) {
    try {
      // 读取请求体
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const { pokemon, title, content, format = 'gen9ou', metadata = {} } = data;

          // 验证数据
          if (!title || !content) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: '标题和内容不能为空' 
            }));
            return;
          }

          // 保存攻略
          const result = await strategyManager.saveStrategy({
            pokemon: pokemon || null,
            title: title.trim(),
            content: content.trim(),
            format,
            metadata
          });

          logger.info('攻略保存成功', {
            pokemon: pokemon || 'global',
            title
          });

          // 如果保存的是指定精灵的攻略，刷新知识库精灵列表
          if (pokemon) {
            try {
              // 刷新 StrategyManager 的缓存
              await strategyManager.refreshPokemonCache();
              
              // 刷新 battle-server 中的知识库精灵列表
              if (typeof global !== 'undefined' && global.refreshKnowledgeBasePokemon) {
                global.refreshKnowledgeBasePokemon().catch(err => {
                  logger.warn('刷新知识库精灵列表失败', { error: err.message });
                });
              }
            } catch (refreshError) {
              logger.warn('刷新精灵列表时出错', { error: refreshError.message });
            }
          }

          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(result));

        } catch (parseError) {
          logger.error('解析请求数据失败', parseError);
          res.writeHead(400, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ 
            success: false, 
            error: '无效的JSON数据' 
          }));
        }
      });

    } catch (error) {
      logger.error('处理保存攻略请求失败', error);
      res.writeHead(500, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ 
        success: false, 
        error: error.message 
      }));
    }
  }

  /**
   * 处理获取攻略请求
   * @param {http.IncomingMessage} req - HTTP请求
   * @param {http.ServerResponse} res - HTTP响应
   */
  async function handleGetStrategies(req, res) {
    try {
      // 解析URL路径：/api/strategies/:pokemon 或 /api/strategies
      const urlParts = req.url.split('?');
      const pathParts = urlParts[0].split('/').filter(Boolean);
      
      // 解析查询参数
      const queryString = urlParts[1] || '';
      const params = new URLSearchParams(queryString);
      const limit = parseInt(params.get('limit') || '0', 10);

      let strategies = [];

      // 判断是获取特定宝可梦攻略还是全部攻略
      if (pathParts.length >= 3 && pathParts[2] !== '') {
        // /api/strategies/:pokemon
        const pokemon = decodeURIComponent(pathParts[2]);
        strategies = await strategyManager.getPokemonStrategies(pokemon);
      } else if (params.get('pokemon')) {
        // /api/strategies?pokemon=xxx
        const pokemon = params.get('pokemon');
        strategies = await strategyManager.getPokemonStrategies(pokemon);
      } else if (params.get('global') === 'true') {
        // /api/strategies?global=true
        strategies = await strategyManager.getGlobalStrategies();
      } else {
        // /api/strategies - 获取所有攻略列表
        strategies = await strategyManager.listStrategies({
          limit: limit > 0 ? limit : undefined
        });
      }

      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        success: true,
        count: strategies.length,
        strategies
      }));

    } catch (error) {
      logger.error('处理获取攻略请求失败', error);
      res.writeHead(500, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ 
        success: false, 
        error: error.message 
      }));
    }
  }

  /**
   * 处理获取攻略统计请求
   * @param {http.IncomingMessage} req - HTTP请求
   * @param {http.ServerResponse} res - HTTP响应
   */
  async function handleGetStats(req, res) {
    try {
      const stats = await strategyManager.getStats();

      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        success: true,
        stats
      }));

    } catch (error) {
      logger.error('处理获取攻略统计请求失败', error);
      res.writeHead(500, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ 
        success: false, 
        error: error.message 
      }));
    }
  }

  /**
   * 处理删除攻略请求
   * @param {http.IncomingMessage} req - HTTP请求
   * @param {http.ServerResponse} res - HTTP响应
   */
  async function handleDeleteStrategy(req, res) {
    try {
      // 解析URL路径：/api/strategies/delete/:filename
      const urlParts = req.url.split('?');
      const pathParts = urlParts[0].split('/').filter(Boolean);

      if (pathParts.length < 4 || pathParts[2] !== 'delete') {
        res.writeHead(400, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ 
          success: false, 
          error: '无效的请求路径' 
        }));
        return;
      }

      const filename = decodeURIComponent(pathParts[3]);
      const deleted = await strategyManager.deleteStrategy(filename);

      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        success: deleted
      }));

    } catch (error) {
      logger.error('处理删除攻略请求失败', error);
      res.writeHead(500, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ 
        success: false, 
        error: error.message 
      }));
    }
  }

  return {
    handleSaveStrategy,
    handleGetStrategies,
    handleGetStats,
    handleDeleteStrategy
  };
}

module.exports = createStrategyController;

