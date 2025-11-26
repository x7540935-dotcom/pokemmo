import PhaseBase from './PhaseBase.js';
import MoveDataHelper from '../utils/MoveDataHelper.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 阶段 4：对战阶段（BattlePhase.js）
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📋 核心职责
 * ──────────────────────────────────────────────────────────────────────────
 * BattlePhase 是对战系统的核心阶段，负责：
 *   1. 对战流程管理
 *      - 处理技能选择请求（|request| 协议）
 *      - 渲染技能按钮和换人选项
 *      - 处理用户选择（使用技能、换人）
 *      - 管理回合状态和同步
 * 
 *   2. 协议处理
 *      - |request|: 请求玩家选择（技能/换人）
 *      - |switch|: 宝可梦切换
 *      - |move|: 技能使用动画
 *      - |-damage|: 伤害显示
 *      - |win|: 对战结束
 * 
 *   3. UI 更新
 *      - 更新技能按钮状态（可用/禁用）
 *      - 更新换人选项
 *      - 更新回合状态文本
 *      - 处理强制换人场景
 * 
 *   4. 回合同步
 *      - 检查 request.wait 字段（是否需要等待对手）
 *      - 确保双方都选择后才能开始回合
 *      - 处理蓄力技能等特殊情况
 * 
 * 🔄 阶段转换流程
 * ──────────────────────────────────────────────────────────────────────────
 * 
 *   team-preview → BattlePhase (收到 |start| 协议)
 *                        │
 *                        ▼
 *                   处理 |request| → 显示技能按钮
 *                        │
 *                        ▼
 *                   用户选择 → 发送命令
 *                        │
 *                        ▼
 *                   接收协议 → 更新UI
 *                        │
 *                        ▼
 *                   对战结束 → 显示结果
 * 
 * ⚠️ 关键修复
 * ──────────────────────────────────────────────────────────────────────────
 * - 检查 request.wait 字段，如果为 true 则禁止操作
 * - 发送选择后清除 request，避免重复发送
 * - 支持强制换人场景（forceSwitch）
 * - 处理蓄力技能的回合同步问题
 */
class BattlePhase extends PhaseBase {
  constructor(battleEngine, stateManager, ui, animationManager = null) {
    super('battle');
    this.battleEngine = battleEngine;
    this.stateManager = stateManager;
    this.ui = ui;
    this.animationManager = animationManager;
    // 保存玩家的身份（p1或p2）
    this.playerSide = null;
    this.awaitingSecondMoveSide = null;
    this.skipNextMoveForSide = { p1: false, p2: false };
    
    // 回合管理
    this.currentTurn = null;
    this.turnMoveQueue = [];  // 当前回合的 move 队列
    this.turnDamageQueue = []; // 当前回合的伤害队列
    this.isProcessingTurn = false;
    this.pendingDamageUpdates = new Map(); // 待处理的伤害更新 { side: { condition, ident, timestamp } }
  }

  onEnter(data) {
    console.log('[BattlePhase] 进入对战阶段');
    this.stateManager.updateBattleState({ 
      isTeamPreview: false,
      isBattleStarted: true 
    });
    
    // 如果有待处理的 request，立即渲染
    console.log('[BattlePhase] 检查是否有待处理的 request');
    const request = this.stateManager.getCurrentRequest();
    if (request) {
      console.log('[BattlePhase] 找到待处理的 request，立即渲染');
      console.log('[BattlePhase] request 内容:', JSON.stringify(request).substring(0, 300));
      this.renderRequest(request);
    } else {
      console.log('[BattlePhase] 没有待处理的 request');
    }
  }

