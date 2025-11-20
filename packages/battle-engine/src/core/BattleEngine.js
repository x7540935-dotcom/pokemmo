/**
 * 对战引擎（BattleEngine）
 * 
 * 职责：
 * - 封装 WebSocket 连接，管理与对战服务器的通信
 * - 处理消息的发送和接收
 * - 支持连接状态管理和事件回调
 * - 处理协议消息的监控和日志记录
 * 
 * 使用场景：
 * - AI对战：连接到服务器，发送队伍数据，接收对战协议
 * - PvP对战：连接到服务器，发送队伍和选择命令，接收对战协议
 * 
 * 消息格式：
 * - 发送：JSON格式 { type: 'start'|'choose', payload/command: ... }
 * - 接收：Pokemon Showdown 协议格式（以 | 开头）或 JSON 控制消息
 */
class BattleEngine {
  /**
   * 构造函数
   * 初始化 WebSocket 连接相关的状态和回调数组
   */
  constructor() {
    this.ws = null;                    // WebSocket 连接对象
    this.url = null;                    // WebSocket 服务器地址
    this.onMessageCallbacks = [];      // 消息接收回调函数数组
    this.onErrorCallbacks = [];        // 错误处理回调函数数组
    this.onCloseCallbacks = [];        // 连接关闭回调函数数组
    this.onReconnectCallbacks = [];    // 重连成功回调函数数组
    this.isConnected = false;          // 连接状态标志
    this._firstProtocolReceived = false; // 是否已收到首次协议
    this._firstProtocolTime = null;     // 首次协议接收时间
  }

