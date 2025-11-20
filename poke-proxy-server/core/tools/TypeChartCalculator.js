/**
 * 属性克制计算器（TypeChartCalculator）
 * 
 * 职责：
 * - 提供完整的18种属性克制关系计算
 * - 计算技能对宝可梦的伤害倍数
 * - 评估技能的克制效果
 * - 比较多个技能的克制效果并排序
 * 
 * 属性克制表：
 * - 包含18种属性的完整克制关系
 * - 支持双属性宝可梦的克制计算（倍数相乘）
 * - 倍数范围：0（无效）、0.25（极不克制）、0.5（不克制）、1（正常）、2（克制）、4（极克制）
 * 
 * 使用场景：
 * - SimpleAI（难度2）：选择克制效果最好的技能
 * - MediumAI（难度3）：评估技能的综合评分
 * - AdvancedAI（难度4）：深度策略评估
 * - ExpertAI（难度5）：LLM决策的辅助信息
 */
class TypeChartCalculator {
  /**
   * 构造函数
   * 初始化18种属性的完整克制表
   */
  constructor() {
    // 完整的属性克制表（18种属性）
    // 格式：{ 攻击属性: { 防御属性: 倍数 } }
    // 倍数：2 = 2倍克制，1 = 正常，0.5 = 0.5倍，0 = 无效
    this.typeChart = {
      'Normal': {
        'Rock': 0.5,
        'Ghost': 0,
        'Steel': 0.5
      },
      'Fire': {
        'Fire': 0.5,
        'Water': 0.5,
        'Grass': 2,
        'Ice': 2,
        'Bug': 2,
        'Rock': 0.5,
        'Dragon': 0.5,
        'Steel': 2
      },
      'Water': {
        'Fire': 2,
        'Water': 0.5,
        'Grass': 0.5,
        'Ground': 2,
        'Rock': 2,
        'Dragon': 0.5
      },
      'Electric': {
        'Water': 2,
        'Electric': 0.5,
        'Grass': 0.5,
        'Ground': 0,
        'Flying': 2,
        'Dragon': 0.5
      },
      'Grass': {
        'Fire': 0.5,
        'Water': 2,
        'Grass': 0.5,
        'Poison': 0.5,
        'Ground': 2,
        'Flying': 0.5,
        'Bug': 0.5,
        'Rock': 2,
        'Dragon': 0.5,
        'Steel': 0.5
      },
      'Ice': {
        'Fire': 0.5,
        'Water': 0.5,
        'Grass': 2,
        'Ice': 0.5,
        'Ground': 2,
        'Flying': 2,
        'Dragon': 2,
        'Steel': 0.5
      },
      'Fighting': {
        'Normal': 2,
        'Ice': 2,
        'Poison': 0.5,
        'Flying': 0.5,
        'Psychic': 0.5,
        'Bug': 0.5,
        'Rock': 2,
        'Ghost': 0,
        'Dark': 2,
        'Steel': 2,
        'Fairy': 0.5
      },
      'Poison': {
        'Grass': 2,
        'Poison': 0.5,
        'Ground': 0.5,
        'Rock': 0.5,
        'Ghost': 0.5,
        'Steel': 0,
        'Fairy': 2
      },
      'Ground': {
        'Fire': 2,
        'Electric': 2,
        'Grass': 0.5,
        'Poison': 2,
        'Flying': 0,
        'Bug': 0.5,
        'Rock': 2,
        'Steel': 2
      },
      'Flying': {
        'Fire': 0.5,
        'Electric': 0.5,
        'Grass': 2,
        'Fighting': 2,
        'Bug': 2,
        'Rock': 0.5,
        'Steel': 0.5
      },
      'Psychic': {
        'Fighting': 2,
        'Poison': 2,
        'Psychic': 0.5,
        'Dark': 0,
        'Steel': 0.5
      },
      'Bug': {
        'Fire': 0.5,
        'Grass': 2,
        'Fighting': 0.5,
        'Poison': 0.5,
        'Flying': 0.5,
        'Psychic': 2,
        'Ghost': 0.5,
        'Dark': 2,
        'Steel': 0.5,
        'Fairy': 0.5
      },
      'Rock': {
        'Fire': 2,
        'Ice': 2,
        'Fighting': 0.5,
        'Ground': 0.5,
        'Flying': 2,
        'Bug': 2,
        'Steel': 0.5
      },
      'Ghost': {
        'Normal': 0,
        'Psychic': 2,
        'Ghost': 2,
        'Dark': 0.5
      },
      'Dragon': {
        'Dragon': 2,
        'Steel': 0.5,
        'Fairy': 0
      },
      'Dark': {
        'Fighting': 0.5,
        'Psychic': 2,
        'Ghost': 2,
        'Dark': 0.5,
        'Fairy': 0.5
      },
      'Steel': {
        'Fire': 0.5,
        'Water': 0.5,
        'Electric': 0.5,
        'Ice': 2,
        'Rock': 2,
        'Steel': 0.5,
        'Fairy': 2
      },
      'Fairy': {
        'Fire': 0.5,
        'Fighting': 2,
        'Poison': 0.5,
        'Dragon': 2,
        'Dark': 2,
        'Steel': 0.5
      }
    };
  }

