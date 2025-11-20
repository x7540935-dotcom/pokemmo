import PhaseBase from './PhaseBase.js';

/**
 * 阶段1：加载队伍（TeamLoadingPhase）
 * 
 * 职责：
 * - 从 localStorage 加载玩家队伍
 * - 连接到 WebSocket 对战服务器
 * - 转换队伍格式为服务器需要的格式
 * - 发送 start 消息启动对战
 * - 处理 PvP 模式的重连场景
 * 
 * 阶段转换：
 * - 进入：对战开始时自动进入
 * - 退出：收到第一个 |poke| 协议时转换到 team-preview 阶段
 * 
 * 支持的模式：
 * - AI对战：发送队伍和难度参数
 * - PvP对战：发送队伍、房间ID和玩家身份（side）
 */
class TeamLoadingPhase extends PhaseBase {
  /**
   * 构造函数
   * 
   * @param {BattleEngine} battleEngine - 对战引擎实例
   * @param {StateManager} stateManager - 状态管理器实例
   */
  constructor(battleEngine, stateManager) {
    super('team-loading');
    this.battleEngine = battleEngine;      // 对战引擎引用
    this.stateManager = stateManager;      // 状态管理器引用
    this.hasReceivedPoke = false;          // 是否已收到第一个 poke 协议
  }

  onEnter(data) {
    console.log('[TeamLoadingPhase] 开始加载队伍');
    this.loadTeams();
  }

  /**
   * 加载队伍
   * 
   * 功能：
   * - 从 localStorage 加载玩家队伍
   * - 连接到 WebSocket 服务器
   * - 获取 URL 参数（模式、难度、房间ID等）
   * - 转换队伍格式
   * - 发送 start 消息启动对战
   * - 处理 PvP 重连场景（注册重连回调）
   * 
   * 流程：
   * 1. 从 localStorage 加载队伍 → 2. 连接到服务器 → 3. 获取参数 → 4. 转换格式 → 5. 发送 start 消息
   * 
   * @throws {Error} 如果连接失败或加载失败
   */
  async loadTeams() {
    try {
      // 1. 从本地存储加载玩家队伍
      const playerTeam = this.loadPlayerTeamFromStorage();
      this.stateManager.setPlayerTeam(playerTeam);

      // 2. 连接到对战服务器
      await this.battleEngine.connect();
      
      // 3. 获取URL参数（难度和模式）
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get('mode') || 'ai';
      const difficulty = urlParams.get('difficulty') ? parseInt(urlParams.get('difficulty'), 10) : 2;
      const roomId = urlParams.get('roomId');
      
      console.log(`[TeamLoadingPhase] 对战模式: ${mode}, 难度: ${difficulty}, 房间ID: ${roomId}`);

      // 4. 启动对战（发送队伍）
      const teamForServer = this.convertTeamForServer(playerTeam);
      const battlePayload = {
        mode: mode,
        formatid: 'gen9ou',
        team: teamForServer
      };
      
      // 如果是AI模式，添加难度参数
      if (mode === 'ai') {
        battlePayload.difficulty = difficulty;
      }
      
      // 如果是PVP模式，添加房间ID和side
      if (mode === 'pvp' && roomId) {
        battlePayload.roomId = roomId;
        
        // 关键修复：优先从URL参数获取side，避免localStorage冲突
        // URL参数是最可靠的，因为每个标签页都有独立的URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlSide = urlParams.get('side');
        
        if (urlSide && (urlSide === 'p1' || urlSide === 'p2')) {
          battlePayload.side = urlSide;
          console.log(`[TeamLoadingPhase] ✅ 从URL参数获取side: ${urlSide}`);
          // 同时保存到localStorage（用于兼容性）
          localStorage.setItem('pvpSide', urlSide);
        } else {
          // 回退到localStorage（兼容旧版本）
          const savedSide = localStorage.getItem('pvpSide');
          if (savedSide && (savedSide === 'p1' || savedSide === 'p2')) {
            battlePayload.side = savedSide;
            console.log(`[TeamLoadingPhase] ⚠️ 从localStorage获取side: ${savedSide}（建议使用URL参数）`);
          } else {
            console.warn(`[TeamLoadingPhase] ⚠️⚠️⚠️ 无法确定玩家side！`);
            console.warn(`[TeamLoadingPhase] URL参数side: ${urlSide}`);
            console.warn(`[TeamLoadingPhase] localStorage pvpSide: ${savedSide}`);
            console.warn(`[TeamLoadingPhase] 这可能导致重连时无法确定玩家身份`);
            console.warn(`[TeamLoadingPhase] localStorage内容:`, {
              pvpSide: localStorage.getItem('pvpSide'),
              pvpRoomId: localStorage.getItem('pvpRoomId'),
              allKeys: Object.keys(localStorage)
            });
            // 尝试从BattleManager连接状态推断（在重连时）
            // 这里先不设置，让后端处理
          }
        }
        
        // 检查是否是从lobby跳转过来的（房间状态可能是battling）
        // 如果是，等待battle-reconnected消息，而不是发送start消息
        console.log(`[TeamLoadingPhase] PvP模式，等待服务器响应（可能是重连）`);
        
        // 注册重连回调
        this.battleEngine.onReconnect((payload) => {
          console.log(`[TeamLoadingPhase] ✅ 收到重连成功消息:`, payload);
          // 重连成功，不需要发送start消息
        });
      }
      
      const success = this.battleEngine.startBattle(battlePayload);

      if (success) {
        console.log('[TeamLoadingPhase] 队伍已发送，等待服务器响应');
        // 协议消息会通过 handleProtocol 方法处理
      } else {
        console.error('[TeamLoadingPhase] 启动对战失败');
        this.transitionTo('error', { message: '无法连接到对战服务器' });
      }
    } catch (error) {
      console.error('[TeamLoadingPhase] 加载队伍失败:', error);
      this.transitionTo('error', { message: error.message });
    }
  }

