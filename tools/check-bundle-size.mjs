#!/usr/bin/env node
/**
 * Bundle Size 检查脚本
 * 
 * 检查前端构建产物大小，对比历史记录
 * 
 * 使用方法：
 *   node tools/check-bundle-size.mjs [选项]
 * 
 * 选项：
 *   --threshold=MB    体积阈值（MB，默认：10）
 *   --growth=PERCENT 允许的最大增长百分比（默认：20）
 *   --output=FILE    输出报告文件（默认：bundle-size-report.json）
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 配置路径
const BATTLE_ENGINE_DIR = join(projectRoot, 'packages', 'battle-engine');
const DIST_DIR = join(BATTLE_ENGINE_DIR, 'dist');
const REPORT_FILE = join(projectRoot, 'bundle-size-report.json');
const HISTORY_FILE = join(projectRoot, 'bundle-size-history.json');

// 默认配置
const DEFAULT_THRESHOLD_MB = 10;
const DEFAULT_GROWTH_PERCENT = 20;

/**
 * 获取目录总大小
 */
function getDirectorySize(dirPath) {
  if (!existsSync(dirPath)) {
    return 0;
  }
  
  let totalSize = 0;
  try {
    const files = readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = join(dirPath, file.name);
      if (file.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else {
        try {
          const stats = statSync(filePath);
          totalSize += stats.size;
        } catch (e) {
          // 忽略无法访问的文件
        }
      }
    }
  } catch (e) {
    console.warn(`[警告] 无法读取目录 ${dirPath}: ${e.message}`);
  }
  return totalSize;
}

/**
 * 获取文件大小
 */
function getFileSize(filePath) {
  if (!existsSync(filePath)) {
    return 0;
  }
  try {
    return statSync(filePath).size;
  } catch (e) {
    return 0;
  }
}

/**
 * 扫描构建产物
 */
function scanBuildArtifacts() {
  const artifacts = {
    totalSize: 0,
    files: {},
    directories: {}
  };
  
  // 检查 dist 目录
  if (existsSync(DIST_DIR)) {
    artifacts.directories.dist = getDirectorySize(DIST_DIR);
    artifacts.totalSize += artifacts.directories.dist;
    
    // 扫描 dist 目录中的文件
    try {
      const files = readdirSync(DIST_DIR, { withFileTypes: true });
      for (const file of files) {
        if (file.isFile()) {
          const filePath = join(DIST_DIR, file.name);
          const size = getFileSize(filePath);
          artifacts.files[file.name] = size;
        }
      }
    } catch (e) {
      console.warn(`[警告] 无法扫描 dist 目录: ${e.message}`);
    }
  }
  
  // 检查其他可能的构建产物
  const possibleFiles = [
    join(BATTLE_ENGINE_DIR, 'bundle.js'),
    join(BATTLE_ENGINE_DIR, 'bundle.min.js'),
  ];
  
  for (const filePath of possibleFiles) {
    if (existsSync(filePath)) {
      const fileName = filePath.split(/[/\\]/).pop();
      const size = getFileSize(filePath);
      artifacts.files[fileName] = size;
      artifacts.totalSize += size;
    }
  }
  
  return artifacts;
}

/**
 * 加载历史记录
 */
function loadHistory() {
  if (!existsSync(HISTORY_FILE)) {
    return null;
  }
  
  try {
    return JSON.parse(readFileSync(HISTORY_FILE, 'utf8'));
  } catch (e) {
    console.warn(`[警告] 无法读取历史记录: ${e.message}`);
    return null;
  }
}

/**
 * 保存历史记录
 */
