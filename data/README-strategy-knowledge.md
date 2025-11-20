# 策略知识抓取脚本使用说明

## 简介

`fetch-strategy-knowledge.mjs` 专门用于抓取**对战策略知识**，而非基础精灵数据。

## 问题修复说明

### 问题：Smogon文章URL返回404

**原因：**
- Smogon的文章URL结构可能已改变
- 部分文章可能已移除或迁移

**解决方案：**
1. **自动获取文章列表**：脚本会先尝试获取Smogon的文章列表，使用实际可用的URL
2. **备选方案**：如果文章获取失败，可以使用 `smogon-dex` 命令从宝可梦分析页面提取策略知识
3. **自动切换**：使用 `all` 命令时，如果文章获取失败会自动切换到备选方案

## 支持的数据源

### 1. Smogon策略文章（主要方案）
- **来源**: https://www.smogon.com/articles/
- **内容**: 策略指南、对战技巧、队伍构建等
- **状态**: 可能部分URL已失效，脚本会自动尝试获取可用文章

### 2. Smogon Dex策略（备选方案，推荐）✅
- **来源**: https://www.smogon.com/dex/ss/pokemon/{name}/
- **内容**: 从宝可梦分析页面提取策略信息
- **优点**: URL稳定，内容可靠
- **推荐**: 优先使用此方案

### 3. 神奇宝贝百科策略页面
- **来源**: https://wiki.52poke.com/
- **内容**: 中文对战策略说明
- **方法**: 使用MediaWiki API

## 使用方法

### 1. 从Smogon Dex获取策略知识（推荐）

```bash
cd "pokemmo myself"

# 使用默认常用宝可梦列表
node data/fetch-strategy-knowledge.mjs smogon-dex

# 指定宝可梦
node data/fetch-strategy-knowledge.mjs smogon-dex pikachu charizard blastoise

# 指定格式
node data/fetch-strategy-knowledge.mjs smogon-dex pikachu format=ss
```

### 2. 尝试获取Smogon策略文章

```bash
# 获取推荐文章
node data/fetch-strategy-knowledge.mjs smogon

# 列出所有可用文章
node data/fetch-strategy-knowledge.mjs smogon list
```

### 3. 获取神奇宝贝百科策略页面

```bash
# 使用推荐页面列表
node data/fetch-strategy-knowledge.mjs 52poke

# 指定页面
node data/fetch-strategy-knowledge.mjs 52poke 对战 属性相克
```

### 4. 获取所有策略知识（推荐）

```bash
node data/fetch-strategy-knowledge.mjs all
```

此命令会：
1. 尝试获取Smogon策略文章
2. 如果失败，自动切换到Smogon Dex策略（备选方案）
3. 获取神奇宝贝百科策略页面

## 数据保存位置

所有数据保存在：
```
pokemmo myself/RAG/data/raw/strategy/
```

目录结构：
```
strategy/
├── smogon/
│   ├── articles/          # Smogon策略文章
│   └── dex-strategy/      # Smogon Dex策略（备选方案）
└── 52poke/
    └── strategy/          # 神奇宝贝百科策略页面
```

## 推荐使用方案

### 方案1：使用备选方案（最稳定）✅

```bash
node data/fetch-strategy-knowledge.mjs smogon-dex
```

从常用宝可梦的分析页面提取策略知识，URL稳定可靠。

### 方案2：获取所有数据源

```bash
node data/fetch-strategy-knowledge.mjs all
```

自动尝试所有数据源，失败时自动切换。

## 故障排除

### 问题1：Smogon文章返回404

**原因**: 文章URL已失效或网站结构改变

**解决**: 
- 使用 `smogon-dex` 命令（备选方案）
- 或使用 `smogon list` 查看可用文章

### 问题2：请求失败/超时

**原因**: 网络问题或请求频率过高

**解决**:
- 检查网络连接
- 脚本已内置延迟和重试机制
- 可以手动增加 `CONFIG.delay` 的值

### 问题3：HTML解析失败

**原因**: cheerio未安装或网站结构改变

**解决**:
```bash
npm install cheerio
```

未安装时脚本会保存原始HTML，可以后续处理。

## 数据格式

每个JSON文件包含：
```json
{
  "metadata": {
    "source": "smogon-dex",
    "type": "pokemon_strategy",
    "fetchedAt": "2025-01-XX...",
    "pokemon": "pikachu"
  },
  "data": {
    "pokemon": "pikachu",
    "strategy": "策略文本内容...",
    "text": "完整文本...",
    "html": "原始HTML（部分）"
  }
}
```

## 注意事项

1. **遵守网站规则**: 
   - 不要过于频繁请求
   - 遵守robots.txt
   - 脚本已内置延迟机制

2. **数据时效性**:
   - 策略知识会随游戏版本更新
   - 建议定期更新知识库

3. **内容质量**:
   - Smogon Dex策略来自官方分析，质量较高
   - 建议优先使用备选方案（smogon-dex）

## 后续处理

获取的数据可以：
1. 使用RAG系统的数据处理管道进行清洗
2. 转换为向量存储
3. 添加到知识库索引

参考 `RAG/scripts/process_documents.py` 进行数据处理。

