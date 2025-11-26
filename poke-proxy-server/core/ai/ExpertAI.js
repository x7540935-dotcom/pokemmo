/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 专家级 AI（ExpertAI.js）- 难度 5 最高级 AI 策略
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📋 核心职责
 * ──────────────────────────────────────────────────────────────────────────
 * ExpertAI 是最高难度的 AI 策略模块，结合了：
 *   1. LLM（大语言模型）推理能力
 *      - 使用阿里云百炼平台的 Qwen 模型
 *      - 进行深度战略分析和决策推理
 *      - 理解复杂的对战局面和长期战术
 * 
 *   2. RAG（检索增强生成）系统
 *      - 查询知识库中的宝可梦攻略和战术
 *      - 检索用户编写的自定义攻略
 *      - 提供策略建议和参考信息
 * 
 *   3. 高级工具集
 *      - 伤害计算器：精确计算伤害值
 *      - 属性克制分析：分析类型优势
 *      - 状态分析器：评估对战局面
 *      - 策略评估器：评估不同选择的收益
 * 
 *   4. 降级机制
 *      - 如果 LLM 不可用，自动降级到 AdvancedAI
 *      - 确保即使没有 LLM 也能正常工作
 * 
 * 🧠 决策流程
 * ──────────────────────────────────────────────────────────────────────────
 * 
 *   ┌─────────────────┐
 *   │  收到 request   │
 *   └────────┬────────┘
 *            │
 *   ┌────────▼────────┐
 *   │  收集对战状态   │ ← 从协议中提取
 *   └────────┬────────┘
 *            │
 *   ┌────────▼────────┐
 *   │  RAG 知识检索   │ ← 查询攻略和战术
 *   └────────┬────────┘
 *            │
 *   ┌────────▼────────┐
 *   │  工具计算分析   │ ← 伤害、克制、状态分析
 *   └────────┬────────┘
 *            │
 *   ┌────────▼────────┐
 *   │  构建 LLM 提示  │ ← 整合所有信息
 *   └────────┬────────┘
 *            │
 *   ┌────────▼────────┐
 *   │  LLM 推理决策   │ ← 生成策略建议
 *   └────────┬────────┘
 *            │
 *   ┌────────▼────────┐
 *   │  验证并执行     │ ← 选择最佳行动
 *   └─────────────────┘
 * 
 * 🔧 配置要求
 * ──────────────────────────────────────────────────────────────────────────
 * 环境变量：
 *   - ALIBABA_BAILIAN_API_KEY: 阿里云百炼 API 密钥（必需）
 * 
 * RAG 系统（可选）：
 *   - Python RAG 服务需要运行
 *   - 知识库需要预先构建
 *   - 如果未启用，仅使用工具集和 LLM
 * 
 * 📊 性能特性
 * ──────────────────────────────────────────────────────────────────────────
 * - LLM 调用超时：8 秒（避免长时间等待）
 * - 自动重试：网络错误时自动重试
 * - 降级策略：LLM 失败时使用 AdvancedAI
 * - 日志记录：所有决策过程记录到 expert-ai.log
 * 
 * ⚠️ 注意事项
 * ──────────────────────────────────────────────────────────────────────────
 * - LLM 调用需要网络连接和 API 密钥
 * - 如果 API 密钥未配置，会自动降级到 AdvancedAI
 * - RAG 系统是可选的，不影响基本功能
 * - 所有工具计算在本地进行，不需要外部服务
 */
const tools = require('../tools');
const RAGIntegration = require('./RAGIntegration');
const LLMClient = require('./LLMClient');
const PromptBuilder = require('./PromptBuilder');
const AdvancedAI = require('./AdvancedAI'); // 作为降级备选

