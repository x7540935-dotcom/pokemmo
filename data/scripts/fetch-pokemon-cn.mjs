#!/usr/bin/env node
/**
 * 从52poke百科获取宝可梦中文名称和贴图
 * 使用MediaWiki API和页面爬取
 * 
 * 使用方法：
 *   node data/scripts/fetch-pokemon-cn.mjs [选项]
 * 
 * 选项：
 *   --start=N      从第N个开始（默认0）
 *   --count=N      获取N个（默认50）
 *   --update-only  只更新缺失的数据
 *   --names-only   只获取中文名称，不下载贴图
 *   --debug        启用调试模式
 * 
 * 示例：
 *   node data/scripts/fetch-pokemon-cn.mjs --start=0 --count=50
 *   node data/scripts/fetch-pokemon-cn.mjs --update-only
 *   node data/scripts/fetch-pokemon-cn.mjs --start=0 --count=1 --debug
 * 
 * 输出：
 *   data/chinese/pokedex-cn.json - 中文名称映射
 *   cache/sprites/ - 贴图文件目录
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// 配置
const WIKI_API = 'https://wiki.52poke.com/api.php';
const WIKI_BASE = 'https://wiki.52poke.com/wiki';
const POKEMON_LIST_PAGE = '宝可梦列表（按全国图鉴编号）';
const OUTPUT_DIR = join(projectRoot, 'data', 'chinese');
const SPRITES_DIR = join(projectRoot, 'cache', 'sprites');
const CHINESE_DATA_FILE = join(OUTPUT_DIR, 'pokedex-cn.json');

// 确保目录存在
[OUTPUT_DIR, SPRITES_DIR].forEach(dir => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

// 请求延迟（毫秒）
const REQUEST_DELAY = 1000;

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 加载现有的中文数据
 */
function loadExistingData() {
  if (existsSync(CHINESE_DATA_FILE)) {
    try {
      return JSON.parse(readFileSync(CHINESE_DATA_FILE, 'utf8'));
    } catch (e) {
      console.warn('[警告] 无法读取现有数据文件，将创建新文件');
      return {};
    }
  }
  return {};
}

/**
 * 保存中文数据
 */
