/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 对战服务器主入口（battle-server.js）
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📋 核心职责
 * ──────────────────────────────────────────────────────────────────────────
 * 1. 服务器启动与初始化
 *    - 初始化 HTTP 和 WebSocket 服务器
 *    - 加载配置（端口、资源路径等）
 *    - 预加载中文数据和贴图资源
 * 
 * 2. 对战流程管理
 *    - AI 对战：生成随机 AI 队伍，管理玩家 vs AI 对战
 *    - PvP 对战：房间创建/加入，双方玩家对战管理
 *    - 消息路由：将 WebSocket 消息分发到对应的处理器
 * 
 * 3. AI 队伍生成
 *    - 根据难度级别生成不同质量的 AI 队伍
 *    - 难度 5：从知识库宝可梦中选择（支持 RAG 增强）
 *    - 自动生成技能、努力值、个体值等完整配置
 * 
 * 4. 资源管理
 *    - 中文数据加载（宝可梦名称、技能、道具等）
 *    - 贴图文件扫描与验证
 *    - 攻略管理器集成（读取用户编写的攻略）
 * 
 * 🏗️ 架构设计
 * ──────────────────────────────────────────────────────────────────────────
 * 
 *                      battle-server.js (本文件)
 *                              │
 *          ┌───────────────────┼───────────────────┐
 *          │                   │                   │
 *     bootstrap.js    connectionController    RoomManager
 *     (HTTP+WS)      (消息路由)              (房间管理)
 *          │                   │                   │
 *          │         ┌─────────┴─────────┐        │
 *          │         │                   │        │
 *    AIBattleController         PvPHandler    SimplePvPManager
 *    (AI对战)                   (PvP路由)     (PvP对战引擎)
 *          │                   │                   │
 *          └───────────┬───────┴───────────────────┘
 *                      │
 *                BattleManager
 *            (Pokemon Showdown 适配)
 * 
 * 📡 网络端点
 * ──────────────────────────────────────────────────────────────────────────
 * - WebSocket: ws://localhost:3071/battle
 * - HTTP 端点：
 *   • GET  /metrics          → Prometheus 指标
 *   • POST /api/metrics      → 前端性能数据上报
 *   • GET  /health           → 健康检查
 *   • GET  /api/strategies   → 攻略管理 API
 * 
 * 📨 消息协议
 * ──────────────────────────────────────────────────────────────────────────
 * 客户端 → 服务器：
 *   • { type: 'start', payload: { mode, formatid, team, difficulty?, roomId?, side? } }
 *   • { type: 'choose', command: 'move 1' | 'switch 2' | 'team 1' }
 *   • { type: 'create-room' }
 *   • { type: 'join-room', payload: { roomId } }
 * 
 * 服务器 → 客户端：
 *   • Pokemon Showdown 协议（|request|, |switch|, |move| 等）
 *   • { type: 'room-created', payload: { roomId, side } }
 *   • { type: 'battle-reconnected', payload: { side, message } }
 * 
 * 🔧 环境变量
 * ──────────────────────────────────────────────────────────────────────────
 * - BATTLE_PORT: 服务器端口（默认 3071）
 * - DEBUG_AI: 是否启用 AI 调试日志
 * - SKIP_AI_PREWARM: 跳过 AI 队伍生成预热
 * 
 * 📝 使用示例
 * ──────────────────────────────────────────────────────────────────────────
 * 启动服务器：
 *   npm run battle
 *   或
 *   node poke-proxy-server/battle-server.js
 * 
 * 启动后会：
 *   1. 加载配置和资源
 *   2. 初始化 HTTP/WebSocket 服务器
 *   3. 注册所有 API 端点
 *   4. 开始监听连接请求
 * 
 * ⚠️ 注意事项
 * ──────────────────────────────────────────────────────────────────────────
 * - 难度 5 的 AI 需要使用 RAG 系统（可选模块）
 * - 用户攻略会自动合并到知识库宝可梦列表
 * - 所有资源（中文数据、贴图）在启动时预加载，确保性能
 */
// 加载核心组件
const BattleManager = require('./domain/battles/BattleManager');
const config = require('./config');
const bootstrap = require('./server/bootstrap');
const createConnectionController = require('./controllers/connectionController');
const createAIBattleController = require('./controllers/AIBattleController');
const createPvPController = require('./controllers/PvPController');

// 使用适配层
const showdownAdapter = require('./adapters/pokemon-showdown/ShowdownAdapter');
const ChineseDataLoader = require('./adapters/resources/ChineseDataLoader');
const SpriteFileManager = require('./adapters/resources/SpriteFileManager');
const StrategyManager = require('./domain/strategies/StrategyManager');

const PORT = config.server.port;
const DEBUG_AI = config.flags.debugAI;
const aiLog = (...args) => {
  if (DEBUG_AI) {
    console.log(...args);
  }
};

console.log('[battle-server] ========== 服务器启动（新架构）==========');
console.log(`[battle-server] 端口: ${PORT}`);

// 初始化资源适配层
const chineseDataLoader = new ChineseDataLoader(config.paths.chineseDex, { watch: false });
const spriteFileManager = new SpriteFileManager(config.paths.spritesDir, { cache: true });

// 预加载中文数据
const CHINESE_DATA = chineseDataLoader.load();
console.log(`[battle-server] 已加载中文贴图映射 ${Object.keys(CHINESE_DATA).length} 条`);

// 预扫描贴图目录
spriteFileManager.scan();
const spriteStats = spriteFileManager.getStats();
console.log(`[battle-server] 已扫描贴图目录，共 ${spriteStats.totalFiles} 个文件`);

// 辅助函数：检查是否有中文数据和贴图
function hasChineseAndSpriteData(species) {
  const spriteFileSet = spriteFileManager.getFileSet();
  return chineseDataLoader.hasChineseAndSprite(species, spriteFileSet);
}

// 知识库中有攻略的宝可梦列表（难度5 AI专用）
// 基础列表：默认有攻略的精灵
const BASE_KNOWLEDGE_POKEMON = [
  'Pikachu', 'Charizard', 'Blastoise', 'Venusaur', 'Lucario',
  'Garchomp', 'Gengar', 'Dragonite', 'Salamence', 'Tyranitar',
  'Greninja', 'Mimikyu', 'Landorus-Therian', 'Clefable', 'Heatran',
  'Tapu Koko', 'Tapu Lele', 'Corviknight', 'Dragapult', 'Zamazenta'
];

// 扩展后的列表（包含用户攻略中的精灵）
let KNOWLEDGE_BASE_POKEMON = [...BASE_KNOWLEDGE_POKEMON];

// 初始化攻略管理器
const strategyManager = new StrategyManager();

/**
 * 从用户攻略中加载精灵列表并合并到知识库列表
 */
async function loadPokemonFromStrategies() {
  try {
    const strategyPokemon = await strategyManager.getPokemonFromStrategies();
    
    // 合并到知识库列表（去重）
    const combinedSet = new Set([...BASE_KNOWLEDGE_POKEMON, ...strategyPokemon]);
    KNOWLEDGE_BASE_POKEMON = Array.from(combinedSet);
    
    console.log(`[battle-server] 已从攻略中加载 ${strategyPokemon.length} 个精灵`);
    console.log(`[battle-server] 知识库精灵总数: ${KNOWLEDGE_BASE_POKEMON.length}`);
    
    if (strategyPokemon.length > 0) {
      console.log(`[battle-server] 新增精灵: ${strategyPokemon.join(', ')}`);
    }
    
    // 初始化缓存
    await strategyManager.refreshPokemonCache();
    
  } catch (error) {
    console.warn('[battle-server] 加载攻略精灵列表失败，使用默认列表', error.message);
    KNOWLEDGE_BASE_POKEMON = [...BASE_KNOWLEDGE_POKEMON];
  }
}