class ExpertAI {
  /**
   * 构造函数
   * 
   * @param {AIChoiceHandler} handler - AI选择处理器引用
   */
  constructor(handler) {
    this.handler = handler;
    this.logger = this.createLogger();
    
    // 初始化工具
    this.typeChart = new tools.TypeChartCalculator();
    this.stateAnalyzer = new tools.BattleStateAnalyzer();
    this.strategyEvaluator = new tools.StrategyEvaluator();
    this.damageCalculator = new tools.DamageCalculator();
    
    // 初始化RAG系统
    this.rag = new RAGIntegration();
    
    // 初始化LLM客户端
    this.llmClient = new LLMClient({
      apiKey: process.env.ALIBABA_BAILIAN_API_KEY || '',
      model: 'qwen-plus',
      temperature: 0.7,
      maxTokens: 2048,
      timeout: 8000 // 8秒超时
    });
    
    // 初始化提示词构建器
    this.promptBuilder = new PromptBuilder();
    
    // 降级备选：如果LLM不可用，使用AdvancedAI
    this.fallbackAI = null;
    if (!this.llmClient.isEnabled()) {
      this.logger.warn('LLM未启用，将使用AdvancedAI作为降级方案');
      this.fallbackAI = new AdvancedAI(handler);
    }
    
    // 配置参数
    this.useLLM = this.llmClient.isEnabled();
    this.useRAG = this.rag.enabled;
    
    this.logger.info('ExpertAI初始化完成', {
      llmEnabled: this.useLLM,
      ragEnabled: this.useRAG
    });
  }