function saveHistory(report) {
  try {
    const history = loadHistory() || { records: [] };
    history.records.push({
      timestamp: report.timestamp,
      totalSize: report.current.totalSize,
      files: report.current.files
    });
    
    // 只保留最近 10 条记录
    if (history.records.length > 10) {
      history.records = history.records.slice(-10);
    }
    
    writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (e) {
    console.warn(`[警告] 无法保存历史记录: ${e.message}`);
  }
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const options = {
    threshold: parseFloat(args.find(a => a.startsWith('--threshold='))?.split('=')[1]) || DEFAULT_THRESHOLD_MB,
    growth: parseFloat(args.find(a => a.startsWith('--growth='))?.split('=')[1]) || DEFAULT_GROWTH_PERCENT,
    output: args.find(a => a.startsWith('--output='))?.split('=')[1] || REPORT_FILE
  };
  
  console.log('[Bundle Size] ========== 开始检查 ==========');
  console.log(`[Bundle Size] 阈值: ${options.threshold} MB`);
  console.log(`[Bundle Size] 允许增长: ${options.growth}%`);
  
  // 扫描构建产物
  console.log('[Bundle Size] 扫描构建产物...');
  const current = scanBuildArtifacts();
  const currentSizeMB = current.totalSize / 1024 / 1024;
  
  console.log(`[Bundle Size] 当前总大小: ${currentSizeMB.toFixed(2)} MB`);
  console.log(`[Bundle Size] 文件数: ${Object.keys(current.files).length}`);
  
  // 加载历史记录
  const history = loadHistory();
  const previous = history && history.records.length > 0 
    ? history.records[history.records.length - 1]
    : null;
  
  const report = {
    timestamp: new Date().toISOString(),
    threshold: options.threshold,
    growthLimit: options.growth,
    current: {
      totalSize: current.totalSize,
      totalSizeMB: currentSizeMB,
      files: current.files,
      directories: current.directories
    },
    previous: previous ? {
      totalSize: previous.totalSize,
      totalSizeMB: previous.totalSize / 1024 / 1024,
      timestamp: previous.timestamp
    } : null,
    comparison: null,
    status: 'unknown',
    errors: [],
    warnings: []
  };
  
  // 对比分析
  if (previous) {
    const sizeDiff = current.totalSize - previous.totalSize;
    const sizeDiffMB = sizeDiff / 1024 / 1024;
    const growthPercent = previous.totalSize > 0 
      ? (sizeDiff / previous.totalSize) * 100 
      : 0;
    
    report.comparison = {
      sizeDiff,
      sizeDiffMB,
      growthPercent
    };
    
    console.log(`[Bundle Size] 上次大小: ${(previous.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[Bundle Size] 变化: ${sizeDiffMB >= 0 ? '+' : ''}${sizeDiffMB.toFixed(2)} MB (${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(2)}%)`);
    
    // 检查增长是否超过阈值
    if (growthPercent > options.growth) {
      report.errors.push(
        `体积增长超过阈值：增长 ${growthPercent.toFixed(2)}%，超过允许的 ${options.growth}%`
      );
      report.status = 'failed';
      console.error(`[Bundle Size] ❌ 体积增长超过阈值：${growthPercent.toFixed(2)}% > ${options.growth}%`);
    } else {
      report.status = 'passed';
      console.log(`[Bundle Size] ✅ 体积增长在允许范围内`);
    }
  } else {
    console.log('[Bundle Size] 无历史记录，跳过增长检查');
  }
  
  // 检查绝对大小阈值
  if (currentSizeMB > options.threshold) {
    report.warnings.push(
      `总大小超过阈值：${currentSizeMB.toFixed(2)} MB > ${options.threshold} MB`
    );
    console.warn(`[Bundle Size] ⚠️ 总大小超过阈值：${currentSizeMB.toFixed(2)} MB`);
  }
  
  // 保存报告
  try {
    writeFileSync(options.output, JSON.stringify(report, null, 2), 'utf8');
    console.log(`[Bundle Size] ✅ 报告已保存: ${options.output}`);
  } catch (e) {
    console.error(`[Bundle Size] ❌ 无法保存报告: ${e.message}`);
  }
  
  // 保存历史记录
  saveHistory(report);
  
  // 输出总结
  console.log('[Bundle Size] ========== 总结 ==========');
  if (report.errors.length > 0) {
    report.errors.forEach(err => console.error(`[Bundle Size] ❌ ${err}`));
  }
  if (report.warnings.length > 0) {
    report.warnings.forEach(warn => console.warn(`[Bundle Size] ⚠️ ${warn}`));
  }
  if (report.status === 'passed' && report.errors.length === 0) {
    console.log('[Bundle Size] ✅ 所有检查通过');
  }
  
  console.log('[Bundle Size] ========== 完成 ==========');
  
  // 如果有错误，退出码为 1
  if (report.errors.length > 0) {
    process.exit(1);
  }
}

// 运行主函数
main();

