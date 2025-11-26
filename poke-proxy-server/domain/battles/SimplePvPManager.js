/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 简化 PvP 对战管理器（SimplePvPManager.js）
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📋 核心职责
 * ──────────────────────────────────────────────────────────────────────────
 * SimplePvPManager 专门用于管理双人对战（PvP），负责：
 *   1. 对战引擎管理
 *      - 创建和管理 Pokemon Showdown BattleStream 实例
 *      - 初始化对战（发送队伍数据）
 *      - 处理协议流的监听和分发
 * 
 *   2. 连接管理
 *      - 管理两个玩家的 WebSocket 连接（p1 和 p2）
 *      - 支持连接替换（重连场景）
 *      - 协议缓存和重发机制
 * 
 *   3. 协议路由
 *      - omniscient 流：所有玩家都能看到的协议（|poke|, |switch| 等）
 *      - p1 流：只发送给玩家 1 的协议（|request| 等）
 *      - p2 流：只发送给玩家 2 的协议（|request| 等）
 * 
 *   4. 选择处理
 *      - 接收玩家选择命令（move, switch, team）
 *      - 转发到对应的玩家流
 * 
 * 🏗️ 架构设计
 * ──────────────────────────────────────────────────────────────────────────
 * 
 *                    SimplePvPManager
 *                           │
 *          ┌────────────────┼────────────────┐
 *          │                │                │
 *    BattleStream      streams.p1     streams.p2
 *    (对战引擎)         (p1协议流)      (p2协议流)
 *          │                │                │
 *          └────────┬───────┴────────────────┘
 *                   │
 *          streams.omniscient
 *          (公共协议流)
 *                   │
 *          ┌────────┴────────┐
 *          │                 │
 *    connections.p1    connections.p2
 *    (p1 WebSocket)    (p2 WebSocket)
 * 
 * 🔄 协议处理流程
 * ──────────────────────────────────────────────────────────────────────────
 * 
 * 初始化阶段：
 *   1. 创建 BattleStream 和玩家流
 *   2. 启动协议监听器（异步）
 *   3. 写入初始化命令（>start, >player p1, >player p2）
 *   4. Pokemon Showdown 开始生成协议
 * 
 * 协议分发：
 *   - omniscient 流 → broadcast() → 发送给所有连接
 *   - p1 流 → sendTo('p1') → 只发送给 p1 连接
 *   - p2 流 → sendTo('p2') → 只发送给 p2 连接
 * 
 * 连接重连：
 *   1. 检测到新连接替换旧连接
 *   2. 关闭旧连接
 *   3. 重发所有已缓存的协议
 *   4. 使用重试机制确保协议完整性
 * 
 * 📦 协议缓存
 * ──────────────────────────────────────────────────────────────────────────
 * 所有协议都会被缓存，用于重连时重新发送：
 *   - _cachedProtocols.omniscient: 公共协议列表
 *   - _cachedProtocols.p1: p1 专属协议列表
 *   - _cachedProtocols.p2: p2 专属协议列表
 * 
 * 重连时会：
 *   1. 按顺序发送所有 omniscient 协议
 *   2. 然后发送对应玩家的专属协议
 *   3. 确保协议顺序正确
 * 
 * ⚠️ 注意事项
 * ──────────────────────────────────────────────────────────────────────────
 * - 协议监听器是异步的，需要等待初始化完成
 * - 重连时协议可能还在生成，使用重试机制处理
 * - 确保协议按顺序发送，避免时序问题
 * - 所有协议都会被缓存，直到对战结束
 */
// 使用适配层访问 Pokemon Showdown
const showdownAdapter = require('../../adapters/pokemon-showdown/ShowdownAdapter');

class SimplePvPManager {
  constructor(formatid = 'gen9ou', seed = null) {
    this.formatid = formatid;
    this.seed = seed;
    this.battleStream = null;
    this.streams = null;
    this.connections = {};
    this.teams = {};
    this.isInitialized = false;
    this._cachedProtocols = {
      omniscient: [],
      p1: [],
      p2: [],
    };
  }

  async initialize(team1, team2) {
    this.teams.p1 = team1;
    this.teams.p2 = team2;

    this.battleStream = showdownAdapter.createBattleStream();
    this.streams = showdownAdapter.getPlayerStreams(this.battleStream);
    
    // 关键修复：先启动协议监听器，再初始化对战
    // 这样可以确保协议监听器在协议开始生成前就已经准备好
    this.startStreamListeners();
    
    // 等待一小段时间，确保监听器已启动（异步监听器需要时间）
    await new Promise(resolve => setTimeout(resolve, 10));

    const formatid = this.formatid;
    const seed = this.seed;
    const startConfig = seed ? { formatid, seed } : { formatid };
    const initCommand = `>start ${JSON.stringify(startConfig)}\n>player p1 ${JSON.stringify({ name: 'Player 1', team: team1 })}\n>player p2 ${JSON.stringify({ name: 'Player 2', team: team2 })}`;
    
    console.log('[SimplePvPManager] 初始化对战，写入命令...');
    this.battleStream.write(initCommand);
    console.log('[SimplePvPManager] ✅ 对战初始化命令已写入');
    
    this.isInitialized = true;
  }

