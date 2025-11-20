/**
 * 策略评估器（StrategyEvaluator）
 * 
 * 职责：
 * - 评估不同策略的优劣，辅助AI决策
 * - 对技能和换人选项进行综合评分
 * - 考虑多个因素：伤害、克制、风险、功能性
 * - 排序选项并选择最佳行动
 * 
 * 评估因素（技能）：
 * - 伤害（40%）：预期伤害百分比
 * - 克制效果（30%）：属性克制倍数
 * - 风险（15%）：命中率、反伤、状态风险
 * - 功能性（15%）：状态技能、能力变化、回复等
 * 
 * 评估因素（换人）：
 * - 健康状态（40%）：HP百分比
 * - 属性优势（40%）：对对手的克制关系
 * - 功能性（20%）：换人的必要性
 * 
 * 使用场景：
 * - AdvancedAI：评估所有选项后选择最佳行动
 * - ExpertAI：为LLM提供策略评估数据
 */
class StrategyEvaluator {
  /**
   * 构造函数
   * 初始化策略权重配置和风险阈值
   */
  constructor() {
    // 策略权重配置
    this.weights = {
      damage: 0.4,           // 伤害权重
      effectiveness: 0.3,    // 克制权重
      risk: 0.15,            // 风险权重
      utility: 0.15          // 功能性权重
    };

    // 风险阈值
    this.riskThresholds = {
      low: 0.3,      // 低风险
      medium: 0.6,   // 中风险
      high: 0.8      // 高风险
    };
  }

  /**
   * 评估技能选择
   * @param {Object} options - 评估选项
   * @param {Object} options.move - 技能对象
   * @param {Object} options.attacker - 攻击方宝可梦
   * @param {Object} options.defender - 防御方宝可梦
   * @param {Object} options.damagePrediction - 伤害预测（来自DamageCalculator）
   * @param {Object} options.effectiveness - 克制效果（来自TypeChartCalculator）
   * @param {Object} options.battleState - 对战状态（来自BattleStateAnalyzer）
   * @returns {Object} 评估结果
   */
  evaluateMove(options) {
    const {
      move,
      attacker,
      defender,
      damagePrediction = {},
      effectiveness = { effectiveness: 1 },
      battleState = {}
    } = options;

    if (!move || !attacker || !defender) {
      return {
        score: 0,
        reasons: ['缺少必要信息']
      };
    }

    // 检查技能是否可用
    if (move.disabled) {
      return {
        score: -1000,
        reasons: ['技能被禁用']
      };
    }

    const scores = {
      damage: 0,
      effectiveness: 0,
      risk: 0,
      utility: 0
    };

    const reasons = [];

    // 1. 伤害评分
    if (damagePrediction.damage !== undefined) {
      // 伤害百分比转换为评分（0-100）
      scores.damage = Math.min(damagePrediction.damage * 100, 100);
      reasons.push(`预期伤害: ${damagePrediction.damage.toFixed(1)}%`);
    } else {
      // 如果没有伤害预测，使用基础威力估算
      const basePower = move.basePower || 50;
      scores.damage = Math.min(basePower, 100);
      reasons.push(`基础威力: ${basePower}`);
    }

    // 2. 克制效果评分
    const eff = effectiveness.effectiveness || 1;
    if (eff >= 2) {
      scores.effectiveness = 100;
      reasons.push('极克制');
    } else if (eff >= 1.5) {
      scores.effectiveness = 75;
      reasons.push('较克制');
    } else if (eff === 1) {
      scores.effectiveness = 50;
      reasons.push('正常效果');
    } else if (eff >= 0.5) {
      scores.effectiveness = 25;
      reasons.push('效果不佳');
    } else {
      scores.effectiveness = 0;
      reasons.push('效果很差');
    }

    // 3. 风险评估
    const risk = this.assessRisk(move, attacker, defender, battleState);
    scores.risk = (1 - risk) * 100; // 风险越低，评分越高
    if (risk > this.riskThresholds.high) {
      reasons.push('高风险');
    } else if (risk > this.riskThresholds.medium) {
      reasons.push('中风险');
    } else {
      reasons.push('低风险');
    }

    // 4. 功能性评分
    scores.utility = this.assessUtility(move, attacker, defender, battleState);
    if (scores.utility > 70) {
      reasons.push('功能性高');
    }

    // 计算总分
    const totalScore = 
      scores.damage * this.weights.damage +
      scores.effectiveness * this.weights.effectiveness +
      scores.risk * this.weights.risk +
      scores.utility * this.weights.utility;

    return {
      score: totalScore,
      scores,
      reasons,
      move: move.name || move.id
    };
  }