// 服务器启动时加载攻略精灵列表
loadPokemonFromStrategies().catch(err => {
  console.error('[battle-server] 初始化攻略精灵列表失败', err);
});

// 导出刷新函数，供其他模块调用
if (typeof global !== 'undefined') {
  global.refreshKnowledgeBasePokemon = loadPokemonFromStrategies;
}

/**
 * 判断是否为最终形态
 * @param {Object} species - Dex species 对象
 * @returns {boolean}
 */
function isFinalEvolution(species) {
  if (!species) return false;
  // Pokemon Showdown 的 species.nfe 表示非最终形态
  const noFurtherEvolution = !species.evos || species.evos.length === 0;
  return !species.nfe && noFurtherEvolution;
}

/**
 * 过滤技能，确保伤害类技能的威力不低于阈值
 * @param {Array<string>} moveIds - 技能 ID 数组
 * @param {Dex} dex - Dex 实例
 * @param {number|null} minPower - 最低威力（null 表示不限制）
 * @returns {Array<string>} 过滤后的技能数组
 */
function enforceMovePowerThreshold(moveIds, dex, minPower) {
  if (!moveIds || !Array.isArray(moveIds) || moveIds.length === 0) {
    return [];
  }
  if (minPower === null || minPower === undefined || minPower <= 0) {
    return moveIds;
  }

  return moveIds.filter(moveId => {
    try {
      const move = dex.moves.get(moveId);
      if (!move || !move.exists) return false;
      const isDamaging = move.category === 'Physical' || move.category === 'Special';
      if (!isDamaging) {
        return true;
      }
      const power = move.basePower || 0;
      return power >= minPower;
    } catch {
      return false;
    }
  });
}

/**
 * 生成随机AI队伍（带技能）
 * 
 * 功能：
 * - 生成指定格式和数量的随机宝可梦队伍
 * - 为每只宝可梦生成技能、努力值（EVs）、个体值（IVs）、特性、道具
 * - 对于难度5，只从知识库中有攻略的宝可梦中选择
 * - 使用 Pokemon Showdown 的 RandomTeams 生成高质量技能配置
 * 
 * @param {string} formatid - 对战格式（如 'gen9ou'）
 * @param {number} [count=6] - 队伍数量，默认6只
 * @param {number|null} [difficulty=null] - AI难度（1-5），null表示不限制
 *   - 难度5：只从知识库宝可梦列表中选择（用于 RAG 增强 AI）
 *   - 其他难度：从所有可用宝可梦中选择
 * @returns {Array<Object>} 队伍数组，每个元素是一个宝可梦对象
 *   包含字段：name, species, ability, item, moves, nature, evs, ivs, level
 * 
 * 技能生成策略（优先级）：
 * 1. 使用 RandomTeams.randomSet() 生成（最高质量）
 * 2. 使用预设套装（dex.sets.get()）
 * 3. 使用降级策略（评分系统选择技能）
 */
function generateRandomAITeam(formatid, count = 6, difficulty = null) {
  const team = [];
  const dex = showdownAdapter.getDex(formatid);
  const normalizedDifficulty = typeof difficulty === 'number' ? difficulty : null;
  const enforceFinalEvolution = normalizedDifficulty !== null && normalizedDifficulty >= 3;
  const minPowerThreshold = normalizedDifficulty !== null && normalizedDifficulty >= 3 ? 40 : null;
  
  // 创建RandomTeams实例用于生成高质量的技能配置
  // 使用随机种子确保每次生成的队伍不同
  const seed = [Math.floor(Math.random() * 2147483647), Math.floor(Math.random() * 2147483647), Math.floor(Math.random() * 2147483647), Math.floor(Math.random() * 2147483647)];
  let randomTeamsGenerator = null;
  try {
    randomTeamsGenerator = showdownAdapter.createRandomTeams(formatid, seed);
    aiLog(`[battle-server] RandomTeams实例创建成功，formatid: ${formatid}`);
  } catch (e) {
    console.warn(`[battle-server] 无法创建RandomTeams实例:`, e.message);
    console.warn(`[battle-server] 将使用降级策略生成技能`);
  }
  
  // 难度5：只从知识库中有攻略的宝可梦中选择
  let candidatePokemon = [];
  if (difficulty === 5) {
    aiLog('[battle-server] 难度5：从知识库宝可梦列表中选择队伍');
    // 从知识库列表中选择
    candidatePokemon = KNOWLEDGE_BASE_POKEMON.map(name => {
      try {
        const species = dex.species.get(name);
        if (species && species.exists) {
          return species;
        }
        // 尝试其他名称格式
        const altNames = [
          name.toLowerCase(),
          name.replace(' ', '-'),
          name.replace('-', ' ')
        ];
        for (const altName of altNames) {
          const altSpecies = dex.species.get(altName);
          if (altSpecies && altSpecies.exists) {
            return altSpecies;
          }
        }
        return null;
      } catch (e) {
        console.warn(`[battle-server] 无法获取 ${name} 的species数据:`, e);
        return null;
      }
    }).filter(s => s !== null && hasChineseAndSpriteData(s));
    
    if (candidatePokemon.length === 0) {
      console.warn('[battle-server] 知识库宝可梦列表中没有可用宝可梦，降级为普通随机选择');
      // 降级为普通选择
      candidatePokemon = dex.species.all().filter(s => {
    if (!s.exists) return false;
    if (s.isNonstandard && s.isNonstandard !== 'Unobtainable') return false;
    if (s.forme && ['Gmax', 'Totem', 'Starter'].some(f => s.forme.includes(f))) return false;
    if (!hasChineseAndSpriteData(s)) return false;
    return true;
  });
    }
  } else {
    // 其他难度：使用原来的逻辑
    candidatePokemon = dex.species.all().filter(s => {
    if (!s.exists) return false;
    if (s.isNonstandard && s.isNonstandard !== 'Unobtainable') return false;
    if (s.forme && ['Gmax', 'Totem', 'Starter'].some(f => s.forme.includes(f))) return false;
    if (!hasChineseAndSpriteData(s)) return false;
    return true;
  });
  }

  if (enforceFinalEvolution) {
    const finalForms = candidatePokemon.filter(isFinalEvolution);
    if (finalForms.length > 0) {
      aiLog(`[battle-server] 难度>=3，使用最终形态宝可梦 (${finalForms.length}/${candidatePokemon.length})`);
      candidatePokemon = finalForms;
    } else {
      console.warn('[battle-server] 难度>=3 但未能找到最终形态宝可梦，继续使用原候选列表');
    }
  }

  // 如果过滤后没有宝可梦，使用默认列表
  if (candidatePokemon.length === 0) {
    const defaultPokemon = ['Pikachu', 'Charizard', 'Blastoise', 'Venusaur', 'Lucario', 'Garchomp'];
    for (let i = 0; i < count; i++) {
      const pokemonName = defaultPokemon[i % defaultPokemon.length];
      const species = dex.species.get(pokemonName);
      if (!species || !species.exists || !hasChineseAndSpriteData(species)) continue;
      
      const moves = getPokemonMoves(dex, species, randomTeamsGenerator, {
        minPowerThreshold
      });
      const evs = generateEVs(species);
      const ivs = generateIVs();
      const pokemonData = {
        name: pokemonName,
        species: pokemonName,
        item: '',
        ability: '',
        moves: moves,
        nature: 'Serious',
        level: 50,
        evs: evs,
        ivs: ivs
      };
      team.push(pokemonData);
      aiLog(`[battle-server] 生成AI宝可梦: ${pokemonName}, EVs总和: ${sumEVs(evs)}, 等级: 50`);
    }
    return team;
  }

  // 随机选择不重复的宝可梦
  const selectedSpecies = [];
  const availableIndices = Array.from({ length: candidatePokemon.length }, (_, i) => i);
  
  for (let i = 0; i < count && availableIndices.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availableIndices.length);
    const speciesIndex = availableIndices.splice(randomIndex, 1)[0];
    selectedSpecies.push(candidatePokemon[speciesIndex]);
  }

  // 生成队伍数据
  for (const species of selectedSpecies) {
    aiLog(`[battle-server] ========== 开始生成 ${species.name} 的技能 ==========`);
    aiLog(`[battle-server] species.id: ${species.id}, species.name: ${species.name}`);
    aiLog(`[battle-server] RandomTeams实例存在: ${!!randomTeamsGenerator}`);
    
    const moves = getPokemonMoves(dex, species, randomTeamsGenerator, {
      minPowerThreshold
    });
    
    aiLog(`[battle-server] getPokemonMoves 返回值:`, moves);
    aiLog(`[battle-server] moves类型: ${typeof moves}, 是数组: ${Array.isArray(moves)}, 长度: ${moves ? moves.length : 0}`);
    
    const evs = generateEVs(species);
    const ivs = generateIVs();
    
    // 验证技能数据
    if (!moves || moves.length === 0) {
      console.error(`[battle-server] ⚠️⚠️⚠️ 严重问题：${species.name} 没有技能！`);
      console.error(`[battle-server] moves值:`, moves);
      console.error(`[battle-server] moves是否为null: ${moves === null}`);
      console.error(`[battle-server] moves是否为undefined: ${moves === undefined}`);
      console.error(`[battle-server] moves是否为数组: ${Array.isArray(moves)}`);
      console.error(`[battle-server] moves长度: ${moves ? moves.length : 'N/A'}`);
      // 使用默认技能作为备选
      const defaultMoves = ['tackle', 'protect', 'quickattack'];
      console.error(`[battle-server] ⚠️⚠️⚠️ 将使用默认技能:`, defaultMoves);
    } else {
      aiLog(`[battle-server] ✅ ${species.name} 成功获得 ${moves.length} 个技能:`, moves);
    }
    
    const pokemonData = {
      name: species.name,
      species: species.name,
      item: '',
      ability: '',
      moves: moves && moves.length > 0 ? moves : ['tackle', 'protect'], // 确保至少有技能
      nature: 'Serious',
      level: 50,
      evs: evs,
      ivs: ivs
    };
    
    if (pokemonData.moves.includes('tackle') || pokemonData.moves.includes('protect')) {
      console.warn(`[battle-server] ⚠️⚠️⚠️ 警告：${species.name} 使用了低级技能！最终技能:`, pokemonData.moves);
    }
    
    aiLog(`[battle-server] 生成AI宝可梦: ${species.name}, EVs总和: ${sumEVs(evs)}, 等级: 50, 技能数: ${pokemonData.moves.length}`);
    aiLog(`[battle-server] ========== ${species.name} 技能生成完成 ==========`);
    team.push(pokemonData);
  }

  return team;
}

