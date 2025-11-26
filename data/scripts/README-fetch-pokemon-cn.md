           # 从52poke百科获取中文名称和贴图

这个工具用于从 [52poke百科](https://wiki.52poke.com) 获取宝可梦的中文名称和贴图，补充项目中缺失的数据。

**数据源：**
- 52poke百科（MediaWiki）
- 宝可梦列表页面：https://wiki.52poke.com/wiki/宝可梦列表（按全国图鉴编号）

## 脚本说明

`fetch-pokemon-cn.mjs` - 使用项目已有依赖，无需安装额外包

**使用的依赖：**
- `node-fetch` (项目已有)
- Node.js 内置模块：`fs`, `path`, `url`

**无需安装任何额外依赖！**

**优势：**
- 使用MediaWiki API，更稳定可靠
- 数据格式规范，易于解析
- 支持批量获取
- 包含完整的宝可梦信息

## 相关脚本

### 1. `fetch-pokemon-cn.mjs` - 获取中文名称和贴图

从52poke百科获取宝可梦的中文名称和贴图。

### 2. `check-missing-sprites.mjs` - 检查缺失贴图

检查所有有中文映射但没有贴图的宝可梦。

**使用方法：**
```bash
# 在控制台显示结果
node data/scripts/check-missing-sprites.mjs

# 保存到文件
node data/scripts/check-missing-sprites.mjs --output=missing-sprites.txt

# JSON格式输出（推荐，用于后续下载）
node data/scripts/check-missing-sprites.mjs --json --output=missing-sprites.json

# CSV格式输出
node data/scripts/check-missing-sprites.mjs --csv --output=missing-sprites.csv
```

### 3. `download-missing-sprites.mjs` - 下载缺失贴图

为缺失贴图的宝可梦自动下载贴图。从52poke百科获取图片URL并下载。

**使用方法：**
```bash
# 从JSON文件读取缺失列表并下载所有
node data/scripts/download-missing-sprites.mjs --file=missing-sprites.json

# 下载前50个
node data/scripts/download-missing-sprites.mjs --file=missing-sprites.json --start=0 --count=50

# 只更新已有spriteUrl但未下载的
node data/scripts/download-missing-sprites.mjs --file=missing-sprites.json --update-only

# 启用调试模式
node data/scripts/download-missing-sprites.mjs --file=missing-sprites.json --debug
```

**工作流程：**
1. 从JSON文件读取缺失贴图的宝可梦列表
2. 对于已有`spriteUrl`的宝可梦，直接下载
3. 对于没有`spriteUrl`的宝可梦，从52poke百科搜索并获取图片URL
4. 下载图片并保存到`cache/sprites/`目录
5. 更新`pokedex-cn.json`文件，添加`spriteFile`和`spriteUrl`信息
6. 每10个宝可梦自动保存一次进度

## 使用方法

### 获取中文名称和贴图

```bash
# 获取前50个宝可梦（默认）
node data/scripts/fetch-pokemon-cn.mjs

# 从第100个开始，获取50个
node data/scripts/fetch-pokemon-cn.mjs --start=100 --count=50

# 只更新缺失的数据
node data/scripts/fetch-pokemon-cn.mjs --update-only

# 只获取中文名称，不下载贴图
node data/scripts/fetch-pokemon-cn.mjs --start=0 --count=100 --names-only

# 启用调试模式（查看详细日志和保存HTML文件）
node data/scripts/fetch-pokemon-cn.mjs --start=0 --count=1 --debug
```

## 输出文件

### 数据文件
- `data/chinese/pokedex-cn.json` - 中文名称和贴图映射

格式示例：
```json
{
  "pikachu": {
    "chineseName": "皮卡丘",
    "englishName": "Pikachu",
    "number": 25,
    "spriteFile": "25-皮卡丘.png",
    "spriteUrl": "https://..."
  }
}
```

### 贴图文件
- `cache/sprites/` - 贴图文件目录
- 文件名格式：`{编号}-{中文名称}.{扩展名}`

## 使用建议

### 首次使用
1. 先测试少量数据：
   ```bash
   node data/scripts/fetch-pokemon-cn.mjs --start=0 --count=10
   ```

2. 检查输出是否正确，如果网站结构变化导致无法获取数据，可以：
   - 手动调整脚本中的正则表达式模式
   - 检查网站的实际HTML结构

### 批量获取
由于网站可能有反爬虫机制，建议：
1. 分批获取，每次50-100个
2. 使用 `--update-only` 选项避免重复获取已有数据
3. 如果遇到大量失败，增加延迟时间（修改脚本中的 `REQUEST_DELAY`）

### 示例工作流
```bash
# 第1批：前50个
node data/scripts/fetch-pokemon-cn.mjs --start=0 --count=50

# 第2批：50-100
node data/scripts/fetch-pokemon-cn.mjs --start=50 --count=50

# 第3批：100-150
node data/scripts/fetch-pokemon-cn.mjs --start=100 --count=50

# ... 依此类推

# 最后，更新所有缺失的数据
node data/scripts/fetch-pokemon-cn.mjs --update-only
```

## 注意事项

1. **遵守网站使用条款**：请合理使用，不要过于频繁地请求，避免对服务器造成压力

2. **网络问题**：如果遇到网络错误，脚本会自动重试，但建议在网络稳定的环境下运行

3. **数据验证**：获取的数据可能需要人工验证，特别是：
   - 中文名称是否正确
   - 贴图是否匹配对应的宝可梦

4. **网站结构变化**：如果网站更新导致脚本无法正常工作，需要：
   - 检查网站的实际HTML结构
   - 更新脚本中的选择器和URL模式
   - 可能需要使用 Puppeteer 版本处理动态内容

5. **数据合并**：获取的数据会与现有的 `data/chinese/pokedex.json` 合并，不会覆盖已有数据

## 故障排除

### 问题：无法获取数据

**首先使用调试模式诊断问题：**
```bash
node data/scripts/fetch-pokemon-cn.mjs --start=0 --count=1 --debug
```

调试模式会：
- 显示详细的请求和响应信息
- 保存HTML文件到 `data/scripts/debug/` 目录
- 显示所有尝试的URL和结果

**然后检查：**
1. 查看调试日志，确认：
   - 哪些URL返回了响应
   - 响应状态码是什么
   - HTML内容是否包含宝可梦数据
2. 检查保存的HTML文件（`data/scripts/debug/pokemon-{编号}.html`）：
   - 查看实际的HTML结构
   - 确认宝可梦数据是否存在
   - 如果数据在JavaScript中，可能需要使用浏览器自动化工具
3. 如果网站是单页应用(SPA)：
   - 数据可能需要JavaScript渲染
   - 考虑使用Puppeteer等浏览器自动化工具
4. 其他可能的问题：
   - 检查网络连接
   - 检查网站是否可以正常访问
   - 检查网站结构是否变化，更新脚本中的正则表达式模式
   - 尝试增加请求延迟时间（修改脚本中的 `REQUEST_DELAY`）

### 问题：贴图下载失败
- 检查贴图URL是否正确
- 检查网络连接
- 检查文件权限（确保可以写入 `cache/sprites/` 目录）

### 问题：中文名称不正确
- 手动检查并修正 `pokedex-cn.json` 文件
- 可能需要调整HTML解析逻辑

## 与现有数据的整合

获取的数据保存在 `data/chinese/pokedex-cn.json`，可以在代码中这样使用：

```javascript
// 加载中文数据
import pokedexCn from './data/chinese/pokedex-cn.json';
import pokedex from './data/chinese/pokedex.json';

// 获取中文名称（优先使用官网数据）
function getChineseName(englishName) {
  const key = englishName.toLowerCase();
  return pokedexCn[key]?.chineseName || pokedex[key] || englishName;
}

// 获取贴图路径
function getSpritePath(englishName) {
  const key = englishName.toLowerCase();
  const spriteFile = pokedexCn[key]?.spriteFile;
  if (spriteFile) {
    return `cache/sprites/${spriteFile}`;
  }
  // 使用默认贴图路径
  return getPokemonSpriteUrl(key);
}
```

## 更新日志

- 2024-01-XX: 初始版本，支持从官网获取中文名称和贴图

