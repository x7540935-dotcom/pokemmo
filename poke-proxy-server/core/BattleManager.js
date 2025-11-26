/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 对战管理器（BattleManager.js）- AI 对战引擎核心
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📋 核心职责
 * ──────────────────────────────────────────────────────────────────────────
 * BattleManager 是 AI 对战的核心引擎，负责：
 *   1. 对战引擎管理
 *      - 创建 Pokemon Showdown BattleStream 实例
 *      - 初始化对战（队伍、格式、随机种子）
 *      - 管理玩家流和 AI 流
 * 
 *   2. 协议路由
 *      - 监听 omniscient 流（公共协议）
 *      - 监听 p1 流（玩家专属协议）
 *      - 路由协议到对应的处理器
 *      - 转发协议到 WebSocket 连接
 * 
 *   3. 选择处理
 *      - 玩家选择：通过 PlayerChoiceHandler 处理
 *      - AI 选择：通过 AIChoiceHandler 处理
 *      - 验证选择的合法性
 * 
 *   4. 连接管理
 *      - 管理玩家 WebSocket 连接
 *      - 支持连接替换（重连场景）
 *      - 协议缓存和重发
 * 
 * 🏗️ 架构设计
 * ──────────────────────────────────────────────────────────────────────────
 * 
 *                  BattleManager
 *                       │
 *          ┌────────────┼────────────┐
 *          │            │            │
 *    BattleStream   ProtocolRouter  Handlers
 *    (对战引擎)      (协议路由)      (选择处理器)
 *          │            │            │
 *          ├────────────┼────────────┤
 *          │            │            │
 *    streams.p1   streams.p2   AIHandler
 *    (玩家流)     (AI流)       (AI选择)
 * 
 * 🔄 AI 对战流程
 * ──────────────────────────────────────────────────────────────────────────
 * 
 *   初始化 → 发送队伍 → 开始对战 → 接收 request → AI 决策 → 发送选择
 *     │         │          │           │           │          │
 *     ▼         ▼          ▼           ▼           ▼          ▼
 * 创建引擎   写入命令   生成协议   路由到处理器  调用AI   写入流
 * 
 * 📦 协议缓存
 * ──────────────────────────────────────────────────────────────────────────
 * - _sentProtocols: 存储已发送的协议（用于重连）
 * - omniscient 协议：所有玩家都能看到
 * - 玩家专属协议：只发送给对应的玩家
 * 
 * ⚠️ 注意事项
 * ──────────────────────────────────────────────────────────────────────────
 * - 主要用于 AI 对战，PvP 对战使用 SimplePvPManager
 * - AI 选择通过 AIHandler 自动处理
 * - 协议路由确保正确的协议发送到正确的连接
 */
class BattleManager {
  /**
   * 构造函数
   * 
   * @param {string} mode - 对战模式：'ai' 或 'pvp'
   * @param {Object} [options={}] - 选项对象
   *   - difficulty: AI难度（1-5），仅AI模式
   *   - roomId: 房间ID，仅PvP模式
   */
  constructor(mode, options = {}) {
    this.mode = mode;                    // 对战模式：'ai' | 'pvp'
    this.options = options;              // 选项对象
    this.engine = null;                  // Pokemon Showdown 对战引擎实例
    this.handlers = {};                  // 处理器映射：{ p1: Handler, p2: Handler }
    this.connections = {};               // WebSocket连接映射：{ p1: WebSocket, p2: WebSocket }
    this.router = null;                  // 协议路由器实例
    
    // 协议监控（简化版）
    this.protocolLogs = [];
    this.startTime = Date.now();
    
    // 保存已发送的协议数据，用于重连时重新发送
    this._sentProtocols = [];
  }
  
  /**
   * 记录协议（简化版监控）
   */
  logProtocol(stage, data, metadata = {}) {
    const timestamp = Date.now() - this.startTime;
    const log = {
      timestamp,
      stage,
      data: data.substring(0, 500), // 只保存前500字符
      metadata
    };
    this.protocolLogs.push(log);
    
    // 实时输出关键协议
    const keyProtocols = ['request', 'teampreview', 'switch', 'poke', 'start', 'win', 'faint'];
    const hasKeyProtocol = keyProtocols.some(proto => data.includes(`|${proto}|`));
    
    if (hasKeyProtocol) {
      const protocolName = keyProtocols.find(proto => data.includes(`|${proto}|`)) || 'unknown';
      console.log(`[Protocol] [${timestamp}ms] [${stage}] ${protocolName}: ${data.substring(0, 200)}`);
    }
  }
  
  /**
   * 生成协议报告
   */
  generateProtocolReport() {
    const elapsed = Date.now() - this.startTime;
    console.log(`\n[Protocol Report] ========== 协议监控报告 [${elapsed}ms] ==========`);
    console.log(`[Protocol Report] 总协议数: ${this.protocolLogs.length}`);
    
    const stageCounts = {};
    this.protocolLogs.forEach(log => {
      stageCounts[log.stage] = (stageCounts[log.stage] || 0) + 1;
    });
    console.log(`[Protocol Report] 阶段统计:`, stageCounts);
    
    // 检查关键协议
    const keyProtocols = ['request', 'teampreview', 'switch', 'poke', 'start'];
    keyProtocols.forEach(proto => {
      const hasProtocol = this.protocolLogs.some(log => log.data.includes(`|${proto}|`));
      console.log(`[Protocol Report] ${proto}: ${hasProtocol ? '✅' : '❌'}`);
    });
    
    // 显示最近10条协议
    console.log(`[Protocol Report] 最近10条协议:`);
    this.protocolLogs.slice(-10).forEach(log => {
      const proto = log.data.match(/\|(\w+)\|/)?.[1] || 'unknown';
      console.log(`[Protocol Report] [${log.timestamp}ms] [${log.stage}] ${proto}`);
    });
    
    console.log(`[Protocol Report] ============================================\n`);
  }