/**
 * 生成合理的努力值分配（EVs）
 * 规则：
 * - 每个属性最多252点
 * - 总和不超过510点（标准对战规则）
 * - 根据宝可梦的种族值自动分配（速度型/耐久型/平衡型）
 * @param {Object} species - 宝可梦种类对象
 * @returns {Object} EVs对象 {hp, atk, def, spa, spd, spe}
 */
function generateEVs(species) {
  if (!species || !species.baseStats) {
    // 默认分配：速度和特攻/物攻
    return { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 }; // 总和504
  }

  const baseStats = species.baseStats;
  
  // 确定宝可梦的主要定位（根据种族值）
  const totalAttack = baseStats.atk || 0;
  const totalSpAttack = baseStats.spa || 0;
  const totalSpeed = baseStats.spe || 0;
  const totalDefense = baseStats.def || 0;
  const totalSpDefense = baseStats.spd || 0;
  const totalHP = baseStats.hp || 0;
  
  // 判断是物攻型还是特攻型
  const isPhysical = totalAttack >= totalSpAttack;
  const primaryAttack = isPhysical ? totalAttack : totalSpAttack;
  
  // 判断是速度快还是防御型
  const isFast = totalSpeed >= 90;
  const isBulky = totalHP + totalDefense + totalSpDefense > 200;
  
  let evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  
  // 根据定位分配努力值
  if (isFast && !isBulky) {
    // 速度型输出：速度252 + 攻击252 + HP 4 = 508
    evs.spe = 252;
    if (isPhysical) {
      evs.atk = 252;
    } else {
      evs.spa = 252;
    }
    evs.hp = 4;
  } else if (isBulky && !isFast) {
    // 耐久型：HP 252 + 防御/特防 + 少量攻击
    evs.hp = 252;
    if (totalDefense >= totalSpDefense) {
      evs.def = 252;
      if (isPhysical) {
        evs.atk = 4;
      } else {
        evs.spa = 4;
      }
    } else {
      evs.spd = 252;
      if (isPhysical) {
        evs.atk = 4;
      } else {
        evs.spa = 4;
      }
    }
  } else {
    // 平衡型：速度128 + HP 128 + 攻击252 = 508
    evs.spe = 128;
    evs.hp = 128;
    if (isPhysical) {
      evs.atk = 252;
    } else {
      evs.spa = 252;
    }
  }
  
  // 确保总和不超过510（标准规则：努力值总和最多510）
  // 同时确保每个属性不超过252
  const total = sumEVs(evs);
  
  // 验证每个属性不超过252
  Object.keys(evs).forEach(stat => {
    if (evs[stat] > 252) {
      evs[stat] = 252;
    }
  });
  
  // 如果总和超过510，按比例缩减
  if (total > 510) {
    const ratio = 510 / total;
    Object.keys(evs).forEach(stat => {
      evs[stat] = Math.floor(evs[stat] * ratio);
    });
    // 重新计算并调整到510（但不超过252限制）
    const newTotal = sumEVs(evs);
    if (newTotal < 510) {
      // 将剩余点数分配给速度（如果有空间）
      const remaining = 510 - newTotal;
      if (evs.spe + remaining <= 252) {
        evs.spe += remaining;
      } else if (evs.hp + remaining <= 252) {
        evs.hp += remaining;
      } else if (evs.atk + remaining <= 252) {
        evs.atk += remaining;
      } else if (evs.spa + remaining <= 252) {
        evs.spa += remaining;
      } else if (evs.def + remaining <= 252) {
        evs.def += remaining;
      } else if (evs.spd + remaining <= 252) {
        evs.spd += remaining;
      }
    }
  }
  
  // 最终验证：确保总和不超过510
  const finalTotal = sumEVs(evs);
  if (finalTotal > 510) {
    console.warn(`[battle-server] 警告：努力值总和 ${finalTotal} 超过510，强制缩减`);
    // 按比例缩减到510
    const ratio = 510 / finalTotal;
    Object.keys(evs).forEach(stat => {
      evs[stat] = Math.floor(evs[stat] * ratio);
    });
  }
  
  return evs;
}

/**
 * 计算努力值总和
 * @param {Object} evs - EVs对象
 * @returns {number} EVs总和
 */
function sumEVs(evs) {
  return (evs.hp || 0) + (evs.atk || 0) + (evs.def || 0) + 
         (evs.spa || 0) + (evs.spd || 0) + (evs.spe || 0);
}

/**
 * 生成个体值（IVs）
 * 默认全31（完美个体值），符合对战环境标准
 * @returns {Object} IVs对象 {hp, atk, def, spa, spd, spe}
 */
