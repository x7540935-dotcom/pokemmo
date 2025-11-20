/**
 * 结构化日志器（Logger）
 * 
 * 职责：
 * - 提供统一的日志接口，替代散落的 console.log
 * - 支持日志级别（debug, info, warn, error, fatal）
 * - 支持模块前缀，便于过滤和追踪
 * - 支持 JSON 格式输出（可选）
 * - 支持日志文件输出（可选）
 * - 兼容 DEBUG_AI 等环境变量
 * 
 * 使用方式：
 * ```js
 * const logger = require('./adapters/logging/Logger')('BattleManager');
 * logger.info('对战已初始化');
 * logger.debug('详细调试信息', { metadata });
 * logger.error('错误信息', error);
 * ```
 */
const { JSONFormatter, TextFormatter, LogFileWriter } = require('./formatters');
const { getGlobalAggregator } = require('./LogAggregator');

class Logger {
  /**
   * 构造函数
   * @param {string} moduleName - 模块名称（用于前缀）
   * @param {Object} [options={}] - 选项
   *   - level: 日志级别（'debug' | 'info' | 'warn' | 'error' | 'fatal'），默认从环境变量读取
   *   - json: 是否输出 JSON 格式（默认 false）
   *   - enableDebug: 是否启用 debug 日志（默认从 DEBUG_AI 读取）
   *   - fileOutput: 是否输出到文件（默认 false）
   *   - logDir: 日志目录（默认 'logs'）
   *   - formatter: 自定义格式化器（可选）
   */
  constructor(moduleName, options = {}) {
    this.moduleName = moduleName || 'Unknown';
    this.options = {
      level: options.level || process.env.LOG_LEVEL || 'info',
      json: options.json || process.env.LOG_FORMAT === 'json',
      enableDebug: options.enableDebug !== undefined 
        ? options.enableDebug 
        : process.env.DEBUG_AI === 'true',
      fileOutput: options.fileOutput || process.env.LOG_FILE === 'true',
      logDir: options.logDir || process.env.LOG_DIR || 'logs',
      ...options
    };
    
    // 日志级别优先级
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4
    };
    
    this.currentLevel = this.levels[this.options.level] || this.levels.info;
    
    // 初始化格式化器
    this.formatter = this.options.formatter || (
      this.options.json 
        ? new JSONFormatter() 
        : new TextFormatter()
    );
    
    // 初始化文件写入器（如果需要）
    this.fileWriter = null;
    if (this.options.fileOutput) {
      this.fileWriter = new LogFileWriter({
        logDir: this.options.logDir,
        fileName: this.moduleName.toLowerCase().replace(/\s+/g, '-')
      });
    }
  }

  /**
   * 格式化日志消息
   * @param {string} level - 日志级别
   * @param {string} message - 消息
   * @param {*} [data] - 附加数据
   * @returns {string} 格式化后的消息
   */
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    
    const entry = {
      timestamp,
      level,
      module: this.moduleName,
      message,
      data: data !== null && data !== undefined ? data : null
    };
    
    return this.formatter.format(entry);
  }

  /**
   * 检查是否应该输出日志
   * @param {string} level - 日志级别
   * @returns {boolean} 是否应该输出
   */
  shouldLog(level) {
    const levelValue = this.levels[level] || this.levels.info;
    
    // debug 级别需要额外检查 enableDebug
    if (level === 'debug' && !this.options.enableDebug) {
      return false;
    }
    
    return levelValue >= this.currentLevel;
  }

  /**
   * 输出日志
   * @param {string} level - 日志级别
   * @param {string} message - 消息
   * @param {*} [data] - 附加数据
   */
  log(level, message, data = null) {
    if (!this.shouldLog(level)) {
      return;
    }

    const formatted = this.formatMessage(level, message, data);
    
    // 输出到控制台
    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.log(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
      case 'fatal':
        console.error(formatted);
        break;
      default:
        console.log(formatted);
    }
    
    // 输出到文件（如果需要）
    if (this.fileWriter) {
      this.fileWriter.write(formatted);
    }
    
    // 添加到日志聚合器（用于查询和统计）
    try {
      const aggregator = getGlobalAggregator();
      aggregator.add({
        timestamp: new Date().toISOString(),
        level,
        module: this.moduleName,
        message,
        data: data !== null && data !== undefined ? data : null
      });
    } catch (error) {
      // 忽略聚合器错误，避免影响日志输出
      console.error('[Logger] 日志聚合器错误:', error.message);
    }
  }

  /**
   * Debug 日志
   * @param {string} message - 消息
   * @param {*} [data] - 附加数据
   */
  debug(message, data = null) {
    this.log('debug', message, data);
  }

  /**
   * Info 日志
   * @param {string} message - 消息
   * @param {*} [data] - 附加数据
   */
  info(message, data = null) {
    this.log('info', message, data);
  }

  /**
   * Warn 日志
   * @param {string} message - 消息
   * @param {*} [data] - 附加数据
   */
  warn(message, data = null) {
    this.log('warn', message, data);
  }

  /**
   * Error 日志
   * @param {string} message - 消息
   * @param {Error|*} [error] - 错误对象或附加数据
   * @param {*} [data] - 附加数据（当第一个参数是 Error 时）
   */
  error(message, error = null, data = null) {
    if (error instanceof Error) {
      this.log('error', message, { error: error.message, stack: error.stack, ...data });
    } else {
      this.log('error', message, error || data);
    }
  }

  /**
   * Fatal 日志（严重错误，可能导致服务停止）
   * @param {string} message - 消息
   * @param {Error|*} [error] - 错误对象或附加数据
   * @param {*} [data] - 附加数据（当第一个参数是 Error 时）
   */
  fatal(message, error = null, data = null) {
    if (error instanceof Error) {
      this.log('fatal', message, { error: error.message, stack: error.stack, ...data });
    } else {
      this.log('fatal', message, error || data);
    }
  }
}

/**
 * 创建 Logger 实例的工厂函数
 * @param {string} moduleName - 模块名称
 * @param {Object} [options={}] - 选项
 * @returns {Logger} Logger 实例
 */
function createLogger(moduleName, options = {}) {
  return new Logger(moduleName, options);
}

// 导出工厂函数和类
module.exports = createLogger;
module.exports.Logger = Logger;

