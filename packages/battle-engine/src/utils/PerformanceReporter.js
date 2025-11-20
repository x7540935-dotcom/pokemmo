/**
 * 性能数据上报器（PerformanceReporter）
 * 
 * 职责：
 * - 批量上报性能数据到后端
 * - 本地缓存（离线支持）
 * - 错误重试机制
 * 
 * 使用方式：
 * ```js
 * import { PerformanceReporter } from './utils/PerformanceReporter';
 * const reporter = new PerformanceReporter({ endpoint: '/api/metrics' });
 * reporter.report(metrics);
 * ```
 */

class PerformanceReporter {
  /**
   * 构造函数
   * @param {Object} options - 选项
   * @param {string} options.endpoint - 上报端点（默认 '/api/metrics'）
   * @param {number} options.batchSize - 批量上报大小（默认 10）
   * @param {number} options.flushInterval - 刷新间隔（毫秒，默认 5000）
   * @param {number} options.maxRetries - 最大重试次数（默认 3）
   * @param {string} options.storageKey - 本地存储键名（默认 'performance_metrics_queue'）
   */
  constructor(options = {}) {
    this.options = {
      endpoint: options.endpoint || '/api/metrics',
      batchSize: options.batchSize || 10,
      flushInterval: options.flushInterval || 5000,
      maxRetries: options.maxRetries || 3,
      storageKey: options.storageKey || 'performance_metrics_queue',
      ...options
    };

    this.queue = [];
    this.flushTimer = null;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // 从本地存储恢复队列
    this.loadQueue();

    // 监听在线/离线事件
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flush();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }

    // 启动定时刷新
    this.startFlushTimer();
  }

  /**
   * 从本地存储加载队列
   */
  loadQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.options.storageKey);
        if (stored) {
          this.queue = JSON.parse(stored);
          console.log(`[PerformanceReporter] 从本地存储恢复 ${this.queue.length} 条指标`);
        }
      }
    } catch (error) {
      console.error('[PerformanceReporter] 加载队列失败:', error);
    }
  }

  /**
   * 保存队列到本地存储
   */
  saveQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.options.storageKey, JSON.stringify(this.queue));
      }
    } catch (error) {
      console.error('[PerformanceReporter] 保存队列失败:', error);
    }
  }

  /**
   * 上报指标
   * @param {Object|Array} metrics - 指标数据（单个或数组）
   */
  report(metrics) {
    const metricsArray = Array.isArray(metrics) ? metrics : [metrics];
    
    metricsArray.forEach(metric => {
      // 添加时间戳
      if (!metric.timestamp) {
        metric.timestamp = Date.now();
      }
      
      this.queue.push(metric);
    });

    this.saveQueue();

    // 如果队列达到批量大小，立即刷新
    if (this.queue.length >= this.options.batchSize) {
      this.flush();
    }
  }

  /**
   * 刷新队列（上报数据）
   */
  async flush() {
    if (this.queue.length === 0) {
      return;
    }

    if (!this.isOnline) {
      console.log('[PerformanceReporter] 离线状态，跳过上报');
      return;
    }

    // 取出批量数据
    const batch = this.queue.splice(0, this.options.batchSize);
    this.saveQueue();

    try {
      await this.sendBatch(batch);
      console.log(`[PerformanceReporter] 成功上报 ${batch.length} 条指标`);
    } catch (error) {
      console.error('[PerformanceReporter] 上报失败:', error);
      
      // 重新加入队列（重试）
      this.queue.unshift(...batch);
      this.saveQueue();
      
      // 如果重试次数未超限，稍后重试
      if (batch[0]._retryCount < this.options.maxRetries) {
        batch.forEach(item => {
          item._retryCount = (item._retryCount || 0) + 1;
        });
        setTimeout(() => this.flush(), 1000 * batch[0]._retryCount);
      } else {
        console.warn('[PerformanceReporter] 达到最大重试次数，丢弃指标');
      }
    }
  }

  /**
   * 发送批量数据
   * @param {Array} batch - 批量数据
   */
  async sendBatch(batch) {
    // 获取服务器地址（从当前页面 URL 或配置）
    const serverUrl = this.getServerUrl();
    const url = `${serverUrl}${this.options.endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        metrics: batch,
        timestamp: Date.now(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        url: typeof window !== 'undefined' ? window.location.href : ''
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 获取服务器地址
   * @returns {string} 服务器地址
   */
  getServerUrl() {
    // 优先使用配置的服务器地址
    if (this.options.serverUrl) {
      return this.options.serverUrl;
    }

    // 从当前页面 URL 获取
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      return `${url.protocol}//${url.hostname}:${url.port || (url.protocol === 'https:' ? 443 : 80)}`;
    }

    // 默认值
    return 'http://localhost:3071';
  }

  /**
   * 启动定时刷新
   */
  startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.options.flushInterval);
  }

  /**
   * 停止定时刷新
   */
  stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * 清空队列
   */
  clear() {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * 获取队列长度
   * @returns {number} 队列长度
   */
  getQueueLength() {
    return this.queue.length;
  }
}

// 创建全局单例
let globalReporter = null;

/**
 * 获取全局性能上报器实例
 * @param {Object} options - 选项
 * @returns {PerformanceReporter} 性能上报器实例
 */
export function getGlobalReporter(options = {}) {
  if (!globalReporter) {
    globalReporter = new PerformanceReporter(options);
  }
  return globalReporter;
}

export default PerformanceReporter;


