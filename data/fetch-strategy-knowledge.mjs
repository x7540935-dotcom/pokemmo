/**
 * 策略知识抓取脚本
 * 专门用于抓取对战策略知识，而非基础精灵数据
 * 
 * 主要来源：
 * 1. Smogon策略指南文章
 * 2. Smogon深度策略文章
 * 3. 神奇宝贝百科对战策略说明
 */

import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  outputDir: path.resolve(__dirname, '../RAG/data/raw/strategy'),
  delay: 2000, // 2秒延迟，避免请求过快
  maxRetries: 3,
  timeout: 30000,
  minPokemonCount: 100, // 最少获取的精灵数量
};

// 用户代理
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 尝试加载cheerio（可选）
let cheerio = null;
async function loadCheerio() {
  if (cheerio !== null) return cheerio;
  
  try {
    const cheerioModule = await import('cheerio');
    cheerio = cheerioModule.default || cheerioModule;
    console.log('[Info] 已加载cheerio，支持HTML解析');
    return cheerio;
  } catch (e) {
    console.log('[Info] cheerio未安装，将保存原始HTML');
    return null;
  }
}

/**
 * 工具函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

async function saveData(filename, data, metadata = {}) {
  const outputPath = path.join(CONFIG.outputDir, filename);
  await fs.ensureDir(path.dirname(outputPath));
  
  const content = {
    metadata: {
      source: metadata.source || 'unknown',
      type: metadata.type || 'strategy',
      fetchedAt: new Date().toISOString(),
      ...metadata,
    },
    data: data,
  };
  
  await fs.writeJSON(outputPath, content, { spaces: 2 });
  console.log(`✅ 已保存: ${filename}`);
}

/**
 * ==================== Smogon策略文章 ====================
 */

/**
 * 获取Smogon文章列表
 */
async function fetchSmogonArticlesList() {
  try {
    const url = 'https://www.smogon.com/articles/';
    console.log(`[Smogon] 获取文章列表...`);
    
    const response = await fetchWithRetry(url);
    const html = await response.text();
    
    const $ = await loadCheerio();
    const articles = [];
    
    if ($) {
      try {
        const $html = $(html);
        
        // 查找文章链接
        $html.find('a[href*="/articles/"]').each((i, elem) => {
          const $link = $(elem);
          const href = $link.attr('href');
          const title = $link.text().trim();
          
          if (href && title && !articles.find(a => a.url === href)) {
            const fullUrl = href.startsWith('http') ? href : `https://www.smogon.com${href}`;
            articles.push({
              title: title,
              url: fullUrl,
              slug: href.split('/').filter(Boolean).pop(),
            });
          }
        });
      } catch (e) {
        console.warn(`[Smogon] 解析文章列表失败: ${e.message}`);
      }
    }
    
    return articles;
  } catch (error) {
    console.error(`[Smogon] 获取文章列表失败:`, error.message);
    return [];
  }
}

/**
 * 获取Smogon单篇文章
 */
async function fetchSmogonArticle(articleUrl, articleTitle) {
  try {
    console.log(`[Smogon] 获取文章: ${articleTitle}`);
    
    const response = await fetchWithRetry(articleUrl);
    const html = await response.text();
    
    const articleData = {
      title: articleTitle,
      url: articleUrl,
      extractedAt: new Date().toISOString(),
    };
    
    const $ = await loadCheerio();
    if ($) {
      try {
        const $html = $(html);
        
        // 提取主要内容
        const mainContent = $html.find('article, .article-content, .content, main').first();
        if (mainContent.length > 0) {
          // 提取文本内容
          articleData.text = mainContent.text().trim();
          
          // 提取HTML内容（保留格式）
          articleData.html = mainContent.html();
          
          // 提取章节
          const sections = [];
          mainContent.find('h1, h2, h3, h4').each((i, elem) => {
            const $heading = $(elem);
            const nextContent = [];
            let current = $heading.next();
            while (current.length && !current.is('h1, h2, h3, h4')) {
              nextContent.push(current.text().trim());
              current = current.next();
            }
            
            sections.push({
              heading: $heading.text().trim(),
              content: nextContent.join('\n').trim(),
            });
          });
          if (sections.length > 0) {
            articleData.sections = sections;
          }
        } else {
          // 如果没有找到特定区域，提取body文本
          articleData.text = $html('body').text().trim();
          articleData.html = html.substring(0, 100000);
        }
      } catch (parseError) {
        console.warn(`[Smogon] HTML解析失败: ${parseError.message}`);
        articleData.html = html.substring(0, 100000);
      }
    } else {
      articleData.html = html.substring(0, 100000);
    }
    
    const slug = articleUrl.split('/').filter(Boolean).pop() || 'article';
    await saveData(`smogon/articles/${slug}.json`, articleData, {
      source: 'smogon',
      type: 'strategy_article',
      title: articleTitle,
      url: articleUrl,
    });
    
    await sleep(CONFIG.delay);
    return articleData;
  } catch (error) {
    console.error(`[Smogon] 获取文章失败 ${articleTitle}:`, error.message);
    return null;
  }
}

