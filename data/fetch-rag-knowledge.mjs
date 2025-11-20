/**
 * RAG知识库数据获取脚本
 * 优先使用官方API，爬虫作为备选方案
 * 
 * 支持的数据源：
 * 1. PokeAPI (API优先)
 * 2. Pokemon Showdown Data (本地数据文件)
 * 3. Smogon University (爬虫备选)
 * 4. Bulbapedia (爬虫备选)
 * 5. 神奇宝贝百科 (爬虫备选)
 * 6. Pikalytics (爬虫备选)
 */

import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 尝试加载cheerio（可选）
let cheerio = null;
async function loadCheerio() {
  if (cheerio !== null) return cheerio; // 已加载
  
  try {
    const cheerioModule = await import('cheerio');
    cheerio = cheerioModule.default || cheerioModule;
    console.log('[Info] 已加载cheerio，支持HTML解析');
    return cheerio;
  } catch (e) {
    console.log('[Info] cheerio未安装，将保存原始HTML（可运行 npm install cheerio 安装）');
    return null;
  }
}

// 配置
const CONFIG = {
  // 输出目录
  outputDir: path.resolve(__dirname, '../RAG/data/raw'),
  // 延迟时间（避免请求过快）
  delay: 1000, // 1秒
  // 重试次数
  maxRetries: 3,
  // 超时时间（毫秒）
  timeout: 30000, // 30秒
};

// 用户代理
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 常用宝可梦列表（用于批量获取）
const COMMON_POKEMON = [
  'pikachu', 'charizard', 'blastoise', 'venusaur',
  'lucario', 'garchomp', 'gengar', 'dragonite',
  'tyranitar', 'metagross', 'salamence', 'garchomp',
  'machamp', 'alakazam', 'gyarados', 'snorlax',
  'blissey', 'ferrothorn', 'heatran', 'landorus',
  'rotom', 'togekiss', 'scizor', 'excadrill',
  'clefable', 'toxapex', 'corviknight', 'dragapult',
  'urshifu', 'zacian', 'zamazenta', 'eternatus',
];

/**
 * 工具函数：延迟
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 工具函数：带重试的HTTP请求
 */
async function fetchWithRetry(url, options = {}, retries = CONFIG.maxRetries) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (retries > 0 && error.name !== 'AbortError') {
      console.warn(`请求失败，${retries}次重试剩余: ${url}`);
      await sleep(CONFIG.delay * 2);
      return fetchWithRetry(url, options, retries - 1);
    }
    
    throw error;
  }
}

/**
 * 保存数据到文件
 */
async function saveData(filename, data, metadata = {}) {
  const outputPath = path.join(CONFIG.outputDir, filename);
  await fs.ensureDir(path.dirname(outputPath));
  
  const content = {
    metadata: {
      source: metadata.source || 'unknown',
      type: metadata.type || 'data',
      fetchedAt: new Date().toISOString(),
      ...metadata,
    },
    data: data,
  };
  
  await fs.writeJSON(outputPath, content, { spaces: 2 });
  console.log(`✅ 已保存: ${filename}`);
}

/**
 * ==================== PokeAPI 数据获取 ====================
 */

/**
 * 从PokeAPI获取宝可梦数据
 */
async function fetchPokemonFromPokeAPI(pokemonNameOrId) {
  try {
    const url = `https://pokeapi.co/api/v2/pokemon/${pokemonNameOrId.toLowerCase()}/`;
    console.log(`[PokeAPI] 获取宝可梦: ${pokemonNameOrId}`);
    
    const response = await fetchWithRetry(url);
    const data = await response.json();
    
    // 提取关键信息
    const pokemonData = {
      id: data.id,
      name: data.name,
      types: data.types.map(t => t.type.name),
      stats: {
        hp: data.stats.find(s => s.stat.name === 'hp')?.base_stat || 0,
        attack: data.stats.find(s => s.stat.name === 'attack')?.base_stat || 0,
        defense: data.stats.find(s => s.stat.name === 'defense')?.base_stat || 0,
        specialAttack: data.stats.find(s => s.stat.name === 'special-attack')?.base_stat || 0,
        specialDefense: data.stats.find(s => s.stat.name === 'special-defense')?.base_stat || 0,
        speed: data.stats.find(s => s.stat.name === 'speed')?.base_stat || 0,
      },
      abilities: data.abilities.map(a => ({
        name: a.ability.name,
        isHidden: a.is_hidden,
      })),
      moves: data.moves.map(m => m.move.name),
      height: data.height,
      weight: data.weight,
      sprites: {
        front: data.sprites.front_default,
        back: data.sprites.back_default,
      },
    };
    
    await saveData(`pokeapi/pokemon/${pokemonNameOrId}.json`, pokemonData, {
      source: 'pokeapi',
      type: 'pokemon',
      pokemon: pokemonNameOrId,
    });
    
    await sleep(CONFIG.delay);
    return pokemonData;
  } catch (error) {
    console.error(`[PokeAPI] 获取宝可梦失败 ${pokemonNameOrId}:`, error.message);
    return null;
  }
}

