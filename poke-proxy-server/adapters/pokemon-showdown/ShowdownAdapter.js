/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Pokemon Showdown 适配层（ShowdownAdapter.js）
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📋 核心职责
 * ──────────────────────────────────────────────────────────────────────────
 * ShowdownAdapter 封装对 Pokemon Showdown 的访问，提供统一的接口：
 *   1. 模块加载策略
 *      - 优先使用 npm 包（node_modules 中的 pokemon-showdown）
 *      - 降级到本地路径（../pokemon-showdown，向后兼容）
 *      - 支持多种加载方式，确保在不同环境下都能工作
 * 
 *   2. 接口封装
 *      - getDex() - 获取 Dex 实例（宝可梦数据查询）
 *      - getTeams() - 获取 Teams 工具类（队伍打包/解包）
 *      - createBattleStream() - 创建 BattleStream 实例（对战引擎）
 *      - getPlayerStreams() - 获取玩家流（协议分发）
 *      - createRandomTeams() - 创建 RandomTeams 实例（随机队伍生成）
 * 
 *   3. 缓存管理
 *      - Dex 实例缓存（按 formatid）
 *      - Teams 工具类缓存
 *      - BattleStream 类缓存
 * 
 * 🔄 加载策略
 * ──────────────────────────────────────────────────────────────────────────
 * 
 * 优先级（从高到低）：
 *   1. npm 包：require('pokemon-showdown') 或 require('@pkmn/sim')
 *   2. 本地路径：../../../../pokemon-showdown/dist/sim
 *   3. 外部路径：通过环境变量或配置文件指定
 * 
 * 这样设计的好处：
 *   - ✅ 支持独立部署（使用 npm 包）
 *   - ✅ 向后兼容（支持本地路径）
 *   - ✅ 灵活性（可配置路径）
 */
const path = require('path');
const fs = require('fs');

class ShowdownAdapter {
  constructor() {
    this._showdownPath = null;
    this._useNpmPackage = null; // null = 未检测, true = 使用npm包, false = 使用本地路径
    this._npmPackageName = null; // 检测到的npm包名
    this._dexCache = new Map();
    this._teamsCache = null;
    this._battleStreamClass = null;
    this._getPlayerStreamsFn = null;
    this._randomTeamsClass = null;
  }

  /**
   * 检测可用的 Pokemon Showdown 模块
   * 优先级：npm 包（node_modules） > 本地路径（同级目录）
   * 
   * @returns {Object} { useNpm: boolean, packageName: string|null, localPath: string|null }
   */
  _detectShowdownModule() {
    if (this._useNpmPackage !== null) {
      // 已经检测过，直接返回缓存结果
      return {
        useNpm: this._useNpmPackage,
        packageName: this._npmPackageName,
        localPath: this._showdownPath
      };
    }

    // 优先尝试 npm 包（多种可能的包名）
    const possiblePackages = [
      'pokemon-showdown',  // 从 GitHub 安装的包
      '@pkmn/sim',         // 替代实现（如果兼容）
      '@smogon/pokemon-showdown'
    ];

    for (const pkgName of possiblePackages) {
      try {
        // 检查包是否可解析
        const resolvedPath = require.resolve(pkgName);
        
        // 验证包是否可用（尝试加载主模块或 dist/sim）
        let pkg = null;
        try {
          pkg = require(pkgName);
        } catch {
          // 尝试从 dist/sim 加载
          try {
            pkg = require(`${pkgName}/dist/sim`);
          } catch {
            continue;
          }
        }

        // 检查包中是否有必要的模块（Dex, BattleStream 等）
        const hasRequiredModules = pkg && (
          pkg.Dex || 
          pkg.BattleStream || 
          (pkg.sim && (pkg.sim.Dex || pkg.sim.BattleStream))
        );

        if (hasRequiredModules || resolvedPath) {
          this._useNpmPackage = true;
          this._npmPackageName = pkgName;
          console.log(`[ShowdownAdapter] ✅ 检测到 npm 包: ${pkgName}`);
          console.log(`[ShowdownAdapter] 包路径: ${resolvedPath}`);
          return {
            useNpm: true,
            packageName: pkgName,
            localPath: null
          };
        }
      } catch (e) {
        // 包不存在或无法加载，继续尝试下一个
        continue;
      }
    }

    // npm 包不可用，降级到本地路径（同级目录）
    this._useNpmPackage = false;
    this._showdownPath = path.resolve(__dirname, '../../../../pokemon-showdown');
    
    // 检查本地路径是否存在
    if (fs.existsSync(this._showdownPath) && fs.existsSync(path.join(this._showdownPath, 'dist', 'sim'))) {
      console.log(`[ShowdownAdapter] ⚠️  未找到 npm 包，使用本地路径: ${this._showdownPath}`);
    } else {
      console.warn(`[ShowdownAdapter] ⚠️  未找到 npm 包，本地路径也不存在: ${this._showdownPath}`);
      console.warn(`[ShowdownAdapter] 提示：运行 npm install 会自动安装 pokemon-showdown`);
    }
    
    return {
      useNpm: false,
      packageName: null,
      localPath: this._showdownPath
    };
  }

