/**
 * 性能监控器（PerformanceMonitor）
 * 
 * 职责：
 * - 监控 Web Vitals 指标（LCP、FID、CLS、FCP、TTFB）
 * - 监控自定义性能指标（WebSocket 连接时间、协议处理时间等）
 * - 提供性能数据收集和上报接口
 * 
 * 使用方式：
 * ```js
 * import { PerformanceMonitor } from './utils/PerformanceMonitor';
 * const monitor = new PerformanceMonitor();
 * monitor.start();
 * monitor.recordCustomMetric('battle_engine_connect_time', 150);
 * ```
 */

import { onCLS, onFID, onFCP, onLCP, onTTFB } from './web-vitals-shim.js';

class PerformanceMonitor {
  /**
   * 构造函数
   * @param {Object} options - 选项
   * @param {Function} options.onMetric - 指标回调函数
   * @param {boolean} options.autoStart - 是否自动开始监控（默认 true）
   */
  constructor(options = {}) {
    this.options = {
      onMetric: options.onMetric || null,
      autoStart: options.autoStart !== false,
      ...options
    };
    
    this.metrics = {
      // Web Vitals
      lcp: null,
      fid: null,
      cls: null,
      fcp: null,
      ttfb: null,
      
      // 自定义指标
      custom: {}
    };
    
    this.isStarted = false;
    this.startTime = null;
  }

  /**
   * 开始监控
   */
  start() {
    if (this.isStarted) {
      console.warn('[PerformanceMonitor] 监控已启动');
      return;
    }

    this.startTime = performance.now();
    this.isStarted = true;

    // 监控 Web Vitals
    try {
      onLCP((metric) => this.handleMetric('lcp', metric));
      onFID((metric) => this.handleMetric('fid', metric));
      onCLS((metric) => this.handleMetric('cls', metric));
      onFCP((metric) => this.handleMetric('fcp', metric));
      onTTFB((metric) => this.handleMetric('ttfb', metric));
      
      console.log('[PerformanceMonitor] Web Vitals 监控已启动');
    } catch (error) {
      console.error('[PerformanceMonitor] 启动 Web Vitals 监控失败:', error);
    }
  }

  /**
   * 处理指标
   * @param {string} name - 指标名称
   * @param {Object} metric - 指标数据
   */
  handleMetric(name, metric) {
    this.metrics[name] = {
      value: metric.value,
      rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
      delta: metric.delta,
      id: metric.id,
      entries: metric.entries,
      timestamp: Date.now()
    };

    // 调用回调函数
    if (this.options.onMetric) {
      this.options.onMetric(name, this.metrics[name]);
    }

    // 输出到控制台（开发环境）
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PerformanceMonitor] ${name.toUpperCase()}:`, {
        value: metric.value,
        rating: metric.rating,
        unit: metric.name === 'CLS' ? '' : 'ms'
      });
    }
  }

  /**
   * 记录自定义指标
   * @param {string} name - 指标名称
   * @param {number} value - 指标值
   * @param {Object} metadata - 附加元数据
   */
  recordCustomMetric(name, value, metadata = {}) {
    if (!this.metrics.custom[name]) {
      this.metrics.custom[name] = [];
    }

    const metric = {
      value,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.custom[name].push(metric);

    // 调用回调函数
    if (this.options.onMetric) {
      this.options.onMetric(`custom.${name}`, metric);
    }

    // 输出到控制台（开发环境）
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PerformanceMonitor] 自定义指标 ${name}:`, value, metadata);
    }
  }

  /**
   * 记录 WebSocket 连接时间
   * @param {number} connectTime - 连接时间（毫秒）
   */
  recordWebSocketConnectTime(connectTime) {
    this.recordCustomMetric('battle_engine_connect_time', connectTime, {
      type: 'websocket',
      unit: 'ms'
    });
  }

  /**
   * 记录首次协议接收时间
   * @param {number} protocolTime - 协议接收时间（毫秒）
   */
  recordFirstProtocolTime(protocolTime) {
    this.recordCustomMetric('battle_engine_first_protocol_time', protocolTime, {
      type: 'protocol',
      unit: 'ms'
    });
  }

  /**
   * 记录 UI 渲染时间
   * @param {string} component - 组件名称
   * @param {number} renderTime - 渲染时间（毫秒）
   */
  recordUIRenderTime(component, renderTime) {
    this.recordCustomMetric('battle_ui_render_time', renderTime, {
      component,
      unit: 'ms'
    });
  }

  /**
   * 记录贴图加载时间
   * @param {string} spriteName - 贴图名称
   * @param {number} loadTime - 加载时间（毫秒）
   */
  recordSpriteLoadTime(spriteName, loadTime) {
    this.recordCustomMetric('battle_sprite_load_time', loadTime, {
      sprite: spriteName,
      unit: 'ms'
    });
  }

  /**
   * 记录阶段转换时间
   * @param {string} fromPhase - 源阶段
   * @param {string} toPhase - 目标阶段
   * @param {number} transitionTime - 转换时间（毫秒）
   */
  recordPhaseTransitionTime(fromPhase, toPhase, transitionTime) {
    this.recordCustomMetric('battle_phase_transition_time', transitionTime, {
      from: fromPhase,
      to: toPhase,
      unit: 'ms'
    });
  }

  /**
   * 获取所有指标
   * @returns {Object} 指标数据
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: this.startTime ? performance.now() - this.startTime : 0
    };
  }

  /**
   * 获取 Web Vitals 指标
   * @returns {Object} Web Vitals 指标
   */
  getWebVitals() {
    return {
      lcp: this.metrics.lcp,
      fid: this.metrics.fid,
      cls: this.metrics.cls,
      fcp: this.metrics.fcp,
      ttfb: this.metrics.ttfb
    };
  }

  /**
   * 获取自定义指标
   * @returns {Object} 自定义指标
   */
  getCustomMetrics() {
    return this.metrics.custom;
  }

  /**
   * 重置所有指标
   */
  reset() {
    this.metrics = {
      lcp: null,
      fid: null,
      cls: null,
      fcp: null,
      ttfb: null,
      custom: {}
    };
    this.startTime = performance.now();
  }
}

// 创建全局单例
let globalMonitor = null;

/**
 * 获取全局性能监控器实例
 * @param {Object} options - 选项
 * @returns {PerformanceMonitor} 性能监控器实例
 */
export function getGlobalMonitor(options = {}) {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor(options);
    if (globalMonitor.options.autoStart) {
      globalMonitor.start();
    }
  }
  return globalMonitor;
}

export default PerformanceMonitor;