  /**
   * 从本地存储加载玩家队伍
   * 
   * 功能：
   * - 从 localStorage 读取 'pokemonTeam' 键的值
   * - 解析 JSON 格式的队伍数据
   * - 过滤无效的宝可梦条目
   * - 记录详细的加载日志
   * 
   * @returns {Array<Object>} - 玩家队伍数组，每个元素是一个宝可梦对象
   *   包含字段：name, nameId, species, ability, item, moves 等
   * 
   * 错误处理：
   * - 如果 localStorage 中没有数据，返回空数组
   * - 如果 JSON 解析失败，返回空数组并记录错误
   */
  loadPlayerTeamFromStorage() {
    try {
      console.log('[TeamLoadingPhase] 开始从 localStorage 加载队伍');
      const saved = localStorage.getItem('pokemonTeam');
      if (!saved) {
        console.warn('[TeamLoadingPhase] 未找到本地队伍');
        return [];
      }
      console.log('[TeamLoadingPhase] 原始数据长度:', saved.length);
      console.log('[TeamLoadingPhase] 原始数据:', saved.substring(0, 500));
      
      const team = JSON.parse(saved);
      console.log('[TeamLoadingPhase] 解析后的队伍:', team);
      console.log('[TeamLoadingPhase] 队伍类型:', Array.isArray(team) ? '数组' : typeof team);
      console.log('[TeamLoadingPhase] 队伍长度:', team?.length);
      
      const validTeam = team.filter(Boolean);
      console.log(`[TeamLoadingPhase] 已加载玩家队伍，包含 ${validTeam.length} 只宝可梦`);
      
      // 显示每只宝可梦的信息
      validTeam.forEach((p, i) => {
        console.log(`[TeamLoadingPhase] 宝可梦 ${i + 1}:`, {
          name: p.name,
          nameId: p.nameId,
          species: p.species,
          ability: p.ability,
          item: p.item,
          moves: p.moves,
          movesType: Array.isArray(p.moves) ? '数组' : typeof p.moves,
          movesLength: Array.isArray(p.moves) ? p.moves.length : 'N/A'
        });
      });
      
      return validTeam;
    } catch (e) {
      console.error('[TeamLoadingPhase] 解析队伍失败:', e);
      console.error('[TeamLoadingPhase] 错误堆栈:', e.stack);
      return [];
    }
  }

