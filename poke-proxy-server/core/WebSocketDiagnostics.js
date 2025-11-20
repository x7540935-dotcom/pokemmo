/**
 * WebSocket 诊断工具（WebSocketDiagnostics）
 * 
 * 职责：
 * - 检测 WebSocket 消息传输问题，特别是校园网环境下的丢包问题
 * - 统计消息发送和接收的数量和大小
 * - 检测大消息（可能被分片）和异常情况
 * - 记录错误和警告信息
 * 
 * 使用场景：
 * - 在 battle-server.js 和 BattleManager.js 中用于诊断连接问题
 * - 帮助识别网络环境导致的协议丢失问题
 * 
 * 统计信息：
 * - messagesSent/Received: 消息数量
 * - bytesSent/Received: 字节数
 * - errors: 错误列表
 * - warnings: 警告列表
 */
class WebSocketDiagnostics {
  /**
   * 构造函数
   * 
   * @param {WebSocket} ws - WebSocket 连接对象
   * @param {string} [label='WebSocket'] - 诊断标签（用于日志标识）
   */
  constructor(ws, label = 'WebSocket') {
    this.ws = ws;
    this.label = label;
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      errors: [],
      warnings: []
    };
    
    this.setupDiagnostics();
  }
  
  setupDiagnostics() {
    // 拦截 send 方法
    const originalSend = this.ws.send.bind(this.ws);
    this.ws.send = (data) => {
      const dataStr = typeof data === 'string' ? data : data.toString();
      const size = dataStr.length;
      
      this.stats.messagesSent++;
      this.stats.bytesSent += size;
      
      // 检查消息大小
      if (size > 65536) { // 64KB
        const warning = `[${this.label}] 警告: 消息过大 (${size} 字节)，可能被分片`;
        console.warn(warning);
        this.stats.warnings.push({ type: 'large_message', size, timestamp: Date.now() });
      }
      
      // 检查消息内容
      if (dataStr.includes('|poke|')) {
        console.log(`[${this.label}] 发送包含 poke 协议的消息 (${size} 字节)`);
      }
      if (dataStr.includes('|request|')) {
        console.log(`[${this.label}] 发送包含 request 协议的消息 (${size} 字节)`);
      }
      
      // 记录发送
      console.log(`[${this.label}] 发送消息 #${this.stats.messagesSent}: ${size} 字节`);
      if (size > 1000) {
        console.log(`[${this.label}] 消息前500字符:`, dataStr.substring(0, 500));
        console.log(`[${this.label}] 消息后500字符:`, dataStr.substring(dataStr.length - 500));
      }
      
      try {
        const bufferedAmountBefore = this.ws.bufferedAmount || 0;
        const result = originalSend(data);
        const bufferedAmountAfter = this.ws.bufferedAmount || 0;
        
        // 检查 WebSocket 状态
        if (this.ws.readyState !== 1) { // OPEN
          const error = `[${this.label}] 错误: 发送后 WebSocket 状态不是 OPEN (readyState: ${this.ws.readyState})`;
          console.error(error);
          this.stats.errors.push({ type: 'invalid_state_after_send', readyState: this.ws.readyState, timestamp: Date.now() });
        }
        
        // 检查 bufferedAmount（如果可用）
        if (this.ws.bufferedAmount !== undefined) {
          console.log(`[${this.label}] bufferedAmount: 发送前=${bufferedAmountBefore}, 发送后=${bufferedAmountAfter}`);
          
          if (bufferedAmountAfter > 0) {
            // 如果消息较小但bufferedAmount增加，可能是TCP缓冲问题
            if (size < 4096 && bufferedAmountAfter > size) {
              const warning = `[${this.label}] ⚠️ 警告: 小消息 (${size} 字节) 可能被TCP缓冲，bufferedAmount=${bufferedAmountAfter}`;
              console.warn(warning);
              this.stats.warnings.push({ 
                type: 'possible_tcp_buffering', 
                messageSize: size, 
                bufferedAmount: bufferedAmountAfter,
                timestamp: Date.now() 
              });
              
              // 尝试发送ping来强制刷新
              if (this.ws.readyState === 1) {
                try {
                  this.ws.ping();
                  console.log(`[${this.label}] 🔄 发送 ping 尝试刷新TCP缓冲区`);
                } catch (pingError) {
                  // 忽略ping错误
                }
              }
            }
            
            if (bufferedAmountAfter > 65536) {
              const warning = `[${this.label}] 警告: bufferedAmount 过大 (${bufferedAmountAfter} 字节)，可能发送阻塞`;
              console.warn(warning);
              this.stats.warnings.push({ type: 'high_buffered_amount', amount: bufferedAmountAfter, timestamp: Date.now() });
            }
          }
        }
        
        return result;
      } catch (e) {
        const error = `[${this.label}] 发送失败: ${e.message}`;
        console.error(error);
        this.stats.errors.push({ type: 'send_error', error: e.message, timestamp: Date.now() });
        throw e;
      }
    };
    
    // 监听消息事件
    if (this.ws.addEventListener) {
      this.ws.addEventListener('message', (event) => {
        const dataStr = typeof event.data === 'string' ? event.data : event.data.toString();
        const size = dataStr.length;
        
        this.stats.messagesReceived++;
        this.stats.bytesReceived += size;
        
        console.log(`[${this.label}] 收到消息 #${this.stats.messagesReceived}: ${size} 字节`);
        if (size > 1000) {
          console.log(`[${this.label}] 消息前500字符:`, dataStr.substring(0, 500));
          console.log(`[${this.label}] 消息后500字符:`, dataStr.substring(dataStr.length - 500));
        }
      });
      
      this.ws.addEventListener('error', (error) => {
        const errorMsg = `[${this.label}] WebSocket 错误: ${error.message || error}`;
        console.error(errorMsg);
        this.stats.errors.push({ type: 'websocket_error', error: errorMsg, timestamp: Date.now() });
      });
      
      this.ws.addEventListener('close', (event) => {
        console.log(`[${this.label}] WebSocket 关闭: code=${event.code}, reason=${event.reason}, wasClean=${event.wasClean}`);
        if (!event.wasClean) {
          const error = `[${this.label}] WebSocket 异常关闭: code=${event.code}, reason=${event.reason}`;
          console.error(error);
          this.stats.errors.push({ type: 'abnormal_close', code: event.code, reason: event.reason, timestamp: Date.now() });
        }
      });
    }
  }
  
  getStats() {
    return {
      ...this.stats,
      averageMessageSizeSent: this.stats.messagesSent > 0 ? this.stats.bytesSent / this.stats.messagesSent : 0,
      averageMessageSizeReceived: this.stats.messagesReceived > 0 ? this.stats.bytesReceived / this.stats.messagesReceived : 0
    };
  }
  
  generateReport() {
    const stats = this.getStats();
    console.log(`\n[${this.label}] ========== WebSocket 诊断报告 ==========`);
    console.log(`[${this.label}] 发送: ${stats.messagesSent} 条消息, ${stats.bytesSent} 字节 (平均 ${stats.averageMessageSizeSent.toFixed(2)} 字节/条)`);
    console.log(`[${this.label}] 接收: ${stats.messagesReceived} 条消息, ${stats.bytesReceived} 字节 (平均 ${stats.averageMessageSizeReceived.toFixed(2)} 字节/条)`);
    console.log(`[${this.label}] 错误: ${stats.errors.length} 个`);
    console.log(`[${this.label}] 警告: ${stats.warnings.length} 个`);
    
    if (stats.errors.length > 0) {
      console.log(`[${this.label}] 错误详情:`);
      stats.errors.forEach((error, idx) => {
        console.log(`[${this.label}]   ${idx + 1}. [${new Date(error.timestamp).toISOString()}] ${error.type}: ${JSON.stringify(error)}`);
      });
    }
    
    if (stats.warnings.length > 0) {
      console.log(`[${this.label}] 警告详情:`);
      stats.warnings.forEach((warning, idx) => {
        console.log(`[${this.label}]   ${idx + 1}. [${new Date(warning.timestamp).toISOString()}] ${warning.type}: ${JSON.stringify(warning)}`);
      });
    }
    
    console.log(`[${this.label}] ============================================\n`);
  }
}

module.exports = WebSocketDiagnostics;

