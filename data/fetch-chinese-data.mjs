#!/usr/bin/env node
/**
 * 从52poke百科获取中文资料
 * 使用MediaWiki API获取宝可梦、技能、特性、道具的中文名称
 * 
 * 使用方法：
 *   node data/fetch-chinese-data.mjs [类型] [开始索引] [数量]
 * 
 *   类型: pokedex | moves | abilities | items | all
 *   开始索引: 从第几个开始（默认0）
 *   数量: 处理多少个（默认全部，或指定数量）
 * 
 * 示例：
 *   node data/fetch-chinese-data.mjs pokedex 0 50  # 处理前50个宝可梦
 *   node data/fetch-chinese-data.mjs all           # 处理所有类型
 * 
 * 输出：
 *   data/chinese/pokedex.json
 *   data/chinese/moves.json
 *   data/chinese/abilities.json
 *   data/chinese/items.json
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

// 52poke百科API地址
const API_BASE = 'https://wiki.52poke.com/api.php';
const OUTPUT_DIR = join(process.cwd(), 'data', 'chinese');

// 确保输出目录存在
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 请求延迟（毫秒）
const REQUEST_DELAY = 800;

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 调用MediaWiki API
 */
async function callAPI(params) {
  const url = new URL(API_BASE);
  Object.keys(params).forEach(key => {
    url.searchParams.append(key, params[key]);
  });

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API调用失败: ${error.message}`);
    return null;
  }
}

/**
 * 从页面内容中提取中文名称
 */
function extractChineseNameFromContent(content, type, pageTitle = '') {
  if (!content) return null;

  // 52poke百科的模板格式
  // 宝可梦: {{Pokémon|name1=英文名|name2=日文名|name3=中文名|...}}
  // 或者可能是多行格式：
  // {{Pokémon
  // |name1=Bulbasaur
  // |name2=フシギダネ
  // |name3=妙蛙种子
  // |...}}

  let templateName = 'Pokémon';
  if (type === 'moves') templateName = '招式';
  else if (type === 'abilities') templateName = '特性';
  else if (type === 'items') templateName = '道具';

  // 匹配模板（支持单行和多行格式）
  // 使用非贪婪匹配，但需要考虑多行情况
  const templateRegex = new RegExp(`\\{\\{${templateName}(?:[^}]|\\n)*?\\}\\}`, 'i');
  let templateMatch = content.match(templateRegex);
  
  // 如果没有匹配到，尝试匹配多行格式（使用 [\s\S] 匹配包括换行符的所有字符）
  if (!templateMatch) {
    const multiLineRegex = new RegExp(`\\{\\{${templateName}[\\s\\S]*?\\}\\}`, 'i');
    templateMatch = content.match(multiLineRegex);
  }
  
  if (templateMatch) {
    const templateContent = templateMatch[0];
    
    // 提取name3参数（中文名称）
    // 52poke的命名规则：name1=英文，name2=日文，name3=中文（简体），name4=中文（繁体）
    // 支持单行和多行格式：name3=值 或 |name3=值
    const name3Patterns = [
      /[|]\s*name3\s*=\s*([^\n|}\[\]<>]+)/i,  // 多行格式：|name3=值
      /name3\s*=\s*([^\n|}\[\]<>]+)/i,        // 单行格式：name3=值
    ];
    
    for (const pattern of name3Patterns) {
      const match = templateContent.match(pattern);
      if (match && match[1]) {
        const chineseName = match[1].trim();
        // 清理可能的额外字符
        return chineseName.replace(/^["']|["']$/g, '').trim();
      }
    }
    
    // 如果没有name3，尝试name4（繁体中文）
    const name4Patterns = [
      /[|]\s*name4\s*=\s*([^\n|}\[\]<>]+)/i,
      /name4\s*=\s*([^\n|}\[\]<>]+)/i,
    ];
    
    for (const pattern of name4Patterns) {
      const match = templateContent.match(pattern);
      if (match && match[1]) {
        const chineseName = match[1].trim();
        return chineseName.replace(/^["']|["']$/g, '').trim();
      }
    }
  }

  // 如果模板中找不到，检查页面标题是否是中文
  // 52poke百科的页面标题通常是中文名称
  if (pageTitle && /[\u4e00-\u9fa5]/.test(pageTitle)) {
    // 清理标题中的额外信息（如"（XXX）"）
    const cleanedTitle = pageTitle.replace(/\s*\([^)]*\)\s*$/, '').trim();
    // 如果标题不包含"列表"、"分类"等关键词，可能是有效的中文名称
    if (!cleanedTitle.includes('列表') && 
        !cleanedTitle.includes('分类') && 
        !cleanedTitle.includes('TCG') &&
        !cleanedTitle.includes('EX') &&
        !cleanedTitle.includes('卡牌') &&
        !cleanedTitle.includes('游戏') &&
        !cleanedTitle.includes('动画') &&
        cleanedTitle.length > 0 &&
        cleanedTitle.length < 20) {
      // 验证标题是否真的是中文（至少包含中文字符）
      if (/[\u4e00-\u9fa5]/.test(cleanedTitle)) {
        return cleanedTitle;
      }
    }
  }

  return null;
}

/**
 * 通过英文名称搜索页面并提取中文名称
 */
async function searchPageByExactName(englishName, type = '') {
  // 方法1: 使用开放搜索API（更可靠）
  const openSearchParams = {
    action: 'opensearch',
    format: 'json',
    search: englishName,
    namespace: '0',
    limit: '10'
  };

  const openSearchData = await callAPI(openSearchParams);
  await delay(REQUEST_DELAY);

  if (openSearchData && openSearchData[1] && openSearchData[1].length > 0) {
    // openSearchData[1] 是标题数组
    // 优先处理中文标题的页面
    const titles = openSearchData[1];
    const chineseTitles = titles.filter(t => /[\u4e00-\u9fa5]/.test(t));
    const englishTitles = titles.filter(t => !/[\u4e00-\u9fa5]/.test(t));
    
    // 先处理中文标题
    const titleList = [...chineseTitles, ...englishTitles];
    
    for (const title of titleList) {
      // 跳过明显不是我们要找的页面
      if (title.includes('列表') || title.includes('分类') || 
          title.includes('TCG') || title.includes('卡牌') || 
          title.includes('游戏') || title.includes('动画')) {
        continue;
      }

      // 获取页面内容
      const pageData = await callAPI({
        action: 'query',
        format: 'json',
        prop: 'revisions',
        rvprop: 'content',
        titles: title,
        rvslots: 'main'
      });
      
      await delay(REQUEST_DELAY);
      
      if (pageData && pageData.query && pageData.query.pages) {
        const page = Object.values(pageData.query.pages)[0];
        if (page && page.revisions && page.revisions[0]) {
          let content = page.revisions[0].slots.main['*'];
          let actualTitle = title;
          
          // 检查是否是重定向页面
          const redirectMatch = content.match(/^#REDIRECT\s*\[\[([^\]]+)\]\]/i);
          if (redirectMatch) {
            // 这是一个重定向页面，获取重定向目标
            const redirectTarget = redirectMatch[1].split('|')[0].trim(); // 处理 [[目标|显示文本]] 格式
            actualTitle = redirectTarget;
            
            // 获取重定向目标页面的内容
            const redirectPageData = await callAPI({
              action: 'query',
              format: 'json',
              prop: 'revisions',
              rvprop: 'content',
              titles: redirectTarget,
              rvslots: 'main'
            });
            
            await delay(REQUEST_DELAY);
            
            if (redirectPageData && redirectPageData.query && redirectPageData.query.pages) {
              const redirectPage = Object.values(redirectPageData.query.pages)[0];
              if (redirectPage && redirectPage.revisions && redirectPage.revisions[0]) {
                content = redirectPage.revisions[0].slots.main['*'];
              }
            }
          }
          
          // 验证页面是否包含英文名称
          const escapedName = englishName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const namePattern = new RegExp(`name1\\s*=\\s*${escapedName}`, 'i');
          
          // 首先尝试从内容中提取中文名称（无论是否匹配到name1）
          const chineseName = extractChineseNameFromContent(content, type, actualTitle);
          
          if (chineseName && /[\u4e00-\u9fa5]/.test(chineseName)) {
            // 如果成功提取到中文名称，验证页面是否包含英文名称
            if (namePattern.test(content)) {
              return chineseName;
            }
            // 即使没有匹配到name1，但如果提取到了中文名称，也可以接受
            // 但需要额外验证：检查页面内容是否包含相关的英文名称（可能在不同的字段中）
            if (content.toLowerCase().includes(englishName.toLowerCase())) {
              return chineseName;
            }
          }
          
          // 如果提取失败，但页面标题（或重定向目标）是中文且看起来合理，使用标题作为备选
          if (type === 'pokedex' && /[\u4e00-\u9fa5]/.test(actualTitle)) {
            const cleanedTitle = actualTitle.replace(/\s*\([^)]*\)\s*$/, '').trim();
            if (!cleanedTitle.includes('列表') && 
                !cleanedTitle.includes('分类') && 
                !cleanedTitle.includes('TCG') &&
                !cleanedTitle.includes('EX') &&
                !cleanedTitle.includes('卡牌') &&
                !cleanedTitle.includes('游戏') &&
                !cleanedTitle.includes('动画') &&
                cleanedTitle.length < 20 &&
                cleanedTitle.length > 0) {
              // 验证页面内容是否包含英文名称
              if (namePattern.test(content) || content.toLowerCase().includes(englishName.toLowerCase())) {
                return cleanedTitle;
              }
              // 如果重定向到了中文页面，即使没有匹配到英文名称，也使用中文标题
              // 因为重定向本身就是一个很好的验证
              if (redirectMatch) {
                return cleanedTitle;
              }
            }
          }
        }
      }
    }
  }

  // 方法2: 如果开放搜索失败，尝试普通搜索
  const searchParams = {
    action: 'query',
    format: 'json',
    list: 'search',
    srsearch: englishName,
    srnamespace: '0',
    srlimit: '10'
  };

  const searchData = await callAPI(searchParams);
  await delay(REQUEST_DELAY);
  
  if (searchData && searchData.query && searchData.query.search && searchData.query.search.length > 0) {
    // 优先处理中文标题的页面
    const results = searchData.query.search;
    const chineseResults = results.filter(r => /[\u4e00-\u9fa5]/.test(r.title));
    const englishResults = results.filter(r => !/[\u4e00-\u9fa5]/.test(r.title));
    const resultList = [...chineseResults, ...englishResults];
    
    for (const result of resultList) {
      const title = result.title;
      
      // 跳过明显不是我们要找的页面
      if (title.includes('列表') || title.includes('分类') || 
          title.includes('TCG') || title.includes('卡牌') || 
          title.includes('游戏') || title.includes('动画')) {
        continue;
      }

      // 获取页面内容
      const pageData = await callAPI({
        action: 'query',
        format: 'json',
        prop: 'revisions',
        rvprop: 'content',
        titles: title,
        rvslots: 'main'
      });
      
      await delay(REQUEST_DELAY);
      
      if (pageData && pageData.query && pageData.query.pages) {
        const page = Object.values(pageData.query.pages)[0];
        if (page && page.revisions && page.revisions[0]) {
          let content = page.revisions[0].slots.main['*'];
          let actualTitle = title;
          
          // 检查是否是重定向页面
          const redirectMatch = content.match(/^#REDIRECT\s*\[\[([^\]]+)\]\]/i);
          if (redirectMatch) {
            // 这是一个重定向页面，获取重定向目标
            const redirectTarget = redirectMatch[1].split('|')[0].trim();
            actualTitle = redirectTarget;
            
            // 获取重定向目标页面的内容
            const redirectPageData = await callAPI({
              action: 'query',
              format: 'json',
              prop: 'revisions',
              rvprop: 'content',
              titles: redirectTarget,
              rvslots: 'main'
            });
            
            await delay(REQUEST_DELAY);
            
            if (redirectPageData && redirectPageData.query && redirectPageData.query.pages) {
              const redirectPage = Object.values(redirectPageData.query.pages)[0];
              if (redirectPage && redirectPage.revisions && redirectPage.revisions[0]) {
                content = redirectPage.revisions[0].slots.main['*'];
              }
            }
          }
          
          // 验证页面是否包含英文名称
          const escapedName = englishName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const namePattern = new RegExp(`name1\\s*=\\s*${escapedName}`, 'i');
          
          // 首先尝试从内容中提取中文名称（无论是否匹配到name1）
          const chineseName = extractChineseNameFromContent(content, type, actualTitle);
          
          if (chineseName && /[\u4e00-\u9fa5]/.test(chineseName)) {
            // 如果成功提取到中文名称，验证页面是否包含英文名称
            if (namePattern.test(content)) {
              return chineseName;
            }
            // 即使没有匹配到name1，但如果提取到了中文名称，也可以接受
            if (content.toLowerCase().includes(englishName.toLowerCase())) {
              return chineseName;
            }
            // 如果是重定向页面，重定向目标就是中文名称
            if (redirectMatch) {
              return chineseName;
            }
          }
          
          // 如果提取失败，但页面标题（或重定向目标）是中文且看起来合理，使用标题作为备选
          if (type === 'pokedex' && /[\u4e00-\u9fa5]/.test(actualTitle)) {
            const cleanedTitle = actualTitle.replace(/\s*\([^)]*\)\s*$/, '').trim();
            if (!cleanedTitle.includes('列表') && 
                !cleanedTitle.includes('分类') && 
                !cleanedTitle.includes('TCG') &&
                !cleanedTitle.includes('EX') &&
                !cleanedTitle.includes('卡牌') &&
                !cleanedTitle.includes('游戏') &&
                !cleanedTitle.includes('动画') &&
                cleanedTitle.length < 20 &&
                cleanedTitle.length > 0) {
              // 验证页面内容是否包含英文名称
              if (namePattern.test(content) || content.toLowerCase().includes(englishName.toLowerCase())) {
                return cleanedTitle;
              }
              // 如果重定向到了中文页面，即使没有匹配到英文名称，也使用中文标题
              if (redirectMatch) {
                return cleanedTitle;
              }
            }
          }
        }
      }
    }
  }

  return null;
}

/**
 * 从数据文件中提取英文名称列表（改进版）
 */
function extractEnglishNames(dataFile) {
  const dataPath = join(process.cwd(), 'data', dataFile);
  
  if (!existsSync(dataPath)) {
    console.error(`文件不存在: ${dataPath}`);
    return {};
  }

  const content = readFileSync(dataPath, 'utf8');
  const names = {};
  
  try {
    // 尝试提取export const的对象
    // 格式: export const BattleXxx = { ... };
    let objContent = '';
    
    if (dataFile === 'moves.js') {
      // moves.js是单行JSON，需要特殊处理
      const match = content.match(/export const BattleMovedex = ({.+});/s);
      if (match) {
        objContent = match[1];
      }
    } else {
      // 其他文件可能是多行格式
      const match = content.match(/export const Battle\w+ = ({[\s\S]+?});/);
      if (match) {
        objContent = match[1];
      }
    }

    if (objContent) {
      // 使用正则表达式提取键值对
      // 匹配格式: "key": { ... "name": "English Name" ... }
      // 或者: key: { ... name: "English Name" ... }
      const patterns = [
        // 匹配 "key": { ... "name": "value" ... }
        /"([^"]+)":\s*\{[^}]*?"name":\s*"([^"]+)"/g,
        // 匹配 key: { ... name: "value" ... }
        /(\w+):\s*\{[^}]*?name:\s*"([^"]+)"/g,
        // 匹配单行格式（moves.js）
        /"([^"]+)":\{"num":\d+[^}]*"name":"([^"]+)"/g
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(objContent)) !== null) {
          const key = match[1];
          const englishName = match[2];
          if (!names[key]) {
            names[key] = englishName;
          }
        }
      }
    } else {
      // 如果无法提取对象内容，使用简单的正则匹配
      const patterns = [
        /(\w+):\s*\{[^}]*?name:\s*"([^"]+)"/g,
        /"(\w+)":\s*\{[^}]*?"name":\s*"([^"]+)"/g
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const key = match[1];
          const englishName = match[2];
          if (!names[key]) {
            names[key] = englishName;
          }
        }
      }
    }
  } catch (error) {
    console.error(`解析 ${dataFile} 失败: ${error.message}`);
  }

  return names;
}

/**
 * 加载已有的中文数据
 */
function loadExistingChineseData(type) {
  const filePath = join(OUTPUT_DIR, `${type}.json`);
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`加载已有数据失败: ${error.message}`);
      return {};
    }
  }
  return {};
}

/**
 * 保存中文数据
 */
function saveChineseData(type, data) {
  const filePath = join(OUTPUT_DIR, `${type}.json`);
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * 批量获取中文名称
 */
async function fetchChineseNames(type, englishNames, startIndex = 0, count = null) {
  // 加载已有数据
  const existingData = loadExistingChineseData(type);
  const chineseMap = { ...existingData };
  
  const entries = Object.entries(englishNames);
  const endIndex = count ? Math.min(startIndex + count, entries.length) : entries.length;
  const targetEntries = entries.slice(startIndex, endIndex);
  
  const total = targetEntries.length;
  let processed = 0;
  let success = 0;
  let failed = 0;

  console.log(`\n开始获取${type}中文名称...`);
  console.log(`  总数量: ${entries.length}`);
  console.log(`  本次处理: ${startIndex} - ${endIndex - 1} (共 ${total} 个)`);
  console.log(`  已有数据: ${Object.keys(existingData).length} 个\n`);

  for (const [key, englishName] of targetEntries) {
    // 如果已有数据，跳过
    if (chineseMap[key]) {
      processed++;
      continue;
    }

    processed++;

    try {
      const chineseName = await searchPageByExactName(englishName, type);
      await delay(REQUEST_DELAY);

      if (chineseName) {
        // 验证提取到的名称不是英文（至少包含一个中文字符）
        if (/[\u4e00-\u9fa5]/.test(chineseName)) {
          chineseMap[key] = chineseName;
          success++;
          console.log(`  [${processed}/${total}] ✅ ${englishName} -> ${chineseName}`);
        } else {
          // 如果提取到的名称是英文，说明提取失败
          failed++;
          console.log(`  [${processed}/${total}] ⚠️  ${englishName} -> ${chineseName} (英文名称，跳过)`);
        }
        
        // 每10个保存一次，防止数据丢失
        if (processed % 10 === 0) {
          saveChineseData(type, chineseMap);
        }
      } else {
        failed++;
        console.log(`  [${processed}/${total}] ❌ ${englishName} -> 未找到`);
      }
    } catch (error) {
      failed++;
      console.error(`  [${processed}/${total}] ❌ ${englishName} 获取失败: ${error.message}`);
    }

    // 显示进度
    if (processed % 5 === 0) {
      console.log(`  进度: ${processed}/${total} (成功: ${success}, 失败: ${failed})`);
    }
  }

  // 最终保存
  saveChineseData(type, chineseMap);

  console.log(`\n${type} 完成:`);
  console.log(`  总计: ${total} 个`);
  console.log(`  成功: ${success} 个`);
  console.log(`  失败: ${failed} 个`);
  console.log(`  已有: ${Object.keys(existingData).length} 个`);
  console.log(`  新增: ${Object.keys(chineseMap).length - Object.keys(existingData).length} 个`);

  return chineseMap;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const type = args[0] || 'all';
  const startIndex = parseInt(args[1]) || 0;
  const count = args[2] ? parseInt(args[2]) : null;

  console.log('='.repeat(60));
  console.log('从52poke百科获取中文资料');
  console.log('='.repeat(60));
  console.log(`类型: ${type}`);
  console.log(`开始索引: ${startIndex}`);
  console.log(`数量: ${count || '全部'}`);

  // 提取英文名称
  console.log('\n提取英文名称...');
  const pokedexEnglish = extractEnglishNames('pokedex.js');
  const movesEnglish = extractEnglishNames('moves.js');
  const abilitiesEnglish = extractEnglishNames('abilities.js');
  const itemsEnglish = extractEnglishNames('items.js');

  console.log(`  宝可梦: ${Object.keys(pokedexEnglish).length} 个`);
  console.log(`  技能: ${Object.keys(movesEnglish).length} 个`);
  console.log(`  特性: ${Object.keys(abilitiesEnglish).length} 个`);
  console.log(`  道具: ${Object.keys(itemsEnglish).length} 个`);

  // 根据类型处理
  if (type === 'pokedex' || type === 'all') {
    await fetchChineseNames('pokedex', pokedexEnglish, startIndex, count);
  }

  if (type === 'moves' || type === 'all') {
    const movesStart = type === 'all' ? 0 : startIndex;
    await fetchChineseNames('moves', movesEnglish, movesStart, count);
  }

  if (type === 'abilities' || type === 'all') {
    const abilitiesStart = type === 'all' ? 0 : startIndex;
    await fetchChineseNames('abilities', abilitiesEnglish, abilitiesStart, count);
  }

  if (type === 'items' || type === 'all') {
    const itemsStart = type === 'all' ? 0 : startIndex;
    await fetchChineseNames('items', itemsEnglish, itemsStart, count);
  }

  console.log('\n' + '='.repeat(60));
  console.log('完成！中文资料已保存到 data/chinese/ 目录');
  console.log('='.repeat(60));
  console.log('\n提示：');
  console.log('  - 数据会增量保存，可以分批处理');
  console.log('  - 使用 node data/fetch-chinese-data.mjs pokedex 100 50 处理第100-149个');
  console.log('  - 已存在的数据会被跳过，不会重复获取');
}

// 运行主函数
main().catch(error => {
  console.error('\n发生错误:', error);
  process.exit(1);
});
