#!/usr/bin/env node
/**
 * Sprites Manifest 生成器
 * 
 * 扫描 cache/sprites/ 目录，生成完整的资源清单
 * 
 * 使用方法：
 *   node tools/generate-sprites-manifest.mjs [选项]
 * 
 * 选项：
 *   --output=FILE    输出文件路径（默认：cache/sprites-manifest.json）
 *   --version=VER    设置版本号（默认：从 package.json 读取）
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 配置路径
const SPRITES_DIR = join(projectRoot, 'cache', 'sprites');
const CHINESE_DATA_FILE = join(projectRoot, 'data', 'chinese', 'pokedex-cn.json');
const PACKAGE_JSON = join(projectRoot, 'package.json');
const DEFAULT_OUTPUT = join(projectRoot, 'cache', 'sprites-manifest.json');

/**
 * 计算文件的 MD5 哈希
 */
function calculateMD5(filePath) {
  try {
    const buffer = readFileSync(filePath);
    return createHash('md5').update(buffer).digest('hex');
  } catch (e) {
    console.warn(`[警告] 无法计算 MD5 for ${filePath}: ${e.message}`);
    return null;
  }
}

/**
 * 解析文件名，提取宝可梦信息
 * 支持格式：
 * - {number}-{chineseName}.{ext}
 * - {englishName}-{chineseName}.{ext}
 * - {specialName}.{ext}
 */
function parseSpriteFileName(fileName) {
  const ext = extname(fileName);
  const baseName = basename(fileName, ext);
  
  // 格式1: {number}-{chineseName}
  const numberMatch = baseName.match(/^(\d+)-(.+)$/);
  if (numberMatch) {
    return {
      number: parseInt(numberMatch[1], 10),
      chineseName: numberMatch[2],
      englishName: null,
      type: 'pokemon'
    };
  }
  
  // 格式2: {englishName}-{chineseName} (如 altariamega-超级七夕青鸟)
  const englishMatch = baseName.match(/^([a-z]+(?:mega|form)?)-(.+)$/);
  if (englishMatch) {
    return {
      number: null,
      chineseName: englishMatch[2],
      englishName: englishMatch[1],
      type: 'special'
    };
  }
  
  // 格式3: 其他格式（如特殊形态）
  return {
    number: null,
    chineseName: baseName,
    englishName: null,
    type: 'unknown'
  };
}

/**
 * 加载中文数据，建立映射关系
 */
function loadChineseData() {
  if (!existsSync(CHINESE_DATA_FILE)) {
    console.warn(`[警告] 中文数据文件不存在: ${CHINESE_DATA_FILE}`);
    return {};
  }
  
  try {
    const data = JSON.parse(readFileSync(CHINESE_DATA_FILE, 'utf8'));
    console.log(`[加载] 从 pokedex-cn.json 加载了 ${Object.keys(data).length} 个宝可梦`);
    return data;
  } catch (e) {
    console.error(`[错误] 无法读取中文数据: ${e.message}`);
    return {};
  }
}

/**
 * 获取版本号
 */