  /**
   * 连接到对战服务器
   * 
   * 功能：
   * - 建立 WebSocket 连接到对战服务器
   * - 支持多种服务器地址获取方式（优先级从高到低）：
   *   1. 传入的 url 参数
   *   2. URL 查询参数 ?server=ws://your-server:3071
   *   3. 当前域名（如果通过 HTTP 服务器访问）
   *   4. 默认 localhost:3071（本地开发）
   * - 设置连接事件监听器（open, message, error, close）
   * - 记录详细的连接日志用于调试
   * 
   * @param {string} [url] - 可选的 WebSocket 服务器地址
   * @returns {Promise<void>} - 连接成功时 resolve，失败时 reject
   * 
   * 事件：
   * - open: 连接成功建立
   * - message: 收到服务器消息（协议或 JSON 控制消息）
   * - error: 连接错误
   * - close: 连接关闭
   */
  connect(url) {
    // 优先级：1. 传入参数 2. URL 参数 3. 环境变量（如果通过 HTTP 访问）4. 默认值
    if (url) {
      this.url = url;
    } else {
      // 从 URL 参数读取服务器地址
      const urlParams = new URLSearchParams(window.location.search);
      const serverParam = urlParams.get('server');
      
      if (serverParam) {
        // 如果 URL 参数包含完整地址，直接使用
        this.url = serverParam.startsWith('ws://') || serverParam.startsWith('wss://') 
          ? serverParam 
          : `ws://${serverParam}/battle`;
      } else if (location.hostname && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        // 如果通过 HTTP 服务器访问，使用当前域名
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.url = `${protocol}//${location.hostname}:3071/battle`;
      } else {
        // 默认使用 localhost（本地开发）
        this.url = `ws://localhost:3071/battle`;
      }
    }
    
    return new Promise((resolve, reject) => {
      try {
        console.log('[WebSocket Monitor] ========== 前端：创建 WebSocket 连接 ==========');
        console.log('[WebSocket Monitor] URL:', this.url);
        console.log('[WebSocket Monitor] 时间:', new Date().toISOString());
        console.log('[WebSocket Monitor] 调用栈:', new Error().stack.split('\n').slice(1, 6).join('\n'));
        
        this.ws = new WebSocket(this.url);
        this._connectionStartTime = Date.now();
        this._connectionId = `frontend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('[WebSocket Monitor] 连接ID:', this._connectionId);
        console.log('[WebSocket Monitor] WebSocket 对象已创建');
        
        this.ws.addEventListener('open', () => {
          const elapsed = Date.now() - this._connectionStartTime;
          console.log('[WebSocket Monitor] ========== 前端：WebSocket 连接已打开 ==========');
          console.log('[WebSocket Monitor] 连接ID:', this._connectionId);
          console.log('[WebSocket Monitor] 时间:', new Date().toISOString());
          console.log('[WebSocket Monitor] 连接耗时:', elapsed, 'ms');
          console.log('[WebSocket Monitor] WebSocket URL:', this.url);
          console.log('[WebSocket Monitor] WebSocket readyState:', this.ws.readyState);
          console.log('[WebSocket Monitor] WebSocket protocol:', this.ws.protocol);
          console.log('[WebSocket Monitor] 调用栈:', new Error().stack.split('\n').slice(1, 6).join('\n'));
          
          console.log('[BattleEngine] 已连接到对战服务器');
          console.log('[BattleEngine] WebSocket URL:', this.url);
          console.log('[BattleEngine] WebSocket readyState:', this.ws.readyState);
          console.log('[BattleEngine] WebSocket protocol:', this.ws.protocol);
          this.isConnected = true;
          
          // 记录 WebSocket 连接时间
          import('../utils/PerformanceMonitor.js')
            .then(({ getGlobalMonitor }) => {
              try {
                const monitor = getGlobalMonitor();
                monitor.recordWebSocketConnectTime(elapsed);
              } catch (error) {
                console.warn('[BattleEngine] 性能监控记录失败', error);
              }
            })
            .catch(() => {
              // 性能监控模块加载失败不影响主流程
            });
          
          resolve();
        });

        this.ws.addEventListener('message', (event) => {
          // 立即记录原始事件，避免数据丢失
          console.log(`[BattleEngine] ========== WebSocket message 事件触发 ==========`);
          console.log(`[BattleEngine] 事件类型: ${event.type}`);
          console.log(`[BattleEngine] 事件数据类型: ${typeof event.data}`);
          console.log(`[BattleEngine] event.data instanceof ArrayBuffer: ${event.data instanceof ArrayBuffer}`);
          console.log(`[BattleEngine] event.data instanceof Blob: ${event.data instanceof Blob}`);
          console.log(`[BattleEngine] event.data.constructor.name: ${event.data.constructor.name}`);
          
          // 处理不同的数据类型
          let dataStr;
          if (typeof event.data === 'string') {
            dataStr = event.data;
            console.log(`[BattleEngine] 数据是字符串类型，长度: ${dataStr.length}`);
          } else if (event.data instanceof ArrayBuffer) {
            console.log(`[BattleEngine] 数据是 ArrayBuffer，长度: ${event.data.byteLength}`);
            dataStr = new TextDecoder('utf-8').decode(event.data);
            console.log(`[BattleEngine] ArrayBuffer 解码后字符串长度: ${dataStr.length}`);
          } else if (event.data instanceof Blob) {
            console.log(`[BattleEngine] 数据是 Blob，大小: ${event.data.size}`);
            // 对于 Blob，我们需要异步读取
            event.data.text().then(text => {
              console.log(`[BattleEngine] Blob 读取完成，文本长度: ${text.length}`);
              this.processMessage(text, event.data.size);
            }).catch(err => {
              console.error(`[BattleEngine] Blob 读取失败:`, err);
            });
            return; // 异步处理，直接返回
          } else {
            // 尝试转换为字符串
            try {
              dataStr = event.data.toString();
              console.log(`[BattleEngine] 数据转换为字符串，长度: ${dataStr.length}`);
            } catch (e) {
              console.error(`[BattleEngine] 无法转换数据为字符串:`, e);
              console.error(`[BattleEngine] 数据类型:`, typeof event.data);
              console.error(`[BattleEngine] 数据值:`, event.data);
              return;
            }
          }
          
          // 处理消息
          this.processMessage(dataStr, event.data instanceof Blob ? event.data.size : new Blob([dataStr]).size);
        });
        
        // 添加 message 事件监听器的错误处理
        this.ws.addEventListener('error', (error) => {
          console.error('[BattleEngine] ========== WebSocket message 事件错误 ==========');
          console.error('[BattleEngine] 错误对象:', error);
        });

        this.ws.addEventListener('error', (error) => {
          console.error('[BattleEngine] ========== WebSocket 错误 ==========');
          console.error('[BattleEngine] 错误对象:', error);
          console.error('[BattleEngine] WebSocket readyState:', this.ws?.readyState);
          console.error('[BattleEngine] WebSocket URL:', this.url);
          console.error('[BattleEngine] 错误时间:', new Date().toISOString());
          this.isConnected = false;
          this.onErrorCallbacks.forEach(cb => cb(error));
        });

        this.ws.addEventListener('close', (event) => {
          const connectionDuration = this._connectionStartTime ? Date.now() - this._connectionStartTime : 0;
          console.log('[WebSocket Monitor] ========== 前端：WebSocket 连接已关闭 ==========');
          console.log('[WebSocket Monitor] 连接ID:', this._connectionId);
          console.log('[WebSocket Monitor] 时间:', new Date().toISOString());
          console.log('[WebSocket Monitor] 连接持续时间:', connectionDuration, 'ms');
          console.log('[WebSocket Monitor] 关闭代码:', event.code);
          console.log('[WebSocket Monitor] 关闭原因:', event.reason || '(无)');
          console.log('[WebSocket Monitor] 是否正常关闭:', event.wasClean);
          console.log('[WebSocket Monitor] WebSocket readyState:', this.ws?.readyState);
          console.log('[WebSocket Monitor] 调用栈:', new Error().stack.split('\n').slice(1, 10).join('\n'));
          
          // 分析关闭原因
          if (event.code === 1000) {
            console.log('[WebSocket Monitor] 关闭类型: 正常关闭 (1000)');
          } else if (event.code === 1001) {
            console.log('[WebSocket Monitor] 关闭类型: 端点离开 (1001)');
          } else if (event.code === 1005) {
            console.log('[WebSocket Monitor] 关闭类型: 无状态码 (1005) - 可能是异常关闭');
          } else if (event.code === 1006) {
            console.log('[WebSocket Monitor] 关闭类型: 异常关闭 (1006) - 连接异常断开');
          } else {
            console.log('[WebSocket Monitor] 关闭类型: 其他 (', event.code, ')');
          }
          
          if (!event.wasClean) {
            console.error('[WebSocket Monitor] ⚠️⚠️⚠️ WebSocket 异常关闭！');
            console.error('[WebSocket Monitor] 这可能意味着：');
            console.error('[WebSocket Monitor] 1. 网络连接中断');
            console.error('[WebSocket Monitor] 2. 服务器主动关闭连接');
            console.error('[WebSocket Monitor] 3. 中间代理/防火墙拦截');
            console.error('[WebSocket Monitor] 4. WebSocket 协议错误');
          }
          
          console.log('[BattleEngine] ========== WebSocket 连接已关闭 ==========');
          console.log('[BattleEngine] 关闭代码:', event.code);
          console.log('[BattleEngine] 关闭原因:', event.reason);
          console.log('[BattleEngine] 是否正常关闭:', event.wasClean);
          console.log('[BattleEngine] WebSocket readyState:', this.ws?.readyState);
          
          this.isConnected = false;
          this.onCloseCallbacks.forEach(cb => cb());
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * 处理收到的消息（统一处理逻辑）
   * 
   * 功能：
   * - 处理从 WebSocket 接收到的消息
   * - 区分 JSON 控制消息和 Pokemon Showdown 协议消息
   * - 记录协议日志到 window.protocolLogs（用于调试）
   * - 检测关键协议（request, teampreview, switch, poke, start, win, faint）
   * - 触发重连成功回调（如果收到 battle-reconnected 消息）
   * 
   * @param {string} dataStr - 消息字符串内容
   * @param {number} messageSize - 消息大小（字节）
   * 
   * 消息类型：
   * - JSON 控制消息：{ type: 'battle-reconnected', payload: ... }
   * - 协议消息：以 | 开头的 Pokemon Showdown 协议格式
   */
  processMessage(dataStr, messageSize) {
    console.log(`[BattleEngine] ========== 处理服务器消息 ==========`);
    console.log(`[BattleEngine] 字符串长度: ${dataStr.length} 字符`);
    console.log(`[BattleEngine] 消息大小: ${messageSize} 字节`);
    console.log(`[BattleEngine] WebSocket readyState: ${this.ws.readyState}`);
    
    // 检查消息是否完整
    if (dataStr.length === 0) {
      console.warn(`[BattleEngine] ⚠️ 警告: 收到空消息`);
      return;
    }
    
    const trimmedData = dataStr.trim();
    
    // 记录首次协议接收时间
    if (!this._firstProtocolReceived && trimmedData.startsWith('|')) {
      this._firstProtocolReceived = true;
      this._firstProtocolTime = Date.now() - this._connectionStartTime;
      
      // 记录性能指标
      try {
        import('../utils/PerformanceMonitor.js').then(({ getGlobalMonitor }) => {
          const monitor = getGlobalMonitor();
          monitor.recordFirstProtocolTime(this._firstProtocolTime);
        }).catch(() => {
          // 忽略错误
        });
      } catch (error) {
        // 忽略错误
      }
    }
    
    // 检查是否是JSON消息（控制消息，如 battle-reconnected）
    // 注意：需要检查是否是完整的JSON消息，而不是包含JSON的协议消息
    if (trimmedData.startsWith('{') && trimmedData.endsWith('}')) {
      try {
        const jsonMsg = JSON.parse(dataStr);
        if (jsonMsg.type === 'battle-reconnected') {
          console.log(`[BattleEngine] ✅ 收到重连成功消息:`, jsonMsg);
          // 触发重连成功回调
          this.onReconnectCallbacks.forEach(cb => cb(jsonMsg.payload));
          // 同时也触发 onMessage 回调，让上层可以处理
          this.handleMessage(dataStr);
          return; // JSON消息不继续处理为协议
        }
        // 其他JSON消息（如 room-created, room-joined 等）需要传递给 onMessage 回调
        console.log(`[BattleEngine] 收到JSON消息:`, jsonMsg.type);
        // 继续调用 handleMessage，让 onMessage 回调能够处理
        this.handleMessage(dataStr);
        return; // JSON消息不继续处理为协议
      } catch (e) {
        // 不是有效的JSON，继续处理为协议
        console.log(`[BattleEngine] 不是有效的JSON消息，继续处理为协议`);
      }
    }
    
    // 检查是否是协议消息（以 | 开头）
    // 注意：协议消息可能包含多行，需要逐行处理
    if (dataStr.includes('|')) {
      // 这是协议消息，需要记录到协议监控
      if (window.protocolLogs) {
        const timestamp = Date.now() - (window.protocolStartTime || Date.now());
        const log = {
          timestamp,
          direction: 'receive',
          data: dataStr.substring(0, 500),
          metadata: { length: dataStr.length }
        };
        window.protocolLogs.push(log);
        
        // 实时输出关键协议
        const keyProtocols = ['request', 'teampreview', 'switch', 'poke', 'start', 'win', 'faint'];
        const hasKeyProtocol = keyProtocols.some(proto => dataStr.includes(`|${proto}|`));
        if (hasKeyProtocol) {
          const protocolName = keyProtocols.find(proto => dataStr.includes(`|${proto}|`)) || 'unknown';
          console.log(`[Protocol-Frontend] [${timestamp}ms] RECEIVE ${protocolName}: ${dataStr.substring(0, 200)}`);
        }
      }
    }
    
    // 检查关键协议（支持两种格式：|protocol| 和 |protocol）
    const hasRequest = dataStr.includes('|request|') || /\|request(\||\s|\n|$)/.test(dataStr);
    const hasTeamPreview = dataStr.includes('|teampreview|') || /\|teampreview(\||\s|\n|$)/.test(dataStr);
    const hasPoke = dataStr.includes('|poke|') || /\|poke(\||\s|\n|$)/.test(dataStr);
    const hasSwitch = dataStr.includes('|switch|') || /\|switch(\||\s|\n|$)/.test(dataStr);
    const hasStart = dataStr.includes('|start|') || /\|start(\||\s|\n|$)/.test(dataStr);
    const hasTime = dataStr.includes('|t:|') || /\|t:(\||\s|\n|$)/.test(dataStr);
    const hasStatus = dataStr.includes('|status|') || /\|status(\||\s|\n|$)/.test(dataStr);
    
    console.log(`[BattleEngine] 协议检查: request=${hasRequest}, teampreview=${hasTeamPreview}, poke=${hasPoke}, switch=${hasSwitch}, start=${hasStart}, time=${hasTime}, status=${hasStatus}`);
    
    // 统计协议行数
    const lines = dataStr.split('\n').filter(line => line.trim());
    console.log(`[BattleEngine] 消息行数: ${lines.length} (过滤空行后)`);
    
    // 显示消息内容（限制长度）
    if (dataStr.length > 2000) {
      console.log(`[BattleEngine] 消息前1000字符:`, dataStr.substring(0, 1000));
      console.log(`[BattleEngine] 消息后1000字符:`, dataStr.substring(dataStr.length - 1000));
    } else if (dataStr.length > 1000) {
      console.log(`[BattleEngine] 消息前500字符:`, dataStr.substring(0, 500));
      console.log(`[BattleEngine] 消息后500字符:`, dataStr.substring(dataStr.length - 500));
    } else {
      console.log(`[BattleEngine] 完整消息:`, dataStr);
    }
    
    // 特别检查 teampreview 协议（可能没有结尾的|）
    if (dataStr.includes('teampreview')) {
      console.log(`[BattleEngine] 🔥 检测到包含 'teampreview' 的文本`);
      const teampreviewLines = lines.filter(line => line.includes('teampreview'));
      teampreviewLines.forEach(line => {
        console.log(`[BattleEngine] 🔥 teampreview 行: ${line}`);
      });
    }
    
    // 特别检查 poke 协议
    if (hasPoke) {
      console.log(`[BattleEngine] 🔥 检测到包含 'poke' 的文本`);
      const pokeLines = lines.filter(line => line.includes('poke'));
      console.log(`[BattleEngine] 🔥 poke 协议数量: ${pokeLines.length}`);
      pokeLines.slice(0, 3).forEach((line, idx) => {
        console.log(`[BattleEngine] 🔥 poke 协议 #${idx + 1}: ${line.substring(0, 100)}`);
      });
    }
    
    // 监控：记录协议接收（简化版）
    if (window.protocolLogs) {
      const timestamp = Date.now() - (window.protocolStartTime || Date.now());
      const log = {
        timestamp,
        direction: 'receive',
        data: dataStr.substring(0, 500),
        metadata: { length: dataStr.length, hasRequest, hasTeamPreview, hasPoke }
      };
      window.protocolLogs.push(log);
      
      // 实时输出关键协议
      const keyProtocols = ['request', 'teampreview', 'switch', 'poke', 'start', 'win', 'faint'];
      const hasKeyProtocol = keyProtocols.some(proto => dataStr.includes(`|${proto}|`));
      if (hasKeyProtocol) {
        const protocolName = keyProtocols.find(proto => dataStr.includes(`|${proto}|`)) || 'unknown';
        console.log(`[Protocol-Frontend] [${timestamp}ms] RECEIVE ${protocolName}: ${dataStr.substring(0, 200)}`);
      }
    }
    
    // 调用处理回调
    this.handleMessage(dataStr);
  }

