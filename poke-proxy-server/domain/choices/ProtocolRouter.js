/**
 * 协议路由器（ProtocolRouter）
 * 
 * 职责：
 * - 将从 Pokemon Showdown 引擎接收到的协议路由到正确的处理器
 * - 识别协议类型（request, switch, teampreview, poke 等）
 * - 解析协议内容并调用对应的处理器方法
 * - 记录协议日志用于调试
 * 
 * 协议类型：
 * - request: 路由到对应方的 ChoiceHandler（PlayerChoiceHandler 或 AIChoiceHandler）
 * - switch/start: 通知所有处理器（用于状态更新）
 * - teampreview: 标记队伍预览阶段
 * - poke: 队伍预览信息（不需要特殊处理）
 * 
 * 工作流程：
 * 1. 接收协议块 → 2. 分割成多行 → 3. 识别协议类型 → 4. 路由到对应处理器
 */
class ProtocolRouter {
  /**
   * 构造函数
   * 
   * @param {BattleManager} battleManager - 对战管理器实例
   */
  constructor(battleManager) {
    this.battleManager = battleManager;
    this.monitor = battleManager.monitor; // 使用 BattleManager 的监控器
  }

  /**
   * 路由协议
   */
  route(chunkStr) {
    const lines = chunkStr.split('\n');
    console.log(`[ProtocolRouter] ========== 开始路由协议 ==========`);
    console.log(`[ProtocolRouter] 收到 ${lines.length} 行数据`);
    
    // 监控：记录整个 chunk 到 router 阶段（用于统计）
    if (this.monitor) {
      // 检查是否包含关键协议（支持两种格式：|protocol| 和 |protocol）
      const hasKeyProtocol = this.monitor.keyProtocols.some(proto => {
        // 检查标准格式
        if (chunkStr.includes(`|${proto}|`)) return true;
        // 检查无结尾|的格式（如teampreview）
        if (this.monitor.containsProtocol && this.monitor.containsProtocol(chunkStr, proto)) return true;
        // 使用正则表达式作为后备
        const regex = new RegExp(`\\|${proto}(?:\\||[\\s\\n]|$)`);
        return regex.test(chunkStr);
      });
      if (hasKeyProtocol) {
        this.monitor.log('router', chunkStr, 'router', { lineCount: lines.length });
      }
    }
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) {
        continue;
      }

      const protocolName = line.split('|')[1] || 'unknown';
      
      // 只输出关键协议的详细信息
      const isKeyProtocol = this.monitor && this.monitor.keyProtocols && this.monitor.keyProtocols.includes(protocolName.toLowerCase());
      if (isKeyProtocol) {
        console.log(`[ProtocolRouter] ⭐ 处理第 ${i} 行 [${protocolName}]: ${line.substring(0, 100)}`);
      }
      