  startStreamListeners() {
    // omniscient 流监听器（所有玩家都能看到的协议）
    (async () => {
      try {
        for await (const chunk of this.streams.omniscient) {
          const chunkStr = chunk.toString();
          this._cachedProtocols.omniscient.push(chunkStr);
          console.log(`[SimplePvPManager] 收到 omniscient 协议 (${this._cachedProtocols.omniscient.length}): ${chunkStr.substring(0, 100)}...`);
          this.broadcast(chunkStr);
        }
      } catch (error) {
        console.error('[SimplePvPManager] omniscient 流错误:', error);
      }
    })();

    // p1 流监听器
    (async () => {
      try {
        for await (const chunk of this.streams.p1) {
          const chunkStr = chunk.toString();
          this._cachedProtocols.p1.push(chunkStr);
          console.log(`[SimplePvPManager] 收到 p1 协议 (${this._cachedProtocols.p1.length}): ${chunkStr.substring(0, 100)}...`);
          this.sendTo('p1', chunkStr);
          
          // 如果协议包含 request，记录日志
          if (chunkStr.includes('|request|')) {
            console.log(`[SimplePvPManager] ✅ p1 request 协议已缓存并发送`);
          }
        }
      } catch (error) {
        console.error('[SimplePvPManager] p1 流错误:', error);
      }
    })();

    // p2 流监听器
    (async () => {
      try {
        for await (const chunk of this.streams.p2) {
          const chunkStr = chunk.toString();
          this._cachedProtocols.p2.push(chunkStr);
          console.log(`[SimplePvPManager] 收到 p2 协议 (${this._cachedProtocols.p2.length}): ${chunkStr.substring(0, 100)}...`);
          this.sendTo('p2', chunkStr);
          
          // 如果协议包含 request，记录日志
          if (chunkStr.includes('|request|')) {
            console.log(`[SimplePvPManager] ✅ p2 request 协议已缓存并发送`);
          }
        }
      } catch (error) {
        console.error('[SimplePvPManager] p2 流错误:', error);
      }
    })();
  }

  broadcast(message) {
    Object.values(this.connections).forEach((ws) => {
      if (ws && ws.readyState === 1) {
        ws.send(message);
      }
    });
  }

  sendTo(side, message) {
    const ws = this.connections[side];
    if (ws && ws.readyState === 1) {
      ws.send(message);
    }
  }

