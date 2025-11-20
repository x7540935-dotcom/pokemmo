/**
 * AI模块统一导出（index.js）
 * 
 * 职责：
 * - 统一导出所有AI策略类
 * - 提供统一的模块接口
 * 
 * 导出的AI类：
 * - SimpleAI: 简单AI（难度1-2）
 * - MediumAI: 中等AI（难度3）
 * - AdvancedAI: 高级AI（难度4）
 * - ExpertAI: 专家AI（难度5）
 * 
 * 使用方式：
 * const aiModules = require('./ai');
 * const ai = new aiModules.SimpleAI(handler, difficulty);
 */
const SimpleAI = require('./SimpleAI');
const MediumAI = require('./MediumAI');
const AdvancedAI = require('./AdvancedAI');
const ExpertAI = require('./ExpertAI');

module.exports = {
  SimpleAI,
  MediumAI,
  AdvancedAI,
  ExpertAI
};

