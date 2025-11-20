# Pokemmo Myself

自托管的宝可梦对战平台，集成 AI / PvP 对战、队伍管理、本地化及 RAG 增强功能。当前处于 **重构阶段**，目标是在不牺牲功能的前提下让架构更清晰、体积更可控、开发体验更现代。

---

## 重构总览

| 阶段 | 目标 | 状态 |
| ---- | ---- | ---- |
| Phase 0 | 盘点脚本/文档、删除冗余（如 `tools/ts2json.js`） | ✅ |
| Phase 1 | 梳理文档&架构蓝图，统一前后端术语 | ✅ |
| Phase 2 | 前端模块化（`battle-system` → 打包产物 + 共享库） | ✅ |
| Phase 3 | 后端分层与配置中心化，拆分 `battle-server.js` 职责 | ✅ |
| Phase 4 | 资源/数据流水线与自动化测试、CI 体积守卫 | ✅ |

详细路线请见 `docs/architecture/重构路线图.md`。

---

## 快速开始

### 依赖

- Node.js 18+
- npm 或 pnpm
- （可选）Python 3.8+：RAG 相关脚本
- 现代浏览器（Chrome / Edge / Firefox）

### 安装

```bash
# 根目录依赖（工具、静态服务器等）
npm install

# 对战服务器依赖
cd "pokemmo myself/poke-proxy-server"
npm install
```

### 运行

```bash
# 1. 启动对战服务器（必需）
cd "pokemmo myself/poke-proxy-server"
node battle-server.js
# ws://localhost:3071/battle

# 2. 启动静态前端（分享或多端调试时）
cd "pokemmo myself"
node simple-http-server.js 8080
# http://localhost:8080
```

本地调试可直接打开 `pokemmo.html` / `pvp-lobby.html`；远程分享请带上 `?server=` 查询参数并参考 `docs/部署和分享指南.md`。

---

## 当前目录

```
pokemmo myself/
├── packages/battle-engine/    # 前端核心逻辑（已模块化）
├── docs/                      # 文档（重构版）
├── battle.html / pokemmo.html # 经典入口
├── poke-proxy-server/         # WebSocket / AI / PvP 服务
├── tools/                     # 实用工具（manifest 生成、校验、体积检查）
├── tests/e2e/                 # E2E 测试（Playwright）
├── cache/、data/              # 资源与中文数据
└── team/、RAG/                # 队伍示例、RAG 知识库
```

更多细节参见：
- `docs/架构说明文档.md`：前后端分层、数据流以及关键模块
- `docs/modules/前端模块说明.md`：状态机、UI、工具拆解
- `docs/modules/后端模块说明.md`：AI / PvP 管理器与依赖

---

## 可用脚本

| 命令 | 说明 |
| ---- | ---- |
| `npm run battle` | 启动 `poke-proxy-server/battle-server.js` |
| `npm run proxy` | 资源代理（缓存精灵贴图） |
| `npm run test` | 运行前端 `battle-engine` 冒烟测试 |
| `npm run test:e2e` | 运行 E2E 测试（Playwright） |
| `npm run lint` | 运行 ESLint 代码检查 |
| `npm run lint:fix` | 自动修复 ESLint 问题 |
| `npm run manifest:all` | 生成所有资源清单（sprites + data） |
| `npm run validate:resources` | 校验资源完整性 |
| `npm run check:bundle-size` | 检查构建产物体积 |

> 🔧 旧的 `tools/ts2json.js` 已移除；数据转换改为在重构流水线中统一实现。

---

## 功能矩阵

- **AI 对战**：5 档难度（规则 / 策略 / RAG）
- **PvP**：房间系统、重连、队伍同步
- **队伍管理**：本地编辑 + Showdown 格式互转
- **中文本地化**：宝可梦/技能/道具/特性全量翻译
- **诊断工具**：协议日志、WebSocket 监控、资源缺失报告

---

## 贡献指南

1. 阅读 `docs/项目开发文档.md` 与 `docs/architecture/重构路线图.md`
2. 针对当期阶段提交 PR，并附上：
   - 对应任务或阶段编号
   - 测试或验证方式
3. 若涉及体积 / 资源变动，请附带统计脚本输出

欢迎在 Discussions 中交流架构调整建议。MIT License。  
最新更新时间：2025-11-19 (Phase 4 完成)