  /**
   * 转换队伍格式为服务器需要的格式
   * 
   * 功能：
   * - 将前端格式的队伍转换为 Pokemon Showdown 服务器格式
   * - 确保 moves 是字符串数组（从对象数组中提取 id 或 name）
   * - 设置默认值（如 nature: 'Serious', level: 50）
   * - 处理缺失的字段
   * 
   * @param {Array<Object>} team - 前端格式的队伍数组
   * @returns {Array<Object>} - 服务器格式的队伍数组
   *   每个宝可梦对象包含：name, species, ability, item, moves, nature, level
   * 
   * 转换规则：
   * - moves: 如果是对象数组，提取 id 或 name；如果是字符串数组，直接使用
   * - 如果没有 moves，使用默认技能 'Tackle'
   * - name/species: 优先使用 name，其次 nameId，再次 species，最后默认 'Pikachu'
   */
  convertTeamForServer(team) {
    console.log('[TeamLoadingPhase] 开始转换队伍格式');
    console.log('[TeamLoadingPhase] 输入队伍:', team);
    
    const converted = team.map((p, i) => {
      console.log(`[TeamLoadingPhase] 转换宝可梦 ${i + 1}:`, p);
      
      // 确保 moves 是字符串数组
      let moves = [];
      if (p.moves) {
        if (Array.isArray(p.moves)) {
          // 如果是对象数组，提取 id 或 name
          moves = p.moves.map(m => {
            if (typeof m === 'string') {
              return m;
            } else if (m && (m.id || m.name)) {
              return m.id || m.name;
            }
            return null;
          }).filter(Boolean);
        } else {
          console.warn(`[TeamLoadingPhase] 宝可梦 ${i + 1} 的 moves 不是数组:`, typeof p.moves);
        }
      }
      
      // 如果没有 moves，使用默认
      if (moves.length === 0) {
        moves = ['Tackle'];
        console.warn(`[TeamLoadingPhase] 宝可梦 ${i + 1} 没有技能，使用默认技能 Tackle`);
      }
      
      const convertedPokemon = {
        name: p.name || p.nameId || p.species || 'Pikachu',
        species: p.name || p.nameId || p.species || 'Pikachu',
        ability: p.ability || '',
        item: p.item || '',
        moves: moves,
        nature: 'Serious',
        level: 50
      };
      
      console.log(`[TeamLoadingPhase] 转换后的宝可梦 ${i + 1}:`, convertedPokemon);
      return convertedPokemon;
    });
    
    console.log('[TeamLoadingPhase] 转换完成，队伍:', converted);
    return converted;
  }

  /**
   * 处理协议消息
   */
  handleProtocol(line) {
    // 处理 |poke| 协议（队伍预览信息）
    // 收到第一个 poke 时，立即转换到 team-preview 阶段，以便处理后续的 poke 协议
    if (line.startsWith('|poke|') && !this.hasReceivedPoke) {
      console.log('[TeamLoadingPhase] 收到第一个 poke 协议，提前进入队伍预览阶段');
      this.hasReceivedPoke = true;
      this.transitionTo('team-preview');
      // 注意：转换后，主循环会重新处理这条消息给新阶段
    }
    
    // 检查是否收到 teampreview，表示队伍已加载完成
    if (line.startsWith('|teampreview|')) {
      console.log('[TeamLoadingPhase] 收到 teampreview 协议');
      // 如果还没转换，现在转换
      if (!this.hasReceivedPoke) {
        this.transitionTo('team-preview');
      }
    }
  }

  onExit() {
    // 清理工作
  }
}

export default TeamLoadingPhase;