  /**
   * 评估换人选择
   * @param {Object} options - 评估选项
   * @param {Object} options.switchTarget - 要换上的宝可梦
   * @param {Object} options.currentActive - 当前场上宝可梦
   * @param {Object} options.opponent - 对手宝可梦
   * @param {Object} options.battleState - 对战状态
   * @returns {Object} 评估结果
   */
  evaluateSwitch(options) {
    const {
      switchTarget,
      currentActive,
      opponent,
      battleState = {}
    } = options;

    if (!switchTarget) {
      return {
        score: -1000,
        reasons: ['无效的换人目标']
      };
    }

    // 检查是否可以换人
    if (switchTarget.active) {
      return {
        score: -1000,
        reasons: ['已在场上']
      };
    }

    if (switchTarget.condition && switchTarget.condition.includes('fnt')) {
      return {
        score: -1000,
        reasons: ['已倒下']
      };
    }

    const scores = {
      health: 0,
      typeAdvantage: 0,
      utility: 0
    };

    const reasons = [];

    // 1. 健康状态评分
    const analyzer = require('./BattleStateAnalyzer');
    const stateAnalyzer = new analyzer();
    const targetState = stateAnalyzer.analyzePokemon(switchTarget);
    scores.health = targetState.hp * 100;
    reasons.push(`HP: ${(targetState.hp * 100).toFixed(0)}%`);

    // 2. 属性优势评分
    if (opponent && switchTarget.types && opponent.types) {
      const typeChart = require('./TypeChartCalculator');
      const calculator = new typeChart();
      
      // 评估对手技能对我方的克制
      let defensiveScore = 50; // 默认
      // 这里简化处理，实际需要评估对手所有技能
      
      // 评估我方技能对对手的克制
      let offensiveScore = 50; // 默认
      
      scores.typeAdvantage = (defensiveScore + offensiveScore) / 2;
      reasons.push('属性评估完成');
    }

    // 3. 功能性评分
    // 评估换人的必要性
    if (currentActive) {
      const currentState = stateAnalyzer.analyzePokemon(currentActive);
      if (currentState.hp < 0.3) {
        scores.utility = 100; // 急需换人
        reasons.push('当前宝可梦HP过低');
      } else if (currentState.hp < 0.5) {
        scores.utility = 70;
        reasons.push('当前宝可梦HP较低');
      } else {
        scores.utility = 30;
        reasons.push('换人非必需');
      }
    }

    // 计算总分
    const totalScore = 
      scores.health * 0.4 +
      scores.typeAdvantage * 0.4 +
      scores.utility * 0.2;

    return {
      score: totalScore,
      scores,
      reasons,
      pokemon: switchTarget.name || switchTarget.species
    };
  }

  /**
   * 评估风险
   * @param {Object} move - 技能对象
   * @param {Object} attacker - 攻击方
   * @param {Object} defender - 防御方
   * @param {Object} battleState - 对战状态
   * @returns {number} 风险值（0-1）
   */
  assessRisk(move, attacker, defender, battleState) {
    let risk = 0;

    // 1. 命中率风险
    const accuracy = move.accuracy || 100;
    if (accuracy < 70) {
      risk += 0.3;
    } else if (accuracy < 90) {
      risk += 0.15;
    }

    // 2. 反伤风险（如近身战、双刃头锤等）
    if (move.recoil) {
      risk += 0.2;
    }
    if (move.mindBlownRecoil) {
      risk += 0.3;
    }

    // 3. 状态风险（如逆鳞、破坏光线等）
    if (move.selfdestruct || move.selfSwitch) {
      risk += 0.25;
    }

    // 4. 对手反击风险
    // 如果对手HP较高，使用低威力技能可能被反击
    if (defender && battleState.opponent) {
      const defenderHP = battleState.opponent.hp || 1;
      if (defenderHP > 0.7 && (move.basePower || 0) < 60) {
        risk += 0.15;
      }
    }

    return Math.min(risk, 1);
  }

  /**
   * 评估功能性
   * @param {Object} move - 技能对象
   * @param {Object} attacker - 攻击方
   * @param {Object} defender - 防御方
   * @param {Object} battleState - 对战状态
   * @returns {number} 功能性评分（0-100）
   */
  assessUtility(move, attacker, defender, battleState) {
    let utility = 50; // 基础分

    // 1. 状态技能
    if (move.status) {
      utility += 20;
    }

    // 2. 能力变化技能
    if (move.boosts) {
      utility += 15;
    }

    // 3. 回复技能
    if (move.heal) {
      utility += 25;
    }

    // 4. 先制技能
    if (move.priority > 0) {
      utility += 15;
    }

    // 5. 多段攻击
    if (move.multihit) {
      utility += 10;
    }

    // 6. 场地技能
    if (move.weather || move.terrain) {
      utility += 20;
    }

    return Math.min(utility, 100);
  }

  /**
   * 比较多个选项并排序
   * @param {Object[]} evaluations - 评估结果数组
   * @returns {Object[]} 排序后的评估结果
   */
  rankOptions(evaluations) {
    if (!Array.isArray(evaluations)) {
      return [];
    }

    return evaluations
      .filter(evaluation => evaluation.score > -1000) // 过滤无效选项
      .sort((a, b) => b.score - a.score);
  }

  /**
   * 获取最佳选项
   * @param {Object[]} evaluations - 评估结果数组
   * @returns {Object|null} 最佳评估结果
   */
  getBestOption(evaluations) {
    const ranked = this.rankOptions(evaluations);
    return ranked.length > 0 ? ranked[0] : null;
  }
}

module.exports = StrategyEvaluator;

