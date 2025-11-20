#!/usr/bin/env node
/**
 * 批量提取 Showdown 混淆打包文件中的核心数据对象
 * 支持：Items / Learnsets / Moves / Pokedex
 * 自动生成 ES Module：data/items.js  data/learnsets.js  ...
 * 用法：node extract-showdown-data.mjs [输入目录] [输出目录]
 * 默认：输入 ./  输出 ./data
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// ---------- 配置表 ----------
const TASKS = [
  { file: 'items.js',     obj: 'Items',     exportAs: 'BattleItems'     },
  { file: 'learnsets.js', obj: 'Learnsets', exportAs: 'BattleLearnsets' },
  { file: 'moves.js',     obj: 'Moves',     exportAs: 'BattleMovedex'   },
  { file: 'pokedex.js',   obj: 'Pokedex',   exportAs: 'BattlePokedex'   }
];

// ---------- 参数解析 ----------
const inDir  = process.argv[2] || './';
const outDir = process.argv[3] || './data';

// ---------- 工具函数 ----------
function extractOne({ file, obj, exportAs }) {
  const srcPath = join(inDir, file);
  const dstPath = join(outDir, file); // 保持同名
  let code;
  try {
    code = readFileSync(srcPath, 'utf8');
  } catch (e) {
    console.error(`❌ 读取失败 ${srcPath}：${e.message}`);
    return;
  }

  // 贪婪匹配 const OBJ = { ... };
  const reg = new RegExp(`const\\s+${obj}\\s*=\\s*\\{[\\s\\S]*?\\}(?=;)`);
  const m = code.match(reg);
  if (!m) {
    console.error(`❌ 未找到 “const ${obj} = {...}” 结构，跳过 ${file}`);
    return;
  }

  const rawObj = m[0].replace(`const ${obj} = `, '');
  const esm = `/* 自动生成，来源：${srcPath} */\nexport const ${exportAs} = ${rawObj};\n`;

  try {
    mkdirSync(dirname(dstPath), { recursive: true });
    writeFileSync(dstPath, esm, 'utf8');
    console.log(`✅ ${file}  →  ${dstPath}`);
  } catch (e) {
    console.error(`❌ 写入失败 ${dstPath}：${e.message}`);
  }
}

// ---------- 批量执行 ----------
console.log('开始提取 Showdown 数据...\n');
TASKS.forEach(extractOne);
console.log('\n🎉 全部完成！');