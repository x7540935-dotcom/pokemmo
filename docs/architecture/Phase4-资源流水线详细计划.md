# Phase 4｜资源流水线与自动化详细计划

> 版本：2025-11-19  
> 状态：进行中  
> 负责人：Pokemmo Myself Maintainers

---

## 目标

1. **资源清单化**：自动生成 sprites/data manifest，支持版本追踪
2. **资源校验**：缺失检测、完整性校验、版本一致性检查
3. **CI/CD 自动化**：lint、测试、体积阈值、e2e 冒烟测试
4. **资源优化**：差分补丁、CDN 缓存策略（可选）

---

## 详细步骤

### Step 1｜资源清单生成（Manifest System）

#### 1.1 创建 Sprites Manifest 生成器
- **文件**：`tools/generate-sprites-manifest.mjs`
- **功能**：
  - 扫描 `cache/sprites/` 目录
  - 生成 `cache/sprites-manifest.json`，包含：
    - 文件列表（文件名、大小、修改时间、MD5）
    - 宝可梦 ID 到文件的映射
    - 统计信息（总数、总大小、缺失列表）
- **输出格式**：
  ```json
  {
    "version": "1.0.0",
    "generatedAt": "2025-11-19T...",
    "totalFiles": 829,
    "totalSize": 12345678,
    "files": {
      "1-妙蛙种子.png": {
        "size": 1234,
        "mtime": "...",
        "md5": "...",
        "pokemonId": 1,
        "pokemonName": "bulbasaur"
      }
    },
    "pokemonMapping": {
      "1": "1-妙蛙种子.png",
      "bulbasaur": "1-妙蛙种子.png"
    },
    "missing": [...]
  }
  ```

#### 1.2 创建数据 Manifest 生成器
- **文件**：`tools/generate-data-manifest.mjs`
- **功能**：
  - 扫描 `data/chinese/` 目录
  - 生成 `data/data-manifest.json`，包含：
    - 文件列表（pokedex-cn.json, moves.json, items.json, abilities.json）
    - 每个文件的版本、大小、MD5
    - 数据统计（宝可梦数、技能数、道具数、特性数）
- **输出格式**：
  ```json
  {
    "version": "1.0.0",
    "generatedAt": "...",
    "files": {
      "pokedex-cn.json": {
        "size": 123456,
        "md5": "...",
        "pokemonCount": 1025
      },
      "moves.json": {...},
      "items.json": {...},
      "abilities.json": {...}
    },
    "statistics": {
      "totalPokemon": 1025,
      "totalMoves": 850,
      "totalItems": 500,
      "totalAbilities": 300
    }
  }
  ```

#### 1.3 集成到 npm scripts
- 在根目录 `package.json` 添加：
  ```json
  {
    "scripts": {
      "manifest:sprites": "node tools/generate-sprites-manifest.mjs",
      "manifest:data": "node tools/generate-data-manifest.mjs",
      "manifest:all": "npm run manifest:sprites && npm run manifest:data"
    }
  }
  ```

---

### Step 2｜资源校验脚本

#### 2.1 增强缺失检测脚本
- **文件**：`tools/validate-resources.mjs`
- **功能**：
  - 读取 manifest 文件
  - 检查文件是否存在、大小是否匹配、MD5 是否一致
  - 检查缺失的 sprites（对比 pokedex-cn.json 和 sprites-manifest.json）
  - 输出校验报告（JSON + 人类可读格式）
- **输出**：
  - `validation-report.json`：详细报告
  - 控制台输出：摘要信息

#### 2.2 版本一致性检查
- **功能**：
  - 检查 manifest 版本是否与 package.json 版本一致
  - 检查数据文件是否过期（超过 N 天未更新）
  - 检查 sprites 是否与数据文件中的宝可梦列表匹配

#### 2.3 集成到 npm scripts
- 添加：
  ```json
  {
    "scripts": {
      "validate:resources": "node tools/validate-resources.mjs",
      "validate:sprites": "node tools/validate-resources.mjs --type=sprites",
      "validate:data": "node tools/validate-resources.mjs --type=data"
    }
  }
  ```

---

### Step 3｜CI/CD 配置

#### 3.1 设置 ESLint
- **文件**：`.eslintrc.js` 或 `eslint.config.mjs`
- **配置**：
  - 使用 airbnb-base 或类似规则
  - 覆盖前端（packages/battle-engine）和后端（poke-proxy-server）
  - 添加 `.eslintignore`