/**
 * 推荐的Smogon策略文章列表
 * 注意：Smogon的文章URL可能已改变，脚本会先尝试获取文章列表
 */
const RECOMMENDED_SMOGON_ARTICLES = [
  // 尝试不同的URL格式
  { title: 'Switching Guide', url: 'https://www.smogon.com/articles/switching', slug: 'switching' },
  { title: 'Prediction Guide', url: 'https://www.smogon.com/articles/prediction', slug: 'prediction' },
  { title: 'Team Building Guide', url: 'https://www.smogon.com/articles/team-building', slug: 'team-building' },
  { title: 'Damage Calculation', url: 'https://www.smogon.com/articles/damage-calculation', slug: 'damage-calculation' },
  { title: 'Speed Tiers', url: 'https://www.smogon.com/articles/speed-tiers', slug: 'speed-tiers' },
  { title: 'Hazards Guide', url: 'https://www.smogon.com/articles/hazards', slug: 'hazards' },
  { title: 'Weather Guide', url: 'https://www.smogon.com/articles/weather', slug: 'weather' },
  { title: 'Status Conditions', url: 'https://www.smogon.com/articles/status', slug: 'status' },
];

/**
 * 从Smogon Dex获取策略知识（备选方案）
 * 从常用宝可梦的分析页面提取策略信息
 */
async function fetchSmogonDexStrategy(pokemonName, format = 'ss') {
  try {
    const url = `https://www.smogon.com/dex/${format}/pokemon/${pokemonName.toLowerCase()}/`;
    console.log(`[Smogon Dex] 获取策略: ${pokemonName}`);
    
    const response = await fetchWithRetry(url);
    const html = await response.text();
    
    const strategyData = {
      pokemon: pokemonName,
      format: format,
      url: url,
      extractedAt: new Date().toISOString(),
    };
    
    const $ = await loadCheerio();
    if ($) {
      try {
        const $html = $(html);
        
        // 提取策略相关内容
        const strategyText = [];
        
        // 提取Overview部分（策略概述）
        $html.find('.Overview, .overview, [class*="Overview"]').each((i, elem) => {
          const text = $(elem).text().trim();
          if (text) strategyText.push(`概述: ${text}`);
        });
        
        // 提取Sets部分（配置建议）
        $html.find('.Sets, .sets, [class*="Set"]').each((i, elem) => {
          const text = $(elem).text().trim();
          if (text) strategyText.push(`配置: ${text}`);
        });
        
        // 提取Usage Tips部分（使用技巧）
        $html.find('.Usage, .tips, [class*="Usage"]').each((i, elem) => {
          const text = $(elem).text().trim();
          if (text) strategyText.push(`使用技巧: ${text}`);
        });
        
        if (strategyText.length > 0) {
          strategyData.strategy = strategyText.join('\n\n');
        } else {
          // 如果没有找到特定区域，提取主要内容
          const mainContent = $html.find('main, .main-content, article').first();
          if (mainContent.length > 0) {
            strategyData.text = mainContent.text().trim();
          }
        }
        
        strategyData.html = html.substring(0, 50000);
      } catch (parseError) {
        console.warn(`[Smogon Dex] HTML解析失败: ${parseError.message}`);
        strategyData.html = html.substring(0, 100000);
      }
    } else {
      strategyData.html = html.substring(0, 100000);
    }
    
    await saveData(`smogon/dex-strategy/${pokemonName}-${format}.json`, strategyData, {
      source: 'smogon-dex',
      type: 'pokemon_strategy',
      pokemon: pokemonName,
      format: format,
    });
    
    await sleep(CONFIG.delay);
    return strategyData;
  } catch (error) {
    console.error(`[Smogon Dex] 获取策略失败 ${pokemonName}:`, error.message);
    return null;
  }
}