  /**
   * 初始化对战
   * 
   * 功能：
   * - 创建 Pokemon Showdown 对战引擎实例
   * - 初始化玩家和 AI 的选择处理器
   * - 设置协议路由
   * - 开始对战流程
   * 
   * @param {Array<Object>} team1 - 玩家1的队伍数组
   * @param {Array<Object>} team2 - 玩家2的队伍数组（AI模式时是AI队伍）
   * @param {string} [formatid='gen9ou'] - 对战格式，默认 'gen9ou'
   * @param {Array<number>|null} [seed=null] - 随机种子，null表示使用随机种子
   * 
   * @throws {Error} 如果初始化失败
   */
  async initialize(team1, team2, formatid = 'gen9ou', seed = null) {
    console.log(`[BattleManager] 初始化对战，模式: ${this.mode}`);
    
    // 创建对战引擎（使用适配层，支持 npm 包和本地路径）
    const showdownAdapter = require('../adapters/pokemon-showdown/ShowdownAdapter');
    const BattleStream = showdownAdapter.getBattleStreamClass();
    const getPlayerStreams = showdownAdapter.getPlayerStreamsFn();
    const battleStream = new BattleStream();
    const streams = getPlayerStreams(battleStream);
    
    // 关键修复：拦截 p1 和 p2 流的 write 方法，添加详细日志
    const originalP1Write = streams.p1.write.bind(streams.p1);
    streams.p1.write = (data) => {
      console.log(`[BattleManager-p1-stream] ========== p1 流 write 被调用 ==========`);
      console.log(`[BattleManager-p1-stream] 原始数据:`, JSON.stringify(data));
      console.log(`[BattleManager-p1-stream] 数据长度:`, data.length);
      // p1 流的 write 方法会使用正则表达式添加前缀
      // data.replace(/(^|\n)/g, '$1>p1 ') 会将 "team 1" 转换为 ">p1 team 1"
      const transformed = data.replace(/(^|\n)/g, `$1>p1 `);
      console.log(`[BattleManager-p1-stream] 转换后数据:`, JSON.stringify(transformed));
      console.log(`[BattleManager-p1-stream] 转换后长度:`, transformed.length);
      const result = originalP1Write(data);
      console.log(`[BattleManager-p1-stream] write 返回:`, result);
      return result;
    };
    
    const originalP2Write = streams.p2.write.bind(streams.p2);
    streams.p2.write = (data) => {
      console.log(`[BattleManager-p2-stream] ========== p2 流 write 被调用 ==========`);
      console.log(`[BattleManager-p2-stream] 原始数据:`, JSON.stringify(data));
      console.log(`[BattleManager-p2-stream] 数据长度:`, data.length);
      const transformed = data.replace(/(^|\n)/g, `$1>p2 `);
      console.log(`[BattleManager-p2-stream] 转换后数据:`, JSON.stringify(transformed));
      console.log(`[BattleManager-p2-stream] 转换后长度:`, transformed.length);
      const result = originalP2Write(data);
      console.log(`[BattleManager-p2-stream] write 返回:`, result);
      return result;
    };
    
    // 关键修复：拦截 BattleStream 的 _writeLines 方法，添加详细日志
    const originalWriteLines = battleStream._writeLines.bind(battleStream);
    battleStream._writeLines = (chunk) => {
      console.log(`[BattleStream] ========== _writeLines 被调用 ==========`);
      console.log(`[BattleStream] chunk:`, JSON.stringify(chunk));
      console.log(`[BattleStream] chunk 长度:`, chunk.length);
      const lines = chunk.split('\n');
      console.log(`[BattleStream] 分割后行数:`, lines.length);
      lines.forEach((line, idx) => {
        console.log(`[BattleStream] 行 ${idx + 1}:`, JSON.stringify(line));
        if (line.startsWith('>')) {
          const afterSlice = line.slice(1);
          console.log(`[BattleStream] 行 ${idx + 1} 去掉 '>' 后:`, JSON.stringify(afterSlice));
          // 模拟 splitFirst 的行为
          const spaceIndex = afterSlice.indexOf(' ');
          if (spaceIndex >= 0) {
            const type = afterSlice.slice(0, spaceIndex);
            const message = afterSlice.slice(spaceIndex + 1);
            console.log(`[BattleStream] 行 ${idx + 1} type:`, JSON.stringify(type));
            console.log(`[BattleStream] 行 ${idx + 1} message:`, JSON.stringify(message));
          } else {
            console.log(`[BattleStream] 行 ${idx + 1} 没有空格，整个字符串作为 type:`, JSON.stringify(afterSlice));
          }
        }
      });
      return originalWriteLines(chunk);
    };
    
    this.engine = {
      streams,
      omniscient: streams.omniscient,
      p1: streams.p1,
      p2: streams.p2
    };

    // 创建处理器
    const PlayerChoiceHandler = require('./PlayerChoiceHandler');
    const AIChoiceHandler = require('./AIChoiceHandler');
    
    this.handlers.p1 = new PlayerChoiceHandler('p1', this);
    
    if (this.mode === 'ai') {
      // 获取难度参数（默认2）
      const difficulty = this.options.difficulty || 2;
      console.log(`[BattleManager] 创建AI处理器，难度: ${difficulty}`);
      this.handlers.p2 = new AIChoiceHandler('p2', this, difficulty);
    } else {
      this.handlers.p2 = new PlayerChoiceHandler('p2', this);
    }

    // 创建协议路由器
    const ProtocolRouter = require('./ProtocolRouter');
    this.router = new ProtocolRouter(this);

    // 准备初始化命令（但不立即发送，等待连接添加后再发送）
    // 使用适配层获取 Teams 工具类（支持 npm 包和本地路径）
    const Teams = showdownAdapter.getTeams();
    
    // 验证队伍数据并输出日志
    console.log('[BattleManager] 打包队伍前验证：');
    console.log('[BattleManager] team1 长度:', team1.length);
    team1.forEach((p, i) => {
      console.log(`[BattleManager] team1[${i}]: ${p.name}, 技能数: ${p.moves?.length || 0}, 技能: ${JSON.stringify(p.moves || [])}`);
    });
    console.log('[BattleManager] team2 长度:', team2.length);
    team2.forEach((p, i) => {
      console.log(`[BattleManager] team2[${i}]: ${p.name}, 技能数: ${p.moves?.length || 0}, 技能: ${JSON.stringify(p.moves || [])}`);
    });
    
    const p1Team = Teams.pack(team1);
    const p2Team = Teams.pack(team2);
    
    // 验证打包后的数据
    const unpackedP1 = Teams.unpack(p1Team);
    const unpackedP2 = Teams.unpack(p2Team);
    console.log('[BattleManager] 打包后验证：');
    unpackedP1.forEach((p, i) => {
      console.log(`[BattleManager] unpackedP1[${i}]: ${p.name}, 技能数: ${p.moves?.length || 0}, 技能: ${JSON.stringify(p.moves || [])}`);
    });
    unpackedP2.forEach((p, i) => {
      console.log(`[BattleManager] unpackedP2[${i}]: ${p.name}, 技能数: ${p.moves?.length || 0}, 技能: ${JSON.stringify(p.moves || [])}`);
    });

    // 注意：命令必须用换行符分隔，但最后一行不需要换行符（或者需要？）
    // 根据 Pokemon Showdown 的标准，每行命令应该独立
    this._initCommands = `>start ${JSON.stringify({formatid, seed})}
>player p1 ${JSON.stringify({name: 'Player 1', team: p1Team})}
>player p2 ${JSON.stringify({name: this.mode === 'ai' ? 'AI' : 'Player 2', team: p2Team})}`;

    console.log('[BattleManager] ✅ 初始化命令已准备（将在连接添加后发送）');
    console.log('[BattleManager] 初始化命令预览:', this._initCommands.substring(0, 200));
    
    // 立即启动 omniscient 流监听（在初始化时就启动，避免丢失协议）
    console.log('[BattleManager] 立即启动 omniscient 流监听');
    this.startOmniscientListener();
    this._listenerStarted = true;
    
    // 注意：初始化命令将在 addConnection 时发送（当第一个连接添加时）
    // 这样可以确保连接已建立后再发送命令

    return this;
  }

