/**
 * AI选择处理器（AIChoiceHandler）
 * 
 * 职责：
 * - 自动处理 AI 的选择逻辑，支持难度分级（1-5）
 * - 根据难度实例化对应的 AI 策略类
 * - 处理 request 协议，生成并发送 AI 选择
 * 
 * AI难度映射：
 * - 难度1-2: SimpleAI - 简单策略（随机或属性克制）
 * - 难度3: MediumAI - 中等策略（考虑HP和属性）
 * - 难度4: AdvancedAI - 高级策略（全面分析和评估）
 * - 难度5: ExpertAI - 专家策略（RAG增强，LLM辅助）
 * 
 * 工作流程：
 * 1. 收到 request 协议 → 2. 调用 AI 的 generateChoice 方法 → 3. 发送选择到引擎
 */
const aiModules = require('../../core/ai');

class AIChoiceHandler {
  /**
   * 构造函数
   * 
   * @param {string} side - 玩家方标识，AI总是 'p2'
   * @param {BattleManager} battleManager - 对战管理器实例
   * @param {number} [difficulty=2] - AI难度（1-5），默认2
   */
  constructor(side, battleManager, difficulty = 2) {
    this.side = side; // 'p2' (AI总是p2)
    this.battleManager = battleManager;
    this.difficulty = difficulty; // 难度等级：1-5
    this.ai = this.createAI(difficulty);
  }

  /**
   * 根据难度创建对应的AI实例
   */
  createAI(difficulty) {
    console.log(`[AIChoiceHandler] 创建难度 ${difficulty} 的AI`);
    
    switch(difficulty) {
      case 1:
      case 2:
        // 难度1-2：使用SimpleAI
        return new aiModules.SimpleAI(this, difficulty);
      case 3:
        // 难度3：使用MediumAI
        return new aiModules.MediumAI(this);
      case 4:
        // 难度4：使用AdvancedAI
        return new aiModules.AdvancedAI(this);
      case 5:
        // 难度5：使用ExpertAI
        return new aiModules.ExpertAI(this);
      default:
        console.warn(`[AIChoiceHandler] 未知难度 ${difficulty}，使用默认难度2`);
        return new aiModules.SimpleAI(this, 2);
    }
  }

  /**
   * 处理 request 协议（立即响应）
   */
  handleRequest(request) {
    console.log(`[AIChoiceHandler] ${this.side} 收到 request 协议`);
    console.log(`[AIChoiceHandler] request 内容:`, JSON.stringify(request).substring(0, 500));
    
    // 立即生成并发送选择
    const choice = this.generateChoice(request);
    console.log(`[AIChoiceHandler] ${this.side} 生成选择: ${choice}`);
    
    const success = this.battleManager.sendChoice(this.side, choice);
    
    if (success) {
      console.log(`[AIChoiceHandler] ${this.side} 选择已发送到引擎`);
    } else {
      console.error(`[AIChoiceHandler] ${this.side} 选择发送失败`);
    }

    return success;
  }

  /**
   * 生成AI选择（委托给具体的AI实现）
   */
  generateChoice(request) {
    if (!this.ai) {
      console.error('[AIChoiceHandler] AI实例不存在，使用默认选择');
      return 'default';
    }

    return this.ai.generateChoice(request);
  }
}

module.exports = AIChoiceHandler;



