/**
 * 提示词构建器（PromptBuilder）
 * 
 * 职责：
 * - 构建发送给LLM的决策提示词
 * - 格式化对战状态、可用行动、工具计算结果等信息
 * - 将复杂的对战数据转换为LLM可理解的文本格式
 * 
 * 提示词结构：
 * 1. 当前对战状态（我方和对手宝可梦信息）
 * 2. 可用行动（技能列表和换人选项）
 * 3. 辅助信息（工具计算结果、RAG知识）
 * 4. 决策要求（分析因素和输出格式）
 * 
 * 输出格式：
 * - JSON格式：{ action: "move"|"switch", index: 1-6, reason: "理由", confidence: 0.0-1.0 }
 * 
 * 使用场景：
 * - ExpertAI调用LLM前构建提示词
 */
class PromptBuilder {
  /**
   * 构造函数
   * 初始化日志记录器
   */
  constructor() {
    this.logger = {
      debug: (msg, data) => console.log(`[PromptBuilder] ${msg}`, data || ''),
      info: (msg, data) => console.log(`[PromptBuilder] ${msg}`, data || ''),
      warn: (msg, data) => console.warn(`[PromptBuilder] ${msg}`, data || ''),
      error: (msg, data) => console.error(`[PromptBuilder] ${msg}`, data || '')
    };
  }

  /**
   * 构建决策提示词
   * @param {Object} context - 对战上下文
   * @param {Object} context.myActive - 我方场上宝可梦
   * @param {Object} context.opponent - 对手宝可梦（如果可用）
   * @param {Object} context.availableMoves - 可用技能列表
   * @param {Object} context.availableSwitches - 可换的宝可梦列表
   * @param {Object} context.battleState - 对战状态
   * @param {Array} context.ragKnowledge - RAG检索的知识
   * @param {Object} context.toolResults - 工具计算结果
   * @returns {string} 构建的提示词
   */
  buildDecisionPrompt(context) {
    const {
      myActive,
      opponent,
      availableMoves = [],
      availableSwitches = [],
      battleState = {},
      ragKnowledge = [],
      toolResults = {}
    } = context;

    let prompt = `# 宝可梦对战决策任务

## 当前对战状态

### 我方宝可梦
- 名称：${myActive?.name || myActive?.species || '未知'}
- HP：${this.formatHP(myActive)}
- 状态：${this.formatCondition(myActive)}
- 可用技能：${this.formatMoves(availableMoves)}

### 对手宝可梦
${opponent ? `- 名称：${opponent.name || opponent.species || '未知'}
- HP：${this.formatHP(opponent)}
- 状态：${this.formatCondition(opponent)}` : '- 信息未知'}

## 可选行动

### 可用技能
${this.formatMovesDetailed(availableMoves, toolResults)}

### 可换的宝可梦
${this.formatSwitches(availableSwitches)}

## 辅助信息

### 工具计算结果
${this.formatToolResults(toolResults)}

### 知识库建议
${this.formatRAGKnowledge(ragKnowledge)}

## 决策要求

请分析当前对战状态，考虑以下因素：
1. 我方和对手的HP状态
2. 属性克制关系
3. 技能威力和命中率
4. 对手可能的行动
5. 长期战略考虑

请给出你的决策建议，格式如下：
{
  "action": "move" 或 "switch",
  "index": 1-4（技能编号）或 1-6（换人编号）,
  "reason": "决策理由（中文）",
  "confidence": 0.0-1.0（置信度）
}

只返回JSON格式，不要其他文字。`;

    this.logger.debug('构建决策提示词完成', { promptLength: prompt.length });
    return prompt;
  }

