# 中文资料获取说明

这个脚本用于从52poke百科（https://wiki.52poke.com/）获取宝可梦相关的中文资料。

## 功能

- 获取宝可梦中文名称
- 获取技能中文名称
- 获取特性中文名称
- 获取道具中文名称

## 使用方法

### 1. 安装依赖

确保已安装 `node-fetch`：

```bash
npm install node-fetch
```

### 2. 运行脚本

#### 获取所有类型的数据（每个类型处理前10个作为测试）

```bash
node data/fetch-chinese-data.mjs all
```

#### 获取特定类型的数据

```bash
# 获取宝可梦中文名称
node data/fetch-chinese-data.mjs pokedex

# 获取技能中文名称
node data/fetch-chinese-data.mjs moves

# 获取特性中文名称
node data/fetch-chinese-data.mjs abilities

# 获取道具中文名称
node data/fetch-chinese-data.mjs items
```

#### 分批处理（推荐）

由于数据量较大，建议分批处理：

```bash
# 处理前50个宝可梦
node data/fetch-chinese-data.mjs pokedex 0 50

# 处理第50-99个宝可梦
node data/fetch-chinese-data.mjs pokedex 50 50

# 处理第100-149个宝可梦
node data/fetch-chinese-data.mjs pokedex 100 50
```

### 3. 输出文件

脚本会在 `data/chinese/` 目录下生成以下JSON文件：

- `pokedex.json` - 宝可梦中文名称映射
- `moves.json` - 技能中文名称映射
- `abilities.json` - 特性中文名称映射
- `items.json` - 道具中文名称映射

### 4. 数据格式

每个JSON文件的格式如下：

```json
{
  "bulbasaur": "妙蛙种子",
  "ivysaur": "妙蛙草",
  "venusaur": "妙蛙花",
  ...
}
```

键（key）是英文ID（与Showdown数据一致），值（value）是中文名称。

## 注意事项

1. **API请求限制**：脚本会在每次请求之间延迟800ms，避免请求过快导致被限制
2. **增量更新**：脚本支持增量更新，已存在的数据不会被重复获取
3. **断点续传**：如果中途中断，可以从中断的位置继续处理
4. **数据验证**：脚本会验证获取的中文名称是否正确

## 使用示例

### 完整获取所有数据

```bash
# 1. 获取所有宝可梦（分批处理）
node data/fetch-chinese-data.mjs pokedex 0 100
node data/fetch-chinese-data.mjs pokedex 100 100
node data/fetch-chinese-data.mjs pokedex 200 100
# ... 继续直到处理完所有宝可梦

# 2. 获取所有技能
node data/fetch-chinese-data.mjs moves 0 100
node data/fetch-chinese-data.mjs moves 100 100
# ... 继续直到处理完所有技能

# 3. 获取所有特性
node data/fetch-chinese-data.mjs abilities

# 4. 获取所有道具
node data/fetch-chinese-data.mjs items 0 100
node data/fetch-chinese-data.mjs items 100 100
# ... 继续直到处理完所有道具
```

## 故障排除

### 1. API请求失败

如果遇到API请求失败，可能是：
- 网络连接问题
- 请求频率过高（脚本会自动延迟，但可能需要增加延迟时间）
- 52poke百科API限制

解决方法：
- 检查网络连接
- 增加 `REQUEST_DELAY` 的值（在脚本中修改）
- 减少每次处理的数量

### 2. 某些名称无法找到

如果某些英文名称无法找到对应的中文名称，可能是：
- 名称不匹配（52poke百科使用的名称可能略有不同）
- 页面不存在
- API搜索限制

解决方法：
- 手动检查52poke百科
- 手动添加到JSON文件中

### 3. 数据不完整

如果获取的数据不完整，可以：
- 检查 `data/chinese/` 目录下的JSON文件
- 继续运行脚本，已存在的数据会被跳过
- 手动补充缺失的数据

## 数据使用

获取的中文数据可以在项目中使用，例如：

```javascript
import pokedexChinese from './data/chinese/pokedex.json';

// 获取宝可梦的中文名称
const chineseName = pokedexChinese['bulbasaur']; // "妙蛙种子"
```

## 更新数据

如果需要更新数据：

1. 删除 `data/chinese/` 目录下的JSON文件
2. 重新运行脚本
3. 或者使用增量更新（脚本会自动跳过已存在的数据）

## 许可证

此脚本仅用于获取公开的中文资料，请遵守52poke百科的使用条款。

