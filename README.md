# Pokemmo Myself

自托管的宝可梦对战/练习平台，提供 **AI 对战、真人 PvP、队伍管理、中文化资源、性能与可观测性** 等完整能力。经过 Phase 0–5 全量重构，前后端已经模块化、脚本/文档齐备，可直接用于二次开发或教学研究。

---

## 1. 核心特性

- **多入口前端**：`pokemmo.html`（AI）、`pvp-lobby.html`（匹配）、`battle.html`（调试）、`team.html`（队伍搭建）
- **模块化对战引擎**：`packages/battle-engine` 拆分 connection / protocol / state / UI / utils，可单独复用
- **分层后端**：`poke-proxy-server` 拆成 bootstrap → controller → domain → adapters，内建 AI 队伍、PvP 房间、健康检查
- **资源流水线**：Sprites / 数据 Manifest 生成、资源校验、体积阈值守卫
- **测试与 CI 能力**：Jest（单元/集成）、Playwright（E2E）、ESLint、bundle-size 检查脚本
- **可观测性**：统一 Logger + LogAggregator、Prometheus 指标 `/metrics`、前端性能上报 `/api/metrics`、诊断端点 `/api/diagnostics`

详细路线图与阶段产出见 `docs/architecture/重构路线图.md`、`docs/architecture/Phase5-观测与发布详细计划.md`。

---

## 2. 目录速览

```
pokemmo myself/
├── packages/battle-engine/         # 前端对战引擎（ES Modules）
├── poke-proxy-server/              # Node.js WebSocket/AI/PvP 服务
├── docs/                           # 重构后的完整文档体系
├── data/、cache/                   # 中文数据、Showdown 资源、manifest 输出
├── tools/                          # 资源/体积脚本、simple-http-server 等
├── tests/e2e/                      # Playwright 测试
├── *.html                          # 多入口页面
└── vendor/ / packages/*/utils/…    # 辅助脚本与前端工具
```

阅读指引：
- `docs/学习系列-01~04`：系统学习路线（整体、前端、后端、工程化）
- `docs/modules/前端模块说明.md`、`docs/modules/后端模块说明.md`：深入每个模块
- `docs/部署和分享指南.md`：在本机/局域网快速分享

---

## 3. 环境与依赖

| 组件 | 版本/说明 |
| ---- | -------- |
| Node.js | ≥ 18（推荐与仓库一致，便于运行 `ws`/`prom-client` 等依赖） |
| npm | 最新稳定版；也可使用 pnpm/yarn |
| 现代浏览器 | Chrome / Edge / Firefox，需支持 ES Modules & WebSocket |
| 可选 | Python 3.8+（部分 RAG/数据脚本）、`npx playwright install`（E2E） |

安装依赖：
```bash
# 根目录（前端工具、静态服务器、脚本）
npm install

# 后端服务
cd "pokemmo myself/poke-proxy-server"
npm install
```

---

## 4. 运行与调试

1. **启动后端 battle server**
   ```bash
   cd "pokemmo myself/poke-proxy-server"
   node battle-server.js
   # 默认 ws://localhost:3071/battle
   ```
2. **启动前端静态服务器（便于分享/跨设备访问）**
   ```bash
   cd "pokemmo myself"
   node simple-http-server.js 8080
   # http://localhost:8080
   ```
3. **打开页面**
   - AI 对战：`http://localhost:8080/pokemmo.html`
   - PvP 匹配：`http://localhost:8080/pvp-lobby.html`
   - 对战调试：`http://localhost:8080/battle.html`
   - 队伍搭建：`http://localhost:8080/team.html`

> 若仅在本机调试，可直接用浏览器打开 HTML 文件；如需让局域网内其他人访问，按 `docs/部署和分享指南.md` 生成 `?server=ws://你的IP:3071` 的入口链接。

---

## 5. 工程脚本

| 命令 | 作用 |
| ---- | ---- |
| `npm run battle` | 从根目录启动 `poke-proxy-server/battle-server.js` |
| `npm run proxy` | 下载/代理远程资源 |
| `npm run manifest:all` | 生成 sprites + data manifest |
| `npm run validate:resources` | 校验资源是否缺失 |
| `npm run check:bundle-size` | 检查资源/构建体积是否超限 |
| `npm run test` | `packages/battle-engine` 冒烟测试 |
| `npm run test:e2e` | Playwright 端到端测试（需先启动前后端服务或在脚本中自启） |
| `npm run lint` / `lint:fix` | ESLint 检查 / 自动修复 |

在 `poke-proxy-server` 子目录内还提供：
| 命令 | 作用 |
| ---- | ---- |
| `npm test` | Jest 单元/集成测试 |
| `npm run test:coverage` | 生成覆盖率 |

---

## 6. 可观测性 & 调试入口

- **日志**：统一 Logger + LogAggregator，可输出 JSON/文本并写文件
- **Prometheus**：访问 `http://localhost:3071/metrics`
- **健康/诊断**：
  - `/health`、`/health/live`、`/health/ready`
  - `/api/diagnostics`：房间/对战/日志/性能汇总
  - `/api/metrics`：前端性能数据（可查询最近上报）
- **前端性能**：内置 `PerformanceMonitor`、`WebVitalsReporter`，通过 `performance-init` 快速启用

---

## 7. 测试矩阵

- **前端引擎 smoke test**：`npm run test`
- **后端 Jest**：`cd poke-proxy-server && npm test`
- **Playwright E2E**：`npm run test:e2e`
- **静态检查**：`npm run lint`
- **资源/体积守卫**：`npm run manifest:all && npm run validate:resources && npm run check:bundle-size`

建议在提交前至少执行 `lint + test（前后端）+ manifest 校验`，CI 可直接复用上述脚本。

---

## 8. 贡献与学习

1. 先阅读 `docs/学习系列-01~04`，熟悉整体→前端→后端→工程化顺序
2. 对照 `docs/architecture/重构路线图.md` 选择你要延伸的方向（Phase 5 已完成，可直接进入功能/性能增强）
3. 提交修改前附上：
   - 功能点/修复点描述
   - 相关脚本输出（测试/校验/体积）
4. 需要进一步了解子模块，可查 `docs/modules` 目录

项目采用 MIT License。欢迎用于教育、研究或个人部署。最新更新时间：2025-11-20。

