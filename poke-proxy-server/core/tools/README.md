# AI工具使用说明

本目录包含AI难度系统所需的基础工具。

## 工具列表

### 1. TypeChartCalculator（属性克制计算器）

计算属性克制关系，支持18种属性。

**使用示例：**
```javascript
const { TypeChartCalculator } = require('./tools');

const calculator = new TypeChartCalculator();

// 计算单个属性克制
const effectiveness = calculator.getEffectiveness('Fire', 'Grass');
// 返回: 2 (2倍克制)

// 计算双属性克制
const effectiveness2 = calculator.getEffectiveness('Fire', ['Grass', 'Bug']);
// 返回: 4 (2倍 × 2倍 = 4倍)

// 评估技能对目标的克制
const evaluation = calculator.evaluateMove(
  { type: 'Fire' },
  { types: ['Grass', 'Bug'] }
);
// 返回: { effectiveness: 4, description: '极克制' }

// 获取最佳克制技能
const bestMove = calculator.getBestMove(moves, target);
```

### 2. BattleStateAnalyzer（状态分析器）

解析对战状态，提供局势分析。

**使用示例：**
```javascript
const { BattleStateAnalyzer } = require('./tools');

const analyzer = new BattleStateAnalyzer();

// 解析HP
const hp = analyzer.parseHP('75/100');
// 返回: 0.75

// 解析状态
const status = analyzer.parseStatus('brn');
// 返回: 'brn'

// 分析宝可梦状态
const pokemonState = analyzer.analyzePokemon(pokemon);
// 返回: { hp: 0.75, status: 'brn', boosts: {...}, ... }

// 分析对战状态
const battleState = analyzer.analyze(request);
// 返回: { myActive: {...}, opponent: {...}, ... }

// 判断是否需要换人
const shouldSwitch = analyzer.shouldSwitch(battleState, 0.3);
```

### 3. StrategyEvaluator（策略评估器）

评估不同策略的优劣，辅助AI决策。

**使用示例：**
```javascript
const { StrategyEvaluator } = require('./tools');

const evaluator = new StrategyEvaluator();

// 评估技能选择
const moveEvaluation = evaluator.evaluateMove({
  move: moveData,
  attacker: attackerPokemon,
  defender: defenderPokemon,
  damagePrediction: { damage: 0.5 },
  effectiveness: { effectiveness: 2 },
  battleState: battleState
});
// 返回: { score: 85, scores: {...}, reasons: [...] }

// 评估换人选择
const switchEvaluation = evaluator.evaluateSwitch({
  switchTarget: targetPokemon,
  currentActive: currentPokemon,
  opponent: opponentPokemon,
  battleState: battleState
});
// 返回: { score: 70, scores: {...}, reasons: [...] }

// 比较多个选项
const evaluations = [moveEval1, moveEval2, moveEval3];
const ranked = evaluator.rankOptions(evaluations);
const best = evaluator.getBestOption(evaluations);
```

### 4. DamageCalculator（伤害计算器）

调用Pokemon Showdown的伤害计算逻辑。

**使用示例：**
```javascript
const { DamageCalculator } = require('./tools');

const calculator = new DamageCalculator();

// 计算伤害
const damageResult = calculator.calculate({
  attacker: attackerPokemon,
  move: moveData,
  defender: defenderPokemon,
  field: fieldData,
  side: sideData
});
// 返回: {
//   damage: 45,
//   minDamage: 38,
//   maxDamage: 45,
//   damagePercent: 0.45,
//   effectiveness: 2,
//   killChance: 0
// }
```

## 在AIChoiceHandler中使用

```javascript
const tools = require('./tools');

class AIChoiceHandler {
  constructor(side, battleManager) {
    this.side = side;
    this.battleManager = battleManager;
    
    // 初始化工具
    this.typeChart = new tools.TypeChartCalculator();
    this.stateAnalyzer = new tools.BattleStateAnalyzer();
    this.strategyEvaluator = new tools.StrategyEvaluator();
    this.damageCalculator = new tools.DamageCalculator();
  }
  
  generateChoice(request) {
    // 分析对战状态
    const battleState = this.stateAnalyzer.analyze(request);
    
    // 获取对手信息（需要从其他地方获取）
    const opponent = this.getOpponent(request);
    
    // 评估所有技能
    const moveEvaluations = request.active[0].moves.map((move, index) => {
      // 计算伤害
      const damage = this.damageCalculator.calculate({
        attacker: request.active[0],
        move: move,
        defender: opponent
      });
      
      // 计算克制效果
      const effectiveness = this.typeChart.evaluateMove(move, opponent);
      
      // 评估策略
      return this.strategyEvaluator.evaluateMove({
        move: move,
        attacker: request.active[0],
        defender: opponent,
        damagePrediction: damage,
        effectiveness: effectiveness,
        battleState: battleState
      });
    });
    
    // 选择最佳技能
    const bestMove = this.strategyEvaluator.getBestOption(moveEvaluations);
    
    return `move ${bestMove.index + 1}`;
  }
}
```

## 注意事项

1. **Pokemon Showdown依赖**：DamageCalculator需要Pokemon Showdown，确保路径正确
2. **性能考虑**：伤害计算可能较慢，建议缓存结果
3. **错误处理**：所有工具都有降级策略，确保在出错时仍能工作
4. **数据格式**：确保传入的数据格式符合要求

## 下一步

这些工具为AI难度系统提供了基础能力。接下来可以：
1. 实现不同难度的AI（使用这些工具）
2. 优化工具性能
3. 扩展工具功能