      // 检查是否是重要协议
      if (line.startsWith('|request|')) {
        console.log(`[ProtocolRouter] ⭐ 识别为 request 协议`);
        this.handleRequest(line);
      } else if (line.startsWith('|switch|') || line.startsWith('|start|')) {
        if (isKeyProtocol) {
          console.log(`[ProtocolRouter] ⭐ 识别为 switch/start 协议`);
        }
        this.handleSwitch(line);
      } else if (line.startsWith('|teampreview') || line.startsWith('|teampreview|')) {
        console.log(`[ProtocolRouter] ⭐ 识别为 teampreview 协议`);
        this.handleTeamPreview(line);
        
        // 关键修复：teampreview 后，对战引擎应该发送 request 协议
        // 但如果没有立即发送，我们需要等待
        // 同时，我们需要确保 AI 能够自动选择，以便触发 request
        console.log('[ProtocolRouter] teampreview 协议处理完成，等待 request 协议...');
        
        // 注意：request 协议应该在对战引擎收到双方选择后发送
        // 如果 AI 还没有选择，request 可能不会立即发送
      } else if (line.startsWith('|poke|')) {
        // poke 协议太多，不输出详细信息
      }
    }
    console.log(`[ProtocolRouter] ========== 协议路由完成 ==========`);
  }

  /**
   * 处理 request 协议
   */
  handleRequest(line) {
    console.log('[ProtocolRouter] ========== 收到 request 协议 ==========');
    console.log('[ProtocolRouter] request 完整内容:', line.substring(0, 500));
    
    try {
      const reqStr = line.slice('|request|'.length);
      console.log('[ProtocolRouter] request JSON 字符串:', reqStr.substring(0, 500));
      
      const request = JSON.parse(reqStr);
      
      // 关键修复：完整输出 request 协议的所有内容（用于诊断）
      console.log('[ProtocolRouter] ========== request 协议完整内容 ==========');
      console.log('[ProtocolRouter] request 对象（完整）:', JSON.stringify(request, null, 2));
      console.log('[ProtocolRouter] request 的所有字段:', Object.keys(request));
      
      // 特别关注 teamPreview 相关的字段
      if (request.teamPreview) {
        console.log('[ProtocolRouter] ⭐ teamPreview 模式已启用');
        console.log('[ProtocolRouter] request.teamPreview:', request.teamPreview);
      }
      
      console.log('[ProtocolRouter] request 对象（前500字符）:', JSON.stringify(request).substring(0, 500));
      
      // 关键修复：详细输出 request 协议的完整内容，特别是 teamPreview 相关的字段
      if (request.teamPreview) {
        console.log('[ProtocolRouter] ========== teamPreview request 详细信息 ==========');
        console.log('[ProtocolRouter] request.teamPreview:', request.teamPreview);
        console.log('[ProtocolRouter] request.side:', request.side ? JSON.stringify(request.side).substring(0, 500) : 'null');
        console.log('[ProtocolRouter] request.side.pokemon 数量:', request.side?.pokemon?.length || 0);
        if (request.side && request.side.pokemon) {
          console.log('[ProtocolRouter] request.side.pokemon 列表:');
          request.side.pokemon.forEach((p, i) => {
            console.log(`[ProtocolRouter]   [${i + 1}] ${p.ident || p.details || 'unknown'}`);
          });
        }
        console.log('[ProtocolRouter] request 的所有字段:', Object.keys(request));
        
        // 关键检查：查找 request 协议中是否有关于命令格式的提示
        console.log('[ProtocolRouter] ========== 检查命令格式提示 ==========');
        console.log('[ProtocolRouter] request.maxTeamSize:', request.maxTeamSize);
        console.log('[ProtocolRouter] request.teamLength:', request.teamLength);
        console.log('[ProtocolRouter] request.noCancel:', request.noCancel);
        console.log('[ProtocolRouter] request.rqid:', request.rqid);
        console.log('[ProtocolRouter] request.wait:', request.wait);
        console.log('[ProtocolRouter] request.side.name:', request.side?.name);
        console.log('[ProtocolRouter] request.side.id:', request.side?.id);
        
        // 检查是否有其他相关字段
        const allKeys = Object.keys(request);
        const relevantKeys = allKeys.filter(k => 
          k.includes('team') || k.includes('preview') || k.includes('choice') || 
          k.includes('format') || k.includes('size') || k.includes('length')
        );
        if (relevantKeys.length > 0) {
          console.log('[ProtocolRouter] 相关字段:', relevantKeys);
          relevantKeys.forEach(k => {
            console.log(`[ProtocolRouter]   ${k}:`, request[k]);
          });
        }
        
        console.log('[ProtocolRouter] ============================================');
      }
      
      // 关键修复：清除等待 request 的标志
      if (this.battleManager._waitingForRequest) {
        const elapsed = this.battleManager._teampreviewTime ? Date.now() - this.battleManager._teampreviewTime : 0;
        console.log(`[ProtocolRouter] ✅ 收到 request 协议，清除等待标志（耗时: ${elapsed}ms）`);
        this.battleManager._waitingForRequest = false;
        if (this.battleManager._teampreviewTime) {
          delete this.battleManager._teampreviewTime;
        }
      }
      
      if (request && request.side && request.side.id) {
        const side = request.side.id;
        console.log(`[ProtocolRouter] request 的 side.id: ${side}`);
        
        const handler = this.battleManager.getHandler(side);
        console.log(`[ProtocolRouter] 获取到的 handler:`, handler ? handler.constructor.name : 'null');
        
        if (handler) {
          console.log(`[ProtocolRouter] 调用 handler.handleRequest() for ${side}`);
          // 监控：记录 handler 处理
          if (this.monitor) {
            this.monitor.log('request', JSON.stringify(request), 'handler', { side: side });
          }
          handler.handleRequest(request);
          console.log(`[ProtocolRouter] handler.handleRequest() 完成`);
        } else {
          console.warn(`[ProtocolRouter] ⚠️ 没有找到 ${side} 的处理器！`);
          console.warn(`[ProtocolRouter] 当前 handlers:`, Object.keys(this.battleManager.handlers || {}));
          // 监控：记录错误
          if (this.monitor) {
            this.monitor.log('error', `没有找到 ${side} 的处理器`, 'handler', { side: side, handlers: Object.keys(this.battleManager.handlers || {}) });
          }
        }
      } else {
        console.warn('[ProtocolRouter] request 没有 side 字段');
        console.warn('[ProtocolRouter] request 对象:', JSON.stringify(request));
      }
    } catch (e) {
      console.error('[ProtocolRouter] 解析 request 失败:', e);
      console.error('[ProtocolRouter] 错误堆栈:', e.stack);
      console.error('[ProtocolRouter] 原始行:', line.substring(0, 500));
    }
  }

  /**
   * 处理 switch 协议
   */
  handleSwitch(line) {
    // 通知所有处理器（用于状态更新）
    Object.values(this.battleManager.handlers).forEach(handler => {
      if (handler.handleSwitch) {
        handler.handleSwitch(line);
      }
    });
  }

  /**
   * 处理 teampreview 协议
   */
  handleTeamPreview(line) {
    console.log('[ProtocolRouter] ========== 收到 teampreview 协议 ==========');
    console.log('[ProtocolRouter] teampreview 协议内容:', line);
    console.log('[ProtocolRouter] 时间戳:', new Date().toISOString());
    
    // teampreview 只是通知，不需要特殊处理
    // 实际的队伍预览选择通过 request 协议处理
    // 但是，Pokemon Showdown 引擎在收到 teampreview 后，会立即发送 request 协议
    // 如果没有收到 request，可能是因为：
    // 1. 引擎正在等待某些条件
    // 2. request 将在下一个 chunk 中发送（最可能）
    // 3. 需要等待玩家选择后才会发送 request
    
    console.log('[ProtocolRouter] teampreview 协议处理完成');
    console.log('[ProtocolRouter] ⚠️ 注意：request 协议应该会在 teampreview 后立即发送，或者在下一个 chunk 中');
    console.log('[ProtocolRouter] ⚠️ 如果长时间没有收到 request，可能需要检查对战引擎的状态');
    console.log('[ProtocolRouter] ⚠️ 根据 Pokemon Showdown 的标准行为：');
    console.log('[ProtocolRouter] ⚠️   - teampreview 后，引擎应该会立即发送 request 协议');
    console.log('[ProtocolRouter] ⚠️   - request 协议会发送给双方玩家（p1 和 p2）');
    console.log('[ProtocolRouter] ⚠️   - request 协议应该通过 omniscient stream 发送');
    console.log('[ProtocolRouter] ⚠️   - 如果 request 没有立即发送，可能需要等待一些时间');
    
    // 设置一个标志，表示我们正在等待 request 协议
    this.battleManager._waitingForRequest = true;
    this.battleManager._teampreviewTime = Date.now();
    
    // 设置一个超时检查（10秒后如果没有收到 request，输出警告）
    setTimeout(() => {
      if (this.battleManager._waitingForRequest) {
        console.error('[ProtocolRouter] ⚠️⚠️⚠️ 10秒后仍未收到 request 协议！');
        console.error('[ProtocolRouter] ⚠️⚠️⚠️ 这可能表示：');
        console.error('[ProtocolRouter] ⚠️⚠️⚠️ 1. 对战引擎没有生成 request 协议');
        console.error('[ProtocolRouter] ⚠️⚠️⚠️ 2. request 协议被发送到了错误的 stream');
        console.error('[ProtocolRouter] ⚠️⚠️⚠️ 3. 对战引擎在等待某些条件');
        this.battleManager._waitingForRequest = false;
      }
    }, 10000);
  }
}

module.exports = ProtocolRouter;