  /**
   * 启动 omniscient 流监听
   * 同时启动 p1 和 p2 流监听（用于接收 request 协议）
   */
  startOmniscientListener() {
    console.log('[BattleManager] ========== 启动 omniscient 流监听 ==========');
    
    // 如果已经启动，不再重复启动
    if (this._omniscientListenerRunning) {
      console.log('[BattleManager] omniscient 流监听已经在运行，跳过');
      return;
    }
    this._omniscientListenerRunning = true;
    
    // 关键修复：同时监听 p1 和 p2 流，因为 request 协议可能通过这些流发送
    // 虽然 request 协议通常也通过 omniscient 流发送，但为了确保不丢失，我们也监听 p1 和 p2 流
    this.startPlayerStreamListeners();
    
    (async () => {
      try {
        console.log('[BattleManager] 进入 omniscient 流循环');
        let chunkCount = 0;
        
        for await (const chunk of this.engine.omniscient) {
          chunkCount++;
          const chunkStr = chunk.toString();
          console.log(`[BattleManager] ========== 收到 omniscient 输出 #${chunkCount} (${chunkStr.length} 字节) ==========`);
          console.log(`[BattleManager] 当前连接数: ${Object.keys(this.connections).length}`);
          console.log(`[BattleManager] 时间戳: ${new Date().toISOString()}`);
          
          // 监控：记录协议
          this.logProtocol('omniscient', chunkStr, { length: chunkStr.length, chunkIndex: chunkCount });
          
          // 保存协议数据，用于重连时重新发送
          this._sentProtocols.push(chunkStr);
          console.log(`[BattleManager] 已保存协议到缓存，当前缓存数: ${this._sentProtocols.length}`);
          
          // 关键修复：检查是否包含 request 协议（使用更宽松的匹配）
          // 因为 request 协议可能在不同的 chunk 中，或者在 teampreview 之后稍晚发送
          if (chunkStr.includes('|request|')) {
            console.log(`[BattleManager] 🔥🔥🔥 ========== 在 omniscient 流中检测到 request 协议！==========`);
            console.log(`[BattleManager] request 协议位置: ${chunkStr.indexOf('|request|')}`);
            console.log(`[BattleManager] request 协议上下文:`, chunkStr.substring(Math.max(0, chunkStr.indexOf('|request|') - 50), chunkStr.indexOf('|request|') + 500));
          } else {
            // 如果没有 request 协议，检查是否刚刚收到了 teampreview
            if (chunkStr.includes('teampreview')) {
              console.log(`[BattleManager] ⚠️ 收到 teampreview 但当前 chunk 中没有 request 协议`);
              console.log(`[BattleManager] ⚠️ request 协议可能在下一个 chunk 中，或者引擎还在等待某些条件`);
            }
          }
          
          // 检查关键协议（只记录关键协议，减少日志输出）
          const hasRequest = chunkStr.includes('|request|');
          const hasTeamPreview = chunkStr.includes('|teampreview|');
          const hasStart = chunkStr.includes('|start|');
          
          // 只在关键协议时输出详细日志
          if (hasRequest || hasTeamPreview || hasStart) {
            const lines = chunkStr.split('\n').filter(line => line.trim());
            console.log(`[BattleManager] 收到关键协议 (${lines.length} 行): request=${hasRequest}, teampreview=${hasTeamPreview}, start=${hasStart}`);
          }
          
          // 检查是否包含重要协议
          if (hasRequest) {
            console.log('[BattleManager] 🔥🔥🔥 ========== 检测到 request 协议！==========');
            // 清除等待标志
            this._waitingForRequest = false;
            
            // 计算从 teampreview 到 request 的时间
            if (this._teampreviewTime) {
              const elapsed = Date.now() - this._teampreviewTime;
              console.log(`[BattleManager] ⏱️ 从 teampreview 到 request 的时间: ${elapsed}ms`);
              delete this._teampreviewTime;
            }
            
            // 找到 request 协议的位置
            const requestIndex = chunkStr.indexOf('|request|');
            console.log(`[BattleManager] request 协议位置: ${requestIndex}`);
            console.log(`[BattleManager] request 协议上下文:`, chunkStr.substring(Math.max(0, requestIndex - 50), requestIndex + 300));
            
            // 提取 request 协议行
            const requestLine = lines.find(line => line.startsWith('|request|'));
            if (requestLine) {
              console.log(`[BattleManager] request 协议完整内容: ${requestLine.substring(0, 500)}`);
              try {
                const req = JSON.parse(requestLine.slice('|request|'.length));
                console.log(`[BattleManager] request 解析结果:`, JSON.stringify(req).substring(0, 500));
                if (req.side) {
                  console.log(`[BattleManager] request.side.id: ${req.side.id}`);
                  console.log(`[BattleManager] request.teamPreview: ${req.teamPreview}`);
                }
              } catch (e) {
                console.error(`[BattleManager] request 解析失败:`, e);
                console.error(`[BattleManager] request 行内容: ${requestLine.substring(0, 200)}`);
              }
            }
          } else {
            // 如果没有 request 协议，检查为什么
            if (hasTeamPreview) {
              console.log('[BattleManager] 🔥 收到 teampreview 协议！');
              console.log('[BattleManager] ⚠️ 收到 teampreview 协议，但没有 request 协议');
              console.log('[BattleManager] ⚠️ 这可能意味着：');
              console.log('[BattleManager] ⚠️ 1. request 协议将在后续 chunk 中发送（最可能）');
              console.log('[BattleManager] ⚠️ 2. 对战引擎还在等待某些条件');
              console.log('[BattleManager] ⚠️ 3. 需要等待更多协议');
              console.log('[BattleManager] ⚠️ 4. 对战引擎需要等待玩家选择后才能发送 request');
              console.log('[BattleManager] ⚠️ 注意：Pokemon Showdown 的标准行为是：');
              console.log('[BattleManager] ⚠️   - teampreview 后，引擎会发送 request 协议给双方玩家');
              console.log('[BattleManager] ⚠️   - 但是 request 可能在不同的 chunk 中发送');
              console.log('[BattleManager] ⚠️   - 或者需要等待玩家/AI 选择后才会发送下一个 request');
              
              // 检查是否有连接（如果有连接，request 应该会被发送到客户端）
              const connectionCount = Object.keys(this.connections).length;
              if (connectionCount === 0) {
                console.log('[BattleManager] ⚠️⚠️⚠️ 没有连接！request 协议可能无法转发到客户端');
              } else {
                console.log(`[BattleManager] ✅ 有 ${connectionCount} 个连接，request 协议应该会被转发`);
              }
            }
            
            // 统计 poke 协议数量
            const pokeLines = lines.filter(line => line.startsWith('|poke|'));
            const pokeCount = pokeLines.length;
            if (pokeCount > 0) {
              console.log(`[BattleManager] 收到 ${pokeCount} 个 poke 协议`);
              if (pokeCount < 12) {
                console.log(`[BattleManager] ⚠️ poke 协议数量不足（期望至少12个，实际${pokeCount}个），可能还在发送中`);
                console.log(`[BattleManager] 前3个poke协议:`, pokeLines.slice(0, 3).map(l => l.substring(0, 100)));
              } else {
                console.log(`[BattleManager] ✅ poke 协议数量充足（${pokeCount}个）`);
              }
            }
          }
          
          if (hasTeamPreview) {
            console.log('[BattleManager] 🔥 检测到 teampreview 协议！');
          }
          
          if (hasSwitch) {
            console.log('[BattleManager] 🔥 检测到 switch 协议！');
          }
          
          // 转发给所有连接的客户端
          const connectionCount = Object.keys(this.connections).length;
          
          if (connectionCount === 0) {
            // 缓存协议，等待连接添加后再转发
            if (!this._pendingChunks) {
              this._pendingChunks = [];
            }
            this._pendingChunks.push(chunkStr);
            // 只在关键协议时输出警告
            if (hasRequest || hasTeamPreview || hasStart) {
              console.log(`[BattleManager] ⚠️ 没有连接，缓存协议 (当前缓存数: ${this._pendingChunks.length})`);
            }
          } else {
            // 如果有缓存的协议，先发送缓存的协议（快速发送，不阻塞）
            if (this._pendingChunks && this._pendingChunks.length > 0) {
              const cachedCount = this._pendingChunks.length;
              // 优化：批量发送缓存的协议，使用 setImmediate 确保不阻塞当前事件循环
              setImmediate(() => {
                this._pendingChunks.forEach((cachedChunk) => {
                  Object.values(this.connections).forEach((ws) => {
                    if (ws && ws.readyState === 1) {
                      try {
                        ws.send(cachedChunk);
                      } catch (e) {
                        console.error(`[BattleManager] ❌ 转发缓存的协议失败:`, e);
                      }
                    }
                  });
                });
                this._pendingChunks = [];
                console.log(`[BattleManager] ✅ 已发送 ${cachedCount} 个缓存的协议`);
              });
            }
            
            // 转发当前协议（立即转发，不延迟）
            
            // 优化：立即转发协议，不延迟
            Object.values(this.connections).forEach((ws, index) => {
              if (ws && ws.readyState === 1) { // WebSocket.OPEN
                try {
                  // 验证消息内容
                  if (!chunkStr || chunkStr.length === 0) {
                    return;
                  }
                  
                  // 检查协议内容（只记录关键协议）
                  const hasRequest = chunkStr.includes('|request|');
                  const hasStart = chunkStr.includes('|start|');
                  const hasTeamPreview = chunkStr.includes('|teampreview|');
                  
                  // 只在关键协议时输出详细日志
                  if (hasRequest) {
                    console.log(`[BattleManager] 🔥 立即转发 request 协议到连接 #${index + 1}`);
                  }
                  
                  // 立即发送消息（禁用压缩以提高性能）
                  const sendResult = ws.send(chunkStr, { compress: false });
                  if (sendResult === false) {
                    console.error(`[BattleManager] ⚠️ send() 返回 false`);
                  } else if (hasRequest) {
                    console.log(`[BattleManager] ✅ request 协议已立即发送 (${chunkStr.length} 字节)`);
                  }
                  
                  // 优化：只在关键协议时发送ping，且使用异步方式避免阻塞
                  if (hasRequest || hasStart || hasTeamPreview) {
                    // 使用 setImmediate 异步发送ping，不阻塞协议转发
                    setImmediate(() => {
                      try {
                        ws.ping();
                      } catch (pingError) {
                        // 静默处理
                      }
                    });
                  }
                } catch (e) {
                  console.error(`[BattleManager] ❌ 转发失败 (连接 ${index + 1}):`, e);
                }
              }
            });
          }

          // 检查是否包含 request 协议（在 omniscient 流中）
          if (chunkStr.includes('|request|')) {
            console.log(`[BattleManager-omniscient] 🔥🔥🔥 ========== 在 omniscient 流中检测到 request 协议！==========`);
            const requestLines = chunkStr.split('\n').filter(line => line.startsWith('|request|'));
            requestLines.forEach((line, index) => {
              console.log(`[BattleManager-omniscient] request 协议 #${index + 1}: ${line.substring(0, 300)}`);
            });
          }
          
          // 路由协议到处理器
          console.log('[BattleManager] 开始路由协议');
          this.router.route(chunkStr);
          console.log('[BattleManager] 协议路由完成');
        }
      } catch (error) {
        console.error('[BattleManager] omniscient 流错误:', error);
        console.error('[BattleManager] 错误堆栈:', error.stack);
        this._omniscientListenerRunning = false;
      }
    })();
    console.log('[BattleManager] omniscient 流监听已启动（异步）');
  }
  