/**
 * 从PokeAPI获取技能数据
 */
async function fetchMoveFromPokeAPI(moveName) {
  try {
    const url = `https://pokeapi.co/api/v2/move/${moveName.toLowerCase()}/`;
    console.log(`[PokeAPI] 获取技能: ${moveName}`);
    
    const response = await fetchWithRetry(url);
    const data = await response.json();
    
    const moveData = {
      id: data.id,
      name: data.name,
      accuracy: data.accuracy,
      power: data.power,
      pp: data.pp,
      priority: data.priority,
      type: data.type.name,
      damageClass: data.damage_class.name,
      effect: data.effect_entries.find(e => e.language.name === 'en')?.effect || '',
      shortEffect: data.effect_entries.find(e => e.language.name === 'en')?.short_effect || '',
    };
    
    await saveData(`pokeapi/moves/${moveName}.json`, moveData, {
      source: 'pokeapi',
      type: 'move',
      move: moveName,
    });
    
    await sleep(CONFIG.delay);
    return moveData;
  } catch (error) {
    console.error(`[PokeAPI] 获取技能失败 ${moveName}:`, error.message);
    return null;
  }
}

/**
 * 从PokeAPI获取特性数据
 */
async function fetchAbilityFromPokeAPI(abilityName) {
  try {
    const url = `https://pokeapi.co/api/v2/ability/${abilityName.toLowerCase()}/`;
    console.log(`[PokeAPI] 获取特性: ${abilityName}`);
    
    const response = await fetchWithRetry(url);
    const data = await response.json();
    
    const abilityData = {
      id: data.id,
      name: data.name,
      effect: data.effect_entries.find(e => e.language.name === 'en')?.effect || '',
      shortEffect: data.effect_entries.find(e => e.language.name === 'en')?.short_effect || '',
    };
    
    await saveData(`pokeapi/abilities/${abilityName}.json`, abilityData, {
      source: 'pokeapi',
      type: 'ability',
      ability: abilityName,
    });
    
    await sleep(CONFIG.delay);
    return abilityData;
  } catch (error) {
    console.error(`[PokeAPI] 获取特性失败 ${abilityName}:`, error.message);
    return null;
  }
}

/**
 * ==================== Pokemon Showdown 数据 ====================
 */

/**
 * 从本地Pokemon Showdown数据文件提取数据
 */
async function extractShowdownData() {
  try {
    const showdownDataDir = path.resolve(__dirname, '../../pokemon-showdown/data');
    
    // 检查目录是否存在
    if (!await fs.pathExists(showdownDataDir)) {
      console.warn(`[Showdown] 数据目录不存在: ${showdownDataDir}`);
      return;
    }
    
    console.log(`[Showdown] 从本地数据文件提取数据...`);
    
    // 读取pokedex数据
    const pokedexPath = path.join(showdownDataDir, 'pokedex.ts');
    if (await fs.pathExists(pokedexPath)) {
      const content = await fs.readFile(pokedexPath, 'utf-8');
      await saveData('showdown/pokedex.ts', content, {
        source: 'pokemon-showdown',
        type: 'pokedex',
      });
    }
    
    // 读取moves数据
    const movesPath = path.join(showdownDataDir, 'moves.ts');
    if (await fs.pathExists(movesPath)) {
      const content = await fs.readFile(movesPath, 'utf-8');
      await saveData('showdown/moves.ts', content, {
        source: 'pokemon-showdown',
        type: 'moves',
      });
    }
    
    // 读取abilities数据
    const abilitiesPath = path.join(showdownDataDir, 'abilities.ts');
    if (await fs.pathExists(abilitiesPath)) {
      const content = await fs.readFile(abilitiesPath, 'utf-8');
      await saveData('showdown/abilities.ts', content, {
        source: 'pokemon-showdown',
        type: 'abilities',
      });
    }
    
    // 读取items数据
    const itemsPath = path.join(showdownDataDir, 'items.ts');
    if (await fs.pathExists(itemsPath)) {
      const content = await fs.readFile(itemsPath, 'utf-8');
      await saveData('showdown/items.ts', content, {
        source: 'pokemon-showdown',
        type: 'items',
      });
    }
    
    console.log(`[Showdown] ✅ 数据提取完成`);
  } catch (error) {
    console.error(`[Showdown] 数据提取失败:`, error.message);
  }
}

/**
 * ==================== 爬虫备选方案 ====================
 */