- **npm scripts**：
  ```json
  {
    "lint": "eslint . --ext .js,.mjs",
    "lint:fix": "eslint . --ext .js,.mjs --fix"
  }
  ```

#### 3.2 设置 Prettier（可选）
- **文件**：`.prettierrc`
- **npm scripts**：
  ```json
  {
    "format": "prettier --write \"**/*.{js,mjs,json,md}\"",
    "format:check": "prettier --check \"**/*.{js,mjs,json,md}\""
  }
  ```

#### 3.3 GitHub Actions 工作流
- **文件**：`.github/workflows/ci.yml`
- **步骤**：
  1. Lint 检查
  2. 单元测试（前端 + 后端）
  3. 集成测试（WebSocket 冒烟）
  4. 资源校验（manifest 生成 + 校验）
  5. 体积阈值检查（bundle size）
  6. 覆盖率报告（上传到 Codecov 或类似服务）

#### 3.4 体积阈值检查
- **文件**：`tools/check-bundle-size.mjs`
- **功能**：
  - 检查前端构建产物大小
  - 对比历史记录，如果增长超过阈值则失败
  - 输出报告到 `bundle-size-report.json`

---

### Step 4｜E2E 冒烟测试

#### 4.1 设置 Playwright（推荐）或 Puppeteer
- **安装**：
  ```bash
  npm install --save-dev @playwright/test
  ```
- **配置**：`playwright.config.js`

#### 4.2 编写 E2E 测试
- **文件**：`tests/e2e/smoke.test.js`
- **测试场景**：
  1. 启动服务器
  2. 打开 AI 对战页面
  3. 选择队伍并开始对战
  4. 验证 UI 渲染（HP 条、技能按钮）
  5. 执行一个回合（选择技能）
  6. 验证协议接收和状态更新
  7. 关闭连接

#### 4.3 集成到 CI
- 在 GitHub Actions 中添加 E2E 测试步骤

---

### Step 5｜资源优化（可选，后续实施）

#### 5.1 差分补丁生成
- **文件**：`tools/generate-diff-patch.mjs`
- **功能**：对比两个版本的 manifest，生成增量更新包

#### 5.2 CDN 缓存策略
- 配置缓存头、版本化 URL、CDN 集成

---

## 任务清单

| 编号 | 任务 | 文件/目录 | 状态 |
| ---- | ---- | --------- | ---- |
| P4-01 | 创建 Sprites Manifest 生成器 | `tools/generate-sprites-manifest.mjs` | ⏳ |
| P4-02 | 创建数据 Manifest 生成器 | `tools/generate-data-manifest.mjs` | ⏳ |
| P4-03 | 集成 manifest 生成到 npm scripts | `package.json` | ⏳ |
| P4-04 | 创建资源校验脚本 | `tools/validate-resources.mjs` | ⏳ |
| P4-05 | 设置 ESLint 配置 | `.eslintrc.js` | ⏳ |
| P4-06 | 创建 GitHub Actions CI 工作流 | `.github/workflows/ci.yml` | ⏳ |
| P4-07 | 创建体积阈值检查脚本 | `tools/check-bundle-size.mjs` | ⏳ |
| P4-08 | 设置 Playwright E2E 测试 | `tests/e2e/`, `playwright.config.js` | ⏳ |
| P4-09 | 编写 E2E 冒烟测试 | `tests/e2e/smoke.test.js` | ⏳ |
| P4-10 | 更新文档（README、开发文档） | `README.md`, `docs/项目开发文档.md` | ⏳ |

---

## 验收标准

- ✅ Manifest 文件自动生成，包含完整元数据
- ✅ 资源校验脚本能检测缺失、损坏、版本不一致
- ✅ CI 流程：lint → 测试 → 校验 → 体积检查 → E2E
- ✅ 所有检查在 CI 中自动运行，失败时阻止合并
- ✅ 文档更新，说明如何使用新工具

---

## 实施顺序

1. **第一步**：P4-01, P4-02（Manifest 生成器）- 基础设施
2. **第二步**：P4-03, P4-04（集成和校验）- 验证工具
3. **第三步**：P4-05, P4-06（Lint 和 CI）- 自动化流程
4. **第四步**：P4-07, P4-08, P4-09（体积检查和 E2E）- 质量保证
5. **第五步**：P4-10（文档更新）- 收尾

---

## 参考

- 现有脚本：
  - `data/scripts/check-missing-sprites.mjs`
  - `missing-sprites.json`
- 相关文档：
  - `docs/项目开发文档.md`
  - `docs/架构说明文档.md`