  /**
   * 处理协议消息
   */
  handleProtocol(line) {
    console.log(`[BattlePhase] 处理协议: ${line.substring(0, 100)}`);
    
    if (line.startsWith('|request|')) {
      console.log('[BattlePhase] 处理 request 协议');
      this.handleRequestProtocol(line);
    } else if (line.startsWith('|switch|') || line.startsWith('|drag|')) {
      console.log('[BattlePhase] 处理 switch 协议');
      this.handleSwitchProtocol(line);
    } else if (line.startsWith('|move|')) {
      this.handleMoveAnimation(line);
    } else if (line.startsWith('|-damage|')) {
      this.handleDamageProtocol(line);
    } else if (line.startsWith('|-heal|')) {
      this.handleHealProtocol(line);
    } else if (line.startsWith('|-status|')) {
      this.handleStatusProtocol(line);
    } else if (line.startsWith('|-curestatus|')) {
      this.handleCureStatusProtocol(line);
    } else if (line.startsWith('|win|') || line.startsWith('|tie|')) {
      this.handleBattleEnd(line);
    } else if (line.startsWith('|turn|')) {
      this.handleTurnProtocol(line);
    } else {
      console.log(`[BattlePhase] 未处理的协议: ${line.substring(0, 50)}`);
    }
  }

  /**
   * 处理 |request| 协议
   */
  handleRequestProtocol(line) {
    try {
      const reqStr = line.slice('|request|'.length);
      console.log('[BattlePhase] 收到 request 协议，原始 JSON 长度:', reqStr.length);
      const req = JSON.parse(reqStr);
      console.log('[BattlePhase] 解析后的 request:', req);
      console.log('[BattlePhase] request.side:', req?.side);
      console.log('[BattlePhase] request.side.id:', req?.side?.id);
      console.log('[BattlePhase] request.active:', req?.active);
      
      if (req && req.side && req.side.id) {
        // 保存玩家的身份（第一次收到request时）
        if (!this.playerSide) {
          this.playerSide = req.side.id;
          console.log(`[BattlePhase] 保存玩家身份: ${this.playerSide}`);
        }
        
        // 只处理我方玩家的request
        if (req.side.id === this.playerSide) {
          console.log(`[BattlePhase] 这是我方 (${this.playerSide}) 的 request，开始渲染`);
          console.log(`[BattlePhase] request.wait: ${req.wait}, request.teamPreview: ${req.teamPreview}, request.forceSwitch: ${req.forceSwitch}`);
          
          // 关键修复：无论 wait 是否为 true，都要更新 request，这样才能知道是否需要等待
          this.stateManager.setCurrentRequest(req);
          if (this.ui) {
            this.ui.updateTeamFromRequest(req.side.id, req.side.pokemon);
          }
          this.renderRequest(req);
        } else {
          console.log(`[BattlePhase] 这不是我方 (${this.playerSide}) 的 request，忽略`);
          console.log('[BattlePhase] 实际 side.id:', req.side.id);
        }
      }
    } catch (e) {
      console.error('[BattlePhase] 解析 request 失败:', e);
      console.error('[BattlePhase] 原始行:', line.substring(0, 200));
    }
  }

