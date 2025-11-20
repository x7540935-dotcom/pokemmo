/**
 * Web Vitals 报告器（WebVitalsReporter）
 * 
 * 职责：
 * - 封装 Web Vitals 指标收集
 * - 提供简化的 API
 * - 自动上报到性能上报器
 * 
 * 使用方式：
 * ```js
 * import { WebVitalsReporter } from './utils/WebVitalsReporter';
 * const reporter = new WebVitalsReporter();
 * reporter.start();
 * ```
 */

import { onCLS, onFID, onFCP, onLCP, onTTFB } from './web-vitals-shim.js';
import { getGlobalReporter } from './PerformanceReporter.js';

class WebVitalsReporter {
  /**
   * 构造函数
   * @param {Object} options - 选项
   * @param {boolean} options.autoReport - 是否自动上报（默认 true）
   * @param {Function} options.onMetric - 指标回调函数
   */
  constructor(options = {}) {
    this.options = {
      autoReport: options.autoReport !== false,
      onMetric: options.onMetric || null,
      ...options
    };

    this.metrics = {};
    this.isStarted = false;
  }

  /**
   * 开始监控
   */
  start() {
    if (this.isStarted) {
      console.warn('[WebVitalsReporter] 监控已启动');
      return;
    }

    this.isStarted = true;

    // 监控所有 Web Vitals 指标
    try {
      onLCP((metric) => this.handleMetric('lcp', metric));
      onFID((metric) => this.handleMetric('fid', metric));
      onCLS((metric) => this.handleMetric('cls', metric));
      onFCP((metric) => this.handleMetric('fcp', metric));
      onTTFB((metric) => this.handleMetric('ttfb', metric));

      console.log('[WebVitalsReporter] Web Vitals 监控已启动');
    } catch (error) {
      console.error('[WebVitalsReporter] 启动监控失败:', error);
    }
  }

  /**
   * 处理指标
   * @param {string} name - 指标名称
   * @param {Object} metric - 指标数据
   */
  handleMetric(name, metric) {
    const metricData = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
      delta: metric.delta,
      id: metric.id,
      timestamp: Date.now(),
      type: 'web-vital'
    };

    this.metrics[name] = metricData;

    // 调用回调函数
    if (this.options.onMetric) {
      this.options.onMetric(name, metricData);
    }

    // 自动上报
    if (this.options.autoReport) {
      const reporter = getGlobalReporter();
      reporter.report(metricData);
    }

    // 输出到控制台（开发环境）
    if (process.env.NODE_ENV !== 'production') {
      const unit = metric.name === 'CLS' ? '' : 'ms';
      console.log(`[WebVitalsReporter] ${metric.name}:`, {
        value: metric.value,
        rating: metric.rating,
        unit
      });
    }
  }

  /**
   * 获取所有指标
   * @returns {Object} 指标数据
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * 重置所有指标
   */
  reset() {
    this.metrics = {};
  }
}

// 创建全局单例
let globalVitalsReporter = null;

/**
 * 获取全局 Web Vitals 报告器实例
 * @param {Object} options - 选项
 * @returns {WebVitalsReporter} Web Vitals 报告器实例
 */
export function getGlobalVitalsReporter(options = {}) {
  if (!globalVitalsReporter) {
    globalVitalsReporter = new WebVitalsReporter(options);
  }
  return globalVitalsReporter;
}

export default WebVitalsReporter;


