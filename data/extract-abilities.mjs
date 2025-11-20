#!/usr/bin/env node
/**
 * 从打包后的 abilities.js 里提取
 *   const Abilities = { ... };
 * 并生成 ES Module：data/abilities.js
 * 用法：node extract-abilities.mjs [源文件路径] [输出目录]
 * 默认：源文件 ./abilities.js  输出目录 ./data
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

// ---------- 参数解析 ----------
const srcPath = process.argv[2] || './abilities.js';
const outDir  = process.argv[3] || './data';
const outPath = join(outDir, 'abilities.js');   // 最终文件：data/abilities.js

// ---------- 读取 ----------
let code;
try {
  code = readFileSync(srcPath, 'utf8');
} catch (e) {
  console.error(`❌ 读取失败：${e.message}`);
  process.exit(1);
}

// ---------- 提取 ----------
// 贪婪匹配最外层的 const Abilities = { ... };
const reg = /const\s+Abilities\s*=\s*\{[\s\S]*?\}(?=;)/;
const m   = code.match(reg);
if (!m) {
  console.error('❌ 未找到 “const Abilities = {...}” 结构，请确认文件内容！');
  process.exit(1);
}
const rawObj = m[0].replace('const Abilities = ', ''); // 去掉前缀

// ---------- 组装 ES Module ----------
const esm = `/* 自动生成，来源：${srcPath} */
export const BattleAbilities = ${rawObj};
`;

// ---------- 写入 ----------
try {
  mkdirSync(dirname(outPath), { recursive: true }); // 确保目录存在
  writeFileSync(outPath, esm, 'utf8');
  console.log(`✅ 已生成 ES Module：${outPath}`);
  console.log(`   导出变量名：BattleAbilities`);
} catch (e) {
  console.error(`❌ 写入失败：${e.message}`);
  process.exit(1);
}