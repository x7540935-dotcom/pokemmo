/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Pokemon Showdown 自动安装脚本（install-showdown.js）
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📋 功能
 * ──────────────────────────────────────────────────────────────────────────
 * 自动检查并安装 Pokemon Showdown 库，确保项目可以独立运行：
 *   1. 检查 npm 包是否可用（@pkmn/sim 或 pokemon-showdown）
 *   2. 如果 npm 包不可用，检查本地路径是否存在
 *   3. 如果本地路径也不存在，自动从 GitHub 克隆
 * 
 * 🚀 使用方式
 * ──────────────────────────────────────────────────────────────────────────
 * 自动执行：
 *   - 在 package.json 的 postinstall 脚本中调用
 *   - 运行 npm install 后自动执行
 * 
 * 手动执行：
 *   node scripts/install-showdown.js
 * 
 * ⚙️ 配置选项
 * ──────────────────────────────────────────────────────────────────────────
 * 环境变量：
 *   - SKIP_SHOWDOWN_INSTALL: 设为 '1' 跳过自动安装
 *   - SHOWDOWN_VERSION: 指定版本或分支（默认 'master'）
 *   - SHOWDOWN_SOURCE: 指定源（'github' 或 'npm'）
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SHOWDOWN_REPO = 'https://github.com/smogon/pokemon-showdown.git';
const TARGET_DIR = path.resolve(__dirname, '../../../pokemon-showdown');
const DIST_PATH = path.join(TARGET_DIR, 'dist', 'sim');

// 检查 npm 包是否可用
function checkNpmPackage() {
  const possiblePackages = [
    '@pkmn/sim',
    'pokemon-showdown',
    '@smogon/pokemon-showdown'
  ];

  for (const pkgName of possiblePackages) {
    try {
      require.resolve(pkgName);
      console.log(`[install-showdown] ✅ 检测到 npm 包: ${pkgName}`);
      return true;
    } catch (e) {
      // 包不存在，继续
    }
  }
  return false;
}

// 检查本地路径是否存在
function checkLocalPath() {
  if (fs.existsSync(TARGET_DIR) && fs.existsSync(DIST_PATH)) {
    console.log(`[install-showdown] ✅ 本地路径已存在: ${TARGET_DIR}`);
    return true;
  }
  return false;
}

// 从 GitHub 克隆
function cloneFromGitHub() {
  console.log(`[install-showdown] 开始从 GitHub 克隆 Pokemon Showdown...`);
  console.log(`[install-showdown] 目标目录: ${TARGET_DIR}`);
  
  try {
    // 确保父目录存在
    const parentDir = path.dirname(TARGET_DIR);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // 如果目录已存在但内容不对，先删除
    if (fs.existsSync(TARGET_DIR)) {
      console.log(`[install-showdown] 清理旧目录...`);
      fs.rmSync(TARGET_DIR, { recursive: true, force: true });
    }

    // 克隆仓库（只克隆最新提交，减小体积）
    const version = process.env.SHOWDOWN_VERSION || 'master';
    console.log(`[install-showdown] 克隆分支: ${version}`);
    
    execSync(
      `git clone --depth 1 --branch ${version} ${SHOWDOWN_REPO} "${TARGET_DIR}"`,
      { stdio: 'inherit' }
    );

    console.log(`[install-showdown] ✅ 克隆完成`);

    // 检查是否需要构建
    const buildScript = path.join(TARGET_DIR, 'package.json');
    if (fs.existsSync(buildScript)) {
      console.log(`[install-showdown] 检测到需要构建，开始构建...`);
      try {
        process.chdir(TARGET_DIR);
        execSync('npm install', { stdio: 'inherit' });
        execSync('npm run build', { stdio: 'inherit' });
        process.chdir(__dirname);
        console.log(`[install-showdown] ✅ 构建完成`);
      } catch (e) {
        console.warn(`[install-showdown] ⚠️  构建失败，可能需要手动构建: ${e.message}`);
      }
    }

    return true;
  } catch (error) {
    console.error(`[install-showdown] ❌ 克隆失败: ${error.message}`);
    console.error(`[install-showdown] 请确保已安装 Git，或手动下载 Pokemon Showdown`);
    return false;
  }
}

// 主函数
function main() {
  // 检查是否跳过安装
  if (process.env.SKIP_SHOWDOWN_INSTALL === '1') {
    console.log(`[install-showdown] 跳过安装（SKIP_SHOWDOWN_INSTALL=1）`);
    return;
  }

  console.log(`[install-showdown] ========== Pokemon Showdown 安装检查 ==========`);

  // 1. 检查 npm 包
  if (checkNpmPackage()) {
    console.log(`[install-showdown] ✅ npm 包已可用，无需额外安装`);
    return;
  }

  // 2. 检查本地路径
  if (checkLocalPath()) {
    console.log(`[install-showdown] ✅ 本地路径已存在，无需安装`);
    return;
  }

  // 3. 尝试从 GitHub 克隆
  console.log(`[install-showdown] ⚠️  未找到 Pokemon Showdown，开始自动安装...`);
  
  // 检查 Git 是否可用
  try {
    execSync('git --version', { stdio: 'ignore' });
  } catch (e) {
    console.error(`[install-showdown] ❌ 未检测到 Git，无法自动安装`);
    console.error(`[install-showdown] 请手动执行以下操作之一：`);
    console.error(`[install-showdown]   1. 安装 npm 包: npm install @pkmn/sim`);
    console.error(`[install-showdown]   2. 从 GitHub 克隆: git clone ${SHOWDOWN_REPO} "${TARGET_DIR}"`);
    process.exit(1);
  }

  // 执行克隆
  if (cloneFromGitHub()) {
    console.log(`[install-showdown] ✅ Pokemon Showdown 安装完成`);
  } else {
    console.error(`[install-showdown] ❌ 安装失败，请手动安装`);
    process.exit(1);
  }
}

// 执行
main();