/**
 * ==================== 神奇宝贝百科策略知识 ====================
 */

/**
 * 从神奇宝贝百科获取对战相关页面
 */
async function fetch52PokeStrategy(pageTitle) {
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
    console.log(`[52Poke] 获取策略页面: ${pageTitle}`);
    
    const response = await fetchWithRetry(url);
    const data = await response.json();
    
    const pages = data.query?.pages || {};
    const pageData = Object.values(pages)[0];
    
    if (!pageData || !pageData.revisions) {
      throw new Error('页面不存在或无法获取内容');
    }
    
    const content = pageData.revisions[0]['*'];
    
    const strategyData = {
      title: pageTitle,
      content: content,
      extractedAt: new Date().toISOString(),
    };
    
    // 尝试提取文本内容（简单的Wiki文本处理）
    const textContent = content
      .replace(/\[\[([^\]]+)\]\]/g, '$1') // 移除链接标记
      .replace(/\{\{[^\}]+\}\}/g, '') // 移除模板
      .replace(/==+([^=]+)==+/g, '\n$1\n') // 标题
      .replace(/\*+/g, '') // 列表标记
      .trim();
    
    strategyData.text = textContent;
    
    const safeTitle = pageTitle.replace(/\//g, '_').replace(/[<>:"|?*]/g, '_');
    await saveData(`52poke/strategy/${safeTitle}.json`, strategyData, {
      source: '52poke',
      type: 'strategy',
      page: pageTitle,
    });
    
    await sleep(CONFIG.delay);
    return strategyData;
  } catch (error) {
    console.error(`[52Poke] 获取策略页面失败 ${pageTitle}:`, error.message);
    return null;
  }
}

/**
 * 推荐的神奇宝贝百科策略页面
 */
const RECOMMENDED_52POKE_PAGES = [
  '对战',
  '对战机制',
  '属性相克',
  '状态变化',
  '天气',
  '场地',
  '招式',
  '特性',
  '道具',
];

/**
 * ==================== 批量获取函数 ====================
 */

/**
 * 批量获取Smogon策略文章
 */
async function batchFetchSmogonArticles(articleList = null) {
  const articles = articleList || RECOMMENDED_SMOGON_ARTICLES;
  
  console.log(`\n========== 开始批量获取Smogon策略文章 ==========`);
  console.log(`数量: ${articles.length}`);
  
  // 先尝试获取文章列表，获取实际可用的URL
  console.log('\n[步骤1] 尝试获取文章列表...');
  const availableArticles = await fetchSmogonArticlesList();
  
  let results = [];
  let failedCount = 0;
  
  // 如果有可用文章列表，优先使用
  if (availableArticles.length > 0) {
    console.log(`\n找到 ${availableArticles.length} 篇可用文章，使用列表中的文章`);
    const articlesToFetch = availableArticles.slice(0, Math.min(20, availableArticles.length));
    
    for (let i = 0; i < articlesToFetch.length; i++) {
      const article = articlesToFetch[i];
      console.log(`\n[${i + 1}/${articlesToFetch.length}] ${article.title}`);
      
      const data = await fetchSmogonArticle(article.url, article.title);
      if (data) {
        results.push(data);
      } else {
        failedCount++;
      }
    }
  } else {
    // 如果没有文章列表，尝试使用推荐的URL
    console.log('\n未找到文章列表，尝试使用推荐的URL...');
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`\n[${i + 1}/${articles.length}] ${article.title}`);
      
      const data = await fetchSmogonArticle(article.url, article.title);
      if (data) {
        results.push(data);
      } else {
        failedCount++;
        console.warn(`⚠️  文章URL可能已失效: ${article.url}`);
      }
    }
  }
  
  console.log(`\n✅ 完成！成功获取 ${results.length}/${articles.length + availableArticles.length} 篇文章`);
  if (failedCount > 0) {
    console.log(`⚠️  失败 ${failedCount} 篇，建议使用备选方案（smogon-dex）`);
  }
  return results;
}

