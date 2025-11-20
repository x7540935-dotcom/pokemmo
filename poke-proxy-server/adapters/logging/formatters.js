/**
 * 日志格式化器（Log Formatters）
 * 
 * 职责：
 * - 提供多种日志格式（文本、JSON、结构化）
 * - 支持日志轮转和文件输出
 * - 支持日志过滤和转换
 */

const fs = require('fs');
const path = require('path');

/**
 * JSON 格式化器
 * 输出结构化 JSON 格式日志
 */
class JSONFormatter {
  /**
   * 格式化日志条目
   * @param {Object} entry - 日志条目
   * @param {string} entry.timestamp - 时间戳
   * @param {string} entry.level - 日志级别
   * @param {string} entry.module - 模块名
   * @param {string} entry.message - 消息
   * @param {*} entry.data - 附加数据
   * @returns {string} JSON 字符串
   */
  format(entry) {
    const logEntry = {
      timestamp: entry.timestamp || new Date().toISOString(),
      level: entry.level,
      module: entry.module,
      message: entry.message,
      ...(entry.data && typeof entry.data === 'object' && !(entry.data instanceof Error)
        ? entry.data
        : { data: entry.data })
    };

    // 如果是 Error 对象，提取堆栈信息
    if (entry.data instanceof Error) {
      logEntry.error = {
        message: entry.data.message,
        stack: entry.data.stack,
        name: entry.data.name
      };
    }

    return JSON.stringify(logEntry);
  }
}

/**
 * 文本格式化器
 * 输出人类可读的文本格式日志
 */
class TextFormatter {
  /**
   * 格式化日志条目
   * @param {Object} entry - 日志条目
   * @returns {string} 格式化后的文本
   */
  format(entry) {
    const timestamp = entry.timestamp || new Date().toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const module = entry.module || 'Unknown';
    const message = entry.message || '';

    let formatted = `${timestamp} [${module}] [${level}] ${message}`;

    if (entry.data !== null && entry.data !== undefined) {
      if (entry.data instanceof Error) {
        formatted += `\n${entry.data.stack || entry.data.message}`;
      } else if (typeof entry.data === 'object') {
        formatted += `\n${JSON.stringify(entry.data, null, 2)}`;
      } else {
        formatted += ` ${String(entry.data)}`;
      }
    }

    return formatted;
  }
}

/**
 * 日志文件写入器
 * 支持日志轮转（按日期/大小）
 */
class LogFileWriter {
  /**
   * 构造函数
   * @param {Object} options - 选项
   * @param {string} options.logDir - 日志目录
   * @param {string} options.fileName - 日志文件名（不含扩展名）
   * @param {number} options.maxSize - 最大文件大小（字节，默认 10MB）
   * @param {number} options.maxFiles - 最大保留文件数（默认 7）
   */
  constructor(options = {}) {
    this.logDir = options.logDir || path.join(process.cwd(), 'logs');
    this.fileName = options.fileName || 'app';
    this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 7;
    this.currentFile = null;
    this.currentDate = null;

    // 确保日志目录存在
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * 获取当前日志文件路径
   * @returns {string} 文件路径
   */
  getCurrentLogFile() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filePath = path.join(this.logDir, `${this.fileName}-${today}.log`);

    // 如果日期变化，切换文件
    if (this.currentDate !== today) {
      this.currentDate = today;
      this.currentFile = filePath;
    }

    return this.currentFile || filePath;
  }

  /**
   * 检查文件大小，如果超过限制则轮转
   * @param {string} filePath - 文件路径
   */
  rotateIfNeeded(filePath) {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const stats = fs.statSync(filePath);
    if (stats.size >= this.maxSize) {
      // 创建带时间戳的备份文件
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = filePath.replace('.log', `-${timestamp}.log`);
      fs.renameSync(filePath, backupPath);

      // 清理旧文件（只保留最近的 N 个）
      this.cleanOldFiles();
    }
  }

  /**
   * 清理旧日志文件
   */
  cleanOldFiles() {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(f => f.startsWith(this.fileName) && f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(this.logDir, f),
          mtime: fs.statSync(path.join(this.logDir, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime); // 按修改时间降序

      // 删除超出限制的文件
      if (files.length > this.maxFiles) {
        files.slice(this.maxFiles).forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error('[LogFileWriter] 清理旧文件失败:', error.message);
    }
  }

  /**
   * 写入日志
   * @param {string} formattedLog - 格式化后的日志
   */
  write(formattedLog) {
    try {
      const filePath = this.getCurrentLogFile();
      this.rotateIfNeeded(filePath);

      fs.appendFileSync(filePath, formattedLog + '\n', 'utf8');
    } catch (error) {
      console.error('[LogFileWriter] 写入日志失败:', error.message);
    }
  }
}

module.exports = {
  JSONFormatter,
  TextFormatter,
  LogFileWriter
};