  /**
   * 处理收到的消息
   * 
   * 功能：
   * - 调用所有注册的消息回调函数
   * - 通常由 processMessage 调用，将处理后的消息传递给上层模块
   * 
   * @param {string} data - 消息内容
   */
  handleMessage(data) {
    this.onMessageCallbacks.forEach(cb => cb(data));
  }

  /**
   * 发送消息到服务器
   * 
   * 功能：
   * - 检查连接状态（isConnected 和 WebSocket readyState）
   * - 支持发送字符串或对象（对象自动转换为 JSON）
   * - 记录协议发送日志（如果是协议消息）
   * - 实时输出关键协议的发送日志
   * 
   * @param {string|Object} message - 要发送的消息（字符串或对象）
   * @returns {boolean} - 是否发送成功
   * 
   * 注意事项：
   * - 只有在 WebSocket.OPEN 状态时才能发送
   * - 协议消息（以 | 开头）会被记录到协议日志
   */
  send(message) {
    console.log(`[BattleEngine] send() 被调用，连接状态: ${this.isConnected}, ws存在: ${!!this.ws}`);
    console.log(`[BattleEngine] WebSocket readyState: ${this.ws?.readyState} (OPEN=1, CONNECTING=0, CLOSING=2, CLOSED=3)`);
    
    if (!this.isConnected || !this.ws) {
      console.error('[BattleEngine] 未连接，无法发送消息');
      console.error('[BattleEngine] isConnected:', this.isConnected, 'ws:', this.ws);
      return false;
    }

    // 检查 WebSocket 状态
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.error(`[BattleEngine] WebSocket 未打开，readyState: ${this.ws.readyState}`);
      return false;
    }

