/**
 * Pokemon Showdown 适配层（ShowdownAdapter）
 * 
 * 职责：
 * - 封装对 Pokemon Showdown 内部模块的访问
 * - 提供统一的接口，便于测试时 mock
 * - 统一路径解析，避免散落的 path.resolve
 * 
 * 提供的接口：
 * - getDex(formatid?) - 获取 Dex 实例
 * - getTeams() - 获取 Teams 工具类
 * - getBattleStream() - 创建 BattleStream 实例
 * - getPlayerStreams(battleStream) - 获取玩家流
 * - getRandomTeams(formatid, seed?) - 创建 RandomTeams 实例
 */
const path = require('path');

class ShowdownAdapter {
  constructor() {
    this._showdownPath = null;
    this._dexCache = new Map();
    this._teamsCache = null;
    this._battleStreamClass = null;
    this._getPlayerStreamsFn = null;
    this._randomTeamsClass = null;
  }

  /**
   * 获取 Pokemon Showdown 根路径
   */
  getShowdownPath() {
    if (!this._showdownPath) {
      // 从当前文件位置向上查找 pokemon-showdown 目录
      // adapters/pokemon-showdown/ShowdownAdapter.js -> ../../../../pokemon-showdown
      this._showdownPath = path.resolve(__dirname, '../../../../pokemon-showdown');
    }
    return this._showdownPath;
  }

  /**
   * 获取 Dex 实例
   * @param {string} [formatid] - 格式ID（如 'gen9ou'），可选
   * @returns {Object} Dex 实例
   */
  getDex(formatid = null) {
    const cacheKey = formatid || 'default';
    if (this._dexCache.has(cacheKey)) {
      return this._dexCache.get(cacheKey);
    }

    try {
      const { Dex } = require(path.resolve(this.getShowdownPath(), 'dist/sim'));
      const dex = formatid ? Dex.forFormat(formatid) : Dex;
      this._dexCache.set(cacheKey, dex);
      return dex;
    } catch (e) {
      throw new Error(`无法加载 Pokemon Showdown Dex: ${e.message}`);
    }
  }

  /**
   * 获取 Teams 工具类
   * @returns {Object} Teams 对象（包含 pack, unpack 等方法）
   */
  getTeams() {
    if (this._teamsCache) {
      return this._teamsCache;
    }

    try {
      const { Teams } = require(path.resolve(this.getShowdownPath(), 'dist/sim/teams'));
      this._teamsCache = Teams;
      return Teams;
    } catch (e) {
      throw new Error(`无法加载 Pokemon Showdown Teams: ${e.message}`);
    }
  }

  /**
   * 获取 BattleStream 类
   * @returns {Class} BattleStream 类
   */
  getBattleStreamClass() {
    if (this._battleStreamClass) {
      return this._battleStreamClass;
    }

    try {
      const PS = require(path.resolve(this.getShowdownPath(), 'dist/sim'));
      this._battleStreamClass = PS.BattleStream;
      return this._battleStreamClass;
    } catch (e) {
      throw new Error(`无法加载 Pokemon Showdown BattleStream: ${e.message}`);
    }
  }

  /**
   * 创建 BattleStream 实例
   * @returns {Object} BattleStream 实例
   */
  createBattleStream() {
    const BattleStream = this.getBattleStreamClass();
    return new BattleStream();
  }

  /**
   * 获取 getPlayerStreams 函数
   * @returns {Function} getPlayerStreams 函数
   */
  getPlayerStreamsFn() {
    if (this._getPlayerStreamsFn) {
      return this._getPlayerStreamsFn;
    }

    try {
      const PS = require(path.resolve(this.getShowdownPath(), 'dist/sim'));
      this._getPlayerStreamsFn = PS.getPlayerStreams;
      return this._getPlayerStreamsFn;
    } catch (e) {
      throw new Error(`无法加载 Pokemon Showdown getPlayerStreams: ${e.message}`);
    }
  }

  /**
   * 获取玩家流
   * @param {Object} battleStream - BattleStream 实例
   * @returns {Object} { p1, p2, omniscient } 流对象
   */
  getPlayerStreams(battleStream) {
    const getPlayerStreams = this.getPlayerStreamsFn();
    return getPlayerStreams(battleStream);
  }

  /**
   * 获取 RandomTeams 类
   * @returns {Class} RandomTeams 类
   */
  getRandomTeamsClass() {
    if (this._randomTeamsClass) {
      return this._randomTeamsClass;
    }

    try {
      // 尝试加载 gen9 的 RandomTeams（默认）
      const { RandomTeams } = require(path.resolve(this.getShowdownPath(), 'dist/data/random-battles/gen9/teams'));
      this._randomTeamsClass = RandomTeams;
      return RandomTeams;
    } catch (e) {
      // 如果 gen9 不存在，尝试其他版本
      console.warn(`[ShowdownAdapter] 无法加载 gen9 RandomTeams: ${e.message}`);
      throw new Error(`无法加载 Pokemon Showdown RandomTeams: ${e.message}`);
    }
  }

  /**
   * 创建 RandomTeams 实例
   * @param {string} formatid - 格式ID（如 'gen9ou'）
   * @param {Array<number>} [seed] - 随机种子数组，可选
   * @returns {Object} RandomTeams 实例
   */
  createRandomTeams(formatid, seed = null) {
    const RandomTeams = this.getRandomTeamsClass();
    if (seed) {
      return new RandomTeams(formatid, seed);
    }
    // 生成默认随机种子
    const defaultSeed = [
      Math.floor(Math.random() * 2147483647),
      Math.floor(Math.random() * 2147483647),
      Math.floor(Math.random() * 2147483647),
      Math.floor(Math.random() * 2147483647)
    ];
    return new RandomTeams(formatid, defaultSeed);
  }
}

// 导出单例实例
const adapter = new ShowdownAdapter();
module.exports = adapter;

