/**
 * 日志聚合器（LogAggregator）
 * 
 * 职责：
 * - 在内存中缓存最近的日志条目
 * - 提供日志查询接口（按级别、模块、时间范围）
 * - 提供日志统计信息（错误率、警告数等）
 * 
 * 使用场景：
 * - 在 HTTP API 中提供日志查询端点
 * - 用于实时监控和调试
 */

class LogAggregator {
  /**
   * 构造函数
   * @param {Object} options - 选项
   * @param {number} options.maxEntries - 最大缓存条目数（默认 1000）
   */
  constructor(options = {}) {
    this.maxEntries = options.maxEntries || 1000;
    this.logs = [];
    this.stats = {
      total: 0,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        fatal: 0
      },
      byModule: {}
    };
  }

  /**
   * 添加日志条目
   * @param {Object} entry - 日志条目
   * @param {string} entry.timestamp - 时间戳
   * @param {string} entry.level - 日志级别
   * @param {string} entry.module - 模块名
   * @param {string} entry.message - 消息
   * @param {*} entry.data - 附加数据
   */
  add(entry) {
    const logEntry = {
      timestamp: entry.timestamp || new Date().toISOString(),
      level: entry.level || 'info',
      module: entry.module || 'Unknown',
      message: entry.message || '',
      data: entry.data || null
    };

    // 添加到日志数组
    this.logs.push(logEntry);

    // 更新统计信息
    this.stats.total++;
    this.stats.byLevel[logEntry.level] = (this.stats.byLevel[logEntry.level] || 0) + 1;
    this.stats.byModule[logEntry.module] = (this.stats.byModule[logEntry.module] || 0) + 1;

    // 限制日志数量
    if (this.logs.length > this.maxEntries) {
      const removed = this.logs.shift();
      // 更新统计信息
      this.stats.byLevel[removed.level] = Math.max(0, (this.stats.byLevel[removed.level] || 0) - 1);
      this.stats.byModule[removed.module] = Math.max(0, (this.stats.byModule[removed.module] || 0) - 1);
    }
  }

  /**
   * 查询日志
   * @param {Object} filters - 过滤条件
   * @param {string[]} filters.levels - 日志级别数组（可选）
   * @param {string[]} filters.modules - 模块名数组（可选）
   * @param {string} filters.startTime - 开始时间（ISO 字符串，可选）
   * @param {string} filters.endTime - 结束时间（ISO 字符串，可选）
   * @param {number} filters.limit - 返回条数限制（默认 100）
   * @returns {Object[]} 日志条目数组
   */
  query(filters = {}) {
    let results = [...this.logs];

    // 按级别过滤
    if (filters.levels && filters.levels.length > 0) {
      results = results.filter(log => filters.levels.includes(log.level));
    }

    // 按模块过滤
    if (filters.modules && filters.modules.length > 0) {
      results = results.filter(log => filters.modules.includes(log.module));
    }

    // 按时间范围过滤
    if (filters.startTime) {
      const start = new Date(filters.startTime);
      results = results.filter(log => new Date(log.timestamp) >= start);
    }
    if (filters.endTime) {
      const end = new Date(filters.endTime);
      results = results.filter(log => new Date(log.timestamp) <= end);
    }

    // 按时间倒序排序（最新的在前）
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 限制返回条数
    const limit = filters.limit || 100;
    return results.slice(0, limit);
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const errorCount = (this.stats.byLevel.error || 0) + (this.stats.byLevel.fatal || 0);
    const warnCount = this.stats.byLevel.warn || 0;
    const errorRate = this.stats.total > 0 ? (errorCount / this.stats.total) * 100 : 0;

    return {
      total: this.stats.total,
      byLevel: { ...this.stats.byLevel },
      byModule: { ...this.stats.byModule },
      errorCount,
      warnCount,
      errorRate: errorRate.toFixed(2) + '%',
      recentLogs: this.logs.length
    };
  }

  /**
   * 清空日志缓存
   */
  clear() {
    this.logs = [];
    this.stats = {
      total: 0,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        fatal: 0
      },
      byModule: {}
    };
  }
}

// 创建全局单例
let globalAggregator = null;

/**
 * 获取全局日志聚合器实例
 * @returns {LogAggregator} 日志聚合器实例
 */
function getGlobalAggregator() {
  if (!globalAggregator) {
    globalAggregator = new LogAggregator({
      maxEntries: parseInt(process.env.LOG_AGGREGATOR_MAX_ENTRIES || '1000', 10)
    });
  }
  return globalAggregator;
}

module.exports = {
  LogAggregator,
  getGlobalAggregator
};