  /**
   * 启动 p1 和 p2 流监听（用于接收 request 协议）
   */
  startPlayerStreamListeners() {
    console.log('[BattleManager] ========== 启动 p1 和 p2 流监听 ==========');
    
    // 监听 p1 流
    (async () => {
      try {
        console.log('[BattleManager] 开始监听 p1 流...');
        for await (const chunk of this.engine.p1) {
          const chunkStr = chunk.toString();
          console.log(`[BattleManager-p1] ========== 收到 p1 流输出 (${chunkStr.length} 字节) ==========`);
          console.log(`[BattleManager-p1] 内容:`, chunkStr.substring(0, 500));
          
          // 检查是否包含 request 协议
          if (chunkStr.includes('|request|')) {
            console.log(`[BattleManager-p1] 🔥🔥🔥 ========== 在 p1 流中检测到 request 协议！==========`);
            console.log(`[BattleManager-p1] request 协议内容:`, chunkStr);
            
            // 监控：记录 request 协议（p1 流）
            this.logProtocol('p1-stream', chunkStr, { 
              stream: 'p1', 
              length: chunkStr.length 
            });
            
            // 将 request 协议路由到处理器
            const lines = chunkStr.split('\n');
            for (const line of lines) {
              if (line.startsWith('|request|')) {
                console.log(`[BattleManager-p1] 路由 p1 request 协议到处理器...`);
                this.router.handleRequest(line);
              }
            }
          }
          
          // 转发到连接的客户端（如果有 p1 连接）
          // 优化：立即转发，不延迟
          if (this.connections.p1) {
            try {
              const hasRequest = chunkStr.includes('|request|');
              
              if (this.connections.p1.readyState === 1) {
                // 立即发送，不等待
                this.connections.p1.send(chunkStr);
                if (hasRequest) {
                  console.log(`[BattleManager-p1] 🔥 立即转发 p1 request 协议到客户端 (${chunkStr.length} 字节)`);
                }
              } else {
                if (hasRequest) {
                  console.warn(`[BattleManager-p1] ⚠️ p1 连接状态不是 OPEN (readyState: ${this.connections.p1.readyState})，无法转发 request`);
                }
              }
            } catch (e) {
              console.error(`[BattleManager-p1] ❌ 转发 p1 流消息失败:`, e);
            }
          } else {
            // 如果没有连接，缓存协议
            if (chunkStr.includes('|request|')) {
              console.warn(`[BattleManager-p1] ⚠️ 没有 p1 连接，request 协议将被缓存`);
              if (!this._pendingP1Chunks) {
                this._pendingP1Chunks = [];
              }
              this._pendingP1Chunks.push(chunkStr);
            }
          }
        }
      } catch (error) {
        console.error('[BattleManager-p1] ❌ p1 流错误:', error);
      }
    })();
    
    // 监听 p2 流（AI 模式和 PvP 模式都需要）
    // 在 PvP 模式下，p2 流也会发送 request 协议给 p2 玩家
    (async () => {
      try {
        const modeLabel = this.mode === 'ai' ? 'AI模式' : 'PvP模式';
        console.log(`[BattleManager] 开始监听 p2 流（${modeLabel}）...`);
        for await (const chunk of this.engine.p2) {
          const chunkStr = chunk.toString();
          console.log(`[BattleManager-p2] ========== 收到 p2 流输出 (${chunkStr.length} 字节) ==========`);
          console.log(`[BattleManager-p2] 内容:`, chunkStr.substring(0, 500));
          
          // 检查是否包含 request 协议
          if (chunkStr.includes('|request|')) {
            console.log(`[BattleManager-p2] 🔥🔥🔥 ========== 在 p2 流中检测到 request 协议！==========`);
            console.log(`[BattleManager-p2] request 协议内容:`, chunkStr);
            
            // 监控：记录 request 协议（p2 流）
            this.logProtocol('p2-stream', chunkStr, { 
              stream: 'p2', 
              length: chunkStr.length 
            });
            
            // 将 request 协议路由到处理器
            const lines = chunkStr.split('\n');
            for (const line of lines) {
              if (line.startsWith('|request|')) {
                console.log(`[BattleManager-p2] 路由 p2 request 协议到处理器...`);
                this.router.handleRequest(line);
              }
            }
          }
          
          // 转发到连接的客户端（PvP 模式下需要转发给 p2 玩家）
          if (this.mode === 'pvp' && this.connections.p2) {
            try {
              // 检查是否是 request 协议
              if (chunkStr.includes('|request|')) {
                console.log(`[BattleManager-p2] 🔥🔥🔥 转发 p2 request 协议到客户端`);
                const requestLine = chunkStr.split('\n').find(line => line.startsWith('|request|'));
                if (requestLine) {
                  console.log(`[BattleManager-p2] request 协议内容: ${requestLine.substring(0, 300)}`);
                }
              }
              
              if (this.connections.p2.readyState === 1) {
                this.connections.p2.send(chunkStr);
                console.log(`[BattleManager-p2] ✅ 已转发 p2 流消息到客户端 (${chunkStr.length} 字节)`);
              } else {
                console.warn(`[BattleManager-p2] ⚠️ p2 连接状态不是 OPEN (readyState: ${this.connections.p2.readyState})`);
              }
            } catch (e) {
              console.error(`[BattleManager-p2] ❌ 转发 p2 流消息失败:`, e);
              console.error(`[BattleManager-p2] 错误详情:`, e.message, e.stack);
            }
          } else if (this.mode === 'ai') {
            // AI 模式下，p2 流不需要转发到客户端（因为它是 AI）
            console.log(`[BattleManager-p2] AI 模式，p2 流不需要转发到客户端`);
          } else if (this.mode === 'pvp' && !this.connections.p2) {
            console.warn(`[BattleManager-p2] ⚠️ PvP 模式但没有 p2 连接，无法转发 p2 流消息`);
          }
        }
      } catch (error) {
        console.error('[BattleManager-p2] ❌ p2 流错误:', error);
        console.error('[BattleManager-p2] 错误堆栈:', error.stack);
      }
    })();
    
    console.log('[BattleManager] p1 和 p2 流监听已启动');
  }