  /**
   * 计算属性克制倍数
   * @param {string|string[]} attackType - 攻击属性（单个或数组）
   * @param {string|string[]} defenseTypes - 防御属性（单个或数组）
   * @returns {number} 克制倍数（0, 0.25, 0.5, 1, 2, 4）
   */
  getEffectiveness(attackType, defenseTypes) {
    // 标准化输入
    if (typeof attackType === 'string') {
      attackType = [attackType];
    }
    if (typeof defenseTypes === 'string') {
      defenseTypes = [defenseTypes];
    }
    
    if (!Array.isArray(attackType) || !Array.isArray(defenseTypes)) {
      console.warn('[TypeChartCalculator] 无效的属性类型');
      return 1;
    }

    // 如果攻击方有多个属性，取第一个（通常技能只有一个属性）
    const atkType = attackType[0];
    if (!atkType || !this.typeChart[atkType]) {
      console.warn(`[TypeChartCalculator] 未知的攻击属性: ${atkType}`);
      return 1;
    }

    // 计算对每个防御属性的克制倍数
    let totalEffectiveness = 1;
    const chart = this.typeChart[atkType];
    
    for (const defType of defenseTypes) {
      if (!defType) continue;
      
      // 查找克制倍数，如果不存在则默认为1
      const effectiveness = chart[defType] !== undefined ? chart[defType] : 1;
      totalEffectiveness *= effectiveness;
    }

    return totalEffectiveness;
  }

  /**
   * 获取属性克制描述
   * @param {number} effectiveness - 克制倍数
   * @returns {string} 描述文本
   */
  getEffectivenessDescription(effectiveness) {
    if (effectiveness === 0) return '无效';
    if (effectiveness === 0.25) return '极不克制';
    if (effectiveness === 0.5) return '不克制';
    if (effectiveness === 1) return '正常';
    if (effectiveness === 2) return '克制';
    if (effectiveness === 4) return '极克制';
    return '未知';
  }

  /**
   * 评估技能对目标的克制效果
   * @param {Object} move - 技能对象（包含type属性）
   * @param {Object} target - 目标宝可梦（包含types属性）
   * @returns {Object} { effectiveness: number, description: string }
   */
  evaluateMove(move, target) {
    if (!move || !target) {
      return { effectiveness: 1, description: '正常' };
    }

    const moveType = move.type;
    const targetTypes = target.types || [];

    const effectiveness = this.getEffectiveness(moveType, targetTypes);
    const description = this.getEffectivenessDescription(effectiveness);

    return { effectiveness, description };
  }

  /**
   * 比较多个技能的克制效果
   * @param {Object[]} moves - 技能数组
   * @param {Object} target - 目标宝可梦
   * @returns {Object[]} 排序后的技能数组（按克制效果降序）
   */
  compareMoves(moves, target) {
    if (!moves || !Array.isArray(moves) || !target) {
      return [];
    }

    return moves.map((move, index) => {
      const evaluation = this.evaluateMove(move, target);
      return {
        move,
        index,
        effectiveness: evaluation.effectiveness,
        description: evaluation.description
      };
    }).sort((a, b) => b.effectiveness - a.effectiveness);
  }

  /**
   * 获取最佳克制技能
   * @param {Object[]} moves - 技能数组
   * @param {Object} target - 目标宝可梦
   * @returns {Object|null} 最佳技能及其索引
   */
  getBestMove(moves, target) {
    const compared = this.compareMoves(moves, target);
    if (compared.length === 0) {
      return null;
    }
    return {
      move: compared[0].move,
      index: compared[0].index,
      effectiveness: compared[0].effectiveness
    };
  }
}

module.exports = TypeChartCalculator;