/**
 * 从Smogon获取宝可梦分析（爬虫）
 */
async function fetchSmogonAnalysis(pokemonName, format = 'ss') {
  try {
    const url = `https://www.smogon.com/dex/${format}/pokemon/${pokemonName.toLowerCase()}/`;
    console.log(`[Smogon] 获取分析: ${pokemonName}`);
    
    const response = await fetchWithRetry(url);
    const html = await response.text();
    
    const analysisData = {
      pokemon: pokemonName,
      format: format,
      url: url,
      extractedAt: new Date().toISOString(),
    };
    
    // 如果cheerio可用，提取文本内容
    const $ = await loadCheerio();
    if ($) {
      try {
        const $html = $(html);
        
        // 提取主要内容区域
        const mainContent = $html.find('.PokemonPage, .main-content, article, .content').first();
        if (mainContent.length > 0) {
          // 提取文本内容
          analysisData.text = mainContent.text().trim();
          
          // 提取配置建议
          const sets = [];
          $html.find('.PokemonSets, .Set, .set').each((i, elem) => {
            const setText = $(elem).text().trim();
            if (setText) sets.push(setText);
          });
          if (sets.length > 0) {
            analysisData.sets = sets;
          }
          
          // 提取策略说明
          const strategy = $html.find('.Strategy, .strategy, .overview').first().text().trim();
          if (strategy) {
            analysisData.strategy = strategy;
          }
        } else {
          // 如果没有找到特定区域，提取body文本
          analysisData.text = $html('body').text().trim();
        }
        
        // 保存原始HTML（限制大小）
        analysisData.html = html.substring(0, 50000);
      } catch (parseError) {
        console.warn(`[Smogon] HTML解析失败，保存原始HTML: ${parseError.message}`);
        analysisData.html = html.substring(0, 100000);
      }
    } else {
      // 没有cheerio，只保存原始HTML
      analysisData.html = html.substring(0, 100000);
    }
    
    await saveData(`smogon/analyses/${pokemonName}-${format}.json`, analysisData, {
      source: 'smogon',
      type: 'pokemon_analysis',
      pokemon: pokemonName,
      format: format,
    });
    
    await sleep(CONFIG.delay * 2); // Smogon需要更长的延迟
    return analysisData;
  } catch (error) {
    console.error(`[Smogon] 获取分析失败 ${pokemonName}:`, error.message);
    return null;
  }
}

/**
 * 从神奇宝贝百科获取中文数据（爬虫）
 * 使用MediaWiki API
 */
async function fetch52PokeData(pageTitle) {
  try {
    const apiUrl = 'https://wiki.52poke.com/api.php';
    const params = new URLSearchParams({
      action: 'query',
      prop: 'revisions',
      rvprop: 'content',
      titles: pageTitle,
      format: 'json',
    });
    
    const url = `${apiUrl}?${params.toString()}`;
    console.log(`[52Poke] 获取数据: ${pageTitle}`);
    
    const response = await fetchWithRetry(url);
    const data = await response.json();
    
    const pages = data.query?.pages || {};
    const pageData = Object.values(pages)[0];
    
    if (!pageData || !pageData.revisions) {
      throw new Error('页面不存在或无法获取内容');
    }
    
    const content = pageData.revisions[0]['*'];
    
    const wikiData = {
      title: pageTitle,
      content: content,
      extractedAt: new Date().toISOString(),
    };
    
    await saveData(`52poke/wiki/${pageTitle.replace(/\//g, '_')}.json`, wikiData, {
      source: '52poke',
      type: 'wiki',
      page: pageTitle,
    });
    
    await sleep(CONFIG.delay);
    return wikiData;
  } catch (error) {
    console.error(`[52Poke] 获取数据失败 ${pageTitle}:`, error.message);
    return null;
  }
}

/**
 * ==================== 批量获取函数 ====================
 */

/**
 * 批量从PokeAPI获取宝可梦数据
 */
async function batchFetchPokemonFromPokeAPI(pokemonList) {
  console.log(`\n========== 开始批量获取宝可梦数据 (PokeAPI) ==========`);
  console.log(`数量: ${pokemonList.length}`);
  
  const results = [];
  for (let i = 0; i < pokemonList.length; i++) {
    const pokemon = pokemonList[i];
    console.log(`\n[${i + 1}/${pokemonList.length}] ${pokemon}`);
    
    const data = await fetchPokemonFromPokeAPI(pokemon);
    if (data) {
      results.push(data);
    }
  }
  
  console.log(`\n✅ 完成！成功获取 ${results.length}/${pokemonList.length} 只宝可梦数据`);
  return results;
}

/**
 * 批量从Smogon获取分析（如果PokeAPI失败）
 */
