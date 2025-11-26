/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PvP 对战处理器（PvPHandler.js）- 双人对战流程管理
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📋 核心职责
 * ──────────────────────────────────────────────────────────────────────────
 * PvPHandler 是双人对战（PvP）的核心协调模块，负责：
 *   1. 对战流程管理
 *      - 处理 start 消息，启动或重连对战
 *      - 验证房间状态和玩家身份
 *      - 协调双方玩家的连接和队伍提交
 * 
 *   2. 重连处理
 *      - 检测房间状态为 'battling' 时，复用已有 BattleManager
 *      - 通过 payload.side 或房间 players 列表确定玩家身份
 *      - 替换旧连接，重发协议数据
 * 
 *   3. 连接管理
 *      - 管理玩家连接与房间的绑定关系
 *      - 处理连接冲突（多个标签页同时连接）
 *      - 确保连接 ID 和 side 的正确映射
 * 
 * 🔄 对战流程
 * ──────────────────────────────────────────────────────────────────────────
 * 
 *   玩家1创建房间 → 玩家2加入房间 → 双方发送 start → 开始对战
 *        │              │              │              │
 *        ▼              ▼              ▼              ▼
 *    roomId生成    roomId验证    队伍验证      创建BattleManager
 *    side=p1       side=p2       状态检查      初始化对战
 *                                                              │
 *                                                              ▼
 *                                                    双方进入对战页面
 *                                                              │
 *                                                              ▼
 *                                                    接收协议，开始对战
 * 
 * 🔄 重连流程
 * ──────────────────────────────────────────────────────────────────────────
 * 
 *   玩家刷新/重连 → 检测房间状态 → 确定玩家身份 → 复用BattleManager
 *         │              │              │              │
 *         ▼              ▼              ▼              ▼
 *   创建新连接     status=battling   从payload获取   替换旧连接
 *                 已有BattleManager  或推断side      重发协议
 * 
 * ⚠️ 关键逻辑
 * ──────────────────────────────────────────────────────────────────────────
 * - 双方都准备好后（isReady()），立即创建 SimplePvPManager
 * - 跳转页面时，新连接会替换 lobby 中的旧连接
 * - 使用 connectionId 唯一标识每个连接
 * - 协议缓存机制确保重连时不会丢失数据
 * 
 * 📦 依赖模块
 * ──────────────────────────────────────────────────────────────────────────
 * - RoomManager: 管理房间状态和玩家连接
 * - SimplePvPManager: 实际的对战引擎管理器
 * - battles Map: 存储 connectionId -> BattleManager 映射
 */
const RoomManager = require('../domain/rooms/RoomManager');
const SimplePvPManager = require('../domain/battles/SimplePvPManager');

class PvPHandler {
  /**
   * 构造函数
   * 
   * @param {RoomManager} roomManager - 房间管理器实例
   * @param {Map} battles - 对战实例映射（connectionId -> BattleManager）
   */
  constructor(roomManager, battles) {
    this.roomManager = roomManager;  // 房间管理器引用
    this.battles = battles;          // 对战实例映射
  }

