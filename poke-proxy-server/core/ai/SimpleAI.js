/**
 * 简单AI（SimpleAI）
 * 
 * 职责：
 * - 实现难度1-2的AI策略
 * - 难度1：完全随机选择（用于测试和娱乐）
 * - 难度2：基于属性克制的简单策略
 * 
 * 策略说明：
 * - 难度1：随机选择技能或换人（20%概率换人）
 * - 难度2：优先选择对对手效果最好的技能（基于属性克制表）
 * 
 * 工具依赖：
 * - TypeChartCalculator: 计算属性克制效果
 * 
 * 使用场景：
 * - 新手玩家的入门难度
 * - 快速测试对战系统
 */
const tools = require('../tools');
const Logger = require('./Logger');

class SimpleAI {
  /**
   * 构造函数
   * 
   * @param {AIChoiceHandler} handler - AI选择处理器引用
   * @param {number} [difficulty=2] - AI难度（1或2），默认2
   */
  constructor(handler, difficulty = 2) {
    this.handler = handler;
    this.difficulty = difficulty;
    this.typeChart = new tools.TypeChartCalculator();
    this.logger = new Logger(`SimpleAI-${difficulty}`);
    
    this.logger.info('SimpleAI初始化完成', { difficulty });
  }

  /**
   * 生成选择
   * 
   * 功能：
   * - 根据 request 协议生成AI的选择命令
   * - 处理不同场景：队伍预览、强制换人、正常对战
   * - 根据难度选择不同的策略
   * 
   * @param {Object} request - 请求对象（来自 |request| 协议）
   *   - teamPreview: 是否是队伍预览请求
   *   - forceSwitch: 是否强制换人
   *   - active: 当前上场宝可梦信息数组
   *   - wait: 是否需要等待
   * @returns {string|null} 选择命令（如 'move 1', 'switch 2', 'team 1'），null表示等待
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
        return this.chooseSwitch(request);
      }

      if (request.active) {
        const choice = this.difficulty === 1 
          ? this.randomChoice(request)
          : this.typeMatchupChoice(request);
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
   * 选择队伍预览（首发）
   */
  chooseTeamPreview(request) {
    this.logger.info('选择队伍预览');
    // 简单策略：选择第一个位置
    return 'team 1';
  }

  /**
   * 选择换人
   */
  chooseSwitch(request) {
    try {
      const pokemon = request.side?.pokemon;
      if (!pokemon || pokemon.length === 0) {
        this.logger.warn('没有可用宝可梦进行换人');
        return 'default';
      }

      // 找到第一个未上场的、未倒下的宝可梦
      for (let i = 0; i < pokemon.length; i++) {
        const p = pokemon[i];
        if (p && !p.active && !p.condition?.endsWith(' fnt')) {
          this.logger.info('选择换人', { index: i + 1, pokemon: p.name || p.species });
          return `switch ${i + 1}`;
        }
      }

      this.logger.warn('没有可换的宝可梦');
      return 'default';
    } catch (error) {
      this.logger.error('选择换人时发生错误', { error: error.message });
      return 'default';
    }
  }

  /**
   * 随机选择（难度1）
   */
  randomChoice(request) {
    try {
      const active = request.active && request.active[0];
      if (!active) {
        this.logger.warn('场上没有宝可梦');
        return 'default';
      }

      // 随机选择技能或换人
      const shouldSwitch = Math.random() < 0.2; // 20%概率换人

      if (shouldSwitch && !active.trapped && request.side?.pokemon) {
        const switchChoice = this.chooseSwitch(request);
        if (switchChoice !== 'default') {
          this.logger.info('随机选择换人');
          return switchChoice;
        }
      }

      // 随机选择技能
      if (active.moves && active.moves.length > 0) {
        const availableMoves = active.moves
          .map((move, index) => ({ move, index: index + 1 }))
          .filter(({ move }) => move && !move.disabled);

        if (availableMoves.length > 0) {
          const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
          this.logger.info('随机选择技能', { moveIndex: randomMove.index, moveName: randomMove.move?.name || randomMove.move?.id });
          return `move ${randomMove.index}`;
        }
      }

      this.logger.warn('没有可用技能');
      return 'default';
    } catch (error) {
      this.logger.error('随机选择时发生错误', { error: error.message });
      return 'default';
    }
  }

  /**
   * 属性克制选择（难度2）
   * 
   * 功能：
   * - 评估所有可用技能对对手的克制效果
   * - 选择效果最好的技能（如果有多个相同效果，随机选择）
   * - 如果无法获取对手信息，降级为随机选择
   * 
   * @param {Object} request - 请求对象
   * @returns {string} 选择命令
   */
  typeMatchupChoice(request) {
    try {
      const active = request.active && request.active[0];
      if (!active) {
        this.logger.warn('场上没有宝可梦，降级为随机选择');
        return this.randomChoice(request);
      }

      // 获取对手信息（需要从其他地方获取，这里简化处理）
      const opponent = this.getOpponentFromRequest(request);
      if (!opponent) {
        // 如果没有对手信息，降级为随机选择
        this.logger.debug('无法获取对手信息，降级为随机选择');
        return this.randomChoice(request);
      }

      // 评估所有可用技能
      if (active.moves && active.moves.length > 0) {
        const moveEvaluations = active.moves
          .map((move, index) => {
            try {
              if (!move || move.disabled) return null;

              const evaluation = this.typeChart.evaluateMove(move, opponent);
              return {
                move,
                index: index + 1,
                effectiveness: evaluation.effectiveness,
                description: evaluation.description
              };
            } catch (error) {
              this.logger.debug('评估技能时出错', { moveIndex: index + 1, error: error.message });
              return null;
            }
          })
          .filter(evaluation => evaluation !== null);

        if (moveEvaluations.length > 0) {
          // 按克制效果排序
          moveEvaluations.sort((a, b) => b.effectiveness - a.effectiveness);

          // 选择最佳克制技能（如果有多个相同效果，随机选择）
          const bestEffectiveness = moveEvaluations[0].effectiveness;
          const bestMoves = moveEvaluations.filter(
            evaluation => evaluation.effectiveness === bestEffectiveness
          );

          const selectedMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
          this.logger.info('选择技能（属性克制）', {
            moveIndex: selectedMove.index,
            moveName: selectedMove.move?.name || selectedMove.move?.id,
            effectiveness: selectedMove.effectiveness,
            description: selectedMove.description
          });
          return `move ${selectedMove.index}`;
        }
      }

      // 如果没有可用技能，考虑换人
      if (!active.trapped && request.side?.pokemon) {
        const switchChoice = this.chooseSwitch(request);
        if (switchChoice !== 'default') {
          return switchChoice;
        }
      }

      this.logger.warn('属性克制选择失败，返回default');
      return 'default';
    } catch (error) {
      this.logger.error('属性克制选择时发生错误', { error: error.message, stack: error.stack });
      return 'default';
    }
  }

  /**
   * 从request中获取对手信息（简化版）
   * 注意：实际使用时需要从BattleManager或其他地方获取完整的对手信息
   */
  getOpponentFromRequest(request) {
    try {
      // request协议通常不包含对手的完整信息
      // 尝试从BattleManager获取对手信息
      if (this.handler && this.handler.battleManager) {
        // 这里可以尝试从BattleManager获取对手状态
        // 暂时返回null，让AI降级为随机选择
      }
      return null;
    } catch (error) {
      this.logger.debug('获取对手信息时出错', { error: error.message });
      return null;
    }
  }
}

module.exports = SimpleAI;

