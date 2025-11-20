/**
 * Prometheus 指标收集器（PrometheusMetrics）
 * 
 * 职责：
 * - 初始化 Prometheus 客户端
 * - 创建和管理各种类型的指标（Counter、Gauge、Histogram、Summary）
 * - 提供指标注册表
 * 
 * 使用方式：
 * ```js
 * const metrics = require('./adapters/metrics/PrometheusMetrics');
 * metrics.incrementCounter('websocket_connections_total', { type: 'ai' });
 * metrics.setGauge('websocket_connections_active', 5, { type: 'ai' });
 * ```
 */

const { Registry, Counter, Gauge, Histogram, Summary } = require('prom-client');

class PrometheusMetrics {
  /**
   * 构造函数
   */
  constructor() {
    this.registry = new Registry();
    
    // 设置默认标签（应用名称、版本等）
    this.registry.setDefaultLabels({
      app: 'pokemmo-battle-server',
      version: process.env.npm_package_version || '1.0.0'
    });

    // 初始化指标
    this.initializeMetrics();
  }

  /**
   * 初始化所有指标
   */
  initializeMetrics() {
    // WebSocket 连接指标
    this.websocketConnectionsTotal = new Counter({
      name: 'websocket_connections_total',
      help: 'WebSocket 连接总数',
      labelNames: ['type'], // type: 'ai' | 'pvp'
      registers: [this.registry]
    });

    this.websocketConnectionsActive = new Gauge({
      name: 'websocket_connections_active',
      help: '当前活跃的 WebSocket 连接数',
      labelNames: ['type'],
      registers: [this.registry]
    });

    // WebSocket 消息指标
    this.websocketMessagesTotal = new Counter({
      name: 'websocket_messages_total',
      help: 'WebSocket 消息总数',
      labelNames: ['direction', 'type'], // direction: 'send' | 'receive', type: 'ai' | 'pvp'
      registers: [this.registry]
    });

    this.websocketMessagesBytes = new Counter({
      name: 'websocket_messages_bytes',
      help: 'WebSocket 消息总字节数',
      labelNames: ['direction', 'type'],
      registers: [this.registry]
    });

    // WebSocket 错误指标
    this.websocketErrorsTotal = new Counter({
      name: 'websocket_errors_total',
      help: 'WebSocket 错误总数',
      labelNames: ['type', 'error_type'], // error_type: 'connection' | 'message' | 'protocol'
      registers: [this.registry]
    });

    // 对战持续时间指标
    this.websocketBattleDuration = new Histogram({
      name: 'websocket_battle_duration_seconds',
      help: '对战持续时间（秒）',
      labelNames: ['type'],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600], // 1秒到10分钟
      registers: [this.registry]
    });

    // 协议处理时间指标
    this.websocketProtocolProcessing = new Summary({
      name: 'websocket_protocol_processing_seconds',
      help: '协议处理时间（秒）',
      labelNames: ['protocol_type'], // protocol_type: 'request' | 'teampreview' | 'switch' | 'move' | 'other'
      registers: [this.registry]
    });

    // 服务器指标
    this.serverUptime = new Gauge({
      name: 'server_uptime_seconds',
      help: '服务器运行时间（秒）',
      registers: [this.registry]
    });

    this.serverMemoryUsage = new Gauge({
      name: 'server_memory_usage_bytes',
      help: '服务器内存使用量（字节）',
      labelNames: ['type'], // type: 'heapUsed' | 'heapTotal' | 'rss' | 'external'
      registers: [this.registry]
    });
  }

  /**
   * 增加连接计数
   * @param {string} type - 连接类型（'ai' | 'pvp'）
   */
  incrementConnection(type = 'unknown') {
    this.websocketConnectionsTotal.inc({ type });
    this.websocketConnectionsActive.inc({ type });
  }

  /**
   * 减少连接计数
   * @param {string} type - 连接类型
   */
  decrementConnection(type = 'unknown') {
    this.websocketConnectionsActive.dec({ type });
  }

  /**
   * 记录消息
   * @param {string} direction - 方向（'send' | 'receive'）
   * @param {string} type - 连接类型
   * @param {number} bytes - 消息字节数
   */
  recordMessage(direction, type, bytes = 0) {
    this.websocketMessagesTotal.inc({ direction, type });
    if (bytes > 0) {
      this.websocketMessagesBytes.inc({ direction, type }, bytes);
    }
  }

  /**
   * 记录错误
   * @param {string} type - 连接类型
   * @param {string} errorType - 错误类型（'connection' | 'message' | 'protocol'）
   */
  recordError(type, errorType = 'unknown') {
    this.websocketErrorsTotal.inc({ type, error_type: errorType });
  }

  /**
   * 记录对战持续时间
   * @param {string} type - 连接类型
   * @param {number} durationSeconds - 持续时间（秒）
   */
  recordBattleDuration(type, durationSeconds) {
    this.websocketBattleDuration.observe({ type }, durationSeconds);
  }

  /**
   * 记录协议处理时间
   * @param {string} protocolType - 协议类型
   * @param {number} processingSeconds - 处理时间（秒）
   */
  recordProtocolProcessing(protocolType, processingSeconds) {
    this.websocketProtocolProcessing.observe({ protocol_type: protocolType }, processingSeconds);
  }

  /**
   * 更新服务器指标
   */
  updateServerMetrics() {
    const uptime = process.uptime();
    this.serverUptime.set(uptime);

    const memUsage = process.memoryUsage();
    this.serverMemoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
    this.serverMemoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
    this.serverMemoryUsage.set({ type: 'rss' }, memUsage.rss);
    this.serverMemoryUsage.set({ type: 'external' }, memUsage.external);
  }

  /**
   * 获取指标注册表
   * @returns {Registry} Prometheus 注册表
   */
  getRegistry() {
    return this.registry;
  }

  /**
   * 获取指标内容（用于 /metrics 端点）
   * @returns {Promise<string>} 指标内容
   */
  async getMetrics() {
    // 更新服务器指标
    this.updateServerMetrics();
    
    return this.registry.metrics();
  }

  /**
   * 重置所有指标（用于测试）
   */
  reset() {
    this.registry.resetMetrics();
    this.initializeMetrics();
  }
}

// 创建全局单例
let globalMetrics = null;

/**
 * 获取全局指标实例
 * @returns {PrometheusMetrics} 指标实例
 */
function getGlobalMetrics() {
  if (!globalMetrics) {
    globalMetrics = new PrometheusMetrics();
  }
  return globalMetrics;
}

module.exports = {
  PrometheusMetrics,
  getGlobalMetrics
};

