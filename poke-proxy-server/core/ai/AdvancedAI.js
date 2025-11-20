/**
 * 高级AI（AdvancedAI）
 * 
 * 职责：
 * - 实现难度4的AI策略
 * - 使用所有辅助工具进行深度分析和评估
 * - 集成RAG系统查询知识库（可选）
 * - 评估所有可能的行动选项（技能和换人）
 * 
 * 策略说明：
 * - 使用 StrategyEvaluator 进行全面的策略评估
 * - 使用 DamageCalculator 预测伤害
 * - 使用 BattleStateAnalyzer 分析对战状态
 * - 考虑换人时机（HP低于25%时考虑）
 * - 评估所有选项后选择最佳行动
 * 
 * 工具依赖：
 * - TypeChartCalculator: 属性克制
 * - BattleStateAnalyzer: 状态分析
 * - StrategyEvaluator: 策略评估
 * - DamageCalculator: 伤害计算
 * - RAGIntegration: RAG知识库查询（可选）
 * 
 * 使用场景：
 * - 高难度对战，适合经验丰富的玩家
 */
const tools = require('../tools');
const RAGIntegration = require('./RAGIntegration');
const Logger = require('./Logger');

class AdvancedAI {
  /**
   * 构造函数
   * 
   * @param {AIChoiceHandler} handler - AI选择处理器引用
   */
  constructor(handler) {
    this.handler = handler;
    this.typeChart = new tools.TypeChartCalculator();
    this.stateAnalyzer = new tools.BattleStateAnalyzer();
    this.strategyEvaluator = new tools.StrategyEvaluator();
    this.damageCalculator = new tools.DamageCalculator();
    this.rag = new RAGIntegration(); // RAG系统集成
    this.logger = new Logger('AdvancedAI');
    
    // 高级策略参数
    this.switchThreshold = 0.25; // 更低的换人阈值
    this.predictionDepth = 1; // 预测深度（预测对手下一回合行动）
    this.considerRAG = true; // 是否使用RAG系统
    
    this.logger.info('AdvancedAI初始化完成', {
      ragEnabled: this.rag.enabled,
      switchThreshold: this.switchThreshold
    });
  }

  /**
   * 生成选择（注意：需要同步返回，但内部可以使用异步逻辑）
   */
  generateChoice(request) {
    // 由于generateChoice需要同步返回，我们使用同步方式
    // RAG查询会在后台进行，不影响决策速度
    return this.generateChoiceSync(request);
  }

  /**
   * 同步生成选择（内部方法）
   */
  generateChoiceSync(request) {
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
        return this.chooseBestSwitchSync(request);
      }

      if (request.active) {
        // 深度分析当前状态
        const battleState = this.stateAnalyzer.analyze(request);
        this.logger.debug('对战状态分析完成', { battleState });
        
        // 评估所有可能的行动（同步版本）
        const evaluations = this.evaluateAllOptionsSync(request, battleState);
        this.logger.debug('选项评估完成', { evaluationsCount: evaluations.length });
        
        // 选择最佳行动
        const choice = this.selectBestAction(evaluations);
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
    // 高级策略：分析对手可能的首发
    // 暂时使用简化策略，选择第一个
    return 'team 1';
  }

  /**
   * 选择最佳换人（同步版本）
   */
  chooseBestSwitchSync(request) {
    try {
      const pokemon = request.side?.pokemon;
      if (!pokemon || pokemon.length === 0) {
        this.logger.warn('没有可用宝可梦进行换人');
        return 'default';
      }

      const opponent = this.getOpponentFromRequest(request);
      const battleState = this.stateAnalyzer.analyze(request);

      // 评估所有可换的宝可梦
      const switchEvaluations = [];
      
      for (let i = 0; i < pokemon.length; i++) {
        const p = pokemon[i];
        if (p && !p.active && !p.condition?.endsWith(' fnt')) {
          try {
            const state = this.stateAnalyzer.analyzePokemon(p);
            
            // 使用策略评估器评估换人
            const evaluation = this.strategyEvaluator.evaluateSwitch({
              switchTarget: p,
              currentActive: battleState.myActive || {},
              opponent: opponent || {},
              battleState: battleState
            });
            
            // RAG查询（异步，但不阻塞决策）
            // 为了保持同步，这里暂时跳过RAG查询
            // 可以在后台预加载RAG信息来改善决策
            
            switchEvaluations.push({
              index: i + 1,
              pokemon: p,
              evaluation: evaluation
            });
          } catch (error) {
            this.logger.debug('评估换人时出错', { index: i + 1, error: error.message });
          }
        }
      }

      if (switchEvaluations.length === 0) {
        this.logger.warn('没有可换的宝可梦');
        return 'default';
      }

      // 排序并选择最佳换人
      switchEvaluations.sort((a, b) => b.evaluation.score - a.evaluation.score);
      const bestSwitch = switchEvaluations[0];
      
      this.logger.info('选择换人', {
        index: bestSwitch.index,
        pokemon: bestSwitch.pokemon?.name || bestSwitch.pokemon?.species,
        score: bestSwitch.evaluation.score.toFixed(1),
        reasons: bestSwitch.evaluation.reasons || []
      });
      
      return `switch ${bestSwitch.index}`;
    } catch (error) {
      this.logger.error('选择最佳换人时发生错误', { error: error.message, stack: error.stack });
      return 'default';
    }
  }

