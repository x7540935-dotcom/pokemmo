#!/usr/bin/env node
/**
 * 为缺失贴图的宝可梦下载贴图
 * 从52poke百科或其他来源下载缺失的贴图
 * 
 * 使用方法：
 *   node data/scripts/download-missing-sprites.mjs [选项]
 * 
 * 选项：
 *   --file=FILE      从文件读取缺失列表（JSON格式，由check-missing-sprites.mjs生成）
 *   --start=N        从第N个开始（默认0）
 *   --count=N        下载N个（默认全部）
 *   --update-only    只更新已有spriteUrl但未下载的
 *   --debug          启用调试模式
 * 
 * 示例：
 *   node data/scripts/download-missing-sprites.mjs --file=missing-sprites.json
 *   node data/scripts/download-missing-sprites.mjs --file=missing-sprites.json --start=0 --count=50
 *   node data/scripts/download-missing-sprites.mjs --file=missing-sprites.json --update-only
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname, resolve, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// 配置
const WIKI_API = 'https://wiki.52poke.com/api.php';
const WIKI_BASE = 'https://wiki.52poke.com/wiki';
const OUTPUT_DIR = join(projectRoot, 'data', 'chinese');
const SPRITES_DIR = join(projectRoot, 'cache', 'sprites');
const CHINESE_DATA_FILE = join(OUTPUT_DIR, 'pokedex-cn.json');

// 确保目录存在
[SPRITES_DIR, OUTPUT_DIR].forEach(dir => {
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
 * 加载缺失贴图列表
 */
function loadMissingList(filePath) {
  if (!existsSync(filePath)) {
    console.error(`[错误] 文件不存在: ${filePath}`);
    process.exit(1);
  }
  
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    if (data.missing && Array.isArray(data.missing)) {
      return data.missing;
    } else if (Array.isArray(data)) {
      return data;
    } else {
      console.error('[错误] 文件格式不正确，应该是包含missing数组的JSON');
      process.exit(1);
    }
  } catch (e) {
    console.error(`[错误] 无法读取文件: ${e.message}`);
    process.exit(1);
  }
}

/**
 * 加载现有的中文数据
 */