/**
 * 从Smogon格式统计页面获取热门精灵列表
 */
async function fetchPopularPokemonFromSmogon(format = 'gen9ou', limit = 150) {
  try {
    // Smogon格式统计页面
    const url = `https://www.smogon.com/stats/${format}/`;
    console.log(`[Smogon Stats] 获取热门精灵列表: ${format}`);
    
    const response = await fetchWithRetry(url);
    const html = await response.text();
    
    const $ = await loadCheerio();
    const pokemonList = [];
    
    if ($) {
      try {
        const $html = $(html);
        
        // 尝试多种选择器来找到精灵列表
        // Smogon统计页面可能使用表格或列表
        $html.find('table tbody tr, .pokemon-list li, a[href*="/dex/"]').each((i, elem) => {
          const $elem = $(elem);
          let pokemonName = null;
          
          // 尝试从链接中提取
          const href = $elem.attr('href') || $elem.find('a').attr('href');
          if (href && href.includes('/dex/') && href.includes('/pokemon/')) {
            const match = href.match(/\/pokemon\/([^\/]+)\//);
            if (match && match[1]) {
              pokemonName = match[1].toLowerCase();
            }
          }
          
          // 尝试从文本中提取
          if (!pokemonName) {
            const text = $elem.text().trim();
            // 跳过表头、百分比等
            if (text && !text.match(/^\d+%?$/) && !text.match(/^[A-Z\s]+$/) && text.length < 30) {
              pokemonName = text.toLowerCase().replace(/[^a-z0-9]/g, '');
            }
          }
          
          // 验证是否是有效的精灵名称（简单验证：长度合理，不包含特殊字符）
          if (pokemonName && pokemonName.length > 2 && pokemonName.length < 20 && 
              !pokemonName.includes('http') && !pokemonName.includes('www') &&
              !pokemonList.includes(pokemonName)) {
            pokemonList.push(pokemonName);
          }
        });
        
        // 如果没找到，尝试从页面文本中提取
        if (pokemonList.length === 0) {
          const bodyText = $html('body').text();
          // 查找常见的精灵名称模式
          const commonPokemon = ['pikachu', 'charizard', 'blastoise', 'venusaur', 'lucario', 
            'garchomp', 'gengar', 'dragonite', 'tyranitar', 'metagross', 'salamence',
            'machamp', 'alakazam', 'gyarados', 'snorlax', 'blissey', 'ferrothorn', 
            'heatran', 'landorus', 'rotom', 'togekiss', 'scizor', 'excadrill',
            'clefable', 'toxapex', 'corviknight', 'dragapult', 'urshifu'];
          
          // 从文本中查找这些精灵名称
          commonPokemon.forEach(p => {
            if (bodyText.toLowerCase().includes(p) && !pokemonList.includes(p)) {
              pokemonList.push(p);
            }
          });
        }
      } catch (e) {
        console.warn(`[Smogon Stats] 解析失败: ${e.message}`);
      }
    }
    
    // 限制数量
    const limitedList = pokemonList.slice(0, limit);
    console.log(`[Smogon Stats] 找到 ${limitedList.length} 只热门精灵`);
    
    return limitedList;
  } catch (error) {
    console.error(`[Smogon Stats] 获取热门精灵列表失败:`, error.message);
    return [];
  }
}

/**
 * 扩展的常用精灵列表（至少100只）
 */
const EXTENDED_COMMON_POKEMON = [
  // 第一世代
  'pikachu', 'raichu', 'charizard', 'blastoise', 'venusaur', 'dragonite', 'gengar', 'alakazam',
  'machamp', 'gyarados', 'snorlax', 'lapras', 'golem', 'rhydon', 'arcanine', 'exeggutor',
  'ninetales', 'clefable', 'wigglytuff', 'vaporeon', 'jolteon', 'flareon',
  
  // 第二世代
  'tyranitar', 'feraligatr', 'meganium', 'typhlosion', 'ampharos', 'blissey', 'scizor', 'heracross',
  'umbreon', 'espeon', 'steelix', 'kingdra', 'donphan', 'porygon2', 'smeargle',
  
  // 第三世代
  'sceptile', 'blaziken', 'swampert', 'salamence', 'metagross', 'gardevoir', 'flygon', 'aggron',
  'milotic', 'absol', 'banette', 'dusclops', 'tropius', 'chimecho',
  
  // 第四世代
  'infernape', 'empoleon', 'torterra', 'garchomp', 'lucario', 'gastrodon', 'gliscor', 'drapion',
  'toxicroak', 'weavile', 'magnezone', 'rhyperior', 'tangrowth', 'electivire', 'magmortar',
  'togekiss', 'yanmega', 'leafeon', 'glaceon', 'mamoswine', 'porygonz', 'gallade', 'probopass',
  'dusknoir', 'froslass', 'rotom', 'rotomwash', 'rotomheat', 'rotomfan', 'rotomfrost', 'rotommow',
  
  // 第五世代
  'serperior', 'emboar', 'samurott', 'excadrill', 'conkeldurr', 'seismitoad', 'throh', 'sawk',
  'leavanny', 'scolipede', 'whimsicott', 'lilligant', 'krookodile', 'darmanitan',
  'crustle', 'scrafty', 'cofagrigus', 'carracosta', 'archeops', 'garbodor', 'zoroark',
  'cinccino', 'gothitelle', 'reuniclus', 'swanna', 'vanilluxe', 'sawsbuck', 'emolga',
  'escavalier', 'amoonguss', 'jellicent', 'alomomola', 'galvantula', 'ferrothorn', 'klinklang',
  'eelektross', 'beheeyem', 'chandelure', 'haxorus', 'beartic', 'cryogonal', 'accelgor',
  'stunfisk', 'mienfoo', 'druddigon', 'golurk', 'bouffalant', 'braviary', 'mandibuzz',
  'heatmor', 'durant', 'hydreigon', 'volcarona', 'cobalion', 'terrakion', 'virizion',
  'tornadus', 'thundurus', 'reshiram', 'zekrom', 'landorus', 'kyurem',
  
  // 第六世代
  'greninja', 'talonflame', 'pyroar', 'florges', 'gogoat', 'pangoro', 'furfrou', 'meowstic',
  'honedge', 'doublade', 'aegislash', 'aromatisse', 'slurpuff', 'malamar', 'barbaracle',
  'dragalge', 'clawitzer', 'heliolisk', 'tyrantrum', 'aurorus', 'sylveon', 'hawlucha',
  'dedenne', 'carbink', 'goomy', 'sliggoo', 'goodra', 'klefki', 'phantump', 'trevenant',
  'pumpkaboo', 'gourgeist', 'bergmite', 'avalugg', 'noibat', 'noivern', 'xerneas', 'yveltal',
  'zygarde', 'diancie', 'hoopa', 'volcanion',
  
  // 第七世代
  'decidueye', 'incineroar', 'primarina', 'toucannon', 'gumshoos', 'vikavolt', 'crabominable',
  'oricorio', 'ribombee', 'rockruff', 'lycanroc', 'wishiwashi', 'toxapex', 'mudsdale',
  'araquanid', 'lurantis', 'shiinotic', 'salazzle', 'bewear', 'tsareena', 'comfey',
  'oranguru', 'passimian', 'wimpod', 'golisopod', 'sandygast', 'palossand', 'pyukumuku',
  'type:null', 'silvally', 'minior', 'komala', 'turtonator', 'togedemaru', 'mimikyu',
  'bruxish', 'drampa', 'dhelmise', 'jangmo-o', 'hakamo-o', 'kommo-o', 'tapu-koko',
  'tapu-lele', 'tapu-bulu', 'tapu-fini', 'cosmog', 'cosmoem', 'solgaleo', 'lunala',
  'nihilego', 'buzzwole', 'pheromosa', 'xurkitree', 'celesteela', 'kartana', 'guzzlord',
  'necrozma', 'magearna', 'marshadow', 'poipole', 'naganadel', 'stakataka', 'blacephalon',
  'zeraora', 'meltan', 'melmetal',
  
  // 第八世代
  'rillaboom', 'cinderace', 'inteleon', 'corviknight', 'orbeetle', 'thievul', 'greedent',
  'eldegoss', 'dubwool', 'drednaw', 'yamper', 'boltund', 'coalossal', 'flapple', 'appletun',
  'sandaconda', 'cramorant', 'arrokuda', 'barraskewda', 'toxel', 'toxtricity', 'sizzlipede',
  'centiskorch', 'clobbopus', 'grapploct', 'sinistea', 'polteageist', 'hatenna', 'hattrem',
  'hatterene', 'impidimp', 'morgrem', 'grimmsnarl', 'obstagoon', 'perrserker', 'cursola',
  'sirfetchd', 'mr-rime', 'runerigus', 'milcery', 'alcremie', 'falinks', 'pincurchin',
  'snom', 'frosmoth', 'stonjourner', 'eiscue', 'indeedee', 'morpeko', 'cufant', 'copperajah',
  'dracozolt', 'arctozolt', 'dracovish', 'arctovish', 'duraludon', 'dreepy', 'drakloak',
  'dragapult', 'zacian', 'zamazenta', 'eternatus', 'kubfu', 'urshifu', 'zarude', 'regieleki',
  'regidrago', 'glastrier', 'spectrier', 'calyrex',
  
  // 第九世代
  'sprigatito', 'floragato', 'meowscarada', 'fuecoco', 'crocalor', 'skeledirge', 'quaxly',
  'quaxwell', 'quaquaval', 'lechonk', 'oinkologne', 'tarountula', 'spidops', 'nymble',
  'lokix', 'pawmi', 'pawmo', 'pawmot', 'tandemaus', 'maushold', 'fidough', 'dachsbun',
  'smoliv', 'dolliv', 'arboliva', 'squawkabilly', 'nacli', 'naclstack', 'garganacl',
  'charcadet', 'armarouge', 'ceruledge', 'tadbulb', 'bellibolt', 'wattrel', 'kilowattrel',
  'maschiff', 'mabosstiff', 'shroodle', 'grafaiai', 'bramblin', 'brambleghast', 'toedscool',
  'toedscruel', 'klawf', 'capsakid', 'scovillain', 'rellor', 'rabsca', 'flittle', 'espathra',
  'tinkatink', 'tinkatuff', 'tinkaton', 'wiglett', 'wugtrio', 'bombirdier', 'finizen',
  'palafin', 'varoom', 'revavroom', 'cyclizar', 'orthworm', 'glimmet', 'glimmora',
  'greavard', 'houndstone', 'flamigo', 'cetoddle', 'cetitan', 'veluza', 'dondozo',
  'tatsugiri', 'annihilape', 'clodsire', 'farigiraf', 'dudunsparce', 'kingambit',
  'great-tusk', 'scream-tail', 'brute-bonnet', 'flutter-mane', 'slither-wing', 'sandy-shocks',
  'iron-treads', 'iron-bundle', 'iron-hands', 'iron-jugulis', 'iron-moth', 'iron-thorns',
  'frigibax', 'arctibax', 'baxcalibur', 'gimmighoul', 'gholdengo', 'wo-chien', 'chien-pao',
  'ting-lu', 'chi-yu', 'roaring-moon', 'iron-valiant', 'koraidon', 'miraidon',
];

/**
 * 批量从Smogon Dex获取策略知识（备选方案）
 */
async function batchFetchSmogonDexStrategy(pokemonList, format = 'ss', minCount = CONFIG.minPokemonCount) {
  console.log(`\n========== 开始批量获取Smogon Dex策略知识 ==========`);
  
  // 如果列表为空或数量不足，使用扩展列表
  let finalList = pokemonList || [];
  if (finalList.length < minCount) {
    console.log(`\n当前列表只有 ${finalList.length} 只精灵，需要至少 ${minCount} 只`);
    console.log(`使用扩展的常用精灵列表...`);
    
    // 合并列表，去重
    const combined = [...new Set([...finalList, ...EXTENDED_COMMON_POKEMON])];
    finalList = combined.slice(0, Math.max(minCount, combined.length));
    console.log(`最终列表包含 ${finalList.length} 只精灵`);
  }
  
  console.log(`数量: ${finalList.length}`);
  
  const results = [];
  const failed = [];
  
  for (let i = 0; i < finalList.length; i++) {
    const pokemon = finalList[i];
    console.log(`\n[${i + 1}/${finalList.length}] ${pokemon}`);
    
    try {
      const data = await fetchSmogonDexStrategy(pokemon, format);
      if (data) {
        results.push(data);
      } else {
        failed.push(pokemon);
      }
    } catch (error) {
      console.error(`获取失败: ${error.message}`);
      failed.push(pokemon);
    }
    
    // 每10只显示一次进度
    if ((i + 1) % 10 === 0) {
      console.log(`\n📊 进度: ${i + 1}/${finalList.length}, 成功: ${results.length}, 失败: ${failed.length}`);
    }
  }
  
  console.log(`\n✅ 完成！成功获取 ${results.length}/${finalList.length} 个策略`);
  if (failed.length > 0) {
    console.log(`⚠️  失败 ${failed.length} 只: ${failed.slice(0, 10).join(', ')}${failed.length > 10 ? '...' : ''}`);
  }
  
  return results;
}

/**
 * 批量获取神奇宝贝百科策略页面
 */
async function batchFetch52PokeStrategy(pages = null) {
  const pageList = pages || RECOMMENDED_52POKE_PAGES;
  
  console.log(`\n========== 开始批量获取神奇宝贝百科策略页面 ==========`);
  console.log(`数量: ${pageList.length}`);
  
  const results = [];
  for (let i = 0; i < pageList.length; i++) {
    const page = pageList[i];
    console.log(`\n[${i + 1}/${pageList.length}] ${page}`);
    
    const data = await fetch52PokeStrategy(page);
    if (data) {
      results.push(data);
    }
  }
  
  console.log(`\n✅ 完成！成功获取 ${results.length}/${pageList.length} 个页面`);
  return results;
}

/**
 * ==================== 主函数 ====================
 */

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  console.log('========== 策略知识抓取脚本 ==========\n');
  console.log('注意：此脚本专门抓取策略知识，不抓取基础精灵数据\n');
  
  // 确保输出目录存在
  await fs.ensureDir(CONFIG.outputDir);
  
  switch (command) {
    case 'smogon':
      // 获取Smogon策略文章
      if (args[1] === 'list') {
        // 获取文章列表
        const articles = await fetchSmogonArticlesList();
        console.log(`\n找到 ${articles.length} 篇文章`);
        articles.slice(0, 20).forEach((a, i) => {
          console.log(`${i + 1}. ${a.title} - ${a.url}`);
        });
      } else {
        // 获取推荐文章
        await batchFetchSmogonArticles();
      }
      break;
      
    case 'smogon-dex':
      // 从Smogon Dex获取策略知识（备选方案）
      const pokemonList = args.slice(1).filter(a => !a.startsWith('format=') && !a.startsWith('from-stats='));
      const format = args.find(a => a.startsWith('format='))?.split('=')[1] || 'ss';
      const fromStats = args.find(a => a.startsWith('from-stats='))?.split('=')[1] || null;
      
      let pokemonToFetch = pokemonList;
      
      // 如果指定了from-stats，从排行榜获取
      if (fromStats || pokemonToFetch.length === 0) {
        if (fromStats) {
          console.log(`\n[步骤1] 从Smogon排行榜获取热门精灵列表 (${fromStats})...`);
          const statsList = await fetchPopularPokemonFromSmogon(fromStats, 150);
          if (statsList.length > 0) {
            pokemonToFetch = [...new Set([...pokemonToFetch, ...statsList])];
            console.log(`从排行榜获取到 ${statsList.length} 只热门精灵`);
          }
        }
        
        // 如果列表仍然不足，使用扩展列表
        if (pokemonToFetch.length < CONFIG.minPokemonCount) {
          console.log(`\n列表不足 ${CONFIG.minPokemonCount} 只，使用扩展的常用精灵列表...`);
          pokemonToFetch = [...new Set([...pokemonToFetch, ...EXTENDED_COMMON_POKEMON])];
        }
      }
      
      await batchFetchSmogonDexStrategy(pokemonToFetch, format);
      break;
      
    case '52poke':
      // 获取神奇宝贝百科策略页面
      const pages = args.slice(1);
      await batchFetch52PokeStrategy(pages.length > 0 ? pages : null);
      break;
      
    case 'all':
      // 获取所有策略知识
      console.log('获取所有策略知识源...\n');
      
      // 1. 尝试获取Smogon策略文章
      console.log('[步骤1] 尝试获取Smogon策略文章...');
      const articleResults = await batchFetchSmogonArticles();
      
      // 如果文章获取失败，使用备选方案（获取至少100只热门精灵）
      if (articleResults.length === 0) {
        console.log('\n⚠️  Smogon文章获取失败，切换到备选方案（Dex策略）...');
        console.log(`将获取至少 ${CONFIG.minPokemonCount} 只热门精灵的策略知识...`);
        
        // 尝试从排行榜获取，失败则使用扩展列表
        let pokemonList = [];
        try {
          console.log('尝试从排行榜获取热门精灵...');
          pokemonList = await fetchPopularPokemonFromSmogon('gen9ou', 150);
        } catch (e) {
          console.warn('从排行榜获取失败，使用扩展列表');
        }
        
        await batchFetchSmogonDexStrategy(pokemonList, 'ss');
      } else {
        // 即使文章获取成功，也获取热门精灵策略（至少100只）
        console.log('\n[步骤1.5] 获取热门精灵策略知识（至少100只）...');
        let pokemonList = [];
        try {
          pokemonList = await fetchPopularPokemonFromSmogon('gen9ou', 150);
        } catch (e) {
          console.warn('从排行榜获取失败，使用扩展列表');
        }
        await batchFetchSmogonDexStrategy(pokemonList, 'ss');
      }
      
      await sleep(CONFIG.delay);
      
      // 2. 神奇宝贝百科策略页面
      console.log('\n[步骤2] 获取神奇宝贝百科策略页面...');
      await batchFetch52PokeStrategy();
      
      break;
      
    case 'help':
    default:
      console.log(`
使用方法:
  node data/fetch-strategy-knowledge.mjs <command> [options]

命令:
  smogon [list]
    获取Smogon策略文章
    示例: 
      node data/fetch-strategy-knowledge.mjs smogon        # 获取推荐文章
      node data/fetch-strategy-knowledge.mjs smogon list   # 列出所有文章

  smogon-dex [pokemon1] [pokemon2] ... [format=ss] [from-stats=gen9ou]
    从Smogon Dex获取策略知识（推荐，默认获取至少100只）
    从宝可梦分析页面提取策略信息
    示例: 
      node data/fetch-strategy-knowledge.mjs smogon-dex                    # 默认获取至少100只
      node data/fetch-strategy-knowledge.mjs smogon-dex from-stats=gen9ou  # 从排行榜获取热门精灵
      node data/fetch-strategy-knowledge.mjs smogon-dex pikachu charizard format=ss

  52poke [page1] [page2] ...
    获取神奇宝贝百科策略页面
    示例: 
      node data/fetch-strategy-knowledge.mjs 52poke
      node data/fetch-strategy-knowledge.mjs 52poke 对战 属性相克

  all
    获取所有策略知识源（推荐）
    包含：Smogon策略文章 + 至少100只热门精灵策略 + 神奇宝贝百科策略页面
    示例: node data/fetch-strategy-knowledge.mjs all

  help
    显示此帮助信息

数据保存位置: ${CONFIG.outputDir}

注意:
  - 此脚本专门抓取策略知识，不抓取基础精灵数据
  - 策略知识包括：换人时机、技能选择、队伍构建、预测技巧等
  - 默认获取至少100只热门精灵的策略知识
  - 安装cheerio可启用HTML解析: npm install cheerio
      `);
      break;
  }
  
  console.log('\n========== 脚本执行完成 ==========');
}

main().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