function saveData(data) {
  writeFileSync(CHINESE_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(`[保存] 已保存 ${Object.keys(data).length} 个宝可梦的数据`);
}

/**
 * 调用MediaWiki API
 */
async function callAPI(params) {
  const url = new URL(WIKI_API);
  Object.keys(params).forEach(key => {
    url.searchParams.append(key, params[key]);
  });

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[API] 调用失败: ${error.message}`);
    return null;
  }
}

/**
 * 从Showdown数据获取宝可梦列表
 */
function getPokemonListFromShowdown() {
  try {
    const pokedexPath = join(projectRoot, 'data', 'data', 'pokedex.json');
    if (existsSync(pokedexPath)) {
      const data = JSON.parse(readFileSync(pokedexPath, 'utf8'));
      return Object.values(data)
        .filter(p => p && p.num && p.name)
        .map(p => ({
          id: p.num,
          name: p.name,
          nameId: p.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        }))
        .sort((a, b) => a.id - b.id);
    }
    
    const chinesePokedexPath = join(OUTPUT_DIR, 'pokedex.json');
    if (existsSync(chinesePokedexPath)) {
      const data = JSON.parse(readFileSync(chinesePokedexPath, 'utf8'));
      return Object.keys(data).map((key, index) => ({
        id: index + 1,
        name: key,
        nameId: key.toLowerCase()
      }));
    }
    
    return [];
  } catch (error) {
    console.error('[错误] 获取Showdown数据失败:', error.message);
    return [];
  }
}

/**
 * 从页面内容中提取中文名称
 */
function extractChineseNameFromContent(content, debug = false) {
  if (!content) return null;

  // 52poke百科使用多种模板格式：
  // 1. {{Pokémon|name1=英文名|name2=日文名|name3=中文名|...}}
  // 2. {{寶可夢信息框|name=中文名|jname=日文名|enname=英文名|...}}（繁体模板）
  // 3. {{宝可梦信息框|name=中文名|...}}（简体模板）
  
  // 方法1: 尝试寶可夢信息框模板（繁体，更常见）
  // 注意：模板可能是多行的，需要匹配到 }}
  // 先找到模板开始位置，然后通过计算大括号找到对应的结束位置
  let templateMatch = null;
  const startMatch = content.match(/\{\{寶可夢信息框/i);
  if (startMatch) {
    const startPos = startMatch.index;
    const afterStart = content.substring(startPos);
    
    // 通过计算大括号的嵌套来找到正确的结束位置
    let braceCount = 0;
    let foundStart = false;
    let endPos = -1;
    
    for (let i = 0; i < afterStart.length; i++) {
      const char = afterStart[i];
      const nextChar = afterStart[i + 1];
      
      if (char === '{' && nextChar === '{') {
        braceCount++;
        foundStart = true;
        i++; // 跳过下一个字符
      } else if (char === '}' && nextChar === '}') {
        braceCount--;
        i++; // 跳过下一个字符
        if (foundStart && braceCount === 0) {
          endPos = i + 1;
          break;
        }
      }
    }
    
    if (endPos > 0) {
      const templateContent = afterStart.substring(0, endPos);
      templateMatch = [templateContent];
      if (debug) {
        console.log(`  [调试] 通过大括号计数找到模板，长度: ${templateContent.length}`);
      }
    } else {
      // 如果大括号计数失败，尝试查找第一个 }}
      const endMatch = afterStart.match(/\}\}/);
      if (endMatch) {
        const templateContent = afterStart.substring(0, endMatch.index + 2);
        templateMatch = [templateContent];
        if (debug) {
          console.log(`  [调试] 通过简单匹配找到模板，长度: ${templateContent.length}`);
        }
      }
    }
  }
  
  // 如果上面的方法失败，尝试正则匹配
  if (!templateMatch) {
    templateMatch = content.match(/\{\{寶可夢信息框[\s\S]*?\}\}\}/i);
  }
  
  // 方法2: 尝试宝可梦信息框模板（简体）
  if (!templateMatch) {
    const startMatch = content.match(/\{\{宝可梦信息框/i);
    if (startMatch) {
      const startPos = startMatch.index;
      const afterStart = content.substring(startPos);
      const endMatch = afterStart.match(/\}\}/);
      if (endMatch) {
        const templateContent = afterStart.substring(0, endMatch.index + 2);
        templateMatch = [templateContent];
      }
    }
    if (!templateMatch) {
      templateMatch = content.match(/\{\{宝可梦信息框[\s\S]*?\}\}\}/i);
    }
  }
  
  // 方法3: 尝试Pokémon模板（旧格式）
  if (!templateMatch) {
    templateMatch = content.match(/\{\{Pokémon[\s\S]*?\}\}/i);
  }
  
  // 方法4: 尝试单行Pokémon模板
  if (!templateMatch) {
    templateMatch = content.match(/\{\{Pokémon[^}]*\}\}/i);
  }
  
  // 如果还是没找到，尝试更宽松的匹配（可能模板格式有变化）
  if (!templateMatch) {
    // 查找包含"信息框"的模板
    templateMatch = content.match(/\{\{[^}]*信息框[\s\S]*?\}\}/i);
  }
  
  if (templateMatch) {
    const templateContent = templateMatch[0];
    
    if (debug) {
      console.log(`  [调试] 匹配到的模板内容: ${templateContent.substring(0, 500)}`);
    }
    
    // 对于信息框模板，中文名称在 name 参数中
    // 对于Pokémon模板，中文名称在 name3 参数中
    
    // 先尝试 name 参数（信息框模板）
    // 注意：参数可能是 |name= 或 ||name= 格式，也可能在换行后
    const namePatterns = [
      /\|\|?\s*name\s*=\s*([^\n|}\[\]<>"']+)/i,      // |name=值 或 ||name=值
      /name\s*=\s*([^\n|}\[\]<>"']+)/i,                // name=值（任何位置）
      /name\s*=\s*"([^"]+)"/i,                         // name="值"
      /name\s*=\s*'([^']+)'/i                          // name='值'
    ];
    
    for (const pattern of namePatterns) {
      const match = templateContent.match(pattern);
      if (match && match[1]) {
        let chineseName = match[1].trim();
        // 清理可能的额外字符
        chineseName = chineseName.replace(/^["']|["']$/g, '').trim();
        // 移除可能的尾随字符（|、}、]等）
        chineseName = chineseName.split(/[|}\]]/)[0].trim();
        // 移除可能的换行符和空格
        chineseName = chineseName.replace(/[\r\n]+/g, '').trim();
        // 验证是否包含中文字符
        if (/[\u4e00-\u9fa5]/.test(chineseName) && chineseName.length >= 2 && chineseName.length <= 10) {
          if (debug) {
            console.log(`  [调试] ✅ 从name参数提取到中文名称: ${chineseName}`);
          }
          return chineseName;
        } else if (debug) {
          console.log(`  [调试] ⚠️  提取的名称不符合要求: "${chineseName}" (长度: ${chineseName.length}, 包含中文: ${/[\u4e00-\u9fa5]/.test(chineseName)})`);
        }
      }
    }
    
    // 再尝试 name3 参数（Pokémon模板）
    const name3Patterns = [
      /[|]\s*name3\s*=\s*([^\n|}\[\]<>"']+)/i,
      /^\s*name3\s*=\s*([^\n|}\[\]<>"']+)/i,
      /name3\s*=\s*"([^"]+)"/i,
      /name3\s*=\s*'([^']+)'/i
    ];
    
    for (const pattern of name3Patterns) {
      const match = templateContent.match(pattern);
      if (match && match[1]) {
        let chineseName = match[1].trim();
        chineseName = chineseName.replace(/^["']|["']$/g, '').trim();
        chineseName = chineseName.split(/[|}\]]/)[0].trim();
        if (/[\u4e00-\u9fa5]/.test(chineseName) && chineseName.length >= 2 && chineseName.length <= 10) {
          return chineseName;
        }
      }
    }
    
    // 尝试 name4 参数（繁体中文）
    const name4Patterns = [
      /[|]\s*name4\s*=\s*([^\n|}\[\]<>"']+)/i,
      /^\s*name4\s*=\s*([^\n|}\[\]<>"']+)/i,
      /name4\s*=\s*"([^"]+)"/i,
      /name4\s*=\s*'([^']+)'/i
    ];
    
    for (const pattern of name4Patterns) {
      const match = templateContent.match(pattern);
      if (match && match[1]) {
        let chineseName = match[1].trim();
        chineseName = chineseName.replace(/^["']|["']$/g, '').trim();
        chineseName = chineseName.split(/[|}\]]/)[0].trim();
        if (/[\u4e00-\u9fa5]/.test(chineseName) && chineseName.length >= 2 && chineseName.length <= 10) {
          return chineseName;
        }
      }
    }
  }
  
  return null;
}

/**
 * 从页面HTML中提取贴图URL
 */
function extractImageUrlFromHTML(html) {
  // 尝试多种模式
  const imagePatterns = [
    // 模式1: 主图片（通常是第一张大图）
    /<img[^>]+alt="[^"]*"[^>]+src="([^"]+\.(?:png|jpg|jpeg|gif|webp))"/i,
    // 模式2: 在infobox中的图片
    /<img[^>]+class="[^"]*infobox[^"]*"[^>]+src="([^"]+\.(?:png|jpg|jpeg|gif|webp))"/i,
    // 模式3: data-src（懒加载）
    /data-src="([^"]+\.(?:png|jpg|jpeg|gif|webp))"/i,
    // 模式4: 任何包含pokemon或sprite的图片
    /<img[^>]+src="([^"]*(?:pokemon|sprite|52poke)[^"]+\.(?:png|jpg|jpeg|gif|webp))"/i
  ];
  
  for (const pattern of imagePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let url = match[1];
      // 处理相对URL
      if (url.startsWith('//')) {
        url = 'https:' + url;
      } else if (url.startsWith('/')) {
        url = 'https://wiki.52poke.com' + url;
      }
      // 验证URL
      if (url.startsWith('http') && /\.(png|jpg|jpeg|gif|webp)/i.test(url)) {
        return url;
      }
    }
  }
  
  return null;
}

/**
 * 通过英文名称搜索宝可梦页面
 */
async function searchPokemonByName(englishName, debug = false) {
  try {
    if (debug) {
      console.log(`  [调试] 搜索宝可梦: ${englishName}`);
    }
    
    // 方法1: 使用开放搜索API（更可靠，可以找到相关页面）
    const openSearchData = await callAPI({
      action: 'opensearch',
      format: 'json',
      search: englishName,
      namespace: '0',
      limit: '10'
    });
    
    if (debug) {
      console.log(`  [调试] OpenSearch结果:`, JSON.stringify(openSearchData, null, 2).substring(0, 500));
    }
    
    if (!openSearchData || !Array.isArray(openSearchData) || !openSearchData[1] || openSearchData[1].length === 0) {
      if (debug) {
        console.log(`  [调试] OpenSearch未找到结果`);
      }
      // 尝试直接通过英文名称
      return await searchByDirectTitle(englishName, debug);
    }
    
    const titles = openSearchData[1];
    if (debug) {
      console.log(`  [调试] 找到 ${titles.length} 个相关页面:`, titles);
    }
    
    // 优先处理中文标题的页面，然后是英文标题
    const chineseTitles = titles.filter(t => /[\u4e00-\u9fa5]/.test(t));
    const englishTitles = titles.filter(t => !/[\u4e00-\u9fa5]/.test(t));
    const titleList = [...chineseTitles, ...englishTitles];
    
    // 过滤掉明显不是宝可梦页面的标题
    const filteredTitles = titleList.filter(title => {
      const lowerTitle = title.toLowerCase();
      return !lowerTitle.includes('列表') && 
             !lowerTitle.includes('分类') && 
             !lowerTitle.includes('tcg') && 
             !lowerTitle.includes('卡牌') &&
             !lowerTitle.includes('游戏') &&
             !lowerTitle.includes('动画');
    });
    
    if (debug) {
      console.log(`  [调试] 过滤后剩余 ${filteredTitles.length} 个页面`);
    }
    
    // 尝试每个页面
    for (const title of filteredTitles) {
      if (debug) {
        console.log(`  [调试] 尝试页面: ${title}`);
      }
      
      const result = await getPageContent(title, englishName, debug);
      if (result && result.chineseName) {
        return result;
      }
      
      await delay(500); // 延迟避免请求过快
    }
    
    // 如果都失败了，尝试直接通过英文名称
    if (debug) {
      console.log(`  [调试] 所有搜索结果都失败，尝试直接标题`);
    }
    return await searchByDirectTitle(englishName, debug);
    
  } catch (error) {
    if (debug) {
      console.log(`  [调试] 错误: ${error.message}`);
      console.log(`  [调试] 堆栈: ${error.stack}`);
    }
    return null;
  }
}

/**
 * 通过直接标题搜索
 */
async function searchByDirectTitle(englishName, debug = false) {
  // 尝试多种标题格式
  const titleVariants = [
    englishName.charAt(0).toUpperCase() + englishName.slice(1), // 首字母大写
    englishName.toUpperCase(), // 全大写
    englishName.toLowerCase(), // 全小写
  ];
  
  for (const title of titleVariants) {
    if (debug) {
      console.log(`  [调试] 尝试直接标题: ${title}`);
    }
    
    const result = await getPageContent(title, englishName, debug);
    if (result && result.chineseName) {
      return result;
    }
    
    await delay(500);
  }
  
  return null;
}

/**
 * 获取页面内容并提取数据
 */
async function getPageContent(pageTitle, englishName, debug = false) {
  try {
    // 获取页面内容
    const pageData = await callAPI({
      action: 'query',
      format: 'json',
      prop: 'revisions|images|imageinfo',
      rvprop: 'content',
      titles: pageTitle,
      rvslots: 'main',
      imlimit: 5,
      iiprop: 'url'
    });
    
    if (debug) {
      console.log(`  [调试] API响应:`, JSON.stringify(pageData, null, 2).substring(0, 1000));
      // 保存完整API响应用于调试
      const debugDir = join(projectRoot, 'data', 'scripts', 'debug');
      if (!existsSync(debugDir)) {
        mkdirSync(debugDir, { recursive: true });
      }
      writeFileSync(
        join(debugDir, `api-${englishName}-${pageTitle}.json`), 
        JSON.stringify(pageData, null, 2), 
        'utf8'
      );
      console.log(`  [调试] API响应已保存到: data/scripts/debug/api-${englishName}-${pageTitle}.json`);
    }
    
    if (!pageData || !pageData.query || !pageData.query.pages) {
      if (debug) {
        console.log(`  [调试] API返回空数据`);
      }
      return null;
    }
    
    const pages = pageData.query.pages;
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];
    
    if (page.missing) {
      if (debug) {
        console.log(`  [调试] 页面不存在 (missing)`);
      }
      return null;
    }
    
    if (!page.revisions || !page.revisions[0]) {
      if (debug) {
        console.log(`  [调试] 页面没有revisions数据`);
      }
      return null;
    }
    
    let content = page.revisions[0].slots.main['*'];
    let actualTitle = pageTitle;
    
    // 检查是否是重定向页面
    const redirectMatch = content.match(/^#REDIRECT\s*\[\[([^\]]+)\]\]/i);
    if (redirectMatch) {
      const redirectTarget = redirectMatch[1].split('|')[0].trim();
      if (debug) {
        console.log(`  [调试] 发现重定向: ${pageTitle} -> ${redirectTarget}`);
      }
      actualTitle = redirectTarget;
      
      // 获取重定向目标页面的内容
      const redirectData = await callAPI({
        action: 'query',
        format: 'json',
        prop: 'revisions|images|imageinfo',
        rvprop: 'content',
        titles: redirectTarget,
        rvslots: 'main',
        imlimit: 5,
        iiprop: 'url'
      });
      
      await delay(500);
      
      if (redirectData && redirectData.query && redirectData.query.pages) {
        const redirectPageId = Object.keys(redirectData.query.pages)[0];
        const redirectPage = redirectData.query.pages[redirectPageId];
        if (redirectPage && redirectPage.revisions && redirectPage.revisions[0]) {
          content = redirectPage.revisions[0].slots.main['*'];
          // 更新page对象以获取图片
          Object.assign(page, redirectPage);
        }
      }
    }
    
    if (debug) {
      console.log(`  [调试] 页面内容长度: ${content.length} 字符`);
      console.log(`  [调试] 内容预览: ${content.substring(0, 500)}`);
      // 保存页面内容用于调试
      const debugDir = join(projectRoot, 'data', 'scripts', 'debug');
      if (!existsSync(debugDir)) {
        mkdirSync(debugDir, { recursive: true });
      }
      writeFileSync(
        join(debugDir, `content-${englishName}-${actualTitle}.txt`), 
        content, 
        'utf8'
      );
      console.log(`  [调试] 页面内容已保存到: data/scripts/debug/content-${englishName}-${actualTitle}.txt`);
      
      // 查找所有相关模板
      const templateMatches = [
        ...(content.match(/\{\{Pokémon[\s\S]*?\}\}/gi) || []),
        ...(content.match(/\{\{寶可夢信息框[\s\S]*?\}\}/gi) || []),
        ...(content.match(/\{\{宝可梦信息框[\s\S]*?\}\}/gi) || [])
      ];
      if (templateMatches.length > 0) {
        console.log(`  [调试] 找到 ${templateMatches.length} 个相关模板`);
        templateMatches.forEach((tmpl, idx) => {
          console.log(`  [调试] 模板 ${idx + 1} 预览: ${tmpl.substring(0, 300)}`);
          // 检查模板中是否有name参数
          const nameMatch = tmpl.match(/\|\|?\s*name\s*=\s*([^\n|}\[\]<>"']+)/i);
          if (nameMatch) {
            console.log(`  [调试] 模板 ${idx + 1} 中的name参数: ${nameMatch[1]}`);
          }
        });
      } else {
        console.log(`  [调试] ⚠️  未找到相关模板`);
      }
    }
    
    // 验证页面是否包含英文名称（在name1参数中）
    const escapedName = englishName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const namePattern = new RegExp(`name1\\s*=\\s*${escapedName}`, 'i');
    const hasEnglishName = namePattern.test(content) || content.toLowerCase().includes(englishName.toLowerCase());
    
    if (debug) {
      console.log(`  [调试] 页面包含英文名称: ${hasEnglishName}`);
    }
    
    // 提取中文名称（传入debug参数）
    const chineseName = extractChineseNameFromContent(content, debug);
    
    if (debug) {
      console.log(`  [调试] 提取的中文名称: ${chineseName || '未找到'}`);
    }
    
    if (!chineseName) {
      return null;
    }
    
    // 如果页面不包含英文名称，但提取到了中文名称，仍然接受（可能是变体名称）
    if (!hasEnglishName && debug) {
      console.log(`  [调试] 警告: 页面不包含英文名称，但提取到了中文名称`);
    }
    
    // 获取图片
    let imageUrl = null;
    
    // 方法1: 从imageinfo获取
    if (page.imageinfo && page.imageinfo.length > 0) {
      imageUrl = page.imageinfo[0].url;
      if (debug) {
        console.log(`  [调试] 从imageinfo获取图片: ${imageUrl}`);
      }
    }
    
    // 方法2: 从images列表获取第一张图片
    if (!imageUrl && page.images && page.images.length > 0) {
      for (const img of page.images) {
        const imgTitle = img.title;
        if (debug) {
          console.log(`  [调试] 尝试获取图片: ${imgTitle}`);
        }
        
        const imageInfo = await callAPI({
          action: 'query',
          format: 'json',
          titles: imgTitle,
          prop: 'imageinfo',
          iiprop: 'url'
        });
        
        await delay(500);
        
        if (imageInfo && imageInfo.query && imageInfo.query.pages) {
          const imgPageId = Object.keys(imageInfo.query.pages)[0];
          const imgPage = imageInfo.query.pages[imgPageId];
          if (imgPage.imageinfo && imgPage.imageinfo[0] && imgPage.imageinfo[0].url) {
            imageUrl = imgPage.imageinfo[0].url;
            if (debug) {
              console.log(`  [调试] 找到图片: ${imageUrl}`);
            }
            break;
          }
        }
      }
    }
    
    // 方法3: 从HTML页面获取
    if (!imageUrl) {
      try {
        const pageUrl = `${WIKI_BASE}/${encodeURIComponent(actualTitle)}`;
        if (debug) {
          console.log(`  [调试] 尝试从HTML获取图片: ${pageUrl}`);
        }
        
        const htmlResponse = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 15000
        });
        
        if (htmlResponse.ok) {
          const html = await htmlResponse.text();
          imageUrl = extractImageUrlFromHTML(html);
          if (debug && imageUrl) {
            console.log(`  [调试] 从HTML提取图片: ${imageUrl}`);
          }
          
          // 保存HTML用于调试
          if (debug) {
            const debugDir = join(projectRoot, 'data', 'scripts', 'debug');
            if (!existsSync(debugDir)) {
              mkdirSync(debugDir, { recursive: true });
            }
            writeFileSync(join(debugDir, `${englishName}-${actualTitle}.html`), html, 'utf8');
            console.log(`  [调试] HTML已保存到: data/scripts/debug/${englishName}-${actualTitle}.html`);
          }
        }
      } catch (e) {
        if (debug) {
          console.log(`  [调试] HTML获取失败: ${e.message}`);
        }
      }
    }
    
    return {
      chineseName: chineseName,
      imageUrl: imageUrl
    };
    
  } catch (error) {
    if (debug) {
      console.log(`  [调试] getPageContent错误: ${error.message}`);
      console.log(`  [调试] 堆栈: ${error.stack}`);
    }
    return null;
  }
}

/**
 * 下载贴图
 */
async function downloadSprite(imageUrl, pokemonId, pokemonName) {
  if (!imageUrl) {
    return null;
  }
  
  try {
    const safeName = (pokemonName || 'unknown')
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
      .substring(0, 20);
    
    const ext = imageUrl.split('.').pop().split('?')[0].toLowerCase() || 'png';
    const filename = `${pokemonId}-${safeName}.${ext}`;
    const filepath = join(SPRITES_DIR, filename);
    
    if (existsSync(filepath)) {
      return filename;
    }
    
    let url = imageUrl;
    if (url.startsWith('//')) {
      url = 'https:' + url;
    } else if (url.startsWith('/')) {
      url = 'https://wiki.52poke.com' + url;
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://wiki.52poke.com/'
      },
      timeout: 20000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (buffer.length < 100) {
      throw new Error('文件太小，可能不是有效的图片');
    }
    
    writeFileSync(filepath, buffer);
    
    return filename;
    
  } catch (error) {
    console.error(`[错误] 下载贴图失败 (${pokemonId}):`, error.message);
    return null;
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    start: parseInt(args.find(a => a.startsWith('--start='))?.split('=')[1]) || 0,
    count: parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1]) || 50,
    updateOnly: args.includes('--update-only'),
    namesOnly: args.includes('--names-only'),
    debug: args.includes('--debug') || args.includes('-d')
  };
  
  console.log('='.repeat(60));
  console.log('52poke百科数据获取工具');
  console.log('='.repeat(60));
  console.log(`目标网站: ${WIKI_BASE}`);
  console.log(`选项:`, options);
  console.log('');
  
  // 加载现有数据
  const existingData = loadExistingData();
  console.log(`[加载] 现有数据: ${Object.keys(existingData).length} 个宝可梦\n`);
  
  // 获取宝可梦列表
  const pokemonList = getPokemonListFromShowdown();
  
  if (pokemonList.length === 0) {
    console.error('[错误] 无法获取宝可梦列表');
    console.error('请确保以下文件之一存在:');
    console.error('  - data/data/pokedex.json');
    console.error('  - data/chinese/pokedex.json');
    process.exit(1);
  }
  
  console.log(`[列表] 共 ${pokemonList.length} 个宝可梦\n`);
  
  // 过滤需要处理的宝可梦
  let toProcess = pokemonList;
  
  if (options.updateOnly) {
    toProcess = pokemonList.filter(p => {
      const key = p.nameId || p.name?.toLowerCase();
      return !existingData[key] || !existingData[key].chineseName;
    });
    console.log(`[过滤] 需要更新的宝可梦: ${toProcess.length} 个\n`);
  }
  
  // 应用范围限制
  toProcess = toProcess.slice(options.start, options.start + options.count);
  console.log(`[范围] 处理范围: ${options.start} - ${options.start + toProcess.length - 1}\n`);
  
  // 处理每个宝可梦
  const results = { ...existingData };
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  
  for (let i = 0; i < toProcess.length; i++) {
    const pokemon = toProcess[i];
    const key = pokemon.nameId || pokemon.name?.toLowerCase();
    
    console.log(`[${i + 1}/${toProcess.length}] 处理: ${pokemon.name} (#${pokemon.id})`);
    
    if (options.updateOnly && existingData[key]?.chineseName) {
      console.log(`  ⏭️  已存在，跳过`);
      skipCount++;
      continue;
    }
    
    try {
      const data = await searchPokemonByName(pokemon.name, options.debug);
      
      if (data && data.chineseName) {
        if (!results[key]) {
          results[key] = {};
        }
        
        results[key].chineseName = data.chineseName;
        results[key].number = pokemon.id;
        results[key].englishName = pokemon.name;
        
        console.log(`  ✅ 中文名称: ${data.chineseName}`);
        
        // 下载贴图
        if (!options.namesOnly && data.imageUrl) {
          const spriteFile = await downloadSprite(data.imageUrl, pokemon.id, data.chineseName);
          if (spriteFile) {
            results[key].spriteFile = spriteFile;
            results[key].spriteUrl = data.imageUrl;
            console.log(`  ✅ 贴图: ${spriteFile}`);
          } else {
            console.log(`  ⚠️  贴图下载失败`);
          }
        }
        
        successCount++;
        
        // 每10个保存一次
        if ((i + 1) % 10 === 0) {
          saveData(results);
        }
      } else {
        console.log(`  ⚠️  未找到数据`);
        failCount++;
      }
      
    } catch (error) {
      console.error(`  ❌ 错误: ${error.message}`);
      failCount++;
    }
    
    // 延迟
    if (i < toProcess.length - 1) {
      await delay(REQUEST_DELAY);
    }
  }
  
  // 最终保存
  saveData(results);
  
  console.log('\n' + '='.repeat(60));
  console.log('完成！');
  console.log(`成功: ${successCount} 个`);
  console.log(`失败: ${failCount} 个`);
  console.log(`跳过: ${skipCount} 个`);
  console.log(`总计: ${Object.keys(results).length} 个宝可梦`);
  console.log(`数据文件: ${CHINESE_DATA_FILE}`);
  if (!options.namesOnly) {
    console.log(`贴图目录: ${SPRITES_DIR}`);
  }
  console.log('='.repeat(60));
}

// 运行
main().catch(error => {
  console.error('[致命错误]', error);
  process.exit(1);
});