  /**
   * 添加WebSocket连接
   */
  addConnection(side, ws) {
    console.log(`[BattleManager] 添加连接: ${side}`);
    
    // 检查是否是重连（旧连接已存在）
    const isReconnect = !!this.connections[side];
    const oldWs = this.connections[side];
    
    if (isReconnect) {
      console.log(`[BattleManager] ⚠️ 检测到重连：${side} 的连接已存在，将替换旧连接`);
      if (oldWs && oldWs.readyState !== oldWs.CLOSED && oldWs.readyState !== oldWs.CLOSING) {
        console.log(`[BattleManager] 旧连接状态: ${oldWs.readyState} (OPEN=1, CLOSING=2, CLOSED=3)`);
        console.log(`[BattleManager] 旧连接ID: ${oldWs._connectionId || 'N/A'}`);
      }
      console.log(`[BattleManager] 新连接ID: ${ws._connectionId || 'N/A'}`);
      console.log(`[BattleManager] 新连接状态: ${ws.readyState} (OPEN=1)`);
      
      // 重要：先关闭旧连接，避免旧连接继续接收协议
      if (oldWs && oldWs.readyState === WebSocket.OPEN) {
        console.log(`[WebSocket Monitor] ========== 后端：BattleManager 关闭旧连接 ==========`);
        console.log(`[WebSocket Monitor] 旧连接ID: ${oldWs._connectionId || 'N/A'}`);
        console.log(`[WebSocket Monitor] 新连接ID: ${ws._connectionId || 'N/A'}`);
        console.log(`[WebSocket Monitor] side: ${side}`);
        console.log(`[WebSocket Monitor] 时间: ${new Date().toISOString()}`);
        console.log(`[WebSocket Monitor] 调用栈:`, new Error().stack.split('\n').slice(1, 6).join('\n'));
        console.log(`[BattleManager] 关闭旧连接 (${side})`);
        try {
          oldWs.close(1000, 'Replaced by new connection');
          console.log(`[WebSocket Monitor] ✅ 旧连接已关闭 (代码: 1000)`);
          console.log(`[BattleManager] ✅ 旧连接已关闭`);
        } catch (e) {
          console.error(`[WebSocket Monitor] ❌ 关闭旧连接时出错:`, e);
          console.warn(`[BattleManager] 关闭旧连接时出错:`, e);
        }
      }
    }
    
    // 添加 WebSocket 诊断工具
    const WebSocketDiagnostics = require('./WebSocketDiagnostics');
    const diagnostics = new WebSocketDiagnostics(ws, `BattleManager-${side}`);
    ws._diagnostics = diagnostics;
    
    // 替换连接
    this.connections[side] = ws;
    // 标记为重连的连接，用于日志追踪
    if (isReconnect) {
      ws._isReconnected = true;
      ws._reconnectedAt = Date.now();
    }
    console.log(`[BattleManager] ✅ 新连接已设置到 connections[${side}]`);
    console.log(`[BattleManager] 连接状态检查: readyState=${ws.readyState} (OPEN=1, CLOSING=2, CLOSED=3)`);
    console.log(`[BattleManager] 连接ID: ${ws._connectionId || 'N/A'}`);
    console.log(`[BattleManager] 当前所有连接: p1=${!!this.connections.p1}, p2=${!!this.connections.p2}`);
    if (this.connections.p1) {
      console.log(`[BattleManager] p1连接状态: ${this.connections.p1.readyState} (OPEN=1, CLOSING=2, CLOSED=3)`);
    }
    if (this.connections.p2) {
      console.log(`[BattleManager] p2连接状态: ${this.connections.p2.readyState} (OPEN=1, CLOSING=2, CLOSED=3)`);
    }
    
    // 如果是玩家处理器，设置WebSocket
    if (this.handlers[side] && this.handlers[side].setConnection) {
      this.handlers[side].setConnection(ws);
      console.log(`[BattleManager] ✅ 已更新处理器连接`);
    }
    
    // 优化：如果这是 p1 连接，立即发送缓存的 p1 流协议（如果有）
    if (side === 'p1' && this._pendingP1Chunks && this._pendingP1Chunks.length > 0) {
      console.log(`[BattleManager] 发现 ${this._pendingP1Chunks.length} 个缓存的 p1 流协议，立即发送`);
      this._pendingP1Chunks.forEach((cachedChunk) => {
        if (ws.readyState === 1) {
          try {
            ws.send(cachedChunk);
            if (cachedChunk.includes('|request|')) {
              console.log(`[BattleManager] ✅ 已发送缓存的 p1 request 协议`);
            }
          } catch (e) {
            console.error(`[BattleManager] ❌ 发送缓存的 p1 协议失败:`, e);
          }
        }
      });
      this._pendingP1Chunks = [];
    }
    
    // 如果是重连，发送重连确认消息和已保存的协议数据
    if (isReconnect) {
      console.log(`[BattleManager] ========== 重连场景：${side} ==========`);
      console.log(`[BattleManager] 发送重连确认消息给客户端`);
      console.log(`[BattleManager] 新连接状态: ${ws.readyState} (OPEN=1)`);
      
      // 确保连接是OPEN状态再发送
      if (ws.readyState === WebSocket.OPEN) {
        try {
          // 先发送重连确认消息
          ws.send(JSON.stringify({
            type: 'battle-reconnected',
            payload: {
              side: side,
              roomId: ws._roomId || 'N/A',
              message: '重连成功，对战继续进行'
            }
          }));
          console.log(`[BattleManager] ✅ 重连确认消息已发送`);
          
          // 然后发送已保存的协议数据
          if (this._sentProtocols && this._sentProtocols.length > 0) {
            console.log(`[BattleManager] 发现 ${this._sentProtocols.length} 个已保存的协议，重新发送给新连接`);
            
            // 使用 setTimeout 确保重连确认消息先到达，然后再发送协议
            setTimeout(() => {
              this._sentProtocols.forEach((protocol, idx) => {
                try {
                  // 检查协议内容
                  const hasRequest = protocol.includes('|request|');
                  const hasStart = protocol.includes('|start|');
                  const hasPoke = protocol.includes('|poke|');
                  const hasTeamPreview = protocol.includes('|teampreview|');
                  
                  console.log(`[BattleManager] 重新发送协议 #${idx + 1} (${protocol.length} 字节)`);
                  console.log(`[BattleManager] 协议内容检查: request=${hasRequest}, start=${hasStart}, poke=${hasPoke}, teampreview=${hasTeamPreview}`);
                  console.log(`[BattleManager] 协议预览（前200字符）: ${protocol.substring(0, 200)}`);
                  
                  ws.send(protocol);
                  console.log(`[BattleManager] ✅ 已重新发送协议 #${idx + 1} 到重连的连接`);
                  
                  // 强制刷新TCP缓冲区
                  const protocolSize = Buffer.byteLength(protocol, 'utf8');
                  if (protocolSize < 4096) {
                    try {
                      ws.ping();
                      console.log(`[BattleManager] 🔄 发送 ping 刷新协议`);
                    } catch (e) {
                      // 忽略错误
                    }
                  }
                } catch (e) {
                  console.error(`[BattleManager] ❌ 重新发送协议 #${idx + 1} 失败:`, e);
                  console.error(`[BattleManager] 错误详情:`, e.message, e.stack);
                }
              });
              console.log(`[BattleManager] ✅ 已重新发送所有协议到重连的连接`);
              
              // 重要：检查是否缺少关键协议
              const allProtocols = this._sentProtocols.join('\n');
              const hasRequestInAll = allProtocols.includes('|request|');
              const hasTeamPreviewInAll = allProtocols.includes('|teampreview|');
              const hasStartInAll = allProtocols.includes('|start|');
              
              console.log(`[BattleManager] 已保存协议检查: request=${hasRequestInAll}, teampreview=${hasTeamPreviewInAll}, start=${hasStartInAll}`);
              
              if (!hasRequestInAll) {
                console.warn(`[BattleManager] ⚠️⚠️⚠️ 已保存的协议中没有 request 协议！`);
                console.warn(`[BattleManager] ⚠️⚠️⚠️ 这可能意味着：`);
                console.warn(`[BattleManager] ⚠️⚠️⚠️ 1. request 协议在重连之后才发送（正常情况）`);
                console.warn(`[BattleManager] ⚠️⚠️⚠️ 2. request 协议会通过 omniscient 流继续发送到新连接`);
                console.warn(`[BattleManager] ⚠️⚠️⚠️ 3. 新连接会继续接收后续的协议，包括 request`);
              }
            }, 100); // 延迟100ms，确保重连确认消息先到达
          } else {
            console.log(`[BattleManager] ⚠️ 没有已保存的协议数据`);
            console.log(`[BattleManager] ⚠️ 新连接将等待接收新的协议数据`);
          }
          
          // 重要：确保 omniscient 流监听器正在运行，以便继续接收新协议
          if (!this._omniscientListenerRunning) {
            console.warn(`[BattleManager] ⚠️ omniscient 流监听器未运行，重新启动`);
            this.startOmniscientListener();
          } else {
            console.log(`[BattleManager] ✅ omniscient 流监听器正在运行，新连接将继续接收协议`);
          }
        } catch (e) {
          console.error(`[BattleManager] ❌ 发送重连确认消息失败:`, e);
          console.error(`[BattleManager] 错误详情:`, e.message, e.stack);
        }
      } else {
        console.error(`[BattleManager] ❌ 连接状态不是OPEN，无法发送重连确认消息 (readyState: ${ws.readyState})`);
      }
    }
    
    // 如果这是第一个连接，立即发送初始化命令
    // 优化：立即发送，不使用 process.nextTick，避免延迟
    if (Object.keys(this.connections).length === 1 && !isReconnect) {
      console.log('[BattleManager] 第一个连接已添加，立即发送初始化命令');
      
      if (this._initCommands) {
        try {
          // 确保命令格式正确
          const commands = this._initCommands + '\n';
          // 立即写入，不使用 process.nextTick
          this.engine.omniscient.write(commands);
          console.log('[BattleManager] ✅ 初始化命令已立即发送');
          // 清除临时变量
          delete this._initCommands;
        } catch (e) {
          console.error('[BattleManager] ❌ 发送初始化命令失败:', e);
        }
      }
    }
  }