  addConnection(side, ws) {
    console.log(`[SimplePvPManager] 添加连接: ${side}, 连接ID: ${ws._connectionId || 'N/A'}`);
    
    const oldWs = this.connections[side];
    const isReconnect = !!oldWs && oldWs !== ws;
    
    if (oldWs && oldWs.readyState === 1 && oldWs !== ws) {
      console.log(`[SimplePvPManager] 检测到旧连接，准备替换: ${side}`);
      try {
        oldWs.close(1000, 'Replaced by new connection');
        console.log(`[SimplePvPManager] ✅ 旧连接已关闭: ${side}`);
      } catch (e) {
        console.warn('[SimplePvPManager] 关闭旧连接失败:', e);
      }
    }

    this.connections[side] = ws;
    console.log(`[SimplePvPManager] ✅ 新连接已添加到 connections: ${side}`);

    // 无论是新连接还是重连，都需要重发协议
    // 新连接需要获取所有已发送的协议，重连需要获取错过的协议
    if (isReconnect) {
      console.log(`[SimplePvPManager] 检测到重连，发送重连消息`);
      // 立即发送重连消息
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'battle-reconnected', payload: { side, message: '重连成功' } }));
      }
    }
    
    // 关键修复：重发协议需要延迟并重试，因为：
    // 1. 连接可能刚刚建立，需要时间准备
    // 2. 协议可能还在生成中，需要等待协议开始发送后再重发
    // 3. 使用重试机制，确保即使协议延迟生成也能被重发
    const retryResendProtocols = (attempt = 0, maxAttempts = 10) => {
      if (ws.readyState !== 1) {
        console.warn(`[SimplePvPManager] 连接已关闭，停止重发协议: ${side}, readyState=${ws.readyState}`);
        return;
      }
      
      const playerProtocols = side === 'p1' ? this._cachedProtocols.p1 : this._cachedProtocols.p2;
      const totalProtocols = this._cachedProtocols.omniscient.length + playerProtocols.length;
      
      if (totalProtocols > 0 || attempt >= maxAttempts) {
        // 如果已有协议缓存，或者已达到最大重试次数，立即重发
        console.log(`[SimplePvPManager] 重发协议 (尝试 ${attempt + 1}/${maxAttempts}), 缓存协议数: ${totalProtocols}`);
        this.resendCachedProtocols(side, ws);
        
        // 即使已重发，也继续监听新的协议（如果还没达到最大重试次数）
        if (attempt < maxAttempts - 1 && totalProtocols === 0) {
          // 如果缓存还是空的，继续等待
          setTimeout(() => retryResendProtocols(attempt + 1, maxAttempts), 200);
        }
      } else {
        // 缓存还是空的，继续等待
        console.log(`[SimplePvPManager] 协议缓存为空，等待协议生成 (尝试 ${attempt + 1}/${maxAttempts})...`);
        setTimeout(() => retryResendProtocols(attempt + 1, maxAttempts), 200);
      }
    };
    
    // 首次尝试立即执行，如果缓存为空则开始重试
    setTimeout(() => retryResendProtocols(0, 10), 50);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'choose') {
          this.handlePlayerChoice(side, message.command);
        }
      } catch (e) {
        const command = data.toString().trim();
        if (command && !command.startsWith('{')) {
          this.handlePlayerChoice(side, command);
        }
      }
    });
  }

  handlePlayerChoice(side, command) {
    if (!this.streams) {
      return false;
    }
    try {
      const stream = side === 'p1' ? this.streams.p1 : this.streams.p2;
      stream.write(command);
      return true;
    } catch (e) {
      console.error(`[SimplePvPManager] 发送选择失败:`, e);
      return false;
    }
  }

  resendCachedProtocols(side, ws) {
    if (!ws || ws.readyState !== 1) {
      console.warn(`[SimplePvPManager] 无法重发协议: ws=${!!ws}, readyState=${ws?.readyState}`);
      return;
    }
    
    console.log(`[SimplePvPManager] ========== 开始重发协议给 ${side} ==========`);
    console.log(`[SimplePvPManager] 缓存统计: omniscient=${this._cachedProtocols.omniscient.length}, p1=${this._cachedProtocols.p1.length}, p2=${this._cachedProtocols.p2.length}`);
    
    const playerProtocols = side === 'p1' ? this._cachedProtocols.p1 : this._cachedProtocols.p2;
    console.log(`[SimplePvPManager] 玩家特定协议数量: ${playerProtocols.length}`);
    
    // 关键修复：按顺序同步发送协议，确保顺序正确
    // 先发送 omniscient 协议（所有玩家都能看到的协议，包括 poke, teampreview 等）
    let protocolCount = 0;
    this._cachedProtocols.omniscient.forEach((protocol, index) => {
      try {
        if (ws.readyState === 1) {
          ws.send(protocol);
          protocolCount++;
          const protocolType = protocol.includes('|poke|') ? 'poke' : 
                              protocol.includes('|teampreview|') ? 'teampreview' : 
                              'other';
          console.log(`[SimplePvPManager] [${protocolCount}] 重发 omniscient ${protocolType} 协议 #${index + 1} (${protocol.length} 字节)`);
        }
      } catch (e) {
        console.error('[SimplePvPManager] 重发 omniscient 协议失败:', e);
      }
    });
    
    // 然后发送玩家特定协议（包括 request 协议）
    playerProtocols.forEach((protocol, index) => {
      try {
        if (ws.readyState === 1) {
          ws.send(protocol);
          protocolCount++;
          const protocolType = protocol.includes('|request|') ? '🔥 REQUEST' : 'other';
          console.log(`[SimplePvPManager] [${protocolCount}] 重发 ${side} ${protocolType} 协议 #${index + 1} (${protocol.length} 字节)`);
          
          // 如果是 request 协议，额外记录详细信息
          if (protocol.includes('|request|')) {
            try {
              const requestMatch = protocol.match(/\|request\|(.+)/);
              if (requestMatch) {
                const requestData = JSON.parse(requestMatch[1]);
                console.log(`[SimplePvPManager] 🔥 REQUEST 协议详情: side=${requestData?.side?.id}, teamPreview=${requestData?.teamPreview}, pokemonCount=${requestData?.side?.pokemon?.length || 0}`);
              }
            } catch (e) {
              console.warn(`[SimplePvPManager] 解析 REQUEST 协议失败:`, e);
            }
          }
        }
      } catch (e) {
        console.error(`[SimplePvPManager] 重发 ${side} 协议失败:`, e);
      }
    });
    
    console.log(`[SimplePvPManager] ✅ 协议重发完成: ${side}, 总计 ${protocolCount} 条协议`);
    console.log(`[SimplePvPManager] ==========================================`);
  }

  removeConnection(side) {
    delete this.connections[side];
  }

  allPlayersConnected() {
    return !!this.connections.p1 && !!this.connections.p2;
  }

  destroy() {
    Object.values(this.connections).forEach((ws) => {
      if (ws && ws.readyState === 1) {
        try {
          ws.close(1000, 'Battle ended');
        } catch (e) {
          // ignore
        }
      }
    });
    this.connections = {};
    this.battleStream = null;
    this.streams = null;
    this.isInitialized = false;
  }
}

module.exports = SimplePvPManager;