  /**
   * 格式化HP显示
   */
  formatHP(pokemon) {
    if (!pokemon) return '未知';
    if (pokemon.hp !== undefined) {
      return `${(pokemon.hp * 100).toFixed(0)}%`;
    }
    if (pokemon.condition) {
      // 从condition中解析HP，格式如 "100/100" 或 "100/100 brn"
      const match = pokemon.condition.match(/(\d+)\/(\d+)/);
      if (match) {
        const current = parseInt(match[1]);
        const max = parseInt(match[2]);
        return `${((current / max) * 100).toFixed(0)}% (${current}/${max})`;
      }
    }
    return '未知';
  }

  /**
   * 格式化状态条件
   */
  formatCondition(pokemon) {
    if (!pokemon || !pokemon.condition) return '正常';
    const condition = pokemon.condition;
    if (condition.includes('brn')) return '灼伤';
    if (condition.includes('par')) return '麻痹';
    if (condition.includes('slp')) return '睡眠';
    if (condition.includes('frz')) return '冰冻';
    if (condition.includes('psn')) return '中毒';
    if (condition.includes('tox')) return '剧毒';
    if (condition.includes('fnt')) return '濒死';
    return '正常';
  }

  /**
   * 格式化技能列表（简单）
   */
  formatMoves(moves) {
    if (!moves || moves.length === 0) return '无';
    return moves.map((m, i) => `${i + 1}. ${m.name || m.id || '未知'}`).join(', ');
  }

  /**
   * 格式化技能列表（详细）
   */
  formatMovesDetailed(moves, toolResults) {
    if (!moves || moves.length === 0) return '无可用技能';
    
    return moves.map((move, index) => {
      const moveIndex = index + 1;
      const moveName = move.name || move.id || '未知';
      const basePower = move.basePower || '—';
      const accuracy = move.accuracy === true ? '100%' : (move.accuracy ? `${move.accuracy}%` : '—');
      const type = move.type || '未知';
      
      // 获取工具计算结果
      const damageInfo = toolResults.moveEvaluations?.[index];
      const effectiveness = toolResults.effectiveness?.[index];
      
      let info = `${moveIndex}. ${moveName} (${type}，威力${basePower}，命中${accuracy})`;
      
      if (damageInfo && damageInfo.damage) {
        info += `，预期伤害${(damageInfo.damage * 100).toFixed(0)}%`;
      }
      if (effectiveness) {
        info += `，克制效果${effectiveness.effectiveness}x`;
      }
      
      return info;
    }).join('\n');
  }

  /**
   * 格式化可换的宝可梦
   */
  formatSwitches(switches) {
    if (!switches || switches.length === 0) return '无（无法换人）';
    
    return switches.map((p, index) => {
      const switchIndex = index + 1;
      const name = p.name || p.species || '未知';
      const hp = this.formatHP(p);
      return `${switchIndex}. ${name} (HP: ${hp})`;
    }).join('\n');
  }

  /**
   * 格式化工具计算结果
   */
  formatToolResults(toolResults) {
    if (!toolResults || Object.keys(toolResults).length === 0) {
      return '无';
    }
    
    const parts = [];
    
    if (toolResults.damagePredictions) {
      parts.push('伤害预测：' + JSON.stringify(toolResults.damagePredictions));
    }
    
    if (toolResults.typeEffectiveness) {
      parts.push('属性克制：' + JSON.stringify(toolResults.typeEffectiveness));
    }
    
    if (toolResults.battleState) {
      parts.push('对战状态分析：' + JSON.stringify(toolResults.battleState));
    }
    
    return parts.length > 0 ? parts.join('\n') : '无';
  }

  /**
   * 格式化RAG知识
   */
  formatRAGKnowledge(ragKnowledge) {
    if (!ragKnowledge || ragKnowledge.length === 0) {
      return '无相关策略建议';
    }
    
    return ragKnowledge.map((knowledge, index) => {
      const content = knowledge.content || knowledge;
      const summary = content.length > 200 ? content.substring(0, 200) + '...' : content;
      return `建议${index + 1}：${summary}`;
    }).join('\n\n');
  }
}

module.exports = PromptBuilder;