  /**
   * 渲染 request（显示技能按钮等）
   */
  renderRequest(req) {
    console.log('[BattlePhase] 开始渲染 request');
    const isForceSwitch = !!req.forceSwitch;
    const isTeamPreview = !!req.teamPreview;
    const canChoose = !req.wait;

    console.log('[BattlePhase] isForceSwitch:', isForceSwitch, 'isTeamPreview:', isTeamPreview, 'canChoose:', canChoose);

    if (isTeamPreview) {
      // 队伍预览请求，不应该在这里处理
      console.log('[BattlePhase] 这是队伍预览请求，跳过');
      return;
    }

    // 更新状态显示
    if (this.ui) {
      this.ui.updateTurnStatus(canChoose ? '你的回合' : '等待对手');
    }

    // 渲染技能 - 直接从 request 协议获取（这是最权威的数据源）
    console.log('[BattlePhase] ========== 处理技能数据 ==========');
    console.log('[BattlePhase] req.active:', req.active);
    
    let moves = [];
    
    // 直接从 request.active 获取技能数据
    if (req.active && Array.isArray(req.active) && req.active.length > 0) {
      const active = req.active[0];
      console.log('[BattlePhase] active 对象:', active);
      
      if (active.moves && Array.isArray(active.moves)) {
        console.log('[BattlePhase] ✅ 从 request.active[0].moves 获取技能数据，数量:', active.moves.length);
        console.log('[BattlePhase] 原始 moves:', active.moves);
        
        // 使用 MoveDataHelper 规范化技能数据
        moves = MoveDataHelper.normalizeMoves(active.moves);
        console.log('[BattlePhase] 规范化后的 moves:', moves);
      } else {
        console.warn('[BattlePhase] ⚠️ active.moves 不存在或不是数组');
      }
    } else {
      console.warn('[BattlePhase] ⚠️ req.active 不存在或为空数组');
    }
    
    if (moves.length === 0) {
      console.error('[BattlePhase] ❌ 没有找到任何技能数据！');
      console.error('[BattlePhase] req 完整结构:', JSON.stringify(req, null, 2));
    } else {
      console.log(`[BattlePhase] ✅ 最终 moves 数组，数量: ${moves.length}`);
    }

    if (this.ui) {
      if (isForceSwitch) {
        // 强制换人
        console.log('[BattlePhase] 强制换人模式');
        console.log('[BattlePhase] 调用 showForceSwitch，传入的pokemon:', req.side.pokemon);
        if (req.side.pokemon && req.side.pokemon.length > 0) {
          console.log('[BattlePhase] pokemon[0]的结构:', Object.keys(req.side.pokemon[0]));
          console.log('[BattlePhase] pokemon[0]的值:', req.side.pokemon[0]);
        }
        this.ui.showForceSwitch(req.side.pokemon);
      } else {
        // 显示技能
        console.log('[BattlePhase] 显示技能和换人选项');
        this.ui.renderMoves(moves, canChoose);
        // 显示换人选项
        console.log('[BattlePhase] 调用 renderSwitchOptions，传入的pokemon:', req.side.pokemon);
        if (req.side.pokemon && req.side.pokemon.length > 0) {
          console.log('[BattlePhase] pokemon[0]的结构:', Object.keys(req.side.pokemon[0]));
          console.log('[BattlePhase] pokemon[0]的值:', req.side.pokemon[0]);
        }
        this.ui.renderSwitchOptions(req.side.pokemon, canChoose);
      }
    } else {
      console.warn('[BattlePhase] UI 未初始化');
    }
  }

  /**
   * 处理 |switch| 协议
   */
  handleSwitchProtocol(line) {
    const parts = line.slice(line.startsWith('|switch|') ? '|switch|'.length : '|drag|'.length).split('|');
    if (parts.length >= 3) {
      const pokemonId = parts[0].trim();
      const details = parts[1].trim();
      const hpStatus = parts[2]?.trim() || '';
      
      const sideMatch = pokemonId.match(/^(p\d+)/);
      const side = sideMatch ? sideMatch[1] : null;
      
      if (side) {
        const speciesMatch = details.match(/^([^,]+)/);
        const species = speciesMatch ? speciesMatch[1].trim() : '';
        
        const pokemonData = {
          ident: pokemonId,
          species: species,
          details: details,
          condition: hpStatus,
          side: side
        };
        
        this.stateManager.updateActivePokemon(side, pokemonData);
        
        if (this.animationManager) {
          this.animationManager.clearQueue();
        }
        if (this.ui) {
          this.ui.updatePokemonDisplay(side, pokemonData);
        }
        if (this.animationManager) {
          this.animationManager.play('enter', { side });
        }
        this.skipNextMoveForSide[side] = false;
        this.awaitingSecondMoveSide = null;
      }
    }
  }

  /**
   * 处理伤害协议
   * 延迟更新 HP，等待 move 动画播放完成
   */
  handleDamageProtocol(line) {
    const parts = line.slice('|-damage|'.length).split('|');
    if (parts.length >= 2) {
      const pokemonId = parts[0].trim();
      const condition = parts[1].trim();
      
      const sideMatch = pokemonId.match(/^(p\d+)/);
      const side = sideMatch ? sideMatch[1] : null;
      
      if (side) {
        // 保存伤害信息，等待动画播放后更新
        this.pendingDamageUpdates.set(side, {
          condition,
          ident: pokemonId,
          timestamp: Date.now()
        });
        
        if (this.isFaintedCondition(condition) && this.awaitingSecondMoveSide === side) {
          this.skipNextMoveForSide[side] = true;
        }
        
        // 延迟处理伤害更新（等待 move 动画播放完成，约 620ms）
        setTimeout(() => {
          this.processPendingDamage(side);
        }, 650);
        
        console.log(`[BattlePhase] 记录 ${side} 的伤害更新（将在动画后处理）`);
      }
    }
  }

  handleMoveAnimation(line) {
    if (!this.animationManager) return;
    const parts = line.split('|');
    if (parts.length < 4) return;
    const attackerIdent = parts[2]?.trim();
    const moveName = parts[3]?.trim();
    const targetIdent = parts[4]?.trim();
    const attackerSide = this.extractSideFromIdent(attackerIdent);
    const targetSide = this.extractSideFromIdent(targetIdent);
    const moveInfo = this.getMoveInfo(moveName);
    if (!attackerSide) return;
    
    // 跳过逻辑：如果这个side的move应该被跳过（例如因为已经击倒）
    if (this.skipNextMoveForSide[attackerSide]) {
      this.skipNextMoveForSide[attackerSide] = false;
      if (this.awaitingSecondMoveSide === attackerSide) {
        this.awaitingSecondMoveSide = null;
      }
      console.log(`[BattlePhase] 跳过 ${attackerSide} 的move动画（已击倒或跳过标记）`);
      return;
    }
    
    // 去重检查：如果最近已经处理过相同attacker的move协议，跳过
    const moveKey = `${attackerSide}-${moveName}-${targetIdent || ''}`;
    const now = Date.now();
    
    if (!this._lastMoveKey || !this._lastMoveTime) {
      this._lastMoveKey = moveKey;
      this._lastMoveTime = now;
    } else {
      const timeDiff = now - this._lastMoveTime;
      if (this._lastMoveKey === moveKey && timeDiff < 200) {
        console.log(`[BattlePhase] 检测到重复的move协议（${timeDiff}ms内），跳过动画: ${attackerSide} 使用 ${moveName}`);
        return;
      }
      this._lastMoveKey = moveKey;
      this._lastMoveTime = now;
    }
    
    this.trackMoveOrder(attackerSide);
    
    // 将 move 动画加入回合队列，并立即播放
    // AnimationManager 会处理回合内的动画顺序和间隔
    this.animationManager.play('move', {
      side: attackerSide,
      targetSide,
      moveType: moveInfo.category,
      elementType: moveInfo.type,
      moveName: moveName
    });
  }

  /**
   * 处理待处理的伤害更新（在动画播放后调用）
   */
  processPendingDamage(side) {
    const pending = this.pendingDamageUpdates.get(side);
    if (pending && this.ui) {
      console.log(`[BattlePhase] 处理 ${side} 的伤害更新（动画后）`);
      this.ui.updatePokemonHP(side, pending.condition, pending.ident);
      this.pendingDamageUpdates.delete(side);
    }
  }

  extractSideFromIdent(ident = '') {
    const match = ident?.match(/^(p\d)/i);
    return match ? match[1] : null;
  }