async function batchFetchSmogonAnalyses(pokemonList, format = 'ss') {
  console.log(`\n========== 开始批量获取Smogon分析 (备选方案) ==========`);
  console.log(`数量: ${pokemonList.length}`);
  
  const results = [];
  for (let i = 0; i < pokemonList.length; i++) {
    const pokemon = pokemonList[i];
    console.log(`\n[${i + 1}/${pokemonList.length}] ${pokemon}`);
    
    const data = await fetchSmogonAnalysis(pokemon, format);
    if (data) {
      results.push(data);
    }
  }
  
  console.log(`\n✅ 完成！成功获取 ${results.length}/${pokemonList.length} 个分析`);
  return results;
}

/**
 * ==================== 主函数 ====================
 */

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  console.log('========== RAG知识库数据获取脚本 ==========\n');
  
  // 确保输出目录存在
  await fs.ensureDir(CONFIG.outputDir);
  
  switch (command) {
    case 'pokeapi':
      // 从PokeAPI获取数据
      let pokemonList = args.slice(1);
      if (pokemonList.length === 0 || pokemonList[0] === 'common') {
        // 使用常用列表
        pokemonList = pokemonList[0] === 'common' ? COMMON_POKEMON : COMMON_POKEMON.slice(0, 10);
        console.log(`使用常用宝可梦列表（${pokemonList.length}只）`);
      }
      await batchFetchPokemonFromPokeAPI(pokemonList);
      break;
      
    case 'showdown':
      // 从Pokemon Showdown提取数据
      await extractShowdownData();
      break;
      
    case 'smogon':
      // 从Smogon获取分析（备选）
      let smogonList = args.slice(1).filter(a => !a.startsWith('format='));
      const format = args.find(a => a.startsWith('format='))?.split('=')[1] || 'ss';
      
      if (smogonList.length === 0 || smogonList[0] === 'common') {
        // 使用常用列表
        smogonList = smogonList[0] === 'common' ? COMMON_POKEMON : COMMON_POKEMON.slice(0, 10);
        console.log(`使用常用宝可梦列表（${smogonList.length}只）`);
      }
      await batchFetchSmogonAnalyses(smogonList, format);
      break;
      
    case '52poke':
      // 从神奇宝贝百科获取数据
      const pageTitle = args[1] || '皮卡丘';
      await fetch52PokeData(pageTitle);
      break;
      
    case 'all':
      // 获取所有数据源
      console.log('获取所有数据源...\n');
      
      // 1. Pokemon Showdown数据（本地）
      await extractShowdownData();
      await sleep(CONFIG.delay);
      
      // 2. PokeAPI（常用宝可梦，前20只）
      const commonPokemon = COMMON_POKEMON.slice(0, 20);
      console.log(`\n从PokeAPI获取 ${commonPokemon.length} 只常用宝可梦数据...`);
      await batchFetchPokemonFromPokeAPI(commonPokemon);
      
      break;
      
    case 'help':
    default:
      console.log(`
使用方法:
  node data/fetch-rag-knowledge.mjs <command> [options]

命令:
  pokeapi [common|<pokemon1> <pokemon2> ...]
    从PokeAPI获取宝可梦数据（API优先）
    示例: 
      node data/fetch-rag-knowledge.mjs pokeapi pikachu charizard
      node data/fetch-rag-knowledge.mjs pokeapi common  # 使用常用列表（前10只）
      node data/fetch-rag-knowledge.mjs pokeapi        # 默认使用前10只常用宝可梦

  showdown
    从本地Pokemon Showdown数据文件提取数据
    示例: node data/fetch-rag-knowledge.mjs showdown

  smogon [common|<pokemon1> <pokemon2> ...] [format=ss]
    从Smogon获取宝可梦分析（爬虫备选）
    示例: 
      node data/fetch-rag-knowledge.mjs smogon pikachu charizard format=ss
      node data/fetch-rag-knowledge.mjs smogon common format=ss  # 使用常用列表

  52poke <pageTitle>
    从神奇宝贝百科获取数据（爬虫备选，使用MediaWiki API）
    示例: node data/fetch-rag-knowledge.mjs 52poke 皮卡丘

  all
    获取所有数据源（推荐）
    包含：Pokemon Showdown本地数据 + PokeAPI常用宝可梦（前20只）
    示例: node data/fetch-rag-knowledge.mjs all

  help
    显示此帮助信息

数据保存位置: ${CONFIG.outputDir}

提示:
  - 优先使用API（PokeAPI）获取数据，更稳定可靠
  - 爬虫方案（Smogon、52poke）作为备选，需要遵守网站规则
  - 安装cheerio可启用HTML解析: npm install cheerio
      `);
      break;
  }
  
  console.log('\n========== 脚本执行完成 ==========');
}

// 运行主函数
main().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