  /**
   * 处理玩家选择
   */
  handlePlayerChoice(side, choice) {
    console.log(`[BattleManager] 处理玩家选择: ${side}, ${choice}`);
    
    if (!this.handlers[side]) {
      console.error(`[BattleManager] 没有找到 ${side} 的处理器`);
      return false;
    }

    return this.handlers[side].receiveChoice(choice);
  }

  /**
   * 发送选择到引擎
   */
  sendChoice(side, choice) {
    const stream = this.engine[side];
    if (!stream) {
      console.error(`[BattleManager] 没有找到 ${side} 的流`);
      return false;
    }

    // 关键修复：根据 Pokemon Showdown 源码分析
    // 1. p1/p2 流会自动添加 >p1/>p2 前缀（battle-stream.ts 第268/273行）
    // 2. 所以我们写入流时不应该包含 >p1/>p2 前缀，只写入命令本身
    // 3. 格式应该是：
    //    - 队伍预览：`team 1` 或 `team 123456`（连续数字，不需要逗号）
    //    - 默认选择：`default`
    //    - 技能：`move 1`
    //    - 换人：`switch 2`
    
    let command;
    if (choice.startsWith('team ')) {
      // 队伍预览选择：格式为 `team 1` 或 `team 123456`
      // 根据 SIMULATOR.md 和测试代码，单打可以使用 `team 1`（单个数字）
      // 或者 `team 123456`（连续数字，表示完整的队伍顺序）
      const position = choice.replace('team ', '').trim();
      const positionNum = parseInt(position, 10);
      
      if (!isNaN(positionNum) && positionNum >= 1 && positionNum <= 6) {
        // 对于单打对战，我们只需要选择一个位置作为首发
        // 格式：`team 1`（单个位置）
        // 注意：p1/p2 流会自动添加 >p1/>p2 前缀，所以我们只写入 `team 1`
        command = `team ${positionNum}`;
        console.log(`[BattleManager] 🔧 队伍预览选择: team ${positionNum}`);
      } else {
        // 如果位置不是数字，保持原始格式（去掉 team 前缀后）
        command = choice.replace('team ', '');
      }
    } else if (choice === 'default') {
      // 默认选择：格式为 `default`
      command = 'default';
      console.log(`[BattleManager] 🔧 默认选择: default`);
    } else {
      // 其他选择（如 `move 1`、`switch 2` 等）
      // 注意：p1/p2 流会自动添加 >p1/>p2 前缀，所以我们只写入命令本身
      command = choice;
    }
    
    console.log(`[BattleManager] 发送选择到引擎（${side}流）: ${command}`);
    console.log(`[BattleManager] 注意：${side} 流会自动添加 >${side} 前缀`);
    console.log(`[BattleManager] 最终命令将是: >${side} ${command}`);
    console.log(`[BattleManager] 选择类型: ${choice.startsWith('team ') ? '队伍预览' : choice === 'default' ? '默认' : '其他'}`);
    console.log(`[BattleManager] 流对象:`, stream ? '存在' : '不存在');
    console.log(`[BattleManager] 流类型:`, stream?.constructor?.name);
    console.log(`[BattleManager] 流写入方法:`, typeof stream.write);
    
    try {
      // 关键修复：p1/p2 流的 write 方法使用正则表达式 `/(^|\n)/g` 来添加前缀
      // 如果我们在命令后面添加换行符，会导致额外的空命令
      // 例如："team 1\n" 会被替换为 ">p1 team 1\n>p1 "，第二个 ">p1 " 是空命令
      // 解决方案：只写入命令本身，不加换行符，让流的 write 方法处理
      // 但是，根据 Pokemon Showdown 的标准，命令应该以换行符结尾
      // 让我们测试：如果命令本身不包含换行符，流的 write 方法会如何处理
      // 
      // 实际上，流的 write 方法会匹配行首和换行符，所以：
      // - "team 1" -> ">p1 team 1" （只匹配行首）
      // - "team 1\n" -> ">p1 team 1\n>p1 " （匹配行首和换行符）
      // 
      // 我们应该只写入命令本身，不加换行符
      console.log(`[BattleManager] 写入流的命令:`, JSON.stringify(command));
      
      // 写入流（p1/p2 流会自动添加 >p1/>p2 前缀）
      // 注意：不要添加换行符，因为流的 write 方法会处理
      stream.write(command);
      console.log(`[BattleManager] ✅ 命令已写入流`);
      
      // 检查流状态
      if (stream.destroyed) {
        console.error(`[BattleManager] ⚠️ 流已被销毁！`);
      }
      if (stream.closed) {
        console.error(`[BattleManager] ⚠️ 流已关闭！`);
      }
      
      return true;
    } catch (e) {
      console.error(`[BattleManager] ❌ 写入流失败:`, e);
      console.error(`[BattleManager] 错误详情:`, e.message, e.stack);
      console.error(`[BattleManager] 流状态:`, {
        destroyed: stream.destroyed,
        closed: stream.closed,
        readable: stream.readable,
        writable: stream.writable
      });
      return false;
    }
  }

  /**
   * 获取处理器
   */
  getHandler(side) {
    return this.handlers[side];
  }

}

module.exports = BattleManager;

