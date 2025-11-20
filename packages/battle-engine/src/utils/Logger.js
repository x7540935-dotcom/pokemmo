/**
 * 统一日志系统（Logger）
 * 
 * 职责：
 * - 提供统一的日志接口，支持日志级别控制
 * - 格式化日志消息（时间戳、模块名、消息内容）
 * - 支持日志级别过滤（error, warn, info, debug）
 * - 自动检测开发/生产环境，设置默认日志级别
 * 
 * 日志级别（从低到高）：
 * - ERROR (0): 错误日志，始终输出
 * - WARN (1): 警告日志
 * - INFO (2): 信息日志（生产环境默认）
 * - DEBUG (3): 调试日志（开发环境默认）
 * 
 * 配置方式：
 * - URL参数：?logLevel=debug
 * - localStorage：localStorage.setItem('logLevel', 'debug')
 * - 自动检测：localhost 使用 DEBUG，其他使用 INFO
 * 
 * 使用示例：
 * Logger.error('BattlePhase', '处理协议失败', { protocol: line });
 * Logger.warn('BattleUI', 'Localization未初始化');
 * Logger.info('BattlePhase', '战斗开始');
 * Logger.debug('BattleEngine', '发送消息', { message });
 */
class Logger {
  /**
   * 日志级别常量
   * 数值越大，级别越高（输出的日志越多）
   */
  static LEVELS = {
    ERROR: 0,  // 错误级别
    WARN: 1,   // 警告级别
    INFO: 2,   // 信息级别
    DEBUG: 3   // 调试级别
  };

  /**
   * 当前日志级别（默认INFO，生产环境）
   * 可通过环境变量或配置修改
   */
  static level = (() => {
    const hasWindow = typeof window !== 'undefined';
    const hasLocalStorage = typeof localStorage !== 'undefined';

    // 检查 URL 参数
    const params = hasWindow ? new URLSearchParams(window.location.search) : null;
    const logLevel = params?.get('logLevel') || params?.get('loglevel');
    if (logLevel) {
      return Logger.LEVELS[logLevel.toUpperCase()] ?? Logger.LEVELS.INFO;
    }
    
    // 检查 localStorage
    const storedLevel = hasLocalStorage ? localStorage.getItem('logLevel') : null;
    if (storedLevel) {
      return Logger.LEVELS[storedLevel.toUpperCase()] ?? Logger.LEVELS.INFO;
    }
    
    // 默认级别（开发环境DEBUG，生产环境INFO）
    const isDev = hasWindow && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === ''
    );
    return isDev ? Logger.LEVELS.DEBUG : Logger.LEVELS.INFO;
  })();

  /**
   * 格式化时间戳
   * 
   * 功能：
   * - 生成格式化的时间戳字符串（HH:MM:SS.mmm）
   * - 用于日志消息前缀
   * 
   * @returns {string} 格式化的时间戳，如 "14:30:25.123"
   */
  static formatTimestamp() {
    const now = new Date();
    return now.toISOString().substring(11, 23);
  }

  /**
   * 格式化日志消息
   * 
   * 功能：
   * - 组合时间戳、模块名、级别和消息内容
   * - 处理附加数据（对象自动序列化为 JSON）
   * - 截断过长的 JSON 数据
   * 
   * @param {string} module - 模块名称（如 'BattlePhase', 'BattleUI'）
   * @param {string} level - 日志级别（'ERROR', 'WARN', 'INFO', 'DEBUG'）
   * @param {string} message - 日志消息
   * @param {any} [data=null] - 附加数据（可选）
   * @returns {string} 格式化后的完整日志消息
   */
  static formatMessage(module, level, message, data = null) {
    const timestamp = this.formatTimestamp();
    const prefix = `[${timestamp}] [${module}]`;
    
    let fullMessage = `${prefix} ${message}`;
    
    if (data !== null && data !== undefined) {
      // 如果是对象或数组，尝试JSON序列化
      if (typeof data === 'object') {
        try {
          const jsonStr = JSON.stringify(data, null, 2);
          // 如果JSON太长，截断
          if (jsonStr.length > 500) {
            fullMessage += `\n${prefix} 数据: ${jsonStr.substring(0, 500)}... (已截断)`;
          } else {
            fullMessage += `\n${prefix} 数据: ${jsonStr}`;
          }
        } catch (e) {
          fullMessage += `\n${prefix} 数据: [无法序列化]`;
        }
      } else {
        fullMessage += ` - ${data}`;
      }
    }
    
    return fullMessage;
  }

  /**
   * 记录错误日志（始终输出）
   */
  static error(module, message, data = null) {
    if (this.level >= this.LEVELS.ERROR) {
      const formatted = this.formatMessage(module, 'ERROR', message, data);
      console.error(formatted);
    }
  }

  /**
   * 记录警告日志
   */
  static warn(module, message, data = null) {
    if (this.level >= this.LEVELS.WARN) {
      const formatted = this.formatMessage(module, 'WARN', message, data);
      console.warn(formatted);
    }
  }

  /**
   * 记录信息日志
   */
  static info(module, message, data = null) {
    if (this.level >= this.LEVELS.INFO) {
      const formatted = this.formatMessage(module, 'INFO', message, data);
      console.log(formatted);
    }
  }

  /**
   * 记录调试日志（仅在开发环境输出）
   */
  static debug(module, message, data = null) {
    if (this.level >= this.LEVELS.DEBUG) {
      const formatted = this.formatMessage(module, 'DEBUG', message, data);
      console.log(formatted);
    }
  }

  /**
   * 设置日志级别
   * 
   * @param {string|number} level - 日志级别 ('error'|'warn'|'info'|'debug' 或数字)
   */
  static setLevel(level) {
    if (typeof level === 'string') {
      this.level = this.LEVELS[level.toUpperCase()] ?? this.LEVELS.INFO;
    } else if (typeof level === 'number' && level >= 0 && level <= 3) {
      this.level = level;
    }
    
    // 保存到 localStorage
    const levelName = Object.keys(this.LEVELS).find(
      key => this.LEVELS[key] === this.level
    );
    if (levelName && typeof localStorage !== 'undefined') {
      localStorage.setItem('logLevel', levelName);
    }
    
    this.info('Logger', `日志级别已设置为: ${levelName || this.level}`);
  }

  /**
   * 获取当前日志级别名称
   */
  static getLevelName() {
    return Object.keys(this.LEVELS).find(
      key => this.LEVELS[key] === this.level
    ) || 'INFO';
  }
}

export default Logger;
