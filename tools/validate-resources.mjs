#!/usr/bin/env node
/**
 * 资源校验脚本
 * 
 * 验证 manifest 文件的完整性和一致性
 * 
 * 使用方法：
 *   node tools/validate-resources.mjs [选项]
 * 
 * 选项：
 *   --type=TYPE      校验类型：sprites, data, all（默认：all）
 *   --output=FILE    输出报告文件（默认：validation-report.json）
 *   --strict         严格模式：任何错误都会导致退出码非零
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 配置路径
const SPRITES_MANIFEST = join(projectRoot, 'cache', 'sprites-manifest.json');
const DATA_MANIFEST = join(projectRoot, 'data', 'data-manifest.json');
const SPRITES_DIR = join(projectRoot, 'cache', 'sprites');
const DATA_DIR = join(projectRoot, 'data', 'chinese');
const PACKAGE_JSON = join(projectRoot, 'package.json');
const DEFAULT_OUTPUT = join(projectRoot, 'validation-report.json');

/**
 * 计算文件的 MD5 哈希
 */
function calculateMD5(filePath) {
  try {
    const buffer = readFileSync(filePath);
    return createHash('md5').update(buffer).digest('hex');
  } catch (e) {
    return null;
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
    // 忽略错误
  }
  return '1.0.0';
}

/**
 * 校验 Sprites Manifest
 */
function validateSprites(manifest, report) {
  console.log('[校验] ========== 校验 Sprites Manifest ==========');
  
  if (!existsSync(SPRITES_MANIFEST)) {
    report.sprites.errors.push('Sprites manifest 文件不存在');
    console.error('[校验] ❌ Sprites manifest 文件不存在');
    return;
  }
  
  try {
    const manifestData = JSON.parse(readFileSync(SPRITES_MANIFEST, 'utf8'));
    
    // 检查版本一致性
    const packageVersion = getVersion();
    if (manifestData.version !== packageVersion) {
      report.sprites.warnings.push(
        `版本不一致：manifest=${manifestData.version}, package.json=${packageVersion}`
      );
      console.warn(`[校验] ⚠️ 版本不一致：manifest=${manifestData.version}, package.json=${packageVersion}`);
    }
    
    // 检查文件
    const files = manifestData.files || {};
    let checkedCount = 0;
    let errorCount = 0;
    let warningCount = 0;
    
    for (const [fileName, fileInfo] of Object.entries(files)) {
      checkedCount++;
      const filePath = join(SPRITES_DIR, fileName);
      const fileErrors = [];
      const fileWarnings = [];
      
      // 检查文件是否存在
      if (!existsSync(filePath)) {
        fileErrors.push('文件不存在');
        errorCount++;
      } else {
        // 检查文件大小
        const stats = statSync(filePath);
        if (stats.size !== fileInfo.size) {
          fileErrors.push(`大小不匹配：期望=${fileInfo.size}, 实际=${stats.size}`);
          errorCount++;
        }
        
        // 检查 MD5（如果 manifest 中有）
        if (fileInfo.md5) {
          const actualMD5 = calculateMD5(filePath);
          if (actualMD5 && actualMD5 !== fileInfo.md5) {
            fileErrors.push(`MD5 不匹配：期望=${fileInfo.md5}, 实际=${actualMD5}`);
            errorCount++;
          }
        }
        
        // 检查修改时间（警告级别）
        const manifestMtime = new Date(fileInfo.mtime);
        const actualMtime = stats.mtime;
        const timeDiff = Math.abs(actualMtime - manifestMtime);
        if (timeDiff > 60000) { // 超过1分钟
          fileWarnings.push(`修改时间不一致：manifest=${fileInfo.mtime}, 实际=${actualMtime.toISOString()}`);
          warningCount++;
        }
      }
      
      if (fileErrors.length > 0 || fileWarnings.length > 0) {
        report.sprites.fileIssues[fileName] = {
          errors: fileErrors,
          warnings: fileWarnings
        };
      }
      
      if (checkedCount % 100 === 0) {
        console.log(`[校验] 已检查 ${checkedCount}/${Object.keys(files).length} 个文件...`);
      }
    }
    
    // 检查缺失的贴图
    const missingCount = manifestData.missing ? manifestData.missing.length : 0;
    if (missingCount > 0) {
      report.sprites.warnings.push(`有 ${missingCount} 个缺失的贴图`);
      console.warn(`[校验] ⚠️ 有 ${missingCount} 个缺失的贴图`);
    }
    
    // 统计信息
    report.sprites.summary = {
      totalFiles: manifestData.totalFiles || 0,
      checkedFiles: checkedCount,
      errors: errorCount,
      warnings: warningCount + missingCount,
      missingSprites: missingCount,
      totalSize: manifestData.totalSize || 0
    };
    
    console.log(`[校验] ✅ Sprites 校验完成：${checkedCount} 个文件，${errorCount} 个错误，${warningCount + missingCount} 个警告`);
    
  } catch (e) {
    report.sprites.errors.push(`无法读取或解析 manifest: ${e.message}`);
    console.error(`[校验] ❌ 无法读取或解析 manifest: ${e.message}`);
  }
}