  getMoveInfo(moveName) {
    const defaultInfo = { category: 'physical', type: 'default' };
    if (!moveName) return 'physical';
    const lower = moveName.toLowerCase();
    const moveId = lower.replace(/[^a-z0-9]+/g, '');
    const showdownMove = window.ShowdownData?.moves?.[moveId];
    if (showdownMove) {
      return {
        category: showdownMove.category || 'physical',
        type: showdownMove.type || 'default'
      };
    }
    if (lower.includes('beam') || lower.includes('pulse') || lower.includes('ball')) {
      return { category: 'special', type: 'default' };
    }
    if (lower.includes('status') || lower.includes('dance')) {
      return { category: 'status', type: 'default' };
    }
    return defaultInfo;
  }

  trackMoveOrder(attackerSide) {
    if (!this.awaitingSecondMoveSide) {
      this.awaitingSecondMoveSide = attackerSide === 'p1' ? 'p2' : 'p1';
    } else if (this.awaitingSecondMoveSide === attackerSide) {
      this.awaitingSecondMoveSide = null;
    } else {
      this.awaitingSecondMoveSide = attackerSide === 'p1' ? 'p2' : 'p1';
    }
  }

  isFaintedCondition(condition = '') {
    if (!condition) return false;
    if (condition.includes('fnt')) return true;
    return /^0(?:\/|$)/.test(condition.trim());
  }

  /**
   * 处理回复协议
   * 回复也延迟更新，保持与伤害更新的一致性
   */
  handleHealProtocol(line) {
    const parts = line.slice('|-heal|'.length).split('|');
    if (parts.length >= 2) {
      const pokemonId = parts[0].trim();
      const condition = parts[1].trim();
      
      const sideMatch = pokemonId.match(/^(p\d+)/);
      const side = sideMatch ? sideMatch[1] : null;
      
      if (side && this.ui) {
        // 延迟更新，与伤害更新保持一致
        setTimeout(() => {
          this.ui.updatePokemonHP(side, condition, pokemonId);
        }, 650);
      }
    }
  }

  handleStatusProtocol(line) {
    const parts = line.slice('|-status|'.length).split('|');
    if (parts.length >= 2) {
      const pokemonId = parts[0].trim();
      const statusId = parts[1].trim();
      const sideMatch = pokemonId.match(/^(p\d+)/);
      const side = sideMatch ? sideMatch[1] : null;
      if (side && this.ui) {
        this.ui.handleStatusEvent(side, pokemonId, statusId);
      }
    }
  }

  handleCureStatusProtocol(line) {
    const parts = line.slice('|-curestatus|'.length).split('|');
    if (parts.length >= 2) {
      const pokemonId = parts[0].trim();
      const statusId = parts[1].trim();
      const sideMatch = pokemonId.match(/^(p\d+)/);
      const side = sideMatch ? sideMatch[1] : null;
      if (side && this.ui) {
        this.ui.handleCureStatusEvent(side, pokemonId, statusId);
      }
    }
  }

  /**
   * 处理回合协议
   */
  handleTurnProtocol(line) {
    const parts = line.slice('|turn|'.length).split('|');
    const turn = parseInt(parts[0]) || 0;
    
    // 如果回合数变化，结束上一回合的动画处理
    if (this.currentTurn !== null && this.currentTurn !== turn) {
      this.endTurnAnimations();
    }
    
    // 开始新回合
    this.currentTurn = turn;
    this.turnMoveQueue = [];
    this.turnDamageQueue = [];
    this.isProcessingTurn = false;
    this.awaitingSecondMoveSide = null;
    this.skipNextMoveForSide = { p1: false, p2: false };
    
    this.stateManager.updateBattleState({ turn: turn });
    
    if (this.animationManager) {
      this.animationManager.startTurn(turn);
    }
    
    if (this.ui) {
      this.ui.updateTurnNumber(turn);
    }
    
    console.log(`[BattlePhase] 开始回合 ${turn}`);
  }

  /**
   * 结束当前回合的动画处理
   */
  endTurnAnimations() {
    if (this.animationManager) {
      this.animationManager.endTurn();
    }
    console.log(`[BattlePhase] 结束回合 ${this.currentTurn} 的动画处理`);
  }

