/**
 * 攻略管理器（StrategyManager）
 * 
 * 职责：
 * - 管理玩家编写的攻略
 * - 保存攻略到文件系统（RAG/data/raw/strategy/user/）
 * - 提供攻略的CRUD操作
 * - 确保攻略格式与RAG系统兼容
 */

const fs = require('fs-extra');
const path = require('path');
const createLogger = require('../../adapters/logging/Logger');

const logger = createLogger('StrategyManager');

class StrategyManager {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {string} options.strategyDir - 攻略存储目录
   */
  constructor(options = {}) {
    // 攻略存储目录：RAG/data/raw/strategy/user/
    const projectRoot = path.resolve(__dirname, '../../../..');
    this.strategyDir = options.strategyDir || path.join(projectRoot, 'RAG', 'data', 'raw', 'strategy', 'user');
    
    // 确保目录存在
    fs.ensureDirSync(this.strategyDir);
    
    logger.info('StrategyManager初始化完成', { strategyDir: this.strategyDir });
  }

  /**
   * 保存攻略
   * @param {Object} strategy - 攻略对象
   * @param {string} strategy.pokemon - 宝可梦名称（可选，全局攻略为空）
   * @param {string} strategy.title - 攻略标题
   * @param {string} strategy.content - 攻略内容
   * @param {string} [strategy.format] - 对战格式（如 'gen9ou'）
   * @param {Object} [strategy.metadata] - 额外元数据
   * @returns {Promise<Object>} 保存结果
   */
  async saveStrategy(strategy) {
    try {
      const { pokemon, title, content, format = 'gen9ou', metadata = {} } = strategy;

      if (!title || !content) {
        throw new Error('标题和内容不能为空');
      }

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedPokemon = pokemon ? this.sanitizeFileName(pokemon.toLowerCase()) : 'global';
      const sanitizedTitle = this.sanitizeFileName(title).substring(0, 50);
      const filename = `${sanitizedPokemon}-${sanitizedTitle}-${timestamp}.json`;

      // 构建攻略数据（与RAG系统格式兼容）
      const strategyData = {
        metadata: {
          source: 'user',
          type: pokemon ? 'pokemon_strategy' : 'global_strategy',
          pokemon: pokemon || null,
          title: title,
          format: format,
          createdAt: new Date().toISOString(),
          author: metadata.author || 'user',
          ...metadata
        },
        data: {
          pokemon: pokemon || null,
          title: title,
          strategy: content,
          text: content,
          format: format
        }
      };

      // 保存文件
      const filePath = path.join(this.strategyDir, filename);
      await fs.writeJSON(filePath, strategyData, { spaces: 2 });

      logger.info('攻略保存成功', {
        pokemon: pokemon || 'global',
        title,
        filePath
      });

      return {
        success: true,
        filename,
        filePath,
        strategy: strategyData
      };

    } catch (error) {
      logger.error('保存攻略失败', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * 获取特定宝可梦的攻略
   * @param {string} pokemon - 宝可梦名称
   * @returns {Promise<Array>} 攻略列表
   */
  async getPokemonStrategies(pokemon) {
    try {
      const sanitizedPokemon = this.sanitizeFileName(pokemon.toLowerCase());
      const files = await fs.readdir(this.strategyDir);

      const strategies = [];
      for (const file of files) {
        if (file.startsWith(sanitizedPokemon + '-') && file.endsWith('.json')) {
          try {
            const filePath = path.join(this.strategyDir, file);
            const data = await fs.readJSON(filePath);
            strategies.push({
              filename: file,
              ...data
            });
          } catch (e) {
            logger.warn('读取攻略文件失败', { file, error: e.message });
          }
        }
      }

      // 按创建时间倒序排序
      strategies.sort((a, b) => {
        const timeA = new Date(a.metadata?.createdAt || 0);
        const timeB = new Date(b.metadata?.createdAt || 0);
        return timeB - timeA;
      });

      return strategies;

    } catch (error) {
      logger.error('获取攻略失败', { pokemon, error: error.message });
      throw error;
    }
  }

  /**
   * 获取全局攻略
   * @returns {Promise<Array>} 攻略列表
   */
  async getGlobalStrategies() {
    try {
      const files = await fs.readdir(this.strategyDir);
      const strategies = [];

      for (const file of files) {
        if (file.startsWith('global-') && file.endsWith('.json')) {
          try {
            const filePath = path.join(this.strategyDir, file);
            const data = await fs.readJSON(filePath);
            strategies.push({
              filename: file,
              ...data
            });
          } catch (e) {
            logger.warn('读取全局攻略文件失败', { file, error: e.message });
          }
        }
      }

      // 按创建时间倒序排序
      strategies.sort((a, b) => {
        const timeA = new Date(a.metadata?.createdAt || 0);
        const timeB = new Date(b.metadata?.createdAt || 0);
        return timeB - timeA;
      });

      return strategies;

    } catch (error) {
      logger.error('获取全局攻略失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取所有攻略列表
   * @param {Object} options - 查询选项
   * @param {string} [options.pokemon] - 筛选特定宝可梦
   * @param {number} [options.limit] - 限制返回数量
   * @returns {Promise<Array>} 攻略列表
   */
  async listStrategies(options = {}) {
    try {
      const { pokemon, limit } = options;
      const files = await fs.readdir(this.strategyDir);
      const strategies = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filePath = path.join(this.strategyDir, file);
          const data = await fs.readJSON(filePath);
          
          // 筛选条件
          if (pokemon) {
            const filePokemon = data.metadata?.pokemon?.toLowerCase();
            if (filePokemon !== pokemon.toLowerCase()) continue;
          }

          strategies.push({
            filename: file,
            pokemon: data.metadata?.pokemon || null,
            title: data.metadata?.title || '未命名',
            createdAt: data.metadata?.createdAt,
            format: data.metadata?.format || 'gen9ou'
          });

        } catch (e) {
          logger.warn('读取攻略文件失败', { file, error: e.message });
        }
      }

      // 按创建时间倒序排序
      strategies.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0);
        const timeB = new Date(b.createdAt || 0);
        return timeB - timeA;
      });

      // 限制数量
      if (limit && limit > 0) {
        return strategies.slice(0, limit);
      }

      return strategies;

    } catch (error) {
      logger.error('获取攻略列表失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 删除攻略
   * @param {string} filename - 文件名
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteStrategy(filename) {
    try {
      // 安全检查：只允许删除用户攻略目录下的文件
      const filePath = path.join(this.strategyDir, path.basename(filename));
      
      if (!filePath.startsWith(this.strategyDir)) {
        throw new Error('不允许删除此文件');
      }

      await fs.remove(filePath);
      logger.info('攻略删除成功', { filename });
      return true;

    } catch (error) {
      logger.error('删除攻略失败', { filename, error: error.message });
      throw error;
    }
  }

  /**
   * 清理文件名（移除不安全字符）
   * @param {string} name - 文件名
   * @returns {string} 清理后的文件名
   */
  sanitizeFileName(name) {
    return name.replace(/[^a-z0-9-_]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  /**
   * 获取攻略统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      const files = await fs.readdir(this.strategyDir);
      const stats = {
        total: 0,
        byPokemon: {},
        global: 0,
        formats: {}
      };

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filePath = path.join(this.strategyDir, file);
          const data = await fs.readJSON(filePath);
          
          stats.total++;
          
          if (data.metadata?.pokemon) {
            const pokemon = data.metadata.pokemon;
            stats.byPokemon[pokemon] = (stats.byPokemon[pokemon] || 0) + 1;
          } else {
            stats.global++;
          }

          const format = data.metadata?.format || 'unknown';
          stats.formats[format] = (stats.formats[format] || 0) + 1;

        } catch (e) {
          // 忽略无法解析的文件
        }
      }

      return stats;

    } catch (error) {
      logger.error('获取攻略统计失败', { error: error.message });
      return { total: 0, byPokemon: {}, global: 0, formats: {} };
    }
  }

  /**
   * 获取所有攻略中提到的精灵名称列表
   * 用于扩展AI可选精灵池
   * @returns {Promise<Array<string>>} 精灵名称数组（去重）
   */
  async getPokemonFromStrategies() {
    try {
      const files = await fs.readdir(this.strategyDir);
      const pokemonSet = new Set();

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filePath = path.join(this.strategyDir, file);
          const data = await fs.readJSON(filePath);
          
          // 从metadata中获取精灵名称
          const pokemon = data.metadata?.pokemon;
          if (pokemon && typeof pokemon === 'string' && pokemon.trim()) {
            // 标准化名称：首字母大写，其余小写
            const normalizedName = pokemon.trim();
            pokemonSet.add(normalizedName);
          }

        } catch (e) {
          logger.warn('读取攻略文件失败（获取精灵列表）', { file, error: e.message });
        }
      }

      const pokemonList = Array.from(pokemonSet).sort();
      logger.info('从攻略中提取精灵列表', { count: pokemonList.length, pokemon: pokemonList });
      
      return pokemonList;

    } catch (error) {
      logger.error('获取攻略精灵列表失败', { error: error.message });
      return [];
    }
  }

  /**
   * 同步版本：获取所有攻略中提到的精灵名称列表（使用缓存）
   * 注意：首次调用会返回空数组，需要先调用异步版本初始化缓存
   */
  getPokemonFromStrategiesSync() {
    // 如果缓存存在且未过期，返回缓存
    if (this._pokemonCache && this._pokemonCacheExpiry > Date.now()) {
      return this._pokemonCache;
    }
    
    // 否则返回空数组（需要异步加载）
    return [];
  }

  /**
   * 刷新精灵列表缓存
   * @returns {Promise<void>}
   */
  async refreshPokemonCache() {
    try {
      const pokemonList = await this.getPokemonFromStrategies();
      this._pokemonCache = pokemonList;
      // 缓存5分钟
      this._pokemonCacheExpiry = Date.now() + 5 * 60 * 1000;
      logger.debug('攻略精灵列表缓存已刷新', { count: pokemonList.length });
    } catch (error) {
      logger.error('刷新攻略精灵列表缓存失败', { error: error.message });
    }
  }
}

module.exports = StrategyManager;