/**
 * 校验数据 Manifest
 */
function validateData(manifest, report) {
  console.log('[校验] ========== 校验数据 Manifest ==========');
  
  if (!existsSync(DATA_MANIFEST)) {
    report.data.errors.push('数据 manifest 文件不存在');
    console.error('[校验] ❌ 数据 manifest 文件不存在');
    return;
  }
  
  try {
    const manifestData = JSON.parse(readFileSync(DATA_MANIFEST, 'utf8'));
    
    // 检查版本一致性
    const packageVersion = getVersion();
    if (manifestData.version !== packageVersion) {
      report.data.warnings.push(
        `版本不一致：manifest=${manifestData.version}, package.json=${packageVersion}`
      );
      console.warn(`[校验] ⚠️ 版本不一致：manifest=${manifestData.version}, package.json=${packageVersion}`);
    }
    
    // 检查文件
    const files = manifestData.files || {};
    let checkedCount = 0;
    let errorCount = 0;
    let warningCount = 0;
    
    for (const [fileName, fileInfo] of Object.entries(files)) {
      if (!fileInfo.exists) {
        continue; // 跳过标记为不存在的文件
      }
      
      checkedCount++;
      const filePath = join(DATA_DIR, fileName);
      const fileErrors = [];
      const fileWarnings = [];
      
      // 检查文件是否存在
      if (!existsSync(filePath)) {
        fileErrors.push('文件不存在');
        errorCount++;
      } else {
        // 检查文件大小
        const stats = statSync(filePath);
        if (stats.size !== fileInfo.size) {
          fileErrors.push(`大小不匹配：期望=${fileInfo.size}, 实际=${stats.size}`);
          errorCount++;
        }
        
        // 检查 MD5（如果 manifest 中有）
        if (fileInfo.md5) {
          const actualMD5 = calculateMD5(filePath);
          if (actualMD5 && actualMD5 !== fileInfo.md5) {
            fileErrors.push(`MD5 不匹配：期望=${fileInfo.md5}, 实际=${actualMD5}`);
            errorCount++;
          }
        }
        
        // 检查修改时间（警告级别）
        const manifestMtime = new Date(fileInfo.mtime);
        const actualMtime = stats.mtime;
        const timeDiff = Math.abs(actualMtime - manifestMtime);
        if (timeDiff > 60000) { // 超过1分钟
          fileWarnings.push(`修改时间不一致：manifest=${fileInfo.mtime}, 实际=${actualMtime.toISOString()}`);
          warningCount++;
        }
      }
      
      if (fileErrors.length > 0 || fileWarnings.length > 0) {
        report.data.fileIssues[fileName] = {
          errors: fileErrors,
          warnings: fileWarnings
        };
      }
    }
    
    // 统计信息
    report.data.summary = {
      checkedFiles: checkedCount,
      errors: errorCount,
      warnings: warningCount,
      statistics: manifestData.statistics || {}
    };
    
    console.log(`[校验] ✅ 数据校验完成：${checkedCount} 个文件，${errorCount} 个错误，${warningCount} 个警告`);
    
  } catch (e) {
    report.data.errors.push(`无法读取或解析 manifest: ${e.message}`);
    console.error(`[校验] ❌ 无法读取或解析 manifest: ${e.message}`);
  }
}

/**
 * 生成人类可读的报告
 */
