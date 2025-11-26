/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 状态管理器（StateManager.js）- 前端对战状态中心
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📋 核心职责
 * ──────────────────────────────────────────────────────────────────────────
 * StateManager 是前端对战系统的状态中心，负责：
 *   1. 状态存储
 *      - 玩家队伍数据（playerTeam）
 *      - 对手队伍数据（opponentTeam）
 *      - 当前上场宝可梦（playerActive, opponentActive）
 *      - 对战状态（回合数、天气、场地等）
 *      - 当前请求对象（currentRequest）
 * 
 *   2. 状态共享
 *      - 所有 Phase 模块都可以访问和更新状态
 *      - UI 模块从 StateManager 读取数据用于渲染
 *      - 协议处理时更新状态
 * 
 *   3. 状态同步
 *      - 确保 UI 显示与协议数据一致
 *      - 支持状态重置（开始新对战时）
 * 
 * 🏗️ 状态结构
 * ──────────────────────────────────────────────────────────────────────────
 * 
 * StateManager {
 *   playerTeam: Array<Pokemon>      // 玩家队伍
 *   opponentTeam: Array<Pokemon>    // 对手队伍
 *   playerActive: Pokemon           // 玩家当前上场宝可梦
 *   opponentActive: Pokemon         // 对手当前上场宝可梦
 *   battleState: {
 *     turn: number                  // 当前回合数
 *     weather: string               // 天气状态
 *     terrain: string               // 场地状态
 *     isTeamPreview: boolean        // 是否在队伍预览阶段
 *     isBattleStarted: boolean      // 对战是否已开始
 *     isBattleEnded: boolean        // 对战是否已结束
 *   }
 *   currentRequest: Object          // 当前的 request 协议对象
 * }
 * 
 * 🔄 状态流转
 * ──────────────────────────────────────────────────────────────────────────
 * 
 *   协议接收 → 解析协议 → 更新 StateManager → UI 读取状态 → 渲染更新
 * 
 *   示例：
 *   |switch|p1: Pikachu → updateActivePokemon('p1', ...) → UI 显示 Pikachu
 *   |request|{...} → setCurrentRequest(...) → UI 显示技能按钮
 * 
 * ⚠️ 注意事项
 * ──────────────────────────────────────────────────────────────────────────
 * - currentRequest 是关键的共享状态，所有 Phase 都可能访问
 * - 状态更新应该通过 StateManager 的方法，不要直接修改内部属性
 * - 开始新对战时需要调用 reset() 清空状态
 */
class StateManager {
  /**
   * 构造函数
   * 初始化并重置所有状态
   */
  constructor() {
    this.reset();
  }

  /**
   * 重置状态
   * 
   * 功能：
   * - 清空所有状态数据
   * - 恢复到初始状态
   * - 用于开始新的对战或清理状态
   */
  reset() {
    this.playerTeam = [];
    this.opponentTeam = [];
    this.playerActive = null;
    this.opponentActive = null;
    this.battleState = {
      turn: 0,
      weather: null,
      terrain: null,
      isTeamPreview: false,
      isBattleStarted: false,
      isBattleEnded: false
    };
    this.currentRequest = null;
  }

  /**
   * 设置玩家队伍
   * 
   * @param {Array<Object>} team - 玩家队伍数组，每个元素是一个宝可梦对象
   */
  setPlayerTeam(team) {
    this.playerTeam = team;
  }

  /**
   * 设置对手队伍
   * 
   * @param {Array<Object>} team - 对手队伍数组，每个元素是一个宝可梦对象
   */
  setOpponentTeam(team) {
    this.opponentTeam = team;
  }

  /**
   * 更新当前上场的宝可梦
   * 
   * 功能：
   * - 更新指定方（p1 或 p2）的当前上场宝可梦数据
   * - 用于跟踪对战中的宝可梦状态变化
   * 
   * @param {string} side - 方标识：'p1' 或 'p2'
   * @param {Object} pokemonData - 宝可梦数据对象，包含 ident, species, details, condition 等
   */
  updateActivePokemon(side, pokemonData) {
    if (side === 'p1') {
      this.playerActive = pokemonData;
    } else if (side === 'p2') {
      this.opponentActive = pokemonData;
    }
  }

  /**
   * 设置当前请求
   * 
   * 功能：
   * - 保存从 |request| 协议解析出的请求对象
   * - 请求对象包含当前可用的技能、换人选项等信息
   * - 用于 UI 渲染和用户选择
   * 
   * @param {Object} request - 请求对象（来自 |request| 协议）
   *   - side: 玩家方信息 { id: 'p1'|'p2', pokemon: [...] }
   *   - active: 当前上场宝可梦信息数组 [{ moves: [...], ... }]
   *   - forceSwitch: 是否强制换人
   *   - teamPreview: 是否是队伍预览请求
   */
  setCurrentRequest(request) {
    console.log('[StateManager] 设置 currentRequest');
    console.log('[StateManager] request 内容:', JSON.stringify(request).substring(0, 300));
    this.currentRequest = request;
    console.log('[StateManager] currentRequest 已设置，类型:', typeof this.currentRequest);
  }

  /**
   * 更新对战状态
   * 
   * 功能：
   * - 合并更新对战状态对象
   * - 支持部分更新（只更新传入的字段）
   * 
   * @param {Object} updates - 要更新的状态字段
   *   - turn: 回合数
   *   - weather: 天气状态
   *   - terrain: 场地状态
   *   - isTeamPreview: 是否在队伍预览阶段
   *   - isBattleStarted: 对战是否已开始
   *   - isBattleEnded: 对战是否已结束
   */
  updateBattleState(updates) {
    Object.assign(this.battleState, updates);
  }

  /**
   * 获取玩家队伍
   */
  getPlayerTeam() {
    return this.playerTeam;
  }

  /**
   * 获取对手队伍
   */
  getOpponentTeam() {
    return this.opponentTeam;
  }

  /**
   * 获取当前上场的宝可梦
   */
  getActivePokemon(side) {
    return side === 'p1' ? this.playerActive : this.opponentActive;
  }

  /**
   * 获取当前请求
   */
  getCurrentRequest() {
    console.log('[StateManager] 获取 currentRequest');
    console.log('[StateManager] currentRequest 存在:', !!this.currentRequest);
    if (this.currentRequest) {
      console.log('[StateManager] currentRequest 内容:', JSON.stringify(this.currentRequest).substring(0, 300));
    }
    return this.currentRequest;
  }

  /**
   * 获取对战状态
   */
  getBattleState() {
    return this.battleState;
  }
}

export default StateManager;

