/**
 * AI模块日志工具类（Logger）
 * 
 * 职责：
 * - 为所有AI模块提供统一的日志记录功能
 * - 同时输出到控制台和日志文件
 * - 支持不同日志级别（INFO, WARN, ERROR, DEBUG）
 * 
 * 日志输出：
 * - 控制台：实时显示（用于开发调试）
 * - 文件：logs/ai.log（持久化存储）
 * 
 * 日志格式：
 * [时间戳] [模块名] [级别] 消息 [数据]
 * 
 * 使用场景：
 * - 所有AI类（SimpleAI, MediumAI, AdvancedAI, ExpertAI）使用此Logger
 * - 记录AI决策过程、错误信息、调试信息等
 */
const fs = require('fs');
const path = require('path');

class Logger {
  /**
   * 构造函数
   * 
   * @param {string} moduleName - 模块名称（如 'SimpleAI-2', 'MediumAI'）
   */
  constructor(moduleName) {
    this.moduleName = moduleName;
    this.logDir = path.resolve(__dirname, '../../../logs');
    
    // 确保日志目录存在
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (e) {
      // 忽略创建目录失败
    }
    
    // 日志文件路径
    this.logFile = path.join(this.logDir, 'ai.log');
  }

  /**
   * 记录日志
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.moduleName}] [${level}] ${message}${data ? ' ' + JSON.stringify(data, null, 2) : ''}`;
    
    // 控制台输出（后端显示）
    if (level === 'ERROR') {
      console.error(logMessage);
    } else if (level === 'WARN') {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
    
    // 写入文件（异步，不阻塞）
    try {
      fs.appendFile(this.logFile, logMessage + '\n', (err) => {
        if (err) {
          // 忽略文件写入错误，避免影响主流程
        }
      });
    } catch (e) {
      // 忽略文件写入错误
    }
  }

  info(message, data) {
    this.log('INFO', message, data);
  }

  warn(message, data) {
    this.log('WARN', message, data);
  }

  error(message, data) {
    this.log('ERROR', message, data);
  }

  debug(message, data) {
    this.log('DEBUG', message, data);
  }
}

module.exports = Logger;