  /**
   * 获取 Pokemon Showdown 根路径（向后兼容方法）
   * 
   * @deprecated 使用 _detectShowdownModule() 代替
   */
  getShowdownPath() {
    if (!this._showdownPath) {
      const detection = this._detectShowdownModule();
      if (!detection.useNpm && detection.localPath) {
        this._showdownPath = detection.localPath;
      } else {
        // 即使使用 npm 包，也提供默认路径（用于降级）
        this._showdownPath = path.resolve(__dirname, '../../../../pokemon-showdown');
      }
    }
    return this._showdownPath;
  }

  /**
   * 加载 Pokemon Showdown 模块（智能选择 npm 包或本地路径）
   * 
   * 加载优先级：
   *   1. npm 包（如果已安装）
   *   2. node_modules 中的包（GitHub 依赖）
   *   3. 本地路径（../../../../pokemon-showdown）
   * 
   * @param {string} modulePath - 模块路径（相对于 showdown 根目录）
   *   例如：'dist/sim', 'dist/sim/teams'
   * @returns {Object} 加载的模块对象
   */
  _requireShowdownModule(modulePath) {
    const detection = this._detectShowdownModule();

    // 如果使用 npm 包（通过 package.json 从 GitHub 安装）
    if (detection.useNpm && detection.packageName) {
      try {
        if (modulePath === 'dist/sim') {
          // 主模块：尝试直接 require 包名
          // 如果是从 GitHub 安装的，路径结构可能不同
          const pkg = require(detection.packageName);
          // 检查是否有 dist/sim 子路径
          try {
            return require(`${detection.packageName}/dist/sim`);
          } catch {
            // 如果没有 dist/sim，直接返回包本身
            return pkg;
          }
        } else if (modulePath === 'dist/sim/teams') {
          // Teams 模块：尝试多种路径
          const possiblePaths = [
            `${detection.packageName}/dist/sim/teams`,
            `${detection.packageName}/sim/teams`,
            `${detection.packageName}/teams`
          ];
          for (const p of possiblePaths) {
            try {
              return require(p);
            } catch {
              continue;
            }
          }
        } else if (modulePath.startsWith('dist/data/random-battles/')) {
          // RandomTeams 模块：尝试多种路径
          const subPath = modulePath.replace('dist/', '');
          const possiblePaths = [
            `${detection.packageName}/${modulePath}`,
            `${detection.packageName}/${subPath}`,
            `${detection.packageName}/data/${subPath.split('/').slice(-2).join('/')}`
          ];
          for (const p of possiblePaths) {
            try {
              return require(p);
            } catch {
              continue;
            }
          }
        }
      } catch (e) {
        console.warn(`[ShowdownAdapter] 从 npm 包加载 ${modulePath} 失败: ${e.message}，降级到本地路径`);
        // 降级到本地路径
      }
    }

    // 使用本地路径（降级方案）
    // 如果使用 npm 包但上面的加载失败，尝试从 node_modules 的包中加载
    if (detection.useNpm && detection.packageName) {
      try {
        // 从 node_modules 中加载（GitHub 依赖安装在这里）
        const nodeModulesBase = path.resolve(__dirname, '../../../node_modules', detection.packageName);
        const nodeModulesPath = path.join(nodeModulesBase, modulePath);
        if (fs.existsSync(nodeModulesPath + '.js') || fs.existsSync(nodeModulesPath)) {
          return require(nodeModulesPath);
        }
      } catch (e) {
        // 继续尝试其他路径
      }
    }

    // 最后尝试：本地路径（同级目录）
    const localPath = path.resolve(this.getShowdownPath(), modulePath);
    try {
      return require(localPath);
    } catch (e) {
      const errorMsg = `无法加载 Pokemon Showdown 模块 ${modulePath}`;
      const suggestions = [
        `1. 确保已运行: cd poke-proxy-server && npm install`,
        `2. 检查 package.json 中是否包含 pokemon-showdown 依赖`,
        `3. 手动安装: npm install https://github.com/smogon/pokemon-showdown.git#master`
      ];
      
      console.error(`[ShowdownAdapter] ❌ ${errorMsg}`);
      console.error(`[ShowdownAdapter] 建议：`);
      suggestions.forEach(s => console.error(`[ShowdownAdapter]   ${s}`));
      
      throw new Error(`${errorMsg}。${suggestions.join(' ')}`);
    }
  }