  /**
   * 处理对战结束
   */
  handleBattleEnd(line) {
    console.log(`[BattlePhase] ========== 处理战斗结束 ==========`);
    console.log(`[BattlePhase] 原始协议: ${line}`);
    console.log(`[BattlePhase] 协议长度: ${line.length}`);
    
    const isWin = line.startsWith('|win|');
    const isTie = line.startsWith('|tie|');
    
    console.log(`[BattlePhase] isWin: ${isWin}, isTie: ${isTie}`);
    
    // 提取winner：|win|协议格式可能是 |win|p1| 或 |win|p1 或 |win|p1a: Pokemon|
    let winner = null;
    if (isWin) {
      // 移除 |win| 前缀
      const winContent = line.slice('|win|'.length);
      console.log(`[BattlePhase] win协议内容（移除前缀后）: "${winContent}"`);
      
      // 按 | 分割，取第一部分
      const parts = winContent.split('|');
      console.log(`[BattlePhase] win协议分割后:`, parts);
      
      // 提取winner，可能是 "p1"、"p1a: Pokemon"、"Player 1" 等格式
      let rawWinner = parts[0]?.trim() || winContent.trim();
      console.log(`[BattlePhase] 原始winner字符串: "${rawWinner}"`);
      
      // 如果包含冒号（如 "p1a: Pokemon"），提取前面的部分
      if (rawWinner.includes(':')) {
        rawWinner = rawWinner.split(':')[0].trim();
        console.log(`[BattlePhase] 移除冒号后: "${rawWinner}"`);
      }
      
      // 尝试多种格式提取：
      // 1. "Player 1" 或 "Player 2" -> "p1" 或 "p2"
      // 2. "p1a" 或 "p1" -> "p1"
      // 3. "p2a" 或 "p2" -> "p2"
      
      let extractedSide = null;
      
      // 方式1：检查是否是 "Player 1" 或 "Player 2" 格式
      const playerMatch = rawWinner.match(/^Player\s+(\d+)$/i);
      if (playerMatch) {
        const playerNum = playerMatch[1];
        extractedSide = `p${playerNum}`.toLowerCase();
        console.log(`[BattlePhase] ✅ 从 "Player ${playerNum}" 提取到: "${extractedSide}"`);
      } else {
        // 方式2：检查是否是 "p1"、"p2"、"p1a" 等格式
        const sideMatch = rawWinner.match(/^([pP]\d+)[a-z]*/);
        if (sideMatch) {
          extractedSide = sideMatch[1].toLowerCase();
          console.log(`[BattlePhase] ✅ 从 "${rawWinner}" 提取到: "${extractedSide}"`);
        }
      }
      
      // 如果提取成功，使用提取的值；否则使用原始值（小写）
      if (extractedSide) {
        winner = extractedSide;
      } else {
        winner = rawWinner.toLowerCase();
        console.warn(`[BattlePhase] ⚠️ 无法提取side，使用原始值（小写）: "${winner}"`);
      }
      
      // 最终验证：确保winner是有效的
      if (!winner || winner.length === 0) {
        console.error(`[BattlePhase] ❌ 无法提取winner，原始内容: "${winContent}"`);
        winner = null;
      } else {
        console.log(`[BattlePhase] ✅ 最终提取的winner: "${winner}" (原始: "${rawWinner}")`);
        console.log(`[BattlePhase] winner类型: ${typeof winner}, 长度: ${winner?.length}`);
      }
    }
    
    console.log(`[BattlePhase] 玩家身份 this.playerSide: "${this.playerSide}"`);
    console.log(`[BattlePhase] playerSide类型: ${typeof this.playerSide}`);
    console.log(`[BattlePhase] playerSide是否存在: ${this.playerSide !== null && this.playerSide !== undefined}`);
    
    this.stateManager.updateBattleState({ isBattleEnded: true });
    
    if (this.ui) {
      if (isWin && winner && winner.length > 0) {
        // 判断胜负：winner可能是p1、p2或者玩家用户名
        let isPlayerWin = false;
        
        // 标准化winner（移除可能的空格和特殊字符）
        const winnerNormalized = winner.toLowerCase().trim();
        console.log(`[BattlePhase] 标准化后的winner: "${winnerNormalized}"`);
        
        if (this.playerSide) {
          // 方式1：直接比较side id（p1或p2）- 精确匹配
          const playerSideNormalized = String(this.playerSide).toLowerCase().trim();
          
          console.log(`[BattlePhase] 标准化比较 - winner: "${winnerNormalized}", playerSide: "${playerSideNormalized}"`);
          
          if (winnerNormalized === playerSideNormalized) {
            // 精确匹配：winner 和 playerSide 完全相同
            isPlayerWin = true;
            console.log(`[BattlePhase] ✅ 精确匹配：winner (${winnerNormalized}) === playerSide (${playerSideNormalized})`);
          } else {
            // 方式2：检查winner是否包含玩家信息（例如 "p1a" 包含 "p1"）
            console.log(`[BattlePhase] ⚠️ 精确匹配失败，尝试包含匹配`);
            console.log(`[BattlePhase] winner: "${winnerNormalized}", playerSide: "${playerSideNormalized}"`);
            
            // 检查winner是否以playerSide开头（例如 "p1a" 以 "p1" 开头）
            // 或者 winner 就是 playerSide 的一部分（这种情况不应该发生，但为了安全）
            if (winnerNormalized.startsWith(playerSideNormalized)) {
              isPlayerWin = true;
              console.log(`[BattlePhase] ✅ 包含匹配：winner (${winnerNormalized}) 以 playerSide (${playerSideNormalized}) 开头`);
            } else if (winner === 'You' || winnerNormalized === 'you') {
              // 如果winner是 "You" 或 "you"（不区分大小写）
              isPlayerWin = true;
              console.log(`[BattlePhase] ✅ winner是 "You"`);
            } else {
              // 如果都不匹配，说明winner不是玩家，玩家输了
              console.log(`[BattlePhase] ❌ winner (${winnerNormalized}) 与 playerSide (${playerSideNormalized}) 不匹配，玩家失败`);
              isPlayerWin = false;
            }
          }
        } else {
          // 如果没有保存playerSide，使用默认逻辑
          // 假设玩家总是p1（向后兼容）
          console.warn('[BattlePhase] ⚠️ 未找到玩家身份，使用默认逻辑（假设p1）');
          console.log(`[BattlePhase] winner标准化: "${winnerNormalized}"`);
          
          // 检查winner是否是p1或包含p1
          const isP1 = winnerNormalized === 'p1' || winnerNormalized.startsWith('p1');
          const isYou = winnerNormalized === 'you';
          
          isPlayerWin = isP1 || isYou;
          console.log(`[BattlePhase] 默认逻辑判断: winner="${winnerNormalized}", isP1=${isP1}, isYou=${isYou}, isPlayerWin=${isPlayerWin}`);
        }
        
        console.log(`[BattlePhase] ========== 最终判断结果 ==========`);
        console.log(`[BattlePhase] 原始winner: "${winner}"`);
        console.log(`[BattlePhase] 标准化winner: "${winnerNormalized}"`);
        console.log(`[BattlePhase] playerSide: "${this.playerSide}" (类型: ${typeof this.playerSide})`);
        console.log(`[BattlePhase] isPlayerWin: ${isPlayerWin}`);
        console.log(`[BattlePhase] 将调用: this.ui.showBattleEnd('${isPlayerWin ? 'win' : 'lose'}')`);
        console.log(`[BattlePhase] 将显示: ${isPlayerWin ? '胜利 🎉' : '失败 😢'}`);
        
        // 确保正确传递结果
        const result = isPlayerWin ? 'win' : 'lose';
        console.log(`[BattlePhase] 最终结果: ${result}`);
        this.ui.showBattleEnd(result);
      } else if (isTie) {
        console.log(`[BattlePhase] 平局`);
        this.ui.showBattleEnd('tie');
      } else {
        console.warn(`[BattlePhase] ⚠️ 未知的战斗结束协议: ${line}`);
        // 默认显示失败（保守处理）
        this.ui.showBattleEnd('lose');
      }
    } else {
      console.error(`[BattlePhase] ❌ UI未初始化，无法显示战斗结束界面`);
    }
  }

