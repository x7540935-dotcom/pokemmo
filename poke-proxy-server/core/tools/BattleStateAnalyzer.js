/**
 * 对战状态分析器（BattleStateAnalyzer）
 * 
 * 职责：
 * - 解析对战状态，提供局势分析
 * - 解析HP百分比、状态异常、能力等级变化
 * - 评估宝可梦健康状态
 * - 判断是否需要换人
 * 
 * 解析功能：
 * - parseHP(): 从condition字符串解析HP百分比
 * - parseStatus(): 解析状态异常（灼伤、麻痹、睡眠等）
 * - parseBoosts(): 解析能力等级变化
 * - analyzePokemon(): 综合分析单个宝可梦状态
 * - analyze(): 分析整个对战状态
 * 
 * 使用场景：
 * - MediumAI：判断是否需要换人（HP低于30%）
 * - AdvancedAI：深度分析对战局势
 * - ExpertAI：为LLM提供状态分析数据
 */
class BattleStateAnalyzer {
  /**
   * 构造函数
   * 初始化状态映射表（状态ID -> 中文名称）
   */
  constructor() {
    // 状态映射
    this.statusMap = {
      'brn': '灼伤',
      'par': '麻痹',
      'slp': '睡眠',
      'psn': '中毒',
      'tox': '剧毒',
      'frz': '冰冻'
    };
  }

  /**
   * 解析HP百分比
   * @param {string} condition - 状态字符串，例如 "100/100", "50/100", "fnt"
   * @returns {number} HP百分比（0-1），如果已倒下返回0
   */
  parseHP(condition) {
    if (!condition) return 1.0;

    // 检查是否倒下
    if (condition.includes('fnt')) {
      return 0;
    }

    // 解析HP格式：当前HP/最大HP
    const match = condition.match(/(\d+)\/(\d+)/);
    if (match) {
      const current = parseInt(match[1], 10);
      const max = parseInt(match[2], 10);
      if (max > 0) {
        return current / max;
      }
    }

    // 如果无法解析，尝试其他格式
    // 有些格式可能是 "100%" 或直接是数字
    const percentMatch = condition.match(/(\d+)%/);
    if (percentMatch) {
      return parseInt(percentMatch[1], 10) / 100;
    }

    // 默认返回满血
    return 1.0;
  }

  /**
   * 解析状态异常
   * @param {string} condition - 状态字符串
   * @returns {string|null} 状态异常ID，如果没有则返回null
   */
  parseStatus(condition) {
    if (!condition) return null;

    // 检查各种状态
    for (const [statusId, statusName] of Object.entries(this.statusMap)) {
      if (condition.includes(statusId)) {
        return statusId;
      }
    }

    return null;
  }

  /**
   * 解析能力等级变化
   * @param {Object} pokemon - 宝可梦对象
   * @returns {Object} 能力等级变化对象
   */
  parseBoosts(pokemon) {
    if (!pokemon || !pokemon.boosts) {
      return {
        atk: 0, def: 0, spa: 0, spd: 0, spe: 0,
        accuracy: 0, evasion: 0
      };
    }

    return {
      atk: pokemon.boosts.atk || 0,
      def: pokemon.boosts.def || 0,
      spa: pokemon.boosts.spa || 0,
      spd: pokemon.boosts.spd || 0,
      spe: pokemon.boosts.spe || 0,
      accuracy: pokemon.boosts.accuracy || 0,
      evasion: pokemon.boosts.evasion || 0
    };
  }

  /**
   * 分析宝可梦状态
   * @param {Object} pokemon - 宝可梦对象
   * @returns {Object} 状态分析结果
   */
  analyzePokemon(pokemon) {
    if (!pokemon) {
      return {
        hp: 0,
        status: null,
        boosts: {},
        trapped: false,
        canAct: false
      };
    }

    const condition = pokemon.condition || '';
    
    return {
      hp: this.parseHP(condition),
      status: this.parseStatus(condition),
      boosts: this.parseBoosts(pokemon),
      trapped: pokemon.trapped || false,
      canAct: !condition.includes('fnt') && !pokemon.trapped,
      active: pokemon.active || false
    };
  }

  /**
   * 分析对战状态
   * @param {Object} request - request协议对象
   * @returns {Object} 对战状态分析结果
   */
  analyze(request) {
    if (!request) {
      return {
        myActive: null,
        opponent: null,
        myTeam: [],
        weather: null,
        field: null,
        turn: 0
      };
    }

    // 分析我方场上宝可梦
    const myActive = request.active && request.active[0] 
      ? this.analyzePokemon(request.active[0])
      : null;

    // 分析对手（需要从request中提取，通常在对战协议中）
    // 注意：request中可能不直接包含对手信息，需要从其他协议中获取
    const opponent = this.getOpponentFromRequest(request);

    // 分析我方队伍
    const myTeam = (request.side && request.side.pokemon) 
      ? request.side.pokemon.map(p => this.analyzePokemon(p))
      : [];

    return {
      myActive,
      opponent,
      myTeam,
      weather: request.weather || null,
      field: request.field || null,
      turn: request.rqid || 0,
      forceSwitch: request.forceSwitch || false,
      teamPreview: request.teamPreview || false
    };
  }

  /**
   * 从request中获取对手信息（如果可用）
   * @param {Object} request - request协议对象
   * @returns {Object|null} 对手分析结果
   */
  getOpponentFromRequest(request) {
    // request协议通常不包含对手的完整信息
    // 对手信息通常在对战状态中，需要通过其他方式获取
    // 这里返回null，实际使用时需要从BattleManager或其他地方获取
    return null;
  }

  /**
   * 判断是否需要换人
   * @param {Object} analysis - 状态分析结果
   * @param {number} hpThreshold - HP阈值（默认0.3）
   * @returns {boolean} 是否需要换人
   */
  shouldSwitch(analysis, hpThreshold = 0.3) {
    if (!analysis.myActive) {
      return false;
    }

    // HP过低
    if (analysis.myActive.hp < hpThreshold) {
      return true;
    }

    // 已倒下
    if (analysis.myActive.hp === 0) {
      return true;
    }

    // 被束缚无法换人
    if (analysis.myActive.trapped) {
      return false;
    }

    return false;
  }

  /**
   * 判断是否可以行动
   * @param {Object} pokemon - 宝可梦分析结果
   * @returns {boolean} 是否可以行动
   */
  canAct(pokemon) {
    if (!pokemon) return false;
    
    // 已倒下
    if (pokemon.hp === 0) return false;
    
    // 被束缚
    if (pokemon.trapped && pokemon.hp < 0.1) return false;
    
    // 睡眠状态（需要检查是否醒来）
    if (pokemon.status === 'slp') {
      // 这里简化处理，实际需要检查睡眠回合数
      return true; // 假设可以行动
    }
    
    return true;
  }

  /**
   * 获取状态描述
   * @param {string} statusId - 状态ID
   * @returns {string} 状态描述
   */
  getStatusDescription(statusId) {
    return this.statusMap[statusId] || statusId || '正常';
  }

  /**
   * 评估宝可梦健康状态
   * @param {Object} pokemon - 宝可梦分析结果
   * @returns {string} 健康状态描述（'健康' | '受伤' | '重伤' | '濒死' | '倒下'）
   */
  evaluateHealth(pokemon) {
    if (!pokemon) return '未知';
    
    const hp = pokemon.hp;
    
    if (hp === 0) return '倒下';
    if (hp < 0.2) return '濒死';
    if (hp < 0.5) return '重伤';
    if (hp < 0.8) return '受伤';
    return '健康';
  }
}

module.exports = BattleStateAnalyzer;

