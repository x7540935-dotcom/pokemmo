/**
 * WebSocket 指标收集器（WebSocketMetrics）
 * 
 * 职责：
 * - 包装 PrometheusMetrics，提供 WebSocket 特定的指标收集接口
 * - 自动跟踪连接生命周期
 * - 自动跟踪消息和错误
 * 
 * 使用方式：
 * ```js
 * const wsMetrics = require('./adapters/metrics/WebSocketMetrics');
 * const tracker = wsMetrics.createTracker(ws, 'ai');
 * // 连接建立时
 * tracker.onConnect();
 * // 发送消息时
 * tracker.onSendMessage(data);
 * // 接收消息时
 * tracker.onReceiveMessage(data);
 * // 发生错误时
 * tracker.onError('connection', error);
 * // 连接关闭时
 * tracker.onClose();
 * ```
 */

const { getGlobalMetrics } = require('./PrometheusMetrics');

class WebSocketTracker {
  /**
   * 构造函数
   * @param {WebSocket} ws - WebSocket 连接对象
   * @param {string} type - 连接类型（'ai' | 'pvp'）
   */
  constructor(ws, type) {
    this.ws = ws;
    this.type = type || 'unknown';
    this.metrics = getGlobalMetrics();
    this.connectedAt = null;
    this.messageCount = { send: 0, receive: 0 };
    this.byteCount = { send: 0, receive: 0 };
  }

  /**
   * 连接建立时调用
   */
  onConnect() {
    this.connectedAt = Date.now();
    this.metrics.incrementConnection(this.type);
  }

  /**
   * 发送消息时调用
   * @param {string|Buffer} data - 消息数据
   */
  onSendMessage(data) {
    const bytes = typeof data === 'string' ? Buffer.byteLength(data, 'utf8') : data.length;
    this.messageCount.send++;
    this.byteCount.send += bytes;
    this.metrics.recordMessage('send', this.type, bytes);
  }

  /**
   * 接收消息时调用
   * @param {string|Buffer} data - 消息数据
   */
  onReceiveMessage(data) {
    const bytes = typeof data === 'string' ? Buffer.byteLength(data, 'utf8') : data.length;
    this.messageCount.receive++;
    this.byteCount.receive += bytes;
    this.metrics.recordMessage('receive', this.type, bytes);
  }

  /**
   * 发生错误时调用
   * @param {string} errorType - 错误类型（'connection' | 'message' | 'protocol'）
   * @param {Error} error - 错误对象
   */
  onError(errorType, error) {
    this.metrics.recordError(this.type, errorType);
  }

  /**
   * 连接关闭时调用
   */
  onClose() {
    this.metrics.decrementConnection(this.type);
    
    // 如果连接持续时间超过 1 秒，记录对战持续时间
    if (this.connectedAt) {
      const duration = (Date.now() - this.connectedAt) / 1000;
      if (duration > 1) {
        this.metrics.recordBattleDuration(this.type, duration);
      }
    }
  }

  /**
   * 记录协议处理时间
   * @param {string} protocolType - 协议类型
   * @param {number} startTime - 开始时间（毫秒）
   */
  recordProtocolProcessing(protocolType, startTime) {
    const processingTime = (Date.now() - startTime) / 1000;
    this.metrics.recordProtocolProcessing(protocolType, processingTime);
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      type: this.type,
      connectedAt: this.connectedAt,
      duration: this.connectedAt ? (Date.now() - this.connectedAt) / 1000 : 0,
      messageCount: { ...this.messageCount },
      byteCount: { ...this.byteCount }
    };
  }
}

/**
 * 创建 WebSocket 跟踪器
 * @param {WebSocket} ws - WebSocket 连接对象
 * @param {string} type - 连接类型（'ai' | 'pvp'）
 * @returns {WebSocketTracker} 跟踪器实例
 */
function createTracker(ws, type) {
  return new WebSocketTracker(ws, type);
}

/**
 * 自动包装 WebSocket，添加指标收集
 * @param {WebSocket} ws - WebSocket 连接对象
 * @param {string} type - 连接类型
 * @returns {WebSocketTracker} 跟踪器实例
 */
function wrapWebSocket(ws, type) {
  const tracker = createTracker(ws, type);
  
  // 拦截 send 方法
  const originalSend = ws.send.bind(ws);
  ws.send = function(data) {
    tracker.onSendMessage(data);
    return originalSend(data);
  };
  
  // 监听消息
  ws.addEventListener('message', (event) => {
    tracker.onReceiveMessage(event.data);
  });
  
  // 监听错误
  ws.addEventListener('error', (error) => {
    tracker.onError('connection', error);
  });
  
  // 监听关闭
  ws.addEventListener('close', () => {
    tracker.onClose();
  });
  
  // 连接建立
  if (ws.readyState === 1) { // OPEN
    tracker.onConnect();
  } else {
    ws.addEventListener('open', () => {
      tracker.onConnect();
    });
  }
  
  return tracker;
}

module.exports = {
  WebSocketTracker,
  createTracker,
  wrapWebSocket
};