  /**
   * 处理用户操作
   */
  handleUserAction(action, data) {
    console.log(`[BattlePhase] ========== 处理用户操作 ==========`);
    console.log(`[BattlePhase] action: ${action}`, data);
    
    // 关键修复：检查当前 request 是否允许选择
    const req = this.stateManager.getCurrentRequest();
    if (!req) {
      console.warn(`[BattlePhase] ⚠️ 没有当前的 request，无法处理操作`);
      return;
    }
    
    // 检查 wait 字段，如果为 true，说明需要等待对手，不允许选择
    if (req.wait === true) {
      console.warn(`[BattlePhase] ⚠️ request.wait 为 true，需要等待对手，不允许选择`);
      if (this.ui) {
        this.ui.updateTurnStatus('等待对手...');
      }
      return;
    }
    
    // 检查是否是队伍预览请求
    if (req.teamPreview) {
      console.warn(`[BattlePhase] ⚠️ 这是队伍预览请求，不应该在这里处理`);
      return;
    }
    
    if (action === 'use-move') {
      const moveIndex = data.moveIndex;
      console.log(`[BattlePhase] 使用技能，索引: ${moveIndex}`);
      
      console.log(`[BattlePhase] 当前 request:`, req ? '存在' : '不存在');
      
      if (req) {
        console.log(`[BattlePhase] request 内容:`, JSON.stringify(req).substring(0, 300));
        console.log(`[BattlePhase] req.active:`, req.active);
        if (req.active && req.active[0]) {
          console.log(`[BattlePhase] req.active[0].moves:`, req.active[0].moves);
        }
      }
      
      const command = `move ${moveIndex}`;
      console.log(`[BattlePhase] 发送命令: ${command}`);
      const sent = this.battleEngine.sendChoice(command);
      console.log(`[BattlePhase] 命令发送${sent ? '成功' : '失败'}`);
      
      // 关键修复：发送选择后，清除当前的 request，避免重复发送
      // 但是保留 UI 禁用状态，等待新的 request 到达
      this.stateManager.setCurrentRequest(null);
      
      // 暂时禁用UI，等待新的 request
      if (this.ui) {
        this.ui.disableAllActions();
        this.ui.updateTurnStatus('等待对手...');
      }
    } else if (action === 'switch-pokemon') {
      const position = data.position;
      console.log(`[BattlePhase] 换人: 位置 ${position}`);
      const command = `switch ${position}`;
      console.log(`[BattlePhase] 发送命令: ${command}`);
      const sent = this.battleEngine.sendChoice(command);
      console.log(`[BattlePhase] 命令发送${sent ? '成功' : '失败'}`);
      
      // 关键修复：发送选择后，清除当前的 request，避免重复发送
      // 但是保留 UI 禁用状态，等待新的 request 到达
      this.stateManager.setCurrentRequest(null);
      
      // 暂时禁用UI，等待新的 request
      if (this.ui) {
        this.ui.disableAllActions();
        this.ui.updateTurnStatus('等待对手...');
      }
    } else {
      console.warn(`[BattlePhase] 未知的操作类型: ${action}`);
    }
  }

  onExit() {
    // 清理工作
    if (this.currentTurn !== null) {
      this.endTurnAnimations();
    }
    this.currentTurn = null;
    this.turnMoveQueue = [];
    this.turnDamageQueue = [];
    this.pendingDamageUpdates.clear();
  }
}

export default BattlePhase;


