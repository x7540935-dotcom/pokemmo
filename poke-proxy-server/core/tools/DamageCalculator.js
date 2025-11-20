/**
 * 伤害计算器（DamageCalculator）
 * 
 * 职责：
 * - 计算技能对宝可梦造成的伤害
 * - 使用Pokemon Showdown的伤害计算公式（简化版）
 * - 预测伤害范围（最小、最大、平均）
 * - 计算伤害百分比和击杀概率
 * 
 * 计算因素：
 * - 技能威力（basePower）
 * - 攻击方和防御方的能力值（考虑能力等级）
 * - 属性克制效果
 * - 等级修正
 * - 随机修正（85%-100%）
 * 
 * 输出结果：
 * - damage: 平均伤害值
 * - minDamage/maxDamage: 伤害范围
 * - damagePercent: 伤害百分比（0-1）
 * - effectiveness: 属性克制倍数
 * - killChance: 击杀概率（简化：如果能造成100%伤害则为1.0）
 * 
 * 使用场景：
 * - AdvancedAI：预测伤害，选择最优技能
 * - ExpertAI：为LLM提供伤害预测数据
 */
const path = require('path');

class DamageCalculator {
  /**
   * 构造函数
   * 延迟加载Pokemon Showdown模块（避免启动时加载）
   */
  constructor() {
    // 延迟加载Pokemon Showdown
    this._dex = null;
    this._battle = null;
  }

  /**
   * 获取Dex实例（延迟加载）
   * @returns {Object} Dex实例
   */
  getDex() {
    if (!this._dex) {
      try {
        const showdownAdapter = require('../../adapters/pokemon-showdown/ShowdownAdapter');
        this._dex = showdownAdapter.getDex();
      } catch (e) {
        console.error('[DamageCalculator] 无法加载Pokemon Showdown Dex:', e);
        throw new Error('Pokemon Showdown未找到，请确保已正确安装');
      }
    }
    return this._dex;
  }

  /**
   * 计算伤害
   * @param {Object} options - 计算选项
   * @param {Object} options.attacker - 攻击方宝可梦对象
   * @param {Object} options.move - 技能对象
   * @param {Object} options.defender - 防御方宝可梦对象
   * @param {Object} options.field - 场地对象（可选）
   * @param {Object} options.side - 攻击方队伍信息（可选）
   * @returns {Object} 伤害计算结果
   */
  calculate(options) {
    const {
      attacker,
      move,
      defender,
      field = {},
      side = {}
    } = options;

    if (!attacker || !move || !defender) {
      console.warn('[DamageCalculator] 缺少必要参数');
      return {
        damage: 0,
        minDamage: 0,
        maxDamage: 0,
        damagePercent: 0,
        error: '缺少必要参数'
      };
    }

    try {
      const Dex = this.getDex();
      
      // 获取技能数据
      const moveData = Dex.moves.get(move.id || move.name);
      if (!moveData) {
        console.warn(`[DamageCalculator] 未找到技能: ${move.id || move.name}`);
        return this._fallbackCalculation(attacker, move, defender);
      }

      // 获取攻击方和防御方的宝可梦数据
      const attackerSpecies = Dex.species.get(attacker.species || attacker.name);
      const defenderSpecies = Dex.species.get(defender.species || defender.name);

      if (!attackerSpecies || !defenderSpecies) {
        console.warn('[DamageCalculator] 未找到宝可梦数据');
        return this._fallbackCalculation(attacker, move, defender);
      }

      // 构建攻击方和防御方的完整数据
      const attackerData = this._buildPokemonData(attacker, attackerSpecies);
      const defenderData = this._buildPokemonData(defender, defenderSpecies);

      // 使用Pokemon Showdown的伤害计算公式
      // 注意：Pokemon Showdown的伤害计算比较复杂，这里使用简化版本
      const damage = this._calculateDamage(
        attackerData,
        moveData,
        defenderData,
        field
      );

      return damage;
    } catch (error) {
      console.error('[DamageCalculator] 计算伤害时出错:', error);
      return this._fallbackCalculation(attacker, move, defender);
    }
  }

  /**
   * 构建宝可梦数据
   * @param {Object} pokemon - 宝可梦对象（来自request协议）
   * @param {Object} speciesData - 宝可梦种类数据（来自Dex）
   * @returns {Object} 完整的宝可梦数据
   */
  _buildPokemonData(pokemon, speciesData) {
    // 解析HP
    const hp = this._parseHP(pokemon.condition);
    const maxHP = this._parseMaxHP(pokemon.condition) || speciesData.baseStats.hp;

    // 解析能力等级
    const boosts = pokemon.boosts || {};

    // 构建数据
    return {
      species: speciesData,
      level: pokemon.level || 50,
      hp: hp * maxHP,
      maxHP: maxHP,
      stats: {
        hp: maxHP,
        atk: this._calculateStat(speciesData.baseStats.atk, boosts.atk || 0, pokemon.level || 50),
        def: this._calculateStat(speciesData.baseStats.def, boosts.def || 0, pokemon.level || 50),
        spa: this._calculateStat(speciesData.baseStats.spa, boosts.spa || 0, pokemon.level || 50),
        spd: this._calculateStat(speciesData.baseStats.spd, boosts.spd || 0, pokemon.level || 50),
        spe: this._calculateStat(speciesData.baseStats.spe, boosts.spe || 0, pokemon.level || 50)
      },
      types: pokemon.types || speciesData.types,
      ability: pokemon.ability || speciesData.abilities[0],
      item: pokemon.item || '',
      status: this._parseStatus(pokemon.condition),
      boosts: boosts
    };
  }