  /**
   * 处理 PvP 对战的 start 消息
   * 
   * 功能：
   * - 处理玩家发送的 start 消息，启动或重连 PvP 对战
   * - 查找或创建房间
   * - 处理重连场景（房间状态为 'battling'）
   * - 等待双方都准备好后开始对战
   * 
   * @param {WebSocket} ws - WebSocket 连接对象
   * @param {Object} payload - start 消息的 payload
   *   - roomId: 房间ID（必需）
   *   - side: 玩家身份 'p1' 或 'p2'（重连时必需）
   *   - formatid: 对战格式，默认 'gen9ou'
   *   - team: 玩家队伍数组
   * 
   * 流程：
   * 1. 验证房间ID → 2. 查找房间 → 3. 检查房间状态
   *    - 如果状态是 'battling'：尝试重连
   *    - 如果状态是 'waiting'：加入房间，等待对方
   *    - 如果双方都准备好：开始对战
   */
  async handleStart(ws, payload) {
    console.log('[PvPHandler] ========== 处理 PvP 对战 start 消息 ==========');
    console.log('[PvPHandler] payload:', JSON.stringify(payload).substring(0, 500));
    console.log('[PvPHandler] 连接ID:', ws._connectionId);
    console.log('[PvPHandler] 连接状态:', ws.readyState, '(OPEN=1)');
    console.log('[PvPHandler] 连接URL:', ws.url || 'N/A');

    try {
      ws._mode = 'pvp';
      
      const roomId = payload.roomId;
      if (!roomId) {
        console.error('[PvPHandler] ❌ 缺少房间ID');
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: '缺少房间ID' }
        }));
        return;
      }

      console.log('[PvPHandler] 查找房间:', roomId);
      let room = this.roomManager.getRoom(roomId);
      if (!room) {
        // 房间不存在，可能是跳转时被删除了
        // 尝试通过battles Map查找是否有正在进行的对战
        console.warn('[PvPHandler] ⚠️ 房间不存在，尝试查找正在进行的对战:', roomId);
        
        // 检查是否有BattleManager正在使用这个roomId
        // 由于battles Map存储的是connectionId -> BattleManager，我们需要另一种方式
        // 暂时返回错误，但提供更详细的提示
        console.error('[PvPHandler] ❌ 房间不存在:', roomId);
        console.error('[PvPHandler] 可能的原因：1. 房间已过期 2. 两个玩家都跳转导致房间被删除');
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: '房间不存在或已过期。请重新创建房间或确保两个玩家都准备好后再跳转。' }
        }));
        return;
      }
      
      console.log('[PvPHandler] ✅ 找到房间:', roomId, '状态:', room.status);
      console.log('[PvPHandler] 房间players:', {
        p1: !!room.players.p1,
        p2: !!room.players.p2,
        p1State: room.players.p1?.readyState,
        p2State: room.players.p2?.readyState
      });
      console.log('[PvPHandler] 当前连接是否在players中:', {
        isP1: room.players.p1 === ws,
        isP2: room.players.p2 === ws
      });

      // 如果房间状态是battling，说明对战已开始，应该复用已有BattleManager
      // 优先检查这个，避免处理不必要的逻辑
      if (room.status === 'battling' && room.battleManager) {
        console.log('[PvPHandler] 房间状态是battling，尝试重连');
        console.log('[PvPHandler] payload.side:', payload.side);
        console.log('[PvPHandler] 当前连接ID:', ws._connectionId);
        console.log('[PvPHandler] room.players.p1连接ID:', room.players.p1?._connectionId);
        console.log('[PvPHandler] room.players.p2连接ID:', room.players.p2?._connectionId);
        console.log('[PvPHandler] BattleManager连接状态: p1=', room.battleManager.connections.p1?.readyState, 'p2=', room.battleManager.connections.p2?.readyState);
        
        // 尝试通过payload中的side信息确定身份
        const requestedSide = payload.side;
        if (requestedSide && (requestedSide === 'p1' || requestedSide === 'p2')) {
          console.log(`[PvPHandler] ✅ 从payload中获取到side: ${requestedSide}`);
          return await this.handleReconnect(ws, payload, room, roomId);
        } else {
          // 没有side信息，尝试从房间的players列表中查找
          console.log('[PvPHandler] ⚠️ payload中没有side信息，尝试从房间players中查找');
          if (room.players.p1 === ws) {
            console.log('[PvPHandler] ✅ 当前连接是 p1');
            ws._side = 'p1';
            ws._roomId = roomId;
            return await this.handleReconnect(ws, payload, room, roomId);
          } else if (room.players.p2 === ws) {
            console.log('[PvPHandler] ✅ 当前连接是 p2');
            ws._side = 'p2';
            ws._roomId = roomId;
            return await this.handleReconnect(ws, payload, room, roomId);
          } else {
            console.warn('[PvPHandler] ⚠️⚠️⚠️ 无法确定玩家side，payload中没有side信息，且不在players列表中');
            console.warn('[PvPHandler] ⚠️⚠️⚠️ 这可能是因为：');
            console.warn('[PvPHandler] ⚠️⚠️⚠️ 1. 玩家没有在start消息中包含side信息');
            console.warn('[PvPHandler] ⚠️⚠️⚠️ 2. 玩家的旧连接已经被移除，新连接还没有添加到players中');
            console.warn('[PvPHandler] ⚠️⚠️⚠️ 3. 需要从localStorage或其他方式获取side信息');
            
            // 尝试从BattleManager的连接中推断side
            // 如果BattleManager中只有一个连接，可以推断出另一个连接的side
            const battleManager = room.battleManager;
            if (battleManager) {
              const hasP1 = !!battleManager.connections.p1;
              const hasP2 = !!battleManager.connections.p2;
              console.log('[PvPHandler] BattleManager连接状态: hasP1=', hasP1, 'hasP2=', hasP2);
              
              if (!hasP1 && hasP2) {
                console.log('[PvPHandler] ✅ 推断：当前连接应该是 p1（因为p1连接缺失）');
                ws._side = 'p1';
                ws._roomId = roomId;
                return await this.handleReconnect(ws, { ...payload, side: 'p1' }, room, roomId);
              } else if (hasP1 && !hasP2) {
                console.log('[PvPHandler] ✅ 推断：当前连接应该是 p2（因为p2连接缺失）');
                ws._side = 'p2';
                ws._roomId = roomId;
                return await this.handleReconnect(ws, { ...payload, side: 'p2' }, room, roomId);
              }
            }
            
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: '无法确定玩家身份，请从房间大厅重新进入' }
            }));
            return;
          }
        }
      }

      // 确定玩家的side
      // 首先尝试从房间的players列表中查找
      if (room.players.p1 === ws) {
        ws._side = 'p1';
        ws._roomId = roomId;
      } else if (room.players.p2 === ws) {
        ws._side = 'p2';
        ws._roomId = roomId;
      } else {
        // 新连接（跳转后创建），尝试通过payload中的side信息确定身份
        const requestedSide = payload.side;
        if (requestedSide && (requestedSide === 'p1' || requestedSide === 'p2')) {
          console.log(`[PvPHandler] 新连接，通过payload确定side: ${requestedSide}`);
          // 检查旧连接是否还在
          const oldWs = room.players[requestedSide];
          if (oldWs) {
            const oldState = oldWs.readyState;
            // WebSocket状态：0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
            
            if (oldState === WebSocket.OPEN) {
              // 旧连接还在OPEN状态，可能是真正的冲突
              console.warn('[PvPHandler] ⚠️ 旧连接还在OPEN状态，无法替换');
              console.warn('[PvPHandler] 旧连接状态:', oldState, '新连接状态:', ws.readyState, '房间状态:', room.status);
              ws.send(JSON.stringify({
                type: 'error',
                payload: { message: '连接冲突：请关闭其他标签页' }
              }));
              return;
            } else if (oldState === WebSocket.CLOSING || oldState === WebSocket.CLOSED) {
              // 旧连接正在关闭或已关闭，允许替换
              console.log(`[PvPHandler] 旧连接状态: ${oldState} (CLOSING=${WebSocket.CLOSING}, CLOSED=${WebSocket.CLOSED})，允许替换`);
            } else {
              // 其他状态（CONNECTING），也允许替换
              console.log(`[PvPHandler] 旧连接状态: ${oldState} (CONNECTING)，允许替换`);
            }
          }
          
          // 替换旧连接
          console.log(`[PvPHandler] 替换旧连接 ${requestedSide}`);
          ws._side = requestedSide;
          ws._roomId = roomId;
          room.players[requestedSide] = ws;
          
          // 确保新连接的 _connectionId 已生成（使用更精确的唯一ID）
          if (!ws._connectionId) {
            console.warn('[PvPHandler] ⚠️ 新连接的 _connectionId 未生成，生成唯一ID');
            ws._connectionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }
          
          // 继续处理队伍保存逻辑
        } else {
          // 没有side信息，无法确定
          console.warn('[PvPHandler] ⚠️ 无法确定玩家side，payload中没有side信息');
          ws.send(JSON.stringify({
            type: 'error',
            payload: { message: '无法确定玩家身份，请从房间大厅重新进入' }
          }));
          return;
        }
      }

      console.log(`[PvPHandler] 对战模式: pvp, 玩家: ${ws._side}`);

      // 准备队伍
      const formatid = payload.formatid || 'gen9ou';
      const seed = payload.seed;

      // 解包或准备队伍对象
      let p1TeamObj;
      if (payload.team && Array.isArray(payload.team)) {
        p1TeamObj = payload.team;
        console.log('[PvPHandler] 使用提供的队伍对象数组，长度:', p1TeamObj.length);
      } else {
        console.log('[PvPHandler] 队伍不是对象数组，尝试解包或使用默认');
        const showdownAdapter = require('../adapters/pokemon-showdown/ShowdownAdapter');
        const Teams = showdownAdapter.getTeams();
        // 需要一个packTeamOrDefault函数，暂时使用空字符串
        const packedTeam = payload.team || '';
        try {
          p1TeamObj = Teams.unpack(packedTeam);
          console.log('[PvPHandler] 解包后的队伍长度:', p1TeamObj.length);
        } catch (e) {
          console.error('[PvPHandler] 解包队伍失败:', e);
          ws.send(JSON.stringify({
            type: 'error',
            payload: { message: '队伍格式错误' }
          }));
          return;
        }
      }

      // 如果房间状态是ready，说明第一个玩家已发送start，等待第二个玩家
      // 如果当前连接不在房间players列表中，说明是新连接，需要处理
      if (room.status === 'ready' && room.players.p1 !== ws && room.players.p2 !== ws) {
        console.log('[PvPHandler] ⚠️ 房间状态是ready，但当前连接不在players列表中');
        // 尝试通过payload中的side信息来确定身份
        const requestedSide = payload.side;
        if (requestedSide && (requestedSide === 'p1' || requestedSide === 'p2')) {
          // 检查旧连接是否还在
          const oldWs = room.players[requestedSide];
          if (oldWs) {
            const oldState = oldWs.readyState;
            if (oldState === WebSocket.OPEN) {
              // 旧连接还在OPEN状态，可能是真正的冲突
              console.warn('[PvPHandler] ⚠️ 旧连接还在OPEN状态，无法替换');
              ws.send(JSON.stringify({
                type: 'error',
                payload: { message: '连接冲突：请关闭其他标签页' }
              }));
              return;
            } else {
              // 旧连接正在关闭或已关闭，允许替换
              console.log(`[PvPHandler] 旧连接状态: ${oldState}，允许替换`);
            }
          }
          
          // 替换旧连接
          console.log(`[PvPHandler] 替换旧连接 ${requestedSide}`);
          ws._side = requestedSide;
          ws._roomId = roomId;
          room.players[requestedSide] = ws;
          
          // 继续处理队伍保存逻辑（在下面的代码中）
        } else {
          // 没有side信息，无法确定
          console.warn('[PvPHandler] ⚠️ 无法确定玩家side，payload中没有side信息');
          ws.send(JSON.stringify({
            type: 'error',
            payload: { message: '无法确定玩家身份，请从房间大厅重新进入' }
          }));
          return;
        }
      }

      // 对战还没开始，正常流程
      // 验证队伍
      const validation = this.roomManager.validateTeam(p1TeamObj);
      if (!validation.valid) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: validation.error }
        }));
        return;
      }

      const side = ws._side;
      
      // 检查是否已经发送过队伍（防止重复发送）
      // 只有在房间状态是 battling 时才阻止（对战已开始，不需要重新发送队伍）
      // 如果状态是 waiting 或 ready，允许更新队伍（可能是重新发送或修正）
      if (room.teams[side] && room.status === 'battling') {
        console.log(`[PvPHandler] ⚠️ ${side} 已经发送过队伍，且对战已开始，忽略重复请求`);
        // 仍然发送房间状态更新，但不重新保存队伍
        room.broadcast({
          type: 'room-update',
          payload: room.getStatus()
        });
        return;
      }
      
      // 如果队伍已存在但状态不是 battling，允许更新（可能是重新发送或修正）
      if (room.teams[side]) {
        console.log(`[PvPHandler] ⚠️ ${side} 已经发送过队伍，但允许更新（状态: ${room.status}）`);
        // 如果状态是 waiting，说明之前发送过但可能没处理完，允许重新发送
        // 如果状态是 ready，说明第一个玩家已发送，当前玩家是第二个，允许发送
        if (room.status === 'waiting' || room.status === 'ready') {
          console.log(`[PvPHandler] 允许 ${side} 重新发送队伍（状态: ${room.status}）`);
        }
      }
      
      console.log(`[PvPHandler] 保存队伍，side: ${side}, 队伍数量: ${p1TeamObj.length}`);
      room.setTeam(side, p1TeamObj);

      // 更新房间状态
      const roomStatus = room.getStatus();
      room.broadcast({
        type: 'room-update',
        payload: roomStatus
      });

      // 检查是否两个玩家都准备好了
      console.log(`[PvPHandler] 检查房间准备状态: side=${side}, status=${room.status}`);
      console.log(`[PvPHandler] 玩家1: 连接=${!!room.players.p1}, 队伍=${!!room.teams.p1}`);
      console.log(`[PvPHandler] 玩家2: 连接=${!!room.players.p2}, 队伍=${!!room.teams.p2}`);
      console.log(`[PvPHandler] isReady()=${room.isReady()}`);
      
      // 关键修复：Pokemon Showdown 的流程是：两个玩家都准备好后，立即开始对战
      // 不需要等待两个玩家都发送 start 消息
      // 只要两个玩家都连接并提交了队伍，且状态是 waiting，就立即开始对战
      if (room.isReady() && room.status === 'waiting') {
        console.log('[PvPHandler] ✅ 两个玩家都准备好了！立即开始对战！');
        console.log('[PvPHandler] 玩家1队伍:', room.teams.p1 ? room.teams.p1.length + '只' : '未准备');
        console.log('[PvPHandler] 玩家2队伍:', room.teams.p2 ? room.teams.p2.length + '只' : '未准备');
        console.log('[PvPHandler] 当前玩家:', side);
        
        room.status = 'battling';

          // 获取两个队伍
          const team1 = room.teams.p1;
          const team2 = room.teams.p2;

          console.log('[PvPHandler] 队伍1数量:', team1.length);
          console.log('[PvPHandler] 队伍2数量:', team2.length);

          // 创建简化的 PvP 对战管理器（直接使用 Pokemon Showdown 的 BattleStream）
          const battleManager = new SimplePvPManager(formatid, seed);
          await battleManager.initialize(team1, team2);

            // 连接两个玩家（SimplePvPManager 会自动处理消息路由）
            battleManager.addConnection('p1', room.players.p1);
            battleManager.addConnection('p2', room.players.p2);

            // 保存对战管理器
            room.battleManager = battleManager;
            
            // 确保连接ID已生成（使用更精确的唯一ID）
            if (!room.players.p1._connectionId) {
              console.warn('[PvPHandler] ⚠️ p1连接的 _connectionId 未生成，生成唯一ID');
              room.players.p1._connectionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            if (!room.players.p2._connectionId) {
              console.warn('[PvPHandler] ⚠️ p2连接的 _connectionId 未生成，生成唯一ID');
              room.players.p2._connectionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            
            // 设置battles映射和_battleManager属性
            console.log('[PvPHandler] 设置battles映射和_battleManager属性');
            console.log('[PvPHandler] p1连接ID:', room.players.p1._connectionId);
            console.log('[PvPHandler] p2连接ID:', room.players.p2._connectionId);
            this.battles.set(room.players.p1._connectionId, battleManager);
            this.battles.set(room.players.p2._connectionId, battleManager);
            // 关键修复：设置 _battleManager 属性，用于 handleChoose 查找
            room.players.p1._battleManager = battleManager;
            room.players.p2._battleManager = battleManager;
            console.log('[PvPHandler] ✅ battles映射和_battleManager属性已设置');

          // 通知玩家对战开始
          room.broadcast({
            type: 'battle-started',
            payload: { roomId: roomId }
          });

          console.log('[PvPHandler] ✅ 对战已开始，已通知两个玩家');
      } else if (room.status === 'battling') {
        // 如果对战已经开始，这是重连请求
        console.log('[PvPHandler] ⚠️ 对战已开始，这是重连请求');
        // 重连逻辑在 handleStart 的开头已经处理了
      } else {
        console.log('[PvPHandler] ⏳ 等待另一个玩家准备');
        console.log('[PvPHandler] 当前状态:', {
          p1Connected: !!room.players.p1,
          p2Connected: !!room.players.p2,
          p1TeamReady: !!room.teams.p1,
          p2TeamReady: !!room.teams.p2,
          status: room.status
        });
      }
    } catch (error) {
      console.error('[PvPHandler] ❌ handleStart 错误:', error);
      console.error('[PvPHandler] 错误堆栈:', error.stack);
      throw error;
    }
  }

  /**
   * 处理重连（对战已开始，复用BattleManager）
   */
  async handleReconnect(ws, payload, room, roomId) {
    console.log('[PvPHandler] 房间已开始对战，尝试复用已有BattleManager');
    
    // 尝试从payload中获取side信息
    let requestedSide = payload.side;
    
    // 如果payload中没有side信息，尝试从房间的players列表中查找
    if (!requestedSide) {
      console.log('[PvPHandler] payload中没有side信息，尝试从房间players中查找');
      if (room.players.p1 === ws) {
        requestedSide = 'p1';
        console.log('[PvPHandler] 当前连接是 p1');
      } else if (room.players.p2 === ws) {
        requestedSide = 'p2';
        console.log('[PvPHandler] 当前连接是 p2');
      } else {
        console.log('[PvPHandler] 当前连接不在players中，无法确定side');
      }
    }
    
    if (requestedSide && (requestedSide === 'p1' || requestedSide === 'p2')) {
      // 检查旧连接是否还在
      const oldWs = room.players[requestedSide];
      if (oldWs) {
        const oldState = oldWs.readyState;
        // 如果房间状态是battling，说明对战已经开始，允许强制替换（正常跳转场景）
        if (room.status === 'battling' && oldState === WebSocket.OPEN) {
          console.log('[PvPHandler] 房间状态是battling，允许强制替换OPEN状态的旧连接（正常跳转）');
          // 注意：不在这里关闭旧连接，让 BattleManager.addConnection 来处理
          // 这样可以确保关闭逻辑统一，避免重复关闭
        } else if (oldState === WebSocket.OPEN) {
          // 旧连接还在OPEN状态，且房间状态不是battling，可能是真正的冲突
          console.warn('[PvPHandler] ⚠️ 旧连接还在OPEN状态，无法替换');
          ws.send(JSON.stringify({
            type: 'error',
            payload: { message: '连接冲突：请关闭其他标签页' }
          }));
          return;
        } else {
          // 旧连接正在关闭或已关闭，允许替换
          console.log(`[PvPHandler] 旧连接状态: ${oldState}，允许替换`);
        }
      }

      // 替换旧连接
      console.log(`[PvPHandler] 替换旧连接 ${requestedSide}，复用BattleManager`);
      console.log(`[PvPHandler] 旧连接ID:`, oldWs?._connectionId);
      console.log(`[PvPHandler] 新连接ID:`, ws._connectionId);
      
      // 先设置新连接的属性，再替换players中的连接
      ws._side = requestedSide;
      ws._roomId = roomId;
      
      // 重要：先添加新连接到BattleManager，再替换players中的连接
      // 这样可以确保新连接在旧连接关闭前就已经注册到BattleManager
      const battleManager = room.battleManager;
      console.log('[PvPHandler] 准备添加新连接到BattleManager');
      console.log('[PvPHandler] 新连接ID:', ws._connectionId);
      console.log('[PvPHandler] BattleManager存在:', !!battleManager);
      
      // 确保新连接的 _connectionId 已生成（使用更精确的唯一ID）
      if (!ws._connectionId) {
        console.warn('[PvPHandler] ⚠️ 新连接的 _connectionId 未生成，生成唯一ID');
        ws._connectionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // 现在才替换players中的连接（在旧连接关闭前）
      // 重要：在替换之前，确保旧连接已经从players中移除，避免旧连接关闭时误删新连接
      if (oldWs && oldWs === room.players[requestedSide]) {
        console.log('[PvPHandler] 旧连接仍在players中，先移除旧连接');
        // 临时移除旧连接，避免旧连接关闭时误删新连接
        delete room.players[requestedSide];
      }
      room.players[requestedSide] = ws;
      console.log('[PvPHandler] ✅ 新连接已替换到players中');
      
      // 先添加新连接到BattleManager（这会触发BattleManager发送battle-reconnected消息）
      console.log('[PvPHandler] 准备添加新连接到BattleManager');
      console.log('[PvPHandler] 新连接ID:', ws._connectionId);
      console.log('[PvPHandler] BattleManager存在:', !!battleManager);
      battleManager.addConnection(requestedSide, ws);
      console.log('[PvPHandler] ✅ 新连接已添加到BattleManager');
      
      // 设置新连接的映射和_battleManager属性（在旧连接关闭之前）
      console.log('[PvPHandler] 设置新连接到battles Map和_battleManager属性');
      console.log('[PvPHandler] 新连接ID:', ws._connectionId);
      this.battles.set(ws._connectionId, battleManager);
      // 关键修复：设置 _battleManager 属性，用于 handleChoose 查找
      ws._battleManager = battleManager;
      console.log('[PvPHandler] ✅ 新连接已添加到battles Map和_battleManager属性');
      
      // 验证映射是否设置成功（重要：确保在旧连接关闭前映射已设置）
      if (this.battles.has(ws._connectionId)) {
        const mappedManager = this.battles.get(ws._connectionId);
        if (mappedManager === battleManager) {
          console.log('[PvPHandler] ✅ 验证：新连接在battles Map中，映射正确');
        } else {
          console.error('[PvPHandler] ❌ 验证失败：映射的BattleManager不匹配！');
        }
      } else {
        console.error('[PvPHandler] ❌ 验证失败：新连接不在battles Map中！');
        // 尝试重新设置
        this.battles.set(ws._connectionId, battleManager);
        console.log('[PvPHandler] 已尝试重新设置映射');
      }

      // 注意：不再在这里发送 battle-reconnected 消息
      // BattleManager.addConnection 在检测到重连时会自动发送
      console.log('[PvPHandler] ✅ 已复用BattleManager，新连接已替换旧连接');
      
      // 直接返回，不处理队伍（对战已开始）
      console.log('[PvPHandler] ✅ 已复用BattleManager，新连接已替换旧连接');
      console.log('[PvPHandler] 对战已开始，不处理start消息中的队伍，直接返回');
      return; // 对战已开始，不需要处理队伍
    } else {
      // 没有side信息，无法确定
      console.warn('[PvPHandler] ⚠️ 无法确定玩家side，payload中没有side信息');
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: '无法确定玩家身份，请从房间大厅重新进入' }
      }));
      return;
    }
  }
}

module.exports = PvPHandler;