  /**
   * 获取 Dex 实例
   * 
   * 功能：
   *   - 加载 Pokemon Showdown 的 Dex 模块
   *   - Dex 用于查询宝可梦、技能、道具等数据
   *   - 支持按格式过滤（formatid）
   *   - 使用缓存避免重复加载
   * 
   * @param {string} [formatid] - 格式ID（如 'gen9ou'），可选
   * @returns {Object} Dex 实例
   * 
   * @throws {Error} 如果无法加载 Dex 模块
   */
  getDex(formatid = null) {
    const cacheKey = formatid || 'default';
    if (this._dexCache.has(cacheKey)) {
      return this._dexCache.get(cacheKey);
    }

    try {
      const PS = this._requireShowdownModule('dist/sim');
      const Dex = PS.Dex || PS;
      
      if (!Dex) {
        throw new Error('Dex 未在模块中找到');
      }

      const dex = formatid && Dex.forFormat ? Dex.forFormat(formatid) : Dex;
      this._dexCache.set(cacheKey, dex);
      return dex;
    } catch (e) {
      throw new Error(`无法加载 Pokemon Showdown Dex: ${e.message}`);
    }
  }

  /**
   * 获取 Teams 工具类
   * 
   * 功能：
   *   - 加载 Pokemon Showdown 的 Teams 模块
   *   - Teams 提供 pack() 和 unpack() 方法用于队伍序列化
   *   - 使用缓存避免重复加载
   * 
   * @returns {Object} Teams 对象（包含 pack, unpack 等方法）
   * 
   * @throws {Error} 如果无法加载 Teams 模块
   */
  getTeams() {
    if (this._teamsCache) {
      return this._teamsCache;
    }

    try {
      const teamsModule = this._requireShowdownModule('dist/sim/teams');
      const Teams = teamsModule.Teams || teamsModule;
      
      if (!Teams) {
        throw new Error('Teams 未在模块中找到');
      }

      this._teamsCache = Teams;
      return Teams;
    } catch (e) {
      throw new Error(`无法加载 Pokemon Showdown Teams: ${e.message}`);
    }
  }

  /**
   * 获取 BattleStream 类
   * 
   * 功能：
   *   - 加载 Pokemon Showdown 的 BattleStream 类
   *   - BattleStream 是对战引擎的核心，用于执行对战逻辑
   *   - 使用缓存避免重复加载
   * 
   * @returns {Class} BattleStream 类
   * 
   * @throws {Error} 如果无法加载 BattleStream 类
   */
  getBattleStreamClass() {
    if (this._battleStreamClass) {
      return this._battleStreamClass;
    }

    try {
      const PS = this._requireShowdownModule('dist/sim');
      const BattleStream = PS.BattleStream;
      
      if (!BattleStream) {
        throw new Error('BattleStream 未在模块中找到');
      }

      this._battleStreamClass = BattleStream;
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
   * 
   * 功能：
   *   - 加载 Pokemon Showdown 的 getPlayerStreams 函数
   *   - 该函数用于将 BattleStream 分离为多个协议流（p1, p2, omniscient）
   *   - 使用缓存避免重复加载
   * 
   * @returns {Function} getPlayerStreams 函数
   * 
   * @throws {Error} 如果无法加载 getPlayerStreams 函数
   */
  getPlayerStreamsFn() {
    if (this._getPlayerStreamsFn) {
      return this._getPlayerStreamsFn;
    }

    try {
      const PS = this._requireShowdownModule('dist/sim');
      const getPlayerStreams = PS.getPlayerStreams;
      
      if (!getPlayerStreams || typeof getPlayerStreams !== 'function') {
        throw new Error('getPlayerStreams 未在模块中找到或不是函数');
      }

      this._getPlayerStreamsFn = getPlayerStreams;
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
   * 
   * 功能：
   *   - 加载 Pokemon Showdown 的 RandomTeams 类
   *   - RandomTeams 用于生成高质量的随机队伍配置
   *   - 支持不同世代（gen9, gen8 等）
   *   - 使用缓存避免重复加载
   * 
   * @returns {Class} RandomTeams 类
   * 
   * @throws {Error} 如果无法加载 RandomTeams 类
   */
  getRandomTeamsClass() {
    if (this._randomTeamsClass) {
      return this._randomTeamsClass;
    }

    try {
      // 尝试加载 gen9 的 RandomTeams（默认）
      const teamsModule = this._requireShowdownModule('dist/data/random-battles/gen9/teams');
      const RandomTeams = teamsModule.RandomTeams || teamsModule;
      
      if (!RandomTeams) {
        throw new Error('RandomTeams 未在模块中找到');
      }

      this._randomTeamsClass = RandomTeams;
      return RandomTeams;
    } catch (e) {
      // 如果 gen9 不存在，尝试其他版本
      console.warn(`[ShowdownAdapter] 无法加载 gen9 RandomTeams: ${e.message}`);
      
      // 尝试加载其他世代作为降级
      try {
        const teamsModule = this._requireShowdownModule('dist/data/random-battles/gen8/teams');
        const RandomTeams = teamsModule.RandomTeams || teamsModule;
        if (RandomTeams) {
          console.log(`[ShowdownAdapter] 使用 gen8 RandomTeams 作为降级方案`);
          this._randomTeamsClass = RandomTeams;
          return RandomTeams;
        }
      } catch (e2) {
        // 继续抛出原始错误
      }
      
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