  /**
   * 计算能力值
   * @param {number} baseStat - 基础能力值
   * @param {number} boost - 能力等级（-6到6）
   * @param {number} level - 等级
   * @returns {number} 实际能力值
   */
  _calculateStat(baseStat, boost, level = 50) {
    // 能力值计算公式（简化版）
    const nature = 1.0; // 默认性格修正
    const iv = 31; // 默认个体值
    const ev = 252; // 默认努力值（简化）
    
    // 基础计算
    let stat = Math.floor((2 * baseStat + iv + Math.floor(ev / 4)) * level / 100) + 5;
    
    // 性格修正（简化，只考虑物攻/特攻/速度）
    stat = Math.floor(stat * nature);
    
    // 能力等级修正
    const boostMultiplier = boost > 0 
      ? (2 + boost) / 2 
      : boost < 0 
        ? 2 / (2 - boost) 
        : 1;
    
    stat = Math.floor(stat * boostMultiplier);
    
    return stat;
  }

  /**
   * 计算伤害（使用Pokemon Showdown公式的简化版本）
   * @param {Object} attacker - 攻击方数据
   * @param {Object} move - 技能数据
   * @param {Object} defender - 防御方数据
   * @param {Object} field - 场地数据
   * @returns {Object} 伤害结果
   */
  _calculateDamage(attacker, move, defender, field) {
    // 基础威力
    const basePower = move.basePower || 50;
    
    // 攻击力和防御力
    const attackStat = move.category === 'Physical' 
      ? attacker.stats.atk 
      : attacker.stats.spa;
    const defenseStat = move.category === 'Physical'
      ? defender.stats.def
      : defender.stats.spd;
    
    // 等级修正
    const level = attacker.level || 50;
    const levelModifier = (2 * level + 10) / 250;
    
    // 基础伤害
    const baseDamage = (levelModifier * basePower * attackStat) / defenseStat;
    
    // 属性修正（需要TypeChartCalculator）
    const typeChart = require('./TypeChartCalculator');
    const calculator = new typeChart();
    const effectiveness = calculator.getEffectiveness(move.type, defender.types);
    
    // 其他修正（简化）
    let modifier = 1.0;
    modifier *= effectiveness; // 属性修正
    modifier *= (move.accuracy || 100) / 100; // 命中率影响（简化）
    
    // 随机修正（85%-100%）
    const randomMin = 0.85;
    const randomMax = 1.0;
    
    const minDamage = Math.floor(baseDamage * modifier * randomMin);
    const maxDamage = Math.floor(baseDamage * modifier * randomMax);
    const avgDamage = (minDamage + maxDamage) / 2;
    
    // 转换为百分比
    const damagePercent = avgDamage / defender.maxHP;
    const minDamagePercent = minDamage / defender.maxHP;
    const maxDamagePercent = maxDamage / defender.maxHP;
    
    return {
      damage: avgDamage,
      minDamage: minDamage,
      maxDamage: maxDamage,
      damagePercent: Math.min(damagePercent, 1.0),
      minDamagePercent: Math.min(minDamagePercent, 1.0),
      maxDamagePercent: Math.min(maxDamagePercent, 1.0),
      effectiveness: effectiveness,
      killChance: damagePercent >= 1.0 ? 1.0 : 0 // 简化：如果能造成100%伤害则认为必杀
    };
  }

  /**
   * 降级计算（当Pokemon Showdown不可用时）
   * @param {Object} attacker - 攻击方
   * @param {Object} move - 技能
   * @param {Object} defender - 防御方
   * @returns {Object} 简化的伤害结果
   */
  _fallbackCalculation(attacker, move, defender) {
    const basePower = move.basePower || 50;
    const typeChart = require('./TypeChartCalculator');
    const calculator = new typeChart();
    const effectiveness = calculator.getEffectiveness(
      move.type || 'Normal',
      defender.types || ['Normal']
    );
    
    // 极简计算
    const damage = basePower * effectiveness * 0.1; // 简化系数
    
    return {
      damage: damage,
      minDamage: damage * 0.85,
      maxDamage: damage * 1.0,
      damagePercent: Math.min(damage / 100, 1.0),
      minDamagePercent: Math.min(damage * 0.85 / 100, 1.0),
      maxDamagePercent: Math.min(damage / 100, 1.0),
      effectiveness: effectiveness,
      killChance: 0,
      error: '使用降级计算'
    };
  }

  /**
   * 解析HP
   * @param {string} condition - 状态字符串
   * @returns {number} HP百分比
   */
  _parseHP(condition) {
    if (!condition) return 1.0;
    if (condition.includes('fnt')) return 0;
    const match = condition.match(/(\d+)\/(\d+)/);
    if (match) {
      return parseInt(match[1], 10) / parseInt(match[2], 10);
    }
    return 1.0;
  }

  /**
   * 解析最大HP
   * @param {string} condition - 状态字符串
   * @returns {number} 最大HP
   */
  _parseMaxHP(condition) {
    if (!condition) return 100;
    const match = condition.match(/(\d+)\/(\d+)/);
    if (match) {
      return parseInt(match[2], 10);
    }
    return 100;
  }

  /**
   * 解析状态
   * @param {string} condition - 状态字符串
   * @returns {string|null} 状态ID
   */
  _parseStatus(condition) {
    if (!condition) return null;
    const statuses = ['brn', 'par', 'slp', 'psn', 'tox', 'frz'];
    for (const status of statuses) {
      if (condition.includes(status)) {
        return status;
      }
    }
    return null;
  }
}

module.exports = DamageCalculator;

