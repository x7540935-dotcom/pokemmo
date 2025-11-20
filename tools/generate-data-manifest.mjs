#!/usr/bin/env node
/**
 * 数据 Manifest 生成器
 * 
 * 扫描 data/chinese/ 目录，生成数据文件清单
 * 
 * 使用方法：
 *   node tools/generate-data-manifest.mjs [选项]
 * 
 * 选项：
 *   --output=FILE    输出文件路径（默认：data/data-manifest.json）
 *   --version=VER    设置版本号（默认：从 package.json 读取）
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 配置路径
const DATA_DIR = join(projectRoot, 'data', 'chinese');
const PACKAGE_JSON = join(projectRoot, 'package.json');
const DEFAULT_OUTPUT = join(projectRoot, 'data', 'data-manifest.json');

// 数据文件列表
const DATA_FILES = [
  'pokedex-cn.json',
  'pokedex.json',
  'moves.json',
  'items.json',
  'abilities.json'
];

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
 * 统计 JSON 文件中的数据项数量
 */
function countDataItems(filePath, fileType) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    switch (fileType) {
      case 'pokedex-cn.json':
      case 'pokedex.json':
        return Object.keys(data).length;
      case 'moves.json':
        return Array.isArray(data) ? data.length : Object.keys(data).length;
      case 'items.json':
        return Array.isArray(data) ? data.length : Object.keys(data).length;
      case 'abilities.json':
        return Array.isArray(data) ? data.length : Object.keys(data).length;
      default:
        return 0;
    }
  } catch (e) {
    console.warn(`[警告] 无法统计 ${filePath}: ${e.message}`);
    return 0;
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
  
  console.log('[Data Manifest] ========== 开始生成 ==========');
  console.log(`[Data Manifest] 数据目录: ${DATA_DIR}`);
  console.log(`[Data Manifest] 输出文件: ${options.output}`);
  console.log(`[Data Manifest] 版本: ${options.version}`);
  
  // 检查目录是否存在
  if (!existsSync(DATA_DIR)) {
    console.error(`[错误] 数据目录不存在: ${DATA_DIR}`);
    process.exit(1);
  }
  
  // 处理每个数据文件
  const manifest = {
    version: options.version,
    generatedAt: new Date().toISOString(),
    files: {},
    statistics: {
      totalPokemon: 0,
      totalMoves: 0,
      totalItems: 0,
      totalAbilities: 0
    }
  };
  
  for (const fileName of DATA_FILES) {
    const filePath = join(DATA_DIR, fileName);
    
    if (!existsSync(filePath)) {
      console.warn(`[警告] 文件不存在: ${fileName}`);
      continue;
    }
    
    try {
      const stats = statSync(filePath);
      const md5 = calculateMD5(filePath);
      const count = countDataItems(filePath, fileName);
      
      manifest.files[fileName] = {
        size: stats.size,
        mtime: stats.mtime.toISOString(),
        md5: md5,
        exists: true
      };
      
      // 更新统计信息
      if (fileName === 'pokedex-cn.json' || fileName === 'pokedex.json') {
        manifest.files[fileName].pokemonCount = count;
        manifest.statistics.totalPokemon = Math.max(manifest.statistics.totalPokemon, count);
      } else if (fileName === 'moves.json') {
        manifest.files[fileName].moveCount = count;
        manifest.statistics.totalMoves = count;
      } else if (fileName === 'items.json') {
        manifest.files[fileName].itemCount = count;
        manifest.statistics.totalItems = count;
      } else if (fileName === 'abilities.json') {
        manifest.files[fileName].abilityCount = count;
        manifest.statistics.totalAbilities = count;
      }
      
      console.log(`[Data Manifest] ✅ 处理 ${fileName}: ${count} 项, ${(stats.size / 1024).toFixed(2)} KB`);
    } catch (e) {
      console.error(`[错误] 处理文件失败 ${fileName}: ${e.message}`);
      manifest.files[fileName] = {
        exists: false,
        error: e.message
      };
    }
  }
  
  // 输出统计信息
  console.log('[Data Manifest] ========== 统计信息 ==========');
  console.log(`[Data Manifest] 宝可梦数: ${manifest.statistics.totalPokemon}`);
  console.log(`[Data Manifest] 技能数: ${manifest.statistics.totalMoves}`);
  console.log(`[Data Manifest] 道具数: ${manifest.statistics.totalItems}`);
  console.log(`[Data Manifest] 特性数: ${manifest.statistics.totalAbilities}`);
  
  // 写入文件
  try {
    writeFileSync(options.output, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`[Data Manifest] ✅ Manifest 已生成: ${options.output}`);
  } catch (e) {
    console.error(`[错误] 无法写入文件: ${e.message}`);
    process.exit(1);
  }
  
  console.log('[Data Manifest] ========== 完成 ==========');
}

// 运行主函数
main();

