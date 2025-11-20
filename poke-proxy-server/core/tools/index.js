/**
 * AI工具模块统一导出（index.js）
 * 
 * 职责：
 * - 统一导出所有AI辅助工具类
 * - 提供统一的模块接口
 * 
 * 导出的工具类：
 * - TypeChartCalculator: 属性克制计算器
 * - BattleStateAnalyzer: 对战状态分析器
 * - StrategyEvaluator: 策略评估器
 * - DamageCalculator: 伤害计算器
 * 
 * 使用方式：
 * const tools = require('./tools');
 * const calculator = new tools.TypeChartCalculator();
 */
const TypeChartCalculator = require('./TypeChartCalculator');
const BattleStateAnalyzer = require('./BattleStateAnalyzer');
const StrategyEvaluator = require('./StrategyEvaluator');
const DamageCalculator = require('./DamageCalculator');

module.exports = {
  TypeChartCalculator,
  BattleStateAnalyzer,
  StrategyEvaluator,
  DamageCalculator
};