    try {
      // 如果是对象，转换为JSON字符串
      let messageStr;
      if (typeof message === 'object') {
        messageStr = JSON.stringify(message);
        console.log(`[BattleEngine] 对象已转换为JSON:`, messageStr);
      } else {
        messageStr = message;
      }
      
      console.log(`[BattleEngine] 准备发送消息 (${messageStr.length} 字节):`, messageStr.substring(0, 200));
      
      // 监控：记录协议发送（简化版，仅对协议字符串）
      if (window.protocolLogs && typeof message === 'string' && message.startsWith('|')) {
        const timestamp = Date.now() - (window.protocolStartTime || Date.now());
        const log = {
          timestamp,
          direction: 'send',
          data: messageStr.substring(0, 500),
          metadata: { length: messageStr.length }
        };
        window.protocolLogs.push(log);
        
        // 实时输出关键协议
        const keyProtocols = ['request', 'teampreview', 'switch', 'poke', 'start', 'win', 'faint'];
        const hasKeyProtocol = keyProtocols.some(proto => messageStr.includes(`|${proto}|`));
        if (hasKeyProtocol) {
          const protocolName = keyProtocols.find(proto => messageStr.includes(`|${proto}|`)) || 'unknown';
          console.log(`[Protocol-Frontend] [${timestamp}ms] SEND ${protocolName}: ${messageStr.substring(0, 200)}`);
        }
      }
      
      this.ws.send(messageStr);
      console.log('[BattleEngine] 消息已发送到 WebSocket');
      console.log(`[BattleEngine] 发送后 readyState: ${this.ws.readyState}`);
      return true;
    } catch (e) {
      console.error('[BattleEngine] 发送消息失败:', e);
      console.error('[BattleEngine] 错误详情:', e.message, e.stack);
      return false;
    }
  }

  /**
   * 启动对战
   * 
   * 功能：
   * - 发送 start 消息到服务器，启动新的对战
   * - 消息格式：{ type: 'start', payload: { mode, formatid, team, difficulty?, roomId?, side? } }
   * 
   * @param {Object} payload - 对战配置对象
   * @param {string} payload.mode - 对战模式：'ai' 或 'pvp'
   * @param {string} payload.formatid - 对战格式，如 'gen9ou'
   * @param {Array} payload.team - 玩家队伍数组
   * @param {number} [payload.difficulty] - AI难度（1-5），仅AI模式
   * @param {string} [payload.roomId] - 房间ID，仅PvP模式
   * @param {string} [payload.side] - 玩家身份（'p1' 或 'p2'），仅PvP模式
   * @returns {boolean} - 是否发送成功
   */
  startBattle(payload) {
    console.log('[BattleEngine] ========== startBattle 被调用 ==========');
    console.log('[BattleEngine] payload:', JSON.stringify(payload).substring(0, 500));
    console.log('[BattleEngine] isConnected:', this.isConnected);
    console.log('[BattleEngine] ws存在:', !!this.ws);
    console.log('[BattleEngine] ws.readyState:', this.ws?.readyState, '(OPEN=1)');
    
    if (!this.isConnected || !this.ws) {
      console.error('[BattleEngine] ❌ 连接未建立，无法发送start消息');
      return false;
    }
    
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.error('[BattleEngine] ❌ WebSocket未打开，readyState:', this.ws.readyState);
      return false;
    }
    
    const message = JSON.stringify({
      type: 'start',
      payload: payload
    });
    console.log('[BattleEngine] 准备发送start消息:', message.substring(0, 200));
    const result = this.send(message);
    console.log('[BattleEngine] start消息发送结果:', result);
    return result;
  }

  /**
   * 发送选择命令（出招/换人）
   * 
   * 功能：
   * - 发送玩家的选择命令到服务器
   * - 消息格式：{ type: 'choose', command: 'move 1' | 'switch 2' | 'team 1' }
   * 
   * @param {string} command - 选择命令字符串
   *   - 'move 1' - 使用第1个技能（索引从1开始）
   *   - 'switch 2' - 切换到第2个宝可梦（位置从1开始）
   *   - 'team 1' - 选择第1个宝可梦作为首发（队伍预览阶段）
   * @returns {boolean} - 是否发送成功
   */
  sendChoice(command) {
    const message = JSON.stringify({
      type: 'choose',
      command: command
    });
    console.log(`[BattleEngine] 发送选择命令: ${command}，消息: ${message}`);
    const result = this.send(message);
    console.log(`[BattleEngine] 发送结果: ${result}`);
    return result;
  }

  /**
   * 添加消息监听
   * 
   * @param {Function} callback - 消息回调函数，接收 (data: string) 参数
   */
  onMessage(callback) {
    this.onMessageCallbacks.push(callback);
  }

  /**
   * 添加错误监听
   * 
   * @param {Function} callback - 错误回调函数，接收 (error: Event) 参数
   */
  onError(callback) {
    this.onErrorCallbacks.push(callback);
  }

  /**
   * 添加关闭监听
   * 
   * @param {Function} callback - 关闭回调函数，无参数
   */
  onClose(callback) {
    this.onCloseCallbacks.push(callback);
  }

  /**
   * 注册重连成功回调
   * 
   * 功能：
   * - 当收到 battle-reconnected 消息时，会调用此回调
   * - 用于 PvP 对战的重连场景
   * 
   * @param {Function} callback - 重连回调函数，接收 (payload: Object) 参数
   */
  onReconnect(callback) {
    this.onReconnectCallbacks.push(callback);
  }

  /**
   * 移除监听器
   * 
   * 功能：
   * - 从所有回调数组中移除指定的回调函数
   * - 用于清理事件监听器，避免内存泄漏
   * 
   * @param {Function} callback - 要移除的回调函数
   */
  removeListener(callback) {
    this.onMessageCallbacks = this.onMessageCallbacks.filter(cb => cb !== callback);
    this.onErrorCallbacks = this.onErrorCallbacks.filter(cb => cb !== callback);
    this.onCloseCallbacks = this.onCloseCallbacks.filter(cb => cb !== callback);
  }

  /**
   * 断开连接
   * 
   * 功能：
   * - 主动关闭 WebSocket 连接
   * - 发送关闭代码 1000（正常关闭）和原因 'Client disconnect'
   * - 清理连接状态和对象引用
   * - 记录详细的断开日志
   */
  disconnect() {
    console.log('[WebSocket Monitor] ========== 前端：主动断开连接 ==========');
    console.log('[WebSocket Monitor] 连接ID:', this._connectionId);
    console.log('[WebSocket Monitor] 时间:', new Date().toISOString());
    console.log('[WebSocket Monitor] WebSocket readyState:', this.ws?.readyState);
    console.log('[WebSocket Monitor] 调用栈:', new Error().stack.split('\n').slice(1, 6).join('\n'));
    
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        console.log('[WebSocket Monitor] 调用 ws.close() 关闭连接');
        this.ws.close(1000, 'Client disconnect');
      } else {
        console.log('[WebSocket Monitor] 连接状态不是 OPEN 或 CONNECTING，跳过关闭');
      }
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export default BattleEngine;

