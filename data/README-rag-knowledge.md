# RAG知识库数据获取脚本使用说明

## 简介

`fetch-rag-knowledge.mjs` 是一个用于获取RAG知识库数据的脚本，**优先使用官方API**，爬虫作为备选方案。

## 支持的数据源

### 1. PokeAPI（API优先）✅
- **网址**: https://pokeapi.co/
- **类型**: RESTful API
- **数据**: 宝可梦数据、技能数据、特性数据
- **优点**: 免费、稳定、易于使用
- **限制**: 有请求频率限制

### 2. Pokemon Showdown Data（本地数据）✅
- **位置**: `pokemon-showdown/data/`
- **类型**: TypeScript数据文件
- **数据**: 宝可梦、技能、特性、道具的完整数据
- **优点**: 本地数据，无需网络请求

### 3. Smogon University（爬虫备选）⚠️
- **网址**: https://www.smogon.com/
- **类型**: 网页爬虫
- **数据**: 宝可梦分析、策略指南
- **注意**: 需要遵守robots.txt，避免频繁请求

### 4. 神奇宝贝百科（爬虫备选）⚠️
- **网址**: https://wiki.52poke.com/
- **类型**: MediaWiki API
- **数据**: 中文宝可梦数据
- **优点**: 支持中文，数据详细

## 安装依赖

脚本使用Node.js内置模块和以下依赖：
- `node-fetch` - HTTP请求（已安装）
- `fs-extra` - 文件操作（已安装）

如果需要更好的HTML解析，可以安装 `cheerio`（可选）：
```bash
cd "pokemmo myself"
npm install cheerio
```

## 使用方法

### 1. 从PokeAPI获取宝可梦数据（推荐）

```bash
cd "pokemmo myself"

# 获取指定宝可梦
node data/fetch-rag-knowledge.mjs pokeapi pikachu charizard blastoise venusaur

# 使用常用列表（前10只）
node data/fetch-rag-knowledge.mjs pokeapi common

# 默认使用前10只常用宝可梦
node data/fetch-rag-knowledge.mjs pokeapi
```

### 2. 从Pokemon Showdown提取本地数据

```bash
cd "pokemmo myself"
node data/fetch-rag-knowledge.mjs showdown
```

### 3. 从Smogon获取分析（备选方案）

```bash
cd "pokemmo myself"

# 获取指定宝可梦的分析
node data/fetch-rag-knowledge.mjs smogon pikachu charizard format=ss

# 使用常用列表
node data/fetch-rag-knowledge.mjs smogon common format=ss
```

### 4. 从神奇宝贝百科获取数据（备选方案）

```bash
cd "pokemmo myself"
node data/fetch-rag-knowledge.mjs 52poke 皮卡丘
```

### 5. 获取所有数据源（推荐）

```bash
cd "pokemmo myself"
node data/fetch-rag-knowledge.mjs all
```

## 数据保存位置

所有数据保存在：
```
pokemmo myself/RAG/data/raw/
```

目录结构：
```
RAG/data/raw/
├── pokeapi/
│   ├── pokemon/
│   │   ├── pikachu.json
│   │   └── charizard.json
│   ├── moves/
│   └── abilities/
├── showdown/
│   ├── pokedex.ts
│   ├── moves.ts
│   └── abilities.ts
├── smogon/
│   └── analyses/
└── 52poke/
    └── wiki/
```

## 数据格式

每个JSON文件包含：
```json
{
  "metadata": {
    "source": "pokeapi",
    "type": "pokemon",
    "fetchedAt": "2025-01-XX...",
    "pokemon": "pikachu"
  },
  "data": {
    // 实际数据
  }
}
```

## 配置选项

可以在脚本中修改 `CONFIG` 对象：
- `delay`: 请求延迟（毫秒），默认1000ms
- `maxRetries`: 最大重试次数，默认3次
- `timeout`: 请求超时时间，默认30秒

## 注意事项

1. **请求频率**: 
   - PokeAPI有请求频率限制，脚本已内置延迟
   - Smogon等网站需要更长的延迟（2秒）

2. **错误处理**:
   - 脚本会自动重试失败的请求
   - 失败的请求会记录错误日志，但不会中断整个流程

3. **数据完整性**:
   - API数据通常更完整和准确
   - 爬虫数据可能需要后续处理

4. **版权和合规**:
   - 遵守各网站的使用条款
   - 不要大量并发请求
   - 尊重robots.txt

## 推荐的数据获取顺序

### 阶段1：基础数据（必须）
```bash
# 1. Pokemon Showdown本地数据
node data/fetch-rag-knowledge.mjs showdown

# 2. PokeAPI常用宝可梦数据
node data/fetch-rag-knowledge.mjs pokeapi pikachu charizard blastoise venusaur lucario garchomp
```

### 阶段2：策略知识（推荐）
```bash
# Smogon分析（前50只常用宝可梦）
node data/fetch-rag-knowledge.mjs smogon pikachu charizard blastoise venusaur
```

### 阶段3：中文补充（可选）
```bash
# 神奇宝贝百科中文数据
node data/fetch-rag-knowledge.mjs 52poke 皮卡丘
```

## 故障排除

### 问题1：PokeAPI请求失败
- **原因**: 请求频率过高或网络问题
- **解决**: 增加 `delay` 配置，或稍后重试

### 问题2：Smogon爬虫失败
- **原因**: 网站反爬虫或网络问题
- **解决**: 增加延迟时间，或使用API优先方案

### 问题3：Pokemon Showdown数据目录不存在
- **原因**: 项目路径不正确
- **解决**: 确保 `pokemon-showdown` 目录在正确位置

## 后续处理

获取的数据可以：
1. 使用RAG系统的数据处理管道进行清洗和格式化
2. 转换为向量存储
3. 添加到知识库索引

参考 `RAG/scripts/process_documents.py` 进行数据处理。

