#!/usr/bin/env node
/**
 * 检查缺失贴图的宝可梦
 * 找出所有有中文映射但没有贴图的宝可梦
 * 
 * 使用方法：
 *   node data/scripts/check-missing-sprites.mjs [选项]
 * 
 * 选项：
 *   --output=FILE    输出结果到文件（默认：控制台输出）
 *   --json           以JSON格式输出
 *   --csv            以CSV格式输出
 * 
 * 示例：
 *   node data/scripts/check-missing-sprites.mjs
 *   node data/scripts/check-missing-sprites.mjs --output=missing-sprites.txt
 *   node data/scripts/check-missing-sprites.mjs --json --output=missing-sprites.json
 */

import { readFileSync, existsSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// 配置路径
const CHINESE_DATA_FILE = join(projectRoot, 'data', 'chinese', 'pokedex-cn.json');
const CHINESE_POKEDEX_FILE = join(projectRoot, 'data', 'chinese', 'pokedex.json');
const SPRITES_DIR = join(projectRoot, 'cache', 'sprites');

/**
 * 加载中文数据
 */
function loadChineseData() {
  const data = {};
  
  // 加载 pokedex-cn.json（新格式，包含贴图信息）
  if (existsSync(CHINESE_DATA_FILE)) {
    try {
      const cnData = JSON.parse(readFileSync(CHINESE_DATA_FILE, 'utf8'));
      Object.assign(data, cnData);
      console.log(`[加载] 从 pokedex-cn.json 加载了 ${Object.keys(cnData).length} 个宝可梦`);
    } catch (e) {
      console.warn(`[警告] 无法读取 pokedex-cn.json: ${e.message}`);
    }
  }
  
  // 加载 pokedex.json（旧格式，只有中文名称）
  if (existsSync(CHINESE_POKEDEX_FILE)) {
    try {
      const pokedexData = JSON.parse(readFileSync(CHINESE_POKEDEX_FILE, 'utf8'));
      // 合并数据，如果pokedex-cn.json中没有，则添加
      for (const [key, chineseName] of Object.entries(pokedexData)) {
        if (!data[key]) {
          data[key] = { chineseName: chineseName };
        } else if (!data[key].chineseName) {
          data[key].chineseName = chineseName;
        }
      }
      console.log(`[加载] 从 pokedex.json 加载了 ${Object.keys(pokedexData).length} 个宝可梦`);
    } catch (e) {
      console.warn(`[警告] 无法读取 pokedex.json: ${e.message}`);
    }
  }
  
  return data;
}

/**
 * 获取所有贴图文件列表
 */
function getSpriteFiles() {
  if (!existsSync(SPRITES_DIR)) {
    console.warn(`[警告] 贴图目录不存在: ${SPRITES_DIR}`);
    return new Set();
  }
  
  try {
    const files = readdirSync(SPRITES_DIR);
    const spriteSet = new Set(files);
    console.log(`[加载] 找到 ${files.length} 个贴图文件`);
    return spriteSet;
  } catch (e) {
    console.error(`[错误] 无法读取贴图目录: ${e.message}`);
    return new Set();
  }
}

/**
 * 检查宝可梦是否有贴图
 */
function hasSprite(pokemonKey, pokemonData, spriteFiles) {
  // 方法1: 检查 spriteFile 字段指定的文件是否存在
  if (pokemonData.spriteFile) {
    const spritePath = join(SPRITES_DIR, pokemonData.spriteFile);
    if (existsSync(spritePath)) {
      return true;
    }
    // 如果spriteFile字段存在但文件不存在，也检查文件名是否在列表中
    if (spriteFiles.has(pokemonData.spriteFile)) {
      return true;
    }
  }
  
  // 方法2: 根据编号和名称查找可能的贴图文件
  const number = pokemonData.number;
  const chineseName = pokemonData.chineseName;
  const englishName = pokemonData.englishName || pokemonKey;
  
  if (number && chineseName) {
    // 尝试多种可能的文件名格式
    const possibleNames = [
      `${number}-${chineseName}.png`,
      `${number}-${chineseName}.jpg`,
      `${number}-${chineseName}.jpeg`,
      `${number}-${chineseName}.gif`,
      `${number}-${chineseName}.webp`,
      `${number}-${englishName}.png`,
      `${number}-${englishName}.jpg`,
      `${pokemonKey}.png`,
      `${pokemonKey}.jpg`,
      `${chineseName}.png`,
      `${chineseName}.jpg`
    ];
    
    for (const fileName of possibleNames) {
      if (spriteFiles.has(fileName)) {
        return true;
      }
      const filePath = join(SPRITES_DIR, fileName);
      if (existsSync(filePath)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const options = {
    output: args.find(a => a.startsWith('--output='))?.split('=')[1] || null,
    json: args.includes('--json'),
    csv: args.includes('--csv')
  };
  
  console.log('='.repeat(60));
  console.log('检查缺失贴图的宝可梦');
  console.log('='.repeat(60));
  console.log('');
  
  // 加载数据
  const chineseData = loadChineseData();
  const spriteFiles = getSpriteFiles();
  
  if (Object.keys(chineseData).length === 0) {
    console.error('[错误] 没有找到中文数据');
    process.exit(1);
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('开始检查...');
  console.log('='.repeat(60));
  console.log('');
  
  // 检查每个宝可梦
  const missingSprites = [];
  const hasSprites = [];
  let totalChecked = 0;
  
  for (const [key, data] of Object.entries(chineseData)) {
    // 只检查有中文名称的宝可梦
    if (!data.chineseName) {
      continue;
    }
    
    totalChecked++;
    const hasSpriteFile = hasSprite(key, data, spriteFiles);
    
    if (!hasSpriteFile) {
      missingSprites.push({
        key: key,
        englishName: data.englishName || key,
        chineseName: data.chineseName,
        number: data.number || '?',
        spriteFile: data.spriteFile || null,
        spriteUrl: data.spriteUrl || null
      });
    } else {
      hasSprites.push({
        key: key,
        chineseName: data.chineseName,
        number: data.number || '?'
      });
    }
  }
  
  // 按编号排序
  missingSprites.sort((a, b) => {
    const numA = parseInt(a.number) || 9999;
    const numB = parseInt(b.number) || 9999;
    return numA - numB;
  });
  
  // 输出结果
  console.log('='.repeat(60));
  console.log('检查结果');
  console.log('='.repeat(60));
  console.log(`总计检查: ${totalChecked} 个宝可梦`);
  console.log(`有贴图: ${hasSprites.length} 个`);
  console.log(`缺失贴图: ${missingSprites.length} 个`);
  console.log('');
  
  if (missingSprites.length > 0) {
    console.log('缺失贴图的宝可梦列表：');
    console.log('-'.repeat(60));
    
    if (options.json) {
      // JSON格式输出
      const output = {
        total: totalChecked,
        hasSprites: hasSprites.length,
        missingSprites: missingSprites.length,
        missing: missingSprites
      };
      const jsonOutput = JSON.stringify(output, null, 2);
      
      if (options.output) {
        writeFileSync(options.output, jsonOutput, 'utf8');
        console.log(`结果已保存到: ${options.output}`);
      } else {
        console.log(jsonOutput);
      }
    } else if (options.csv) {
      // CSV格式输出
      const csvLines = [
        '编号,英文名称,中文名称,Key,spriteFile,spriteUrl'
      ];
      missingSprites.forEach(p => {
        csvLines.push(
          `${p.number},"${p.englishName}","${p.chineseName}","${p.key}","${p.spriteFile || ''}","${p.spriteUrl || ''}"`
        );
      });
      const csvOutput = csvLines.join('\n');
      
      if (options.output) {
        writeFileSync(options.output, csvOutput, 'utf8');
        console.log(`结果已保存到: ${options.output}`);
      } else {
        console.log(csvOutput);
      }
    } else {
      // 文本格式输出
      const textLines = [];
      missingSprites.forEach((p, index) => {
        const line = `${index + 1}. #${p.number} ${p.englishName} (${p.chineseName}) [${p.key}]`;
        textLines.push(line);
        console.log(line);
        if (p.spriteFile) {
          console.log(`   已配置spriteFile但文件不存在: ${p.spriteFile}`);
        }
        if (p.spriteUrl) {
          console.log(`   有spriteUrl但未下载: ${p.spriteUrl}`);
        }
      });
      
      if (options.output) {
        writeFileSync(options.output, textLines.join('\n'), 'utf8');
        console.log(`\n结果已保存到: ${options.output}`);
      }
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log(`共 ${missingSprites.length} 个宝可梦缺失贴图`);
    console.log('='.repeat(60));
  } else {
    console.log('✅ 所有有中文映射的宝可梦都有贴图！');
  }
}

// 运行
try {
  main();
} catch (error) {
  console.error('[致命错误]', error);
  process.exit(1);
}