function generateIVs() {
  // 标准对战环境通常使用全31个体值（完美个体值）
  return { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
}

/**
 * 获取宝可梦的可学习技能
 * 优先使用Pokemon Showdown的RandomTeams.randomSet()方法生成高质量技能配置
 * 如果无法使用RandomTeams，则使用降级策略
 */
function getPokemonMoves(dex, species, randomTeamsGenerator = null, options = {}) {
  if (!species || !species.exists) {
    return [];
  }

  const minPowerThreshold = typeof options.minPowerThreshold === 'number' ? options.minPowerThreshold : null;
  const toId = (name) => (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

  function getRandomSetWithFallback(targetSpecies) {
    if (!randomTeamsGenerator || !targetSpecies) return null;
    const candidates = [];
    const pushCandidate = (value) => {
      const id = toId(value);
      if (id) candidates.push(id);
    };

    pushCandidate(targetSpecies.id);
    if (targetSpecies.baseSpecies) pushCandidate(targetSpecies.baseSpecies);
    if (targetSpecies.name?.includes('-')) pushCandidate(targetSpecies.name.split('-')[0]);
    if (targetSpecies.aliases?.length) pushCandidate(targetSpecies.aliases[0]);

    const tried = new Set();
    for (const candidate of candidates) {
      if (tried.has(candidate)) continue;
      tried.add(candidate);
      try {
        aiLog(`[getPokemonMoves] 尝试 randomSet(${candidate})（原 species: ${targetSpecies.id}）`);
        const randomSet = randomTeamsGenerator.randomSet(candidate, {}, false, false);
        if (randomSet) {
          aiLog(`[getPokemonMoves] ✅ randomSet(${candidate}) 成功`);
          return randomSet;
        }
      } catch (err) {
        aiLog(`[getPokemonMoves] ⚠️ randomSet(${candidate}) 失败: ${err.message}`);
        // 尝试下一个候选
      }
    }
    return null;
  }

  // 优先使用Pokemon Showdown的RandomTeams.randomSet()方法
  if (randomTeamsGenerator) {
    aiLog(`[getPokemonMoves] ✅ RandomTeams实例存在，尝试生成 ${species.id} 的随机套装`);
    try {
      // 调用randomSet方法生成完整的随机套装（含形态降级兜底）
      const randomSet = getRandomSetWithFallback(species);
      if (!randomSet) {
        aiLog(`[getPokemonMoves] ⚠️ randomSet(${species.id}) 所有候选均失败，进入降级逻辑`);
        throw new Error('randomSet fallback exhausted');
      }
      aiLog(`[getPokemonMoves] randomSet 返回值:`, randomSet);
      aiLog(`[getPokemonMoves] randomSet类型: ${typeof randomSet}, randomSet是否为null: ${randomSet === null}`);
      aiLog(`[getPokemonMoves] randomSet.moves:`, randomSet?.moves);
      aiLog(`[getPokemonMoves] randomSet.moves类型: ${typeof randomSet?.moves}, 是数组: ${Array.isArray(randomSet?.moves)}, 是Set: ${randomSet?.moves instanceof Set}`);
      
      if (randomSet && randomSet.moves) {
        // randomSet.moves是string[]数组，直接使用
        let movesArray;
        if (Array.isArray(randomSet.moves)) {
          movesArray = randomSet.moves;
        } else if (randomSet.moves instanceof Set) {
          // 如果是Set对象，转换为数组
          movesArray = Array.from(randomSet.moves);
        } else {
          // 其他情况，尝试转换为数组
          movesArray = Array.from(randomSet.moves || []);
        }
        
        aiLog(`[getPokemonMoves] movesArray原始值:`, movesArray);
        aiLog(`[getPokemonMoves] movesArray长度:`, movesArray.length);
        
        // 确保返回的是ID格式的技能列表
        const moveIds = movesArray
          .filter(moveId => {
            const isValid = moveId && typeof moveId === 'string' && moveId !== 'struggle';
            if (!isValid) {
              aiLog(`[getPokemonMoves] 过滤掉无效moveId:`, moveId);
            }
            return isValid;
          })
          .map(moveId => {
            // 验证技能ID是否有效
            try {
              const move = dex.moves.get(moveId);
              if (move && move.exists) {
                aiLog(`[getPokemonMoves] ✅ 技能ID有效: ${moveId} -> ${move.id}`);
                return move.id; // 确保是ID格式
              }
              // 如果不是有效ID，尝试转换为ID格式
              const cleaned = moveId.toLowerCase().replace(/\s+/g, '').replace(/['"]/g, '');
              aiLog(`[getPokemonMoves] ⚠️ 技能ID无效，清理后: ${moveId} -> ${cleaned}`);
              return cleaned;
            } catch (e) {
              // 如果获取失败，返回清理后的ID
              const cleaned = moveId.toLowerCase().replace(/\s+/g, '').replace(/['"]/g, '');
              console.warn(`[getPokemonMoves] 验证技能ID时出错: ${moveId}, 错误: ${e.message}, 使用清理后的: ${cleaned}`);
              return cleaned;
            }
          })
          .filter(id => {
            if (!id || id === 'struggle') {
              aiLog(`[getPokemonMoves] 最终过滤掉: ${id}`);
              return false;
            }
            return true;
          }); // 最终过滤
        
        aiLog(`[getPokemonMoves] 验证后的moveIds:`, moveIds);
        aiLog(`[getPokemonMoves] moveIds长度:`, moveIds.length);
        
        if (moveIds.length >= 4) {
          const sanitizedMoves = enforceMovePowerThreshold(moveIds, dex, minPowerThreshold);
          if (minPowerThreshold !== null) {
            if (sanitizedMoves.length >= 4) {
              const moveNames = sanitizedMoves.slice(0, 4).map(id => {
                const m = dex.moves.get(id);
                return m ? m.name : id;
              });
              aiLog(`[battle-server] ✅ 难度限制：${species.name} 使用经过威力筛选的技能 (ID):`, sanitizedMoves.slice(0, 4));
              aiLog(`[battle-server] ✅ ${species.name} 技能 (名称):`, moveNames);
              return sanitizedMoves.slice(0, 4);
            } else if (sanitizedMoves.length > 0) {
              console.warn(`[battle-server] ⚠️ ${species.name} RandomTeams 技能中符合威力要求的数量不足 ${sanitizedMoves.length}/4，尝试降级策略`);
            } else {
              console.warn(`[battle-server] ⚠️ ${species.name} RandomTeams 技能全部低于威力阈值 ${minPowerThreshold}，尝试降级策略`);
            }
          } else {
            const finalMoves = moveIds.slice(0, 4);
            const moveNames = finalMoves.map(id => {
              const m = dex.moves.get(id);
              return m ? m.name : id;
            });
            aiLog(`[battle-server] ✅ 使用RandomTeams生成 ${species.name} 的技能 (ID):`, finalMoves);
            aiLog(`[battle-server] ✅ ${species.name} 的技能 (名称):`, moveNames);
            return finalMoves;
          }
        } else if (moveIds.length > 0) {
          console.warn(`[battle-server] ⚠️ ${species.name} 从RandomTeams获得的技能只有 ${moveIds.length} 个`);
          if (minPowerThreshold === null) {
            const moveNames = moveIds.map(id => {
              const m = dex.moves.get(id);
              return m ? m.name : id;
            });
            aiLog(`[battle-server] ⚠️ ${species.name} 返回部分技能 (${moveIds.length}个):`, moveIds);
            aiLog(`[battle-server] ⚠️ ${species.name} 技能名称:`, moveNames);
            while (moveIds.length < 4 && moveIds.length > 0) {
              moveIds.push(moveIds[moveIds.length - 1]);
            }
            return moveIds.slice(0, 4);
          }
          // 难度限制下技能不足时进入降级逻辑
        } else {
          console.warn(`[battle-server] ⚠️ ${species.name} 从RandomTeams获得的技能为空，使用降级策略`);
          // 继续到降级逻辑
        }
      } else {
        console.warn(`[battle-server] ⚠️ ${species.name} 的RandomSet没有有效技能，使用降级策略`);
      }
    } catch (e) {
      console.error(`[getPokemonMoves] ❌ 使用RandomTeams生成 ${species.name} 技能时出错:`, e.message);
      console.error(`[getPokemonMoves] 错误堆栈:`, e.stack);
      // 继续到降级逻辑
    }
  } else {
    console.warn(`[getPokemonMoves] ⚠️ RandomTeams实例不存在（为null或undefined）`);
  }

  // 降级策略：使用原有的逻辑
  aiLog(`[getPokemonMoves] ⚠️ 进入降级策略，RandomTeams未使用或失败`);
  aiLog(`[getPokemonMoves] species.id: ${species.id}, species.name: ${species.name}`);
  aiLog(`[getPokemonMoves] 尝试获取预设套装: ${species.id}`);
  try {
    // 首先尝试获取预设套装（这通常包含合理的技能配置）
    const set = dex.sets.get(species.id);
    aiLog(`[getPokemonMoves] dex.sets.get(${species.id}) 返回值:`, set ? '存在' : '不存在');
    if (set) {
      aiLog(`[getPokemonMoves] set对象:`, Object.keys(set));
      aiLog(`[getPokemonMoves] set.randomSet:`, set.randomSet ? '存在' : '不存在');
      aiLog(`[getPokemonMoves] set.defaultMoves:`, set.defaultMoves ? `存在(${set.defaultMoves.length}个)` : '不存在');
      aiLog(`[getPokemonMoves] set.sets:`, set.sets ? Object.keys(set.sets).length + '个套装' : '不存在');
      
      // 优先使用随机套装
      if (set.randomSet && set.randomSet.moves && set.randomSet.moves.length > 0) {
        aiLog(`[getPokemonMoves] ✅ 找到randomSet，技能数: ${set.randomSet.moves.length}`);
        const moves = set.randomSet.moves.slice(0, 4);
        // 转换为ID格式
        const moveIds = moves.map(moveName => {
          const move = dex.moves.get(moveName);
          return move ? move.id : moveName.toLowerCase().replace(/\s+/g, '');
        });
        aiLog(`[battle-server] 使用 ${species.name} 的随机套装技能:`, moveIds);
        return moveIds;
      }
      
      // 其次尝试默认套装
      if (set.defaultMoves && set.defaultMoves.length > 0) {
        const moves = set.defaultMoves.slice(0, 4);
        // 转换为ID格式
        const moveIds = moves.map(moveName => {
          const move = dex.moves.get(moveName);
          return move ? move.id : moveName.toLowerCase().replace(/\s+/g, '');
        });
        aiLog(`[battle-server] 使用 ${species.name} 的默认技能:`, moveIds);
        return moveIds;
      }
      
      // 尝试从其他套装获取（优先选择包含高威力技能的套装）
      if (set.sets && Object.keys(set.sets).length > 0) {
        // 评估所有套装，选择最佳的一个
        let bestSet = null;
        let bestSetScore = -1;
        let bestSetKey = null;
        
        for (const setKey in set.sets) {
          const currentSet = set.sets[setKey];
          if (currentSet && currentSet.moves && currentSet.moves.length > 0) {
            // 计算套装的评分（基于技能的平均威力）
            let setScore = 0;
            let moveCount = 0;
            for (const moveName of currentSet.moves) {
              try {
                const move = dex.moves.get(moveName);
                if (move && move.exists) {
                  if (move.basePower && move.basePower > 0) {
                    setScore += move.basePower;
                    moveCount++;
                  }
                }
              } catch {
                // 忽略无效技能
              }
            }
            const avgScore = moveCount > 0 ? setScore / moveCount : 0;
            
            // 选择平均威力最高的套装
            if (avgScore > bestSetScore) {
              bestSetScore = avgScore;
              bestSet = currentSet;
              bestSetKey = setKey;
            }
          }
        }
        
        if (bestSet && bestSet.moves && bestSet.moves.length > 0) {
          const moves = bestSet.moves.slice(0, 4);
          // 转换为ID格式
          const moveIds = moves.map(moveName => {
            const move = dex.moves.get(moveName);
            return move ? move.id : moveName.toLowerCase().replace(/\s+/g, '');
          });
          aiLog(`[battle-server] 使用 ${species.name} 的最佳套装技能 (${bestSetKey}, 平均威力:${bestSetScore.toFixed(0)}):`, moveIds);
          return moveIds;
        }
      }
    }

    // 如果没有预设套装，从学习池中获取
    const learnset = dex.species.getLearnset(species.id);
    if (!learnset || !learnset.learnset) {
      console.warn(`[battle-server] ${species.name} 没有学习池数据`);
      return [];
    }

    // 收集所有可学习的技能
    const allMoves = [];
    const learnsetData = learnset.learnset;
    
    // 需要排除的低级技能（大幅扩展黑名单）
    const excludedMoves = [
      'tackle', 'scratch', 'pound', 'quickattack', 'growl', 'tailwhip', 'leer', 
      'stringshot', 'hardening', 'defensecurl', 'sandattack', 'smokescreen',
      'kinesis', 'focusenergy', 'harden', 'minimize', 'withdraw', 'doubleteam',
      'harden', 'meditate', 'agility', 'teleport', 'mimic', 'screech', 'doubleteam',
      'recover', 'harden', 'light screen', 'reflect', 'focus energy', 'bide',
      'metronome', 'mirror move', 'selfdestruct', 'egg bomb', 'lick', 'smog',
      'sludge', 'bone club', 'fire blast', 'waterfall', 'clamp', 'swift',
      'skull bash', 'spike cannon', 'constrict', 'amnesia', 'kinesis', 'softboiled',
      'high jump kick', 'glare', 'dream eater', 'poison gas', 'barrage', 'leech life',
      'lovely kiss', 'sky attack', 'transform', 'bubble', 'dizzy punch', 'spore',
      'flash', 'psywave', 'splash', 'acid armor', 'crabhammer', 'explosion',
      'fury swipes', 'bonemerang', 'rest', 'rock slide', 'hyper fang', 'sharpen',
      'conversion', 'tri attack', 'super fang', 'slash', 'substitute', 'struggle',
      'sketch', 'triple kick', 'thief', 'spider web', 'mind reader', 'nightmare',
      'flame wheel', 'snore', 'curse', 'flail', 'conversion 2', 'aeroblast',
      'cotton spore', 'reversal', 'spite', 'powder snow', 'protect', 'mach punch',
      'scary face', 'feint attack', 'sweet kiss', 'belly drum', 'sludge bomb',
      'mud-slap', 'octazooka', 'spikes', 'zap cannon', 'foresight', 'destiny bond',
      'perish song', 'icy wind', 'detect', 'bone rush', 'lock-on', 'outrage',
      'sandstorm', 'giga drain', 'endure', 'charm', 'rollout', 'false swipe',
      'swagger', 'milk drink', 'spark', 'fury cutter', 'steel wing', 'mean look',
      'attract', 'sleep talk', 'heal bell', 'return', 'present', 'frustration',
      'safeguard', 'pain split', 'sacred fire', 'magnitude', 'dynamic punch',
      'megahorn', 'dragon breath', 'baton pass', 'encore', 'pursuit', 'rapid spin',
      'sweet scent', 'iron tail', 'metal claw', 'vital throw', 'morning sun',
      'synthesis', 'moonlight', 'hidden power', 'cross chop', 'twister', 'rain dance',
      'sunny day', 'crunch', 'mirror coat', 'psych up', 'extreme speed', 'ancient power',
      'shadow ball', 'future sight', 'rock smash', 'whirlpool', 'beat up'
    ];
    
    // 最低威力要求（非状态技能必须>=50威力）
  const MIN_POWER_THRESHOLD = (typeof minPowerThreshold === 'number' ? minPowerThreshold : 50);
    
    for (const moveId in learnsetData) {
      const methods = learnsetData[moveId];
      // 只选择可以学习的技能（排除某些特殊方法）
      if (methods && Array.isArray(methods) && methods.length > 0) {
        const move = dex.moves.get(moveId);
        if (move && move.exists && move.id !== 'struggle') {
          // 排除低级技能（黑名单）
          if (excludedMoves.includes(move.id.toLowerCase()) || excludedMoves.includes(move.name.toLowerCase())) {
            continue;
          }
          
          // 强制过滤：非状态技能必须达到最低威力要求
          if (move.category !== 'Status') {
            const power = move.basePower || 0;
            if (power < MIN_POWER_THRESHOLD) {
              continue; // 跳过威力过低的技能
            }
          }
          
          // 排除一些明显无用的状态技能
          if (move.category === 'Status') {
            // 排除纯辅助但无实际价值的状态技能
            const uselessStatus = ['splash', 'teleport', 'transform', 'mimic', 'sketch'];
            if (uselessStatus.includes(move.id.toLowerCase())) {
              continue;
            }
          }
          
          // 使用ID而不是name（Pokemon Showdown更偏好ID格式）
          allMoves.push({ id: move.id, name: move.name, move: move });
        }
      }
    }

    // 如果没有找到技能，尝试使用默认技能
    if (allMoves.length === 0) {
      console.warn(`[battle-server] ${species.name} 没有找到可学习技能，尝试使用备用方案`);
      // 尝试使用基础攻击技能作为备用
      const basicMoves = ['tackle', 'scratch', 'pound', 'quickattack'];
      const availableBasic = basicMoves.filter(moveId => {
        try {
          const move = dex.moves.get(moveId);
          return move && move.exists;
        } catch {
          return false;
        }
      });
      if (availableBasic.length > 0) {
        aiLog(`[battle-server] 使用基础备用技能:`, availableBasic.slice(0, 4));
        return availableBasic.slice(0, 4);
      }
      return [];
    }
    
    aiLog(`[battle-server] ${species.name} 找到 ${allMoves.length} 个可学习技能`);

    // 优先选择高威力的技能和常用技能
    const scoredMoves = allMoves.map(moveData => {
      const move = moveData.move;
      let score = 0;
      
      if (move) {
        // 威力评分（权重最高）
        if (move.basePower && move.basePower > 0) {
          score += move.basePower * 2; // 提高威力权重
        } else if (move.basePower === 0) {
          // 状态技能给较低分数
          score += 10;
        }
        
        // 优先选择非状态技能
        if (move.category === 'Physical' || move.category === 'Special') {
          score += 80; // 提高攻击类技能权重
        } else {
          // 状态技能也可以，但分数较低
          score += 20;
        }
        
        // 命中率评分
        if (move.accuracy === true) {
          score += 30; // 必定命中
        } else if (move.accuracy && move.accuracy >= 90) {
          score += 20;
        } else if (move.accuracy && move.accuracy < 70) {
          score -= 20; // 低命中率惩罚
        }
        
        // 优先选择常用技能（检查是否在defaultMoves中）
        const set = dex.sets.get(species.id);
        if (set && set.defaultMoves) {
          // 检查ID和name是否匹配
          if (set.defaultMoves.includes(move.name) || set.defaultMoves.includes(move.id)) {
            score += 150; // 大幅提高常用技能权重
          }
        }
        
        // 大幅惩罚低威力技能
          if (move.basePower) {
            if (move.basePower < MIN_POWER_THRESHOLD && move.category !== 'Status') {
            score -= 100; // 严厉惩罚低威力攻击技能
          } else if (move.basePower >= 80) {
            score += 50; // 奖励高威力技能
          } else if (move.basePower >= 100) {
            score += 100; // 大幅奖励超高威力技能
          }
        }
        
        // 排除明显的低级技能（即使通过了前面的过滤）
        const lowLevelMoves = ['quickattack', 'pound', 'tackle', 'scratch', 'growl', 'leer', 'tailwhip'];
        if (lowLevelMoves.includes(move.id.toLowerCase()) || lowLevelMoves.includes(move.name.toLowerCase())) {
          score -= 200; // 大幅惩罚，确保不会被选中
        }
      }
      
      return { id: moveData.id, name: moveData.name, score: score };
    });

    // 按评分排序（确保高分技能在前）
    scoredMoves.sort((a, b) => b.score - a.score);
    
    // 调试：输出前10个高分技能
    if (scoredMoves.length > 0) {
      const top10 = scoredMoves.slice(0, 10);
      aiLog(`[battle-server] ${species.name} 前10个高分技能:`,
        top10.map(m => `${m.name}(${m.id}) - 评分:${m.score.toFixed(0)}`).join(', '));
    }

    // 过滤掉评分过低的技能（评分<0的技能通常不适合使用）
    const highScoreMoves = scoredMoves.filter(m => m.score > 0);
    
    // 如果高分技能不足4个，降低阈值
    const validScoredMoves = highScoreMoves.length >= 4 ? highScoreMoves : scoredMoves;
    
    // 选择前4个高分技能（使用ID格式，Pokemon Showdown兼容性更好）
    const selectedMoves = validScoredMoves.slice(0, 4).map(m => m.id);
    
    // 确保至少有4个技能（如果不足，从高分技能中补充）
    while (selectedMoves.length < 4 && scoredMoves.length > selectedMoves.length) {
      selectedMoves.push(scoredMoves[selectedMoves.length].id);
    }
    
    // 如果还是不够，从allMoves中补充
    if (selectedMoves.length < 4) {
      for (let i = 0; selectedMoves.length < 4 && i < allMoves.length; i++) {
        if (!selectedMoves.includes(allMoves[i].id)) {
          selectedMoves.push(allMoves[i].id);
        }
      }
    }

    const finalMoves = enforceMovePowerThreshold(selectedMoves.slice(0, 4), dex, minPowerThreshold);
    
    // 验证所有技能ID是否有效
    const validMoves = finalMoves.filter(moveId => {
      try {
        const move = dex.moves.get(moveId);
        return move && move.exists;
      } catch {
        return false;
      }
    });
    
    // 如果有效技能不足，尝试从学习池中获取更多高质量技能
    if (validMoves.length < 4) {
      console.warn(`[battle-server] ${species.name} 有效技能不足 ${validMoves.length}/4，尝试补充高质量技能`);
      
      // 从已评分但未选中的技能中补充（优先选择高分技能）
      const remainingHighScoreMoves = scoredMoves
        .filter(m => !validMoves.includes(m.id) && m.score > 50) // 只选择评分>50的技能
        .slice(0, 4 - validMoves.length)
        .map(m => m.id);
      
      for (const moveId of remainingHighScoreMoves) {
        if (validMoves.length >= 4) break;
        try {
          const move = dex.moves.get(moveId);
          if (move && move.exists && !validMoves.includes(moveId)) {
            validMoves.push(moveId);
            aiLog(`[battle-server] 补充高质量技能: ${move.name} (${moveId})`);
          }
        } catch {
          // 忽略
        }
      }
      
      // 如果还是不足，从所有已评分的技能中补充（降低标准）
      if (validMoves.length < 4) {
        const remainingMoves = scoredMoves
          .filter(m => !validMoves.includes(m.id) && m.score > 0) // 只选择评分>0的技能
          .slice(0, 4 - validMoves.length)
          .map(m => m.id);
        
        for (const moveId of remainingMoves) {
          if (validMoves.length >= 4) break;
          try {
            const move = dex.moves.get(moveId);
            if (move && move.exists && !validMoves.includes(moveId)) {
              validMoves.push(moveId);
              aiLog(`[battle-server] 补充中等质量技能: ${move.name} (${moveId})`);
            }
          } catch {
            // 忽略
          }
        }
      }
      
      // 最后的后备：如果仍然不足，使用一些常见但不算太差的技能
      if (validMoves.length < 4) {
        const fallbackMoves = ['return', 'frustration', 'hiddenpower', 'toxic', 'substitute', 'rest', 'sleeptalk'];
        for (const moveId of fallbackMoves) {
          if (validMoves.length >= 4) break;
          if (!validMoves.includes(moveId)) {
            try {
              const move = dex.moves.get(moveId);
              if (move && move.exists) {
                // 检查这个技能是否在learnset中
                const learnset = dex.species.getLearnset(species.id);
                if (learnset && learnset.learnset && learnset.learnset[moveId]) {
                  validMoves.push(moveId);
                  aiLog(`[battle-server] 使用后备技能: ${move.name} (${moveId})`);
                }
              }
            } catch {
              // 忽略
            }
          }
        }
      }
      
      // 如果仍然不足，记录警告但不使用低级技能
      if (validMoves.length < 4) {
        console.error(`[battle-server] ⚠️ ${species.name} 无法找到足够的有效技能 (${validMoves.length}/4)`);
        // 不添加tackle、protect等低级技能，而是重复已有技能
        while (validMoves.length < 4 && validMoves.length > 0) {
          validMoves.push(validMoves[validMoves.length - 1]);
        }
      }
    }
    
    const moveNames = validMoves.map(id => {
      const m = dex.moves.get(id);
      return m ? m.name : id;
    });
    aiLog(`[battle-server] ${species.name} 最终选择的技能 (ID):`, validMoves);
    aiLog(`[battle-server] ${species.name} 最终选择的技能 (名称):`, moveNames);
    
    // 确保至少返回4个技能
    if (validMoves.length === 0) {
      console.error(`[battle-server] ⚠️ 严重错误：${species.name} 没有任何可用技能！`);
      return ['struggle']; // 最后的后备
    }
    
    // 返回ID格式（Pokemon Showdown推荐），确保至少4个
    while (validMoves.length < 4 && validMoves.length > 0) {
      validMoves.push(validMoves[validMoves.length - 1]); // 重复最后一个
    }
    
    const sanitizedValidMoves = enforceMovePowerThreshold(validMoves, dex, minPowerThreshold);
    if (sanitizedValidMoves.length === 0) {
      console.error(`[battle-server] ⚠️ 严重错误：${species.name} 在威力阈值 ${minPowerThreshold ?? '默认'} 下没有任何可用技能！`);
      return ['struggle'];
    }
    while (sanitizedValidMoves.length < 4 && sanitizedValidMoves.length > 0) {
      sanitizedValidMoves.push(sanitizedValidMoves[sanitizedValidMoves.length - 1]);
    }
    return sanitizedValidMoves.slice(0, 4);
  } catch (e) {
    console.warn(`[battle-server] 获取 ${species.name} 的技能失败:`, e);
    console.warn(`[battle-server] 错误堆栈:`, e.stack);
    // 如果获取失败，尝试使用默认套装作为最后备选
    try {
      const set = dex.sets.get(species.id);
      if (set && set.randomSet && set.randomSet.moves && set.randomSet.moves.length > 0) {
        const moves = set.randomSet.moves.slice(0, 4);
        const moveIds = moves.map(moveName => {
          const move = dex.moves.get(moveName);
          return move ? move.id : moveName.toLowerCase().replace(/\s+/g, '');
        });
        aiLog(`[battle-server] 使用备选：随机套装技能:`, moveIds);
        return moveIds;
      }
      if (set && set.defaultMoves && set.defaultMoves.length > 0) {
        const moves = set.defaultMoves.slice(0, 4);
        const moveIds = moves.map(moveName => {
          const move = dex.moves.get(moveName);
          return move ? move.id : moveName.toLowerCase().replace(/\s+/g, '');
        });
        aiLog(`[battle-server] 使用备选：默认技能:`, moveIds);
        return moveIds;
      }
    } catch (e2) {
      console.warn(`[battle-server] 获取默认技能也失败:`, e2);
    }
    console.warn(`[battle-server] ${species.name} 无法获取技能，使用最后的备用方案`);
    // 最后的备用：使用基础技能
    try {
      const basicMoves = ['tackle', 'scratch', 'pound', 'quickattack'];
      const availableBasic = [];
      for (const moveId of basicMoves) {
        const move = dex.moves.get(moveId);
        if (move && move.exists) {
          availableBasic.push(moveId);
        }
      }
      if (availableBasic.length > 0) {
        aiLog(`[battle-server] 使用最后备用技能:`, availableBasic);
        return availableBasic.slice(0, 4);
      }
    } catch (e3) {
      console.error(`[battle-server] 获取备用技能也失败:`, e3);
    }
    // 如果所有方法都失败，返回struggle（但应该不会到这一步）
    console.error(`[battle-server] ⚠️ 严重错误：${species.name} 完全无法获取技能！`);
    return ['struggle'];
  }
}

// 打包队伍或使用默认
function packTeamOrDefault(team) {
  const Teams = showdownAdapter.getTeams();
  if (!team || !Array.isArray(team) || team.length === 0) {
    return Teams.pack([{
      name: 'Pikachu',
      species: 'Pikachu',
      item: 'Light Ball',
      ability: 'Static',
      moves: ['Thunderbolt', 'Quick Attack', 'Iron Tail', 'Volt Tackle'],
      nature: 'Timid',
      evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      level: 50
    }]);
  }

  try {
    return Teams.pack(team);
  } catch (e) {
    console.error('[battle-server] 打包队伍失败，使用默认队伍:', e);
    return packTeamOrDefault(null);
  }
}

// 存储对战管理器
const battles = new Map(); // connectionId -> BattleManager

// 房间管理器
const RoomManager = require('./domain/rooms/RoomManager');
const roomManager = new RoomManager();
const PvPHandler = require('./core/PvPHandler');
const pvpHandler = new PvPHandler(roomManager, battles);

/**
 * 处理 create-room 消息
 */
function handleCreateRoom(ws) {
  console.log('[battle-server] ========== 处理 create-room 消息 ==========');
  
  const room = roomManager.createRoom(ws);
  if (room) {
    // 添加创建者为 p1
    room.addPlayer('p1', ws);
    
    // 发送房间创建成功消息（包含side信息）
    ws.send(JSON.stringify({
      type: 'room-created',
      payload: {
        roomId: room.roomId,
        side: 'p1' // 告诉客户端你是p1
      }
    }));
    
    // 发送房间状态更新
    ws.send(JSON.stringify({
      type: 'room-update',
      payload: room.getStatus()
    }));
    
    console.log(`[battle-server] ✅ 房间创建成功: ${room.roomId}, 创建者是p1`);
  } else {
    ws.send(JSON.stringify({
      type: 'error',
      payload: { message: '创建房间失败' }
    }));
  }
}

/**
 * 处理 join-room 消息
 */
function handleJoinRoom(ws, payload) {
  console.log('[battle-server] ========== 处理 join-room 消息 ==========');
  console.log('[battle-server] payload:', payload);
  
  if (!payload || !payload.roomId) {
    ws.send(JSON.stringify({
      type: 'error',
      payload: { message: '缺少房间ID' }
    }));
    return;
  }
  
  const room = roomManager.joinRoom(payload.roomId, ws);
  if (room) {
    // 确定新加入玩家的side
    const side = ws._side || (room.players.p1 === ws ? 'p1' : 'p2');
    
    // 发送加入成功消息（包含side信息）
    ws.send(JSON.stringify({
      type: 'room-joined',
      payload: {
        roomId: payload.roomId,
        side: side
      }
    }));
    
    // 发送房间状态更新给两个玩家
    room.broadcast({
      type: 'room-update',
      payload: room.getStatus()
    });
    
    console.log(`[battle-server] ✅ 玩家加入房间成功: ${payload.roomId}, side: ${side}`);
  } else {
    ws.send(JSON.stringify({
      type: 'error',
      payload: { message: '加入房间失败：房间不存在或已满' }
    }));
  }
}

/**
 * 处理 AI 对战 start 消息
 */
async function handleAIStart(ws, payload) {
  console.log('[battle-server] ========== 处理 AI 对战 start 消息 ==========');
  console.log('[battle-server] payload:', JSON.stringify(payload).substring(0, 500));

  try {
    ws._mode = 'ai';
    ws._side = 'p1'; // AI模式，玩家总是p1

    // 准备队伍
    const formatid = payload.formatid || 'gen9ou';
    const seed = payload.seed;
    
    console.log('[battle-server] 准备队伍，formatid:', formatid);
    
    // 解包或准备队伍对象
    let p1TeamObj;
    if (payload.team && Array.isArray(payload.team)) {
      p1TeamObj = payload.team; // 已经是对象数组
      console.log('[battle-server] 使用提供的队伍对象数组，长度:', p1TeamObj.length);
    } else {
      // 从打包的字符串解包，或使用默认队伍
      console.log('[battle-server] 队伍不是对象数组，尝试解包或使用默认');
      const Teams = showdownAdapter.getTeams();
      const packedTeam = packTeamOrDefault(payload.team);
      p1TeamObj = Teams.unpack(packedTeam);
      console.log('[battle-server] 解包后的队伍长度:', p1TeamObj.length);
    }
    
    // 生成AI队伍
    const difficulty = payload.difficulty || 2;
    console.log(`[battle-server] 生成AI队伍，难度: ${difficulty}`);
    const p2TeamObj = generateRandomAITeam(formatid, 6, difficulty);
      console.log('[battle-server] AI队伍生成完成，长度:', p2TeamObj.length);
    
    // 验证队伍数据
    p2TeamObj.forEach((p, index) => {
      if (!p.moves || p.moves.length === 0) {
        console.error(`[battle-server] ⚠️ 错误：队伍中第 ${index + 1} 只宝可梦 ${p.name} 没有技能！`);
    } else {
        console.log(`[battle-server] ✓ 队伍中第 ${index + 1} 只宝可梦 ${p.name} 有 ${p.moves.length} 个技能:`, p.moves);
    }
    });

    console.log(`[battle-server] 对战模式: ai, 难度: ${difficulty}`);

    // 创建对战管理器
    console.log('[battle-server] 创建 BattleManager');
    const battleManager = new BattleManager('ai', { formatid, seed, difficulty });
    console.log('[battle-server] BattleManager 创建完成');

    // 初始化对战
    console.log('[battle-server] 初始化对战');
    await battleManager.initialize(p1TeamObj, p2TeamObj, formatid, seed);
    console.log('[battle-server] 对战初始化完成');

    // 添加连接
    console.log('[battle-server] 添加连接');
    battleManager.addConnection(ws._side, ws);
    console.log('[battle-server] 连接添加完成');

    // 保存对战管理器
    ws._battleManager = battleManager;
    battles.set(ws._connectionId, battleManager);

    console.log('[battle-server] ✅ AI对战已创建并初始化');
    
    // 协议监控器已自动启动，会在后台持续监控
    // 可以手动调用生成报告
    console.log('[battle-server] 协议监控器已自动启动，将每5秒输出摘要');
  } catch (error) {
    console.error('[battle-server] ❌ handleAIStart 错误:', error);
    console.error('[battle-server] 错误堆栈:', error.stack);
    throw error;
  }
}

/**
 * 处理 start 消息（路由到AI或PvP处理器）
 */
async function handleStart(ws, payload) {
  const mode = payload.mode || 'ai'; // 默认AI对战
  
  if (mode === 'pvp') {
    // PvP模式：使用PvPHandler
    return await pvpHandler.handleStart(ws, payload);
  } else {
    // AI模式：使用AI处理器
    return await handleAIStart(ws, payload);
  }
}

/**
 * 处理 choose 消息
 */
function handleChoose(ws, msg) {
  console.log('[battle-server] ========== 处理 choose 消息 ==========');
  console.log('[battle-server] 选择:', msg.command);

  // 对于 PvP 模式，SimplePvPManager 已经在 addConnection 时设置了消息监听
  // 所以这里只需要转发消息即可
  if (ws._battleManager && typeof ws._battleManager.handlePlayerChoice === 'function') {
    const side = ws._side || 'p1';
    const choice = msg.command;
    const success = ws._battleManager.handlePlayerChoice(side, choice);
    
    if (success) {
      console.log(`[battle-server] ✅ ${side} 的选择已处理`);
    } else {
      console.error(`[battle-server] ❌ ${side} 的选择处理失败`);
    }
  } else {
    console.warn('[battle-server] ⚠️ 对战管理器不存在或没有 handlePlayerChoice 方法');
    console.warn('[battle-server] ⚠️ 这可能是正常的（如果使用 SimplePvPManager，消息已在 addConnection 时处理）');
  }
}

const connectionHandler = createConnectionController({
  roomManager,
  aiController: createAIBattleController({
    handleAIStart,
  }),
  pvpController: createPvPController({
    handleCreateRoom,
    handleJoinRoom,
    handlePvPStart: (ws, payload) => pvpHandler.handleStart(ws, payload),
    handleDisconnect: typeof pvpHandler.handleDisconnect === 'function'
      ? (ws, meta) => pvpHandler.handleDisconnect(ws, meta)
      : undefined,
  }),
  battles,
  handleChoose,
});

function collectBattleStats() {
  const stats = {
    totalBattles: battles.size,
    aiBattles: 0,
    pvpBattles: 0,
  };
  for (const battleManager of battles.values()) {
    if (!battleManager) continue;
    if (battleManager.mode === 'pvp') {
      stats.pvpBattles += 1;
    } else {
      stats.aiBattles += 1;
    }
  }
  return stats;
}

function collectResourceStats() {
  return {
    sprites: spriteStats,
    chineseDexEntries: CHINESE_DATA ? Object.keys(CHINESE_DATA).length : 0,
  };
}

const { server } = bootstrap(connectionHandler, {
  showdownAdapter,
  getRoomStats: () => roomManager.getStats(),
  getBattleStats: collectBattleStats,
  getResourceStats: collectResourceStats,
});

server.on('listening', () => {
  console.log(`[battle-server] 服务器运行在 ws://localhost:${PORT}/battle`);
  prewarmAITeamGeneration();
});

function prewarmAITeamGeneration() {
  if (process.env.SKIP_AI_PREWARM === '1') {
    console.log('[battle-server] 跳过 AI 队伍生成预热（SKIP_AI_PREWARM=1）');
    return;
  }
  setTimeout(() => {
    try {
      generateRandomAITeam('gen9randombattle', 6, 3);
      console.log('[battle-server] AI 队伍生成预热完成');
    } catch (error) {
      console.warn('[battle-server] AI 队伍生成预热失败:', error.message);
    }
  }, 0);
}

