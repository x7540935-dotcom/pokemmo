/**
 * 中等AI（MediumAI）
 * 
 * 职责：
 * - 实现难度3的AI策略
 * - 结合属性克制、HP状态、技能威力等多因素决策
 * - 考虑换人时机（HP低于30%时考虑换人）
 * 
 * 策略说明：
 * - 分析当前对战状态（HP、状态效果等）
 * - 评估技能的综合评分（属性克制50% + 威力30% + 命中率20%）
 * - 根据HP状态决定是否换人
 * 
 * 工具依赖：
 * - TypeChartCalculator: 属性克制计算
 * - BattleStateAnalyzer: 对战状态分析
 * 
 * 使用场景：
 * - 中等难度对战，适合有一定经验的玩家
 */
const tools = require('../tools');
const Logger = require('./Logger');

class MediumAI {
  /**
   * 构造函数
   * 
   * @param {AIChoiceHandler} handler - AI选择处理器引用
   */
  constructor(handler) {
    this.handler = handler;
    this.typeChart = new tools.TypeChartCalculator();
    this.stateAnalyzer = new tools.BattleStateAnalyzer();
    this.switchThreshold = 0.3; // 血量低于30%考虑换人
    this.logger = new Logger('MediumAI');
    
    this.logger.info('MediumAI初始化完成');
  }

  /**
   * 生成选择
   */
  generateChoice(request) {
    try {
      this.logger.debug('开始生成决策', { 
        hasActive: !!request.active,
        hasTeamPreview: !!request.teamPreview,
        hasForceSwitch: !!request.forceSwitch
      });

      if (request.wait) {
        return null;
      }

      if (request.teamPreview) {
        return this.chooseTeamPreview(request);
      }

      if (request.forceSwitch) {
        return this.chooseBestSwitch(request);
      }

      if (request.active) {
        // 分析当前状态
        const battleState = this.stateAnalyzer.analyze(request);
        this.logger.debug('对战状态分析完成', { battleState });

        // 检查是否需要换人
        const shouldSwitch = this.shouldSwitch(battleState);
        if (shouldSwitch) {
          const switchChoice = this.chooseBestSwitch(request);
          if (switchChoice !== 'default') {
            this.logger.info('决定换人', { reason: 'HP过低或状态不利' });
            return switchChoice;
          }
        }

        // 选择最佳技能
        const choice = this.chooseBestMove(request, battleState);
        this.logger.debug('决策生成完成', { choice });
        return choice;
      }

      this.logger.warn('无法生成决策，返回default');
      return 'default';
    } catch (error) {
      this.logger.error('生成决策时发生错误', {
        error: error.message,
        stack: error.stack
      });
      return 'default';
    }
  }

  /**
   * 选择队伍预览
   */
  chooseTeamPreview(request) {
    this.logger.info('选择队伍预览');
    // 简单策略：选择第一个位置
    return 'team 1';
  }

  /**
   * 选择最佳换人
   */
  chooseBestSwitch(request) {
    try {
      const pokemon = request.side?.pokemon;
      if (!pokemon || pokemon.length === 0) {
        this.logger.warn('没有可用宝可梦进行换人');
        return 'default';
      }

      // 分析每个可换的宝可梦
      const availableSwitches = [];
      for (let i = 0; i < pokemon.length; i++) {
        const p = pokemon[i];
        if (p && !p.active && !p.condition?.endsWith(' fnt')) {
          try {
            const state = this.stateAnalyzer.analyzePokemon(p);
            availableSwitches.push({
              pokemon: p,
              index: i + 1,
              hp: state.hp,
              health: this.stateAnalyzer.evaluateHealth(state)
            });
          } catch (error) {
            this.logger.debug('分析宝可梦状态时出错', { index: i + 1, error: error.message });
          }
        }
      }

      if (availableSwitches.length === 0) {
        this.logger.warn('没有可换的宝可梦');
        return 'default';
      }

      // 优先选择HP高的宝可梦
      availableSwitches.sort((a, b) => b.hp - a.hp);
      const bestSwitch = availableSwitches[0];

      this.logger.info('选择换人', {
        index: bestSwitch.index,
        pokemon: bestSwitch.pokemon?.name || bestSwitch.pokemon?.species,
        hp: (bestSwitch.hp * 100).toFixed(0) + '%'
      });
      return `switch ${bestSwitch.index}`;
    } catch (error) {
      this.logger.error('选择换人时发生错误', { error: error.message });
      return 'default';
    }
  }