function getVersion() {
  try {
    if (existsSync(PACKAGE_JSON)) {
      const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
      return pkg.version || '1.0.0';
    }
  } catch (e) {
    console.warn(`[警告] 无法读取 package.json: ${e.message}`);
  }
  return '1.0.0';
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const options = {
    output: args.find(a => a.startsWith('--output='))?.split('=')[1] || DEFAULT_OUTPUT,
    version: args.find(a => a.startsWith('--version='))?.split('=')[1] || getVersion()
  };
  
  console.log('[Sprites Manifest] ========== 开始生成 ==========');
  console.log(`[Sprites Manifest] 贴图目录: ${SPRITES_DIR}`);
  console.log(`[Sprites Manifest] 输出文件: ${options.output}`);
  console.log(`[Sprites Manifest] 版本: ${options.version}`);
  
  // 检查目录是否存在
  if (!existsSync(SPRITES_DIR)) {
    console.error(`[错误] 贴图目录不存在: ${SPRITES_DIR}`);
    process.exit(1);
  }
  
  // 加载中文数据
  const chineseData = loadChineseData();
  
  // 扫描文件
  console.log('[Sprites Manifest] 扫描贴图文件...');
  const files = readdirSync(SPRITES_DIR);
  const imageFiles = files.filter(f => {
    const ext = extname(f).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
  });
  
  console.log(`[Sprites Manifest] 找到 ${imageFiles.length} 个图片文件`);
  
  // 处理每个文件
  const manifest = {
    version: options.version,
    generatedAt: new Date().toISOString(),
    totalFiles: 0,
    totalSize: 0,
    files: {},
    pokemonMapping: {},
    missing: []
  };
  
  let processedCount = 0;
  for (const fileName of imageFiles) {
    const filePath = join(SPRITES_DIR, fileName);
    try {
      const stats = statSync(filePath);
      const fileInfo = parseSpriteFileName(fileName);
      const md5 = calculateMD5(filePath);
      
      manifest.files[fileName] = {
        size: stats.size,
        mtime: stats.mtime.toISOString(),
        md5: md5,
        pokemonId: fileInfo.number,
        pokemonName: fileInfo.chineseName,
        englishName: fileInfo.englishName,
        type: fileInfo.type
      };
      
      // 建立映射关系
      if (fileInfo.number) {
        manifest.pokemonMapping[fileInfo.number] = fileName;
        // 同时建立中文名称映射
        if (fileInfo.chineseName) {
          manifest.pokemonMapping[fileInfo.chineseName] = fileName;
        }
      }
      if (fileInfo.englishName) {
        manifest.pokemonMapping[fileInfo.englishName] = fileName;
      }
      
      manifest.totalFiles++;
      manifest.totalSize += stats.size;
      processedCount++;
      
      if (processedCount % 100 === 0) {
        console.log(`[Sprites Manifest] 已处理 ${processedCount}/${imageFiles.length} 个文件...`);
      }
    } catch (e) {
      console.warn(`[警告] 处理文件失败 ${fileName}: ${e.message}`);
    }
  }
  
  // 检查缺失的贴图（对比中文数据）
  console.log('[Sprites Manifest] 检查缺失的贴图...');
  const missingList = [];
  for (const [key, pokemonData] of Object.entries(chineseData)) {
    const number = pokemonData.number;
    const chineseName = pokemonData.chineseName;
    
    // 检查是否有对应的贴图文件
    let hasSprite = false;
    if (number && manifest.pokemonMapping[number]) {
      hasSprite = true;
    } else if (chineseName && manifest.pokemonMapping[chineseName]) {
      hasSprite = true;
    } else if (key && manifest.pokemonMapping[key]) {
      hasSprite = true;
    }
    
    if (!hasSprite) {
      missingList.push({
        key: key,
        englishName: pokemonData.englishName || key,
        chineseName: chineseName,
        number: number,
        spriteFile: null,
        spriteUrl: null
      });
    }
  }
  
  manifest.missing = missingList;
  
  // 输出统计信息
  console.log('[Sprites Manifest] ========== 统计信息 ==========');
  console.log(`[Sprites Manifest] 总文件数: ${manifest.totalFiles}`);
  console.log(`[Sprites Manifest] 总大小: ${(manifest.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`[Sprites Manifest] 缺失贴图: ${manifest.missing.length}`);
  console.log(`[Sprites Manifest] 有贴图: ${manifest.totalFiles - manifest.missing.length}`);
  
  // 写入文件
  try {
    writeFileSync(options.output, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`[Sprites Manifest] ✅ Manifest 已生成: ${options.output}`);
  } catch (e) {
    console.error(`[错误] 无法写入文件: ${e.message}`);
    process.exit(1);
  }
  
  console.log('[Sprites Manifest] ========== 完成 ==========');
}

// 运行主函数
main();