function generateHumanReadableReport(report) {
  const lines = [];
  lines.push('='.repeat(60));
  lines.push('资源校验报告');
  lines.push('='.repeat(60));
  lines.push(`生成时间: ${report.generatedAt}`);
  lines.push('');
  
  // Sprites 报告
  if (report.sprites) {
    lines.push('--- Sprites 校验结果 ---');
    if (report.sprites.errors.length > 0) {
      lines.push(`❌ 错误 (${report.sprites.errors.length}):`);
      report.sprites.errors.forEach(err => lines.push(`  - ${err}`));
      lines.push('');
    }
    if (report.sprites.warnings.length > 0) {
      lines.push(`⚠️ 警告 (${report.sprites.warnings.length}):`);
      report.sprites.warnings.forEach(warn => lines.push(`  - ${warn}`));
      lines.push('');
    }
    if (report.sprites.summary) {
      const s = report.sprites.summary;
      lines.push(`📊 统计:`);
      lines.push(`  - 总文件数: ${s.totalFiles}`);
      lines.push(`  - 已检查: ${s.checkedFiles}`);
      lines.push(`  - 错误: ${s.errors}`);
      lines.push(`  - 警告: ${s.warnings}`);
      lines.push(`  - 缺失贴图: ${s.missingSprites}`);
      lines.push(`  - 总大小: ${(s.totalSize / 1024 / 1024).toFixed(2)} MB`);
      lines.push('');
    }
    if (Object.keys(report.sprites.fileIssues).length > 0) {
      lines.push(`📁 文件问题 (${Object.keys(report.sprites.fileIssues).length}):`);
      for (const [fileName, issues] of Object.entries(report.sprites.fileIssues)) {
        lines.push(`  ${fileName}:`);
        if (issues.errors.length > 0) {
          issues.errors.forEach(err => lines.push(`    ❌ ${err}`));
        }
        if (issues.warnings.length > 0) {
          issues.warnings.forEach(warn => lines.push(`    ⚠️ ${warn}`));
        }
      }
      lines.push('');
    }
  }
  
  // 数据报告
  if (report.data) {
    lines.push('--- 数据校验结果 ---');
    if (report.data.errors.length > 0) {
      lines.push(`❌ 错误 (${report.data.errors.length}):`);
      report.data.errors.forEach(err => lines.push(`  - ${err}`));
      lines.push('');
    }
    if (report.data.warnings.length > 0) {
      lines.push(`⚠️ 警告 (${report.data.warnings.length}):`);
      report.data.warnings.forEach(warn => lines.push(`  - ${warn}`));
      lines.push('');
    }
    if (report.data.summary) {
      const s = report.data.summary;
      lines.push(`📊 统计:`);
      lines.push(`  - 已检查: ${s.checkedFiles}`);
      lines.push(`  - 错误: ${s.errors}`);
      lines.push(`  - 警告: ${s.warnings}`);
      if (s.statistics) {
        lines.push(`  - 宝可梦数: ${s.statistics.totalPokemon || 0}`);
        lines.push(`  - 技能数: ${s.statistics.totalMoves || 0}`);
        lines.push(`  - 道具数: ${s.statistics.totalItems || 0}`);
        lines.push(`  - 特性数: ${s.statistics.totalAbilities || 0}`);
      }
      lines.push('');
    }
    if (Object.keys(report.data.fileIssues).length > 0) {
      lines.push(`📁 文件问题 (${Object.keys(report.data.fileIssues).length}):`);
      for (const [fileName, issues] of Object.entries(report.data.fileIssues)) {
        lines.push(`  ${fileName}:`);
        if (issues.errors.length > 0) {
          issues.errors.forEach(err => lines.push(`    ❌ ${err}`));
        }
        if (issues.warnings.length > 0) {
          issues.warnings.forEach(warn => lines.push(`    ⚠️ ${warn}`));
        }
      }
      lines.push('');
    }
  }
  
  // 总结
  lines.push('--- 总结 ---');
  const totalErrors = (report.sprites?.errors.length || 0) + (report.data?.errors.length || 0) +
    (report.sprites?.summary?.errors || 0) + (report.data?.summary?.errors || 0);
  const totalWarnings = (report.sprites?.warnings.length || 0) + (report.data?.warnings.length || 0) +
    (report.sprites?.summary?.warnings || 0) + (report.data?.summary?.warnings || 0);
  
  if (totalErrors === 0 && totalWarnings === 0) {
    lines.push('✅ 所有资源校验通过！');
  } else {
    lines.push(`❌ 错误: ${totalErrors}`);
    lines.push(`⚠️ 警告: ${totalWarnings}`);
  }
  lines.push('='.repeat(60));
  
  return lines.join('\n');
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const options = {
    type: args.find(a => a.startsWith('--type='))?.split('=')[1] || 'all',
    output: args.find(a => a.startsWith('--output='))?.split('=')[1] || DEFAULT_OUTPUT,
    strict: args.includes('--strict')
  };
  
  console.log('[校验] ========== 开始资源校验 ==========');
  console.log(`[校验] 校验类型: ${options.type}`);
  console.log(`[校验] 输出文件: ${options.output}`);
  console.log(`[校验] 严格模式: ${options.strict}`);
  
  const report = {
    generatedAt: new Date().toISOString(),
    type: options.type,
    sprites: {
      errors: [],
      warnings: [],
      fileIssues: {},
      summary: null
    },
    data: {
      errors: [],
      warnings: [],
      fileIssues: {},
      summary: null
    }
  };
  
  // 执行校验
  if (options.type === 'all' || options.type === 'sprites') {
    validateSprites(SPRITES_MANIFEST, report);
  }
  
  if (options.type === 'all' || options.type === 'data') {
    validateData(DATA_MANIFEST, report);
  }
  
  // 生成报告
  const humanReadable = generateHumanReadableReport(report);
  console.log('\n' + humanReadable);
  
  // 保存报告
  try {
    const reportData = {
      ...report,
      humanReadable
    };
    writeFileSync(options.output, JSON.stringify(reportData, null, 2), 'utf8');
    console.log(`\n[校验] ✅ 报告已保存: ${options.output}`);
  } catch (e) {
    console.error(`[校验] ❌ 无法保存报告: ${e.message}`);
  }
  
  // 计算退出码
  const totalErrors = (report.sprites?.errors.length || 0) + (report.data?.errors.length || 0) +
    (report.sprites?.summary?.errors || 0) + (report.data?.summary?.errors || 0);
  
  if (options.strict && totalErrors > 0) {
    console.log(`[校验] ❌ 严格模式：发现 ${totalErrors} 个错误，退出码 1`);
    process.exit(1);
  }
  
  console.log('[校验] ========== 完成 ==========');
}

// 运行主函数
main();