  /**
   * 判断是否需要换人
   */
  shouldSwitch(battleState) {
    if (!battleState.myActive) {
      return false;
    }

    // HP过低
    if (battleState.myActive.hp < this.switchThreshold) {
      return true;
    }

    // 已倒下
    if (battleState.myActive.hp === 0) {
      return true;
    }

    // 被束缚无法换人
    if (battleState.myActive.trapped) {
      return false;
    }

    return false;
  }

  /**
   * 选择最佳技能
   * 
   * 功能：
   * - 评估所有可用技能的综合评分
   * - 评分因素：属性克制（50%）、威力（30%）、命中率（20%）
   * - 选择评分最高的技能
   * 
   * @param {Object} request - 请求对象
   * @param {Object} battleState - 对战状态分析结果
   * @returns {string} 选择命令（如 'move 1'）
   */
  chooseBestMove(request, battleState) {
    try {
      const active = request.active && request.active[0];
      if (!active) {
        this.logger.warn('场上没有宝可梦');
        return 'default';
      }

      // 获取对手信息（简化处理）
      const opponent = this.getOpponentFromRequest(request);

      if (!active.moves || active.moves.length === 0) {
        this.logger.warn('没有可用技能');
        return 'default';
      }

      // 评估所有可用技能
      const moveEvaluations = active.moves
        .map((move, index) => {
          try {
            if (!move || move.disabled) return null;

            // 1. 属性克制评分
            let typeScore = 50; // 默认
            if (opponent) {
              const evaluation = this.typeChart.evaluateMove(move, opponent);
              const eff = evaluation.effectiveness;
              if (eff >= 2) {
                typeScore = 100;
              } else if (eff >= 1.5) {
                typeScore = 75;
              } else if (eff === 1) {
                typeScore = 50;
              } else if (eff >= 0.5) {
                typeScore = 25;
              } else {
                typeScore = 0;
              }
            }

            // 2. 威力评分
            const basePower = move.basePower || 50;
            const powerScore = Math.min((basePower / 150) * 100, 100);

            // 3. 命中率评分
            const accuracy = move.accuracy || 100;
            const accuracyScore = accuracy;

            // 4. 综合评分
            const totalScore = typeScore * 0.5 + powerScore * 0.3 + accuracyScore * 0.2;

            return {
              move,
              index: index + 1,
              score: totalScore,
              typeScore,
              powerScore,
              accuracyScore
            };
          } catch (error) {
            this.logger.debug('评估技能时出错', { moveIndex: index + 1, error: error.message });
            return null;
          }
        })
        .filter(evaluation => evaluation !== null);

      if (moveEvaluations.length === 0) {
        this.logger.warn('没有可评估的技能');
        return 'default';
      }

      // 按评分排序
      moveEvaluations.sort((a, b) => b.score - a.score);

      // 选择最佳技能（如果有多个相同评分，随机选择）
      const bestScore = moveEvaluations[0].score;
      const bestMoves = moveEvaluations.filter(evaluation => evaluation.score === bestScore);

      const selectedMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
      this.logger.info('选择技能', {
        moveIndex: selectedMove.index,
        moveName: selectedMove.move?.name || selectedMove.move?.id,
        score: selectedMove.score.toFixed(1),
        typeScore: selectedMove.typeScore,
        powerScore: selectedMove.powerScore.toFixed(0),
        accuracyScore: selectedMove.accuracyScore
      });
      return `move ${selectedMove.index}`;
    } catch (error) {
      this.logger.error('选择最佳技能时发生错误', { error: error.message, stack: error.stack });
      return 'default';
    }
  }

  /**
   * 获取对手信息（简化版）
   */
  getOpponentFromRequest(request) {
    try {
      // request协议通常不包含对手的完整信息
      // 尝试从BattleManager获取对手信息
      if (this.handler && this.handler.battleManager) {
        // 这里可以尝试从BattleManager获取对手状态
        // 暂时返回null，使用其他策略
      }
      return null;
    } catch (error) {
      this.logger.debug('获取对手信息时出错', { error: error.message });
      return null;
    }
  }
}

module.exports = MediumAI;