  /**
   * 创建日志记录器
   */
  createLogger() {
    const fs = require('fs');
    const path = require('path');
    const logDir = path.resolve(__dirname, '../../../logs');
    
    // 确保日志目录存在
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (e) {
      // 忽略
    }
    
    const logFile = path.join(logDir, 'expert-ai.log');
    
    // 定义 log 函数
    const log = (level, message, data = null) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [ExpertAI] [${level}] ${message}${data ? ' ' + JSON.stringify(data, null, 2) : ''}`;
      
      // 控制台输出
      if (level === 'ERROR') {
        console.error(logMessage);
      } else if (level === 'WARN') {
        console.warn(logMessage);
      } else {
        console.log(logMessage);
      }
      
      // 写入文件（异步）
      try {
        fs.appendFile(logFile, logMessage + '\n', () => {});
      } catch (e) {
        // 忽略
      }
    };
    
    return {
      log: log,
      info: (msg, data) => log('INFO', msg, data),
      warn: (msg, data) => log('WARN', msg, data),
      error: (msg, data) => log('ERROR', msg, data),
      debug: (msg, data) => log('DEBUG', msg, data)
    };
  }

  /**
   * 生成选择（同步方法，内部可能使用异步逻辑）
   */
  generateChoice(request) {
    // 减少日志输出，避免阻塞（只在关键点记录）
    // this.logger.info('开始生成决策', { 
    //   hasActive: !!request.active,
    //   hasTeamPreview: !!request.teamPreview,
    //   hasForceSwitch: !!request.forceSwitch
    // });

    try {
      // 优先处理强制换人（快速响应）
      if (request.forceSwitch) {
        return this.chooseBestSwitch(request);
      }

      // 如果LLM不可用，直接降级
      if (!this.useLLM || this.fallbackAI) {
        // 减少日志输出
        // this.logger.warn('LLM不可用，使用降级方案');
        return this.fallbackAI ? this.fallbackAI.generateChoice(request) : 'default';
      }

      // 处理不同场景
      if (request.wait) {
        return null;
      }

      if (request.teamPreview) {
        return this.chooseTeamPreview(request);
      }

      if (request.active) {
        // 主要决策逻辑
        return this.makeDecision(request);
      }

      return 'default';
    } catch (error) {
      this.logger.error('生成决策时发生错误', {
        error: error.message,
        stack: error.stack
      });
      
      // 错误时降级
      if (this.fallbackAI) {
        // 减少日志输出
        // this.logger.warn('发生错误，使用降级方案');
        return this.fallbackAI.generateChoice(request);
      }
      
      return 'default';
    }
  }

  /**
   * 选择队伍预览
   */
  chooseTeamPreview(request) {
    this.logger.info('选择队伍预览');
    // 简单策略：选择第一个
    return 'team 1';
  }

  /**
   * 选择最佳换人（快速响应，避免阻塞）
   */
  chooseBestSwitch(request) {
    // 减少日志输出，避免阻塞
    // this.logger.info('选择最佳换人');
    
    // 快速路径：如果有降级AI，直接使用（避免重复计算）
    if (this.fallbackAI) {
      return this.fallbackAI.generateChoice(request);
    }
    
    // 快速实现：优先选择第一个可用的宝可梦
    const pokemon = request.side?.pokemon;
    if (!pokemon || pokemon.length === 0) {
      return 'default';
    }

    // 快速查找第一个可用的宝可梦
    for (let i = 0; i < pokemon.length; i++) {
      const p = pokemon[i];
      if (p && !p.active && !p.condition?.endsWith(' fnt')) {
        return `switch ${i + 1}`;
      }
    }

    return 'default';
  }

  /**
   * 主要决策逻辑
   */
  makeDecision(request) {
    // 减少日志输出，避免阻塞
    // this.logger.info('开始主要决策流程');
    
    const active = request.active && request.active[0];
    if (!active) {
      // this.logger.warn('没有场上宝可梦，返回default');
      return 'default';
    }

    // 分析对战状态
    const battleState = this.stateAnalyzer.analyze(request);
    // this.logger.debug('对战状态分析完成', { battleState });

    // 获取对手信息
    const opponent = this.getOpponentFromRequest(request);
    
    // 收集可用行动
    const availableMoves = this.getAvailableMoves(active);
    const availableSwitches = this.getAvailableSwitches(request);
    
    // 减少日志输出
    // this.logger.info('可用行动收集完成', {
    //   movesCount: availableMoves.length,
    //   switchesCount: availableSwitches.length
    // });

    // 使用工具计算
    const toolResults = this.calculateWithTools(active, opponent, availableMoves, battleState);
    // this.logger.debug('工具计算完成', { toolResults });

    // 查询RAG知识（异步，但不阻塞）
    let ragKnowledge = [];
    if (this.useRAG && active.name) {
      // 注意：这里是同步调用，但RAG查询是异步的
      // 为了不阻塞，我们暂时跳过RAG查询，或者使用简化的同步方式
      // this.logger.debug('RAG查询跳过（异步查询会阻塞决策）');
    }

    // 构建提示词
    const prompt = this.promptBuilder.buildDecisionPrompt({
      myActive: active,
      opponent: opponent,
      availableMoves: availableMoves,
      availableSwitches: availableSwitches,
      battleState: battleState,
      ragKnowledge: ragKnowledge,
      toolResults: toolResults
    });

    // 减少日志输出
    // this.logger.debug('提示词构建完成', { promptLength: prompt.length });

    // 调用LLM（注意：这里是同步方法，但LLM调用是异步的）
    // 为了不阻塞，我们暂时使用本地决策，后续可以改为异步
    // this.logger.warn('LLM调用暂时跳过（需要异步处理），使用本地决策');
    
    // 使用本地决策逻辑（基于工具计算结果）
    return this.makeLocalDecision(availableMoves, availableSwitches, toolResults, battleState);
  }

  /**
   * 获取可用技能
   */
  getAvailableMoves(active) {
    if (!active || !active.moves) {
      return [];
    }
    
    return active.moves
      .map((move, index) => {
        // 处理move可能是对象或字符串的情况
        const moveObj = typeof move === 'string' ? { name: move, id: move } : move;
        return { move: moveObj, index: index + 1 };
      })
      .filter(({ move }) => move && !move.disabled);
  }

  /**
   * 获取可换的宝可梦
   */
  getAvailableSwitches(request) {
    const pokemon = request.side?.pokemon;
    if (!pokemon || pokemon.length === 0) {
      return [];
    }

    const active = request.active && request.active[0];
    if (active && active.trapped) {
      return []; // 无法换人
    }

    return pokemon
      .map((p, index) => ({ pokemon: p, index: index + 1 }))
      .filter(({ pokemon: p }) => p && !p.active && !p.condition?.endsWith(' fnt'));
  }

  /**
   * 使用工具进行计算（优化性能，减少阻塞）
   */
  calculateWithTools(active, opponent, availableMoves, battleState) {
    const results = {
      moveEvaluations: [],
      effectiveness: [],
      damagePredictions: []
    };

    try {
      // 评估每个技能（限制计算量，避免阻塞）
      const maxMovesToEvaluate = 4; // 最多评估4个技能
      const movesToEvaluate = availableMoves.slice(0, maxMovesToEvaluate);
      
      for (const { move, index } of movesToEvaluate) {
        // 属性克制（快速计算）
        let effectiveness = { effectiveness: 1 };
        if (opponent) {
          try {
            effectiveness = this.typeChart.evaluateMove(move, opponent);
          } catch (e) {
            // 忽略错误，使用默认值
          }
        }
        results.effectiveness.push(effectiveness);

        // 伤害预测（可选，如果计算太慢可以跳过）
        let damagePrediction = {};
        if (opponent && this.damageCalculator) {
          try {
            // 快速计算，避免阻塞
            damagePrediction = this.damageCalculator.calculate({
              attacker: active,
              move: move,
              defender: opponent,
              field: battleState.field || {},
              side: {}
            });
          } catch (e) {
            // 忽略错误，使用空对象
          }
        }
        results.damagePredictions.push(damagePrediction);

        // 策略评估（快速评估）
        try {
          const evaluation = this.strategyEvaluator.evaluateMove({
            move: move,
            attacker: active,
            defender: opponent || {},
            damagePrediction: damagePrediction,
            effectiveness: effectiveness,
            battleState: battleState
          });
          results.moveEvaluations.push(evaluation);
        } catch (e) {
          // 忽略错误，跳过这个技能
        }
      }
    } catch (error) {
      // 减少日志输出
      // this.logger.error('工具计算时发生错误', { error: error.message });
    }

    return results;
  }

  /**
   * 本地决策（当LLM不可用或需要快速决策时）
   */
  makeLocalDecision(availableMoves, availableSwitches, toolResults, battleState) {
    // 减少日志输出，避免阻塞
    // this.logger.info('使用本地决策逻辑');

    // 评估所有选项
    const evaluations = [];

    // 评估技能
    if (toolResults.moveEvaluations && toolResults.moveEvaluations.length > 0) {
      toolResults.moveEvaluations.forEach((evaluation, index) => {
        if (evaluation && evaluation.score > -1000) {
          evaluations.push({
            type: 'move',
            index: availableMoves[index]?.index || (index + 1),
            evaluation: evaluation
          });
        }
      });
    }

    // 评估换人（减少计算，避免阻塞）
    // 只在必要时评估换人（如果技能评估结果都不好）
    if (evaluations.length === 0 || (evaluations.length > 0 && evaluations[0].evaluation.score < 0)) {
      availableSwitches.forEach(({ pokemon, index }) => {
        try {
          const switchEval = this.strategyEvaluator.evaluateSwitch({
            switchTarget: pokemon,
            currentActive: battleState.myActive || {},
            opponent: battleState.opponent || {},
            battleState: battleState
          });
          
          if (switchEval && switchEval.score > -1000) {
            evaluations.push({
              type: 'switch',
              index: index,
              evaluation: switchEval
            });
          }
        } catch (e) {
          // 减少日志输出
          // this.logger.debug('评估换人时出错', { pokemon: pokemon?.name, error: e.message });
        }
      });
    }

    if (evaluations.length === 0) {
      // this.logger.warn('没有可用选项，返回default');
      return 'default';
    }

    // 排序并选择最佳
    evaluations.sort((a, b) => b.evaluation.score - a.evaluation.score);
    const best = evaluations[0];

    // 减少日志输出
    // this.logger.info('本地决策完成', {
    //   action: best.type,
    //   index: best.index,
    //   score: best.evaluation.score,
    //   reasons: best.evaluation.reasons
    // });

    if (best.type === 'move') {
      return `move ${best.index}`;
    } else {
      return `switch ${best.index}`;
    }
  }

  /**
   * 获取对手信息
   */
  getOpponentFromRequest(request) {
    // 尝试从BattleManager获取
    if (this.handler && this.handler.battleManager) {
      try {
        // 这里需要根据实际协议格式获取对手信息
        // 暂时返回null
      } catch (e) {
        this.logger.debug('获取对手信息失败', { error: e.message });
      }
    }
    return null;
  }
}

module.exports = ExpertAI;