function loadExistingData() {
  if (existsSync(CHINESE_DATA_FILE)) {
    try {
      return JSON.parse(readFileSync(CHINESE_DATA_FILE, 'utf8'));
    } catch (e) {
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
 * 从52poke百科获取宝可梦的图片
 */
async function getPokemonImage(pokemonName, chineseName, debug = false) {
  try {
    if (debug) {
      console.log(`  [调试] 搜索图片: ${pokemonName} (${chineseName})`);
    }
    
    // 使用OpenSearch找到页面
    const openSearchData = await callAPI({
      action: 'opensearch',
      format: 'json',
      search: pokemonName,
      namespace: '0',
      limit: '5'
    });
    
    if (!openSearchData || !Array.isArray(openSearchData) || !openSearchData[1] || openSearchData[1].length === 0) {
      // 尝试使用中文名称搜索
      if (chineseName) {
        const chineseSearch = await callAPI({
          action: 'opensearch',
          format: 'json',
          search: chineseName,
          namespace: '0',
          limit: '5'
        });
        
        if (chineseSearch && Array.isArray(chineseSearch) && chineseSearch[1] && chineseSearch[1].length > 0) {
          openSearchData[1] = chineseSearch[1];
        }
      }
      
      if (!openSearchData || !openSearchData[1] || openSearchData[1].length === 0) {
        if (debug) {
          console.log(`  [调试] 未找到相关页面`);
        }
        return null;
      }
    }
    
    const titles = openSearchData[1];
    // 过滤掉列表、分类等页面
    const validTitles = titles.filter(t => {
      const lower = t.toLowerCase();
      return !lower.includes('列表') && 
             !lower.includes('分类') && 
             !lower.includes('tcg') && 
             !lower.includes('卡牌');
    });
    
    if (validTitles.length === 0) {
      if (debug) {
        console.log(`  [调试] 没有有效的页面`);
      }
      return null;
    }
    
    // 尝试每个页面
    for (const title of validTitles) {
      if (debug) {
        console.log(`  [调试] 尝试页面: ${title}`);
      }
      
      // 获取页面图片
      const pageData = await callAPI({
        action: 'query',
        format: 'json',
        prop: 'images|imageinfo',
        titles: title,
        imlimit: 10,
        iiprop: 'url'
      });
      
      await delay(500);
      
      if (!pageData || !pageData.query || !pageData.query.pages) {
        continue;
      }
      
      const pages = pageData.query.pages;
      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];
      
      // 方法1: 从imageinfo获取（如果页面有主图片）
      if (page.imageinfo && page.imageinfo.length > 0) {
        for (const imgInfo of page.imageinfo) {
          if (imgInfo.url) {
            // 检查是否是宝可梦图片（通常包含pokemon、sprite等关键词，或文件大小合理）
            const url = imgInfo.url;
            if (url.includes('pokemon') || url.includes('sprite') || 
                url.includes('52poke') || url.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
              if (debug) {
                console.log(`  [调试] ✅ 找到图片: ${url}`);
              }
              return url;
            }
          }
        }
      }
      
      // 方法2: 从images列表获取
      if (page.images && page.images.length > 0) {
        for (const img of page.images) {
          const imgTitle = img.title;
          
          // 跳过非图片文件
          if (!imgTitle.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
            continue;
          }
          
          // 跳过明显不是宝可梦图片的文件
          if (imgTitle.includes('Icon') || imgTitle.includes('icon') || 
              imgTitle.includes('Logo') || imgTitle.includes('logo')) {
            continue;
          }
          
          // 获取图片URL
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
              const url = imgPage.imageinfo[0].url;
              if (debug) {
                console.log(`  [调试] ✅ 找到图片: ${url}`);
              }
              return url;
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    if (debug) {
      console.log(`  [调试] 错误: ${error.message}`);
    }
    return null;
  }
}

/**
 * 下载贴图
 */
async function downloadSprite(imageUrl, meta = {}, debug = false) {
  if (!imageUrl) {
    return null;
  }
  
  try {
    const { number, englishName, chineseName, key } = meta;
    
    const sanitizePart = (value, fallback = 'unknown') => {
      const str = (value && value !== '?' ? String(value) : fallback).trim();
      const sanitized = str.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').replace(/^_+|_+$/g, '');
      return sanitized || fallback;
    };
    
    const idPart = sanitizePart(number, englishName || key || 'pkmn').substring(0, 20);
    const namePart = sanitizePart(chineseName || englishName || key, 'pokemon').substring(0, 20);
    
    const ext = imageUrl.split('.').pop().split('?')[0].toLowerCase() || 'png';
    const filename = `${idPart}-${namePart}.${ext}`;
    const filepath = join(SPRITES_DIR, filename);
    
    if (existsSync(filepath)) {
      if (debug) {
        console.log(`  [调试] 文件已存在: ${filename}`);
      }
      return filename;
    }
    
    let url = imageUrl;
    if (url.startsWith('//')) {
      url = 'https:' + url;
    } else if (url.startsWith('/')) {
      url = 'https://wiki.52poke.com' + url;
    }
    
    if (debug) {
      console.log(`  [调试] 下载图片: ${url}`);
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
    
    if (debug) {
      console.log(`  [调试] ✅ 下载成功: ${filename} (${buffer.length} 字节)`);
    }
    
    return filename;
    
  } catch (error) {
    if (debug) {
      console.log(`  [调试] ❌ 下载失败: ${error.message}`);
    }
    return null;
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    file: args.find(a => a.startsWith('--file='))?.split('=')[1] || 'missing-sprites.json',
    start: parseInt(args.find(a => a.startsWith('--start='))?.split('=')[1]) || 0,
    count: parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1]) || null,
    updateOnly: args.includes('--update-only'),
    debug: args.includes('--debug') || args.includes('-d')
  };
  
  // 解析文件路径：优先使用绝对路径或相对于当前工作目录
  const resolveFilePath = (filePath) => {
    if (!filePath) return null;
    if (isAbsolute(filePath)) return filePath;
    const cwdPath = resolve(process.cwd(), filePath);
    if (existsSync(cwdPath)) {
      return cwdPath;
    }
    return join(projectRoot, 'data', 'scripts', filePath);
  };
  options.file = resolveFilePath(options.file);
  
  console.log('='.repeat(60));
  console.log('下载缺失贴图');
  console.log('='.repeat(60));
  console.log(`缺失列表文件: ${options.file}`);
  console.log(`选项:`, options);
  console.log('');
  
  // 加载缺失列表
  const missingList = loadMissingList(options.file);
  console.log(`[加载] 找到 ${missingList.length} 个缺失贴图的宝可梦\n`);
  
  // 加载现有数据
  const existingData = loadExistingData();
  
  // 过滤需要处理的宝可梦
  let toProcess = missingList;
  
  if (options.updateOnly) {
    // 只处理已有spriteUrl但未下载的
    toProcess = missingList.filter(p => p.spriteUrl && !p.spriteFile);
    console.log(`[过滤] 需要更新的宝可梦: ${toProcess.length} 个\n`);
  }
  
  // 应用范围限制
  if (options.start > 0 || options.count) {
    toProcess = toProcess.slice(options.start, options.count ? options.start + options.count : undefined);
    console.log(`[范围] 处理范围: ${options.start} - ${options.start + toProcess.length - 1}\n`);
  }
  
  // 处理每个宝可梦
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  
  for (let i = 0; i < toProcess.length; i++) {
    const pokemon = toProcess[i];
    const key = pokemon.key;
    const number = pokemon.number || '?';
    const englishName = pokemon.englishName || key;
    const chineseName = pokemon.chineseName;
    
    console.log(`[${i + 1}/${toProcess.length}] 处理: ${englishName} (${chineseName}) #${number}`);
    
    // 如果已有spriteUrl，直接下载
    if (pokemon.spriteUrl) {
      console.log(`  使用已有spriteUrl: ${pokemon.spriteUrl}`);
      const spriteFile = await downloadSprite(
        pokemon.spriteUrl,
        { number, englishName, chineseName, key },
        options.debug
      );
      if (spriteFile) {
        if (!existingData[key]) {
          existingData[key] = {};
        }
        existingData[key].spriteFile = spriteFile;
        existingData[key].spriteUrl = pokemon.spriteUrl;
        existingData[key].chineseName = chineseName;
        existingData[key].englishName = englishName;
        existingData[key].number = number;
        console.log(`  ✅ 下载成功: ${spriteFile}`);
        successCount++;
      } else {
        console.log(`  ❌ 下载失败`);
        failCount++;
      }
    } else {
      // 从52poke百科获取图片
      console.log(`  从52poke百科搜索图片...`);
      const imageUrl = await getPokemonImage(englishName, chineseName, options.debug);
      
      if (imageUrl) {
        const spriteFile = await downloadSprite(
          imageUrl,
          { number, englishName, chineseName, key },
          options.debug
        );
        if (spriteFile) {
          if (!existingData[key]) {
            existingData[key] = {};
          }
          existingData[key].spriteFile = spriteFile;
          existingData[key].spriteUrl = imageUrl;
          existingData[key].chineseName = chineseName;
          existingData[key].englishName = englishName;
          existingData[key].number = number;
          console.log(`  ✅ 下载成功: ${spriteFile}`);
          successCount++;
        } else {
          console.log(`  ❌ 下载失败`);
          failCount++;
        }
      } else {
        console.log(`  ⚠️  未找到图片URL`);
        failCount++;
      }
    }
    
    // 每10个保存一次
    if ((i + 1) % 10 === 0) {
      saveData(existingData);
      console.log(`  [保存] 已保存进度`);
    }
    
    // 延迟
    if (i < toProcess.length - 1) {
      await delay(REQUEST_DELAY);
    }
  }
  
  // 最终保存
  saveData(existingData);
  
  console.log('\n' + '='.repeat(60));
  console.log('完成！');
  console.log(`成功: ${successCount} 个`);
  console.log(`失败: ${failCount} 个`);
  console.log(`跳过: ${skipCount} 个`);
  console.log(`数据文件: ${CHINESE_DATA_FILE}`);
  console.log(`贴图目录: ${SPRITES_DIR}`);
  console.log('='.repeat(60));
}

// 运行
main().catch(error => {
  console.error('[致命错误]', error);
  process.exit(1);
});