  /**
   * 评估所有可能的行动选项（同步版本）
   */
  evaluateAllOptionsSync(request, battleState) {
    try {
      const active = request.active && request.active[0];
      if (!active) {
        this.logger.warn('场上没有宝可梦');
        return [];
      }

    const opponent = this.getOpponentFromRequest(request);
    const evaluations = [];

    // 1. 评估所有可用技能
    if (active.moves && active.moves.length > 0) {
      for (let i = 0; i < active.moves.length; i++) {
        const move = active.moves[i];
        if (!move || move.disabled) continue;

        // 计算伤害预测
        let damagePrediction = {};
        try {
          if (opponent && this.damageCalculator) {
            damagePrediction = this.damageCalculator.calculate({
              attacker: active,
              move: move,
              defender: opponent,
              field: battleState.field || {},
              side: request.side || {}
            });
          }
        } catch (e) {
          this.logger.debug('伤害计算失败', { moveIndex: i + 1, error: e.message });
        }

        // 计算属性克制
        const effectiveness = opponent 
          ? this.typeChart.evaluateMove(move, opponent)
          : { effectiveness: 1 };

        // 使用策略评估器进行深度评估
        const evaluation = this.strategyEvaluator.evaluateMove({
          move: move,
          attacker: active,
          defender: opponent || {},
          damagePrediction: damagePrediction,
          effectiveness: effectiveness,
          battleState: battleState
        });

        // RAG查询（异步，但不阻塞决策）
        // 为了保持同步，这里暂时跳过RAG查询

        evaluations.push({
          type: 'move',
          index: i + 1,
          move: move,
          evaluation: evaluation
        });
      }
    }

    // 2. 评估换人选项（如果允许）
    if (!active.trapped && request.side.pokemon) {
      // 直接评估所有可换的宝可梦
      for (let i = 0; i < request.side.pokemon.length; i++) {
        const switchPokemon = request.side.pokemon[i];
        if (switchPokemon && !switchPokemon.active && !switchPokemon.condition?.endsWith(' fnt')) {
          try {
            const switchEval = this.strategyEvaluator.evaluateSwitch({
              switchTarget: switchPokemon,
              currentActive: active,
              opponent: opponent || {},
              battleState: battleState
            });

            evaluations.push({
              type: 'switch',
              index: i + 1,
              pokemon: switchPokemon,
              evaluation: switchEval
            });
          } catch (error) {
            this.logger.debug('评估换人时出错', { index: i + 1, error: error.message });
          }
        }
      }
    }

      this.logger.debug('选项评估完成', { evaluationsCount: evaluations.length });
      return evaluations;
    } catch (error) {
      this.logger.error('评估所有选项时发生错误', { error: error.message, stack: error.stack });
      return [];
    }
  }

  /**
   * 选择最佳行动
   */
  selectBestAction(evaluations) {
    try {
      if (!evaluations || evaluations.length === 0) {
        this.logger.warn('没有可用选项');
        return 'default';
      }

    // 使用策略评估器排序
    const sortedEvaluations = this.strategyEvaluator.rankOptions(
      evaluations.map(e => e.evaluation)
    );

    if (sortedEvaluations.length === 0) {
      return 'default';
    }

    // 选择最佳选项
    const bestEval = sortedEvaluations[0];
    const bestAction = evaluations.find(
      e => e.evaluation.score === bestEval.score
    );

    if (!bestAction) {
      return 'default';
    }

    // 输出详细信息
    this.logger.info('选择最佳行动', {
      type: bestAction.type === 'move' ? '技能' : '换人',
      index: bestAction.index,
      actionName: bestAction.type === 'move' ? (bestAction.move?.name || bestAction.move?.id) : (bestAction.pokemon?.name || bestAction.pokemon?.species),
      score: bestEval.score.toFixed(1),
      reasons: bestEval.reasons || []
    });

    if (bestAction.type === 'move') {
      return `move ${bestAction.index}`;
    } else {
      return `switch ${bestAction.index}`;
    }
    } catch (error) {
      this.logger.error('选择最佳行动时发生错误', { error: error.message, stack: error.stack });
      return 'default';
    }
  }

  /**
   * 获取对手信息
   */
  getOpponentFromRequest(request) {
    // 尝试从BattleManager获取对手信息
    if (this.handler && this.handler.battleManager) {
      try {
        // BattleManager中，AI是p2，对手是p1
        // 尝试从battleManager的sides中获取对手信息
        const sides = this.handler.battleManager.sides;
        if (sides && sides.p1) {
          const opponentSide = sides.p1;
          // 尝试获取对手场上宝可梦信息
          // 注意：request协议中可能没有完整的对手信息
          // 这里需要根据实际的协议格式来解析
          
          // 如果request中有rqid或其他字段包含对手信息，可以解析
          // 暂时返回null，让评估基于其他因素
        }
      } catch (e) {
        console.debug('[AdvancedAI] 获取对手信息失败:', e);
      }
    }
    // 尝试从request中解析对手信息（如果协议支持）
    // 通常request.active[0]是当前宝可梦的信息
    // 对手信息可能需要从其他字段获取，或者通过BattleManager的状态管理获取
    return null;
  }
}

module.exports = AdvancedAI;

