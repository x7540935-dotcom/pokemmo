# RAG多轮对话助手使用指南

## 功能特性

- ✅ **多轮对话支持**：支持上下文理解的多轮对话
- ✅ **对话记录管理**：每次对话独立文件夹存储
- ✅ **增量摘要**：每3轮自动触发增量摘要，压缩token数量
- ✅ **知识库集成**：结合知识库和上下文回答问题
- ✅ **流式输出**：支持流式回答输出

## 快速开始

### 基本使用

```python
from RAG.knowledge_base import KnowledgeBase
from RAG.conversation import ConversationAssistant

# 初始化知识库
kb = KnowledgeBase()

# 创建对话助手
assistant = ConversationAssistant(knowledge_base=kb)

# 创建新对话
conv_id = assistant.create_conversation()

# 第一轮对话
answer1 = assistant.chat(conv_id, "什么是人工智能？")
print(f"助手：{answer1}")

# 第二轮对话（带上下文）
answer2 = assistant.chat(conv_id, "它有哪些应用领域？")
print(f"助手：{answer2}")

# 第三轮对话（继续上下文）
answer3 = assistant.chat(conv_id, "请详细介绍一下机器学习")
print(f"助手：{answer3}")
```

### 流式输出

```python
# 流式输出
conv_id = assistant.create_conversation()
print("助手：", end='', flush=True)
for chunk in assistant.stream_chat(conv_id, "什么是深度学习？"):
    print(chunk, end='', flush=True)
print()
```

### 加载历史对话

```python
# 加载历史对话
conv_id = assistant.load_conversation("conv_20250101_001")

# 继续对话
answer = assistant.chat(conv_id, "继续之前的话题")
print(f"助手：{answer}")
```

## 增量摘要功能

### 工作原理

1. **每3轮触发一次摘要**：当对话达到3轮、6轮、9轮...时，自动触发增量摘要
2. **增量摘要**：基于之前的摘要和新的对话内容，生成新的摘要
3. **token压缩**：用摘要替代原始对话，大幅减少token数量

### 摘要触发时机

- 第3轮：摘要前3轮对话
- 第6轮：基于第3轮的摘要 + 第4-6轮对话，生成新摘要
- 第9轮：基于第6轮的摘要 + 第7-9轮对话，生成新摘要
- ...以此类推

### 配置摘要间隔

```python
from RAG.config import RAGConfig, ContextConfig

# 自定义配置
config = RAGConfig()
config.context.summary_interval = 3  # 每3轮触发一次摘要（默认）

# 创建对话助手
assistant = ConversationAssistant(knowledge_base=kb, config=config)
```

## 对话记录管理

### 对话存储结构

```
RAG/data/conversations/
├── conv_20250101_001_a1b2c3d4/
│   └── history.json
├── conv_20250101_002_b2c3d4e5/
│   └── history.json
└── index.json  # 对话索引
```

### 列出所有对话

```python
# 列出所有对话
conversations = assistant.list_conversations()
for conv in conversations:
    print(f"对话ID: {conv['conversation_id']}")
    print(f"创建时间: {conv['created_at']}")
    print(f"对话轮次: {conv['total_turns']}")
```

### 删除对话

```python
# 删除对话
assistant.delete_conversation("conv_20250101_001")
```

### 搜索对话

```python
# 搜索对话
results = assistant.search_conversations("人工智能", max_results=10)
for result in results:
    print(f"找到对话: {result['conversation_id']}")
```

## 配置选项

### 对话配置

```python
from RAG.config import ConversationConfig

conversation_config = ConversationConfig(
    max_turns=30,                    # 最大对话轮次
    auto_save=True,                  # 自动保存
    save_interval=1,                 # 保存间隔（每N轮保存一次）
    context_window_size=30,          # 上下文窗口大小
    enable_context_compression=True, # 启用上下文压缩
    summary_interval=3,              # 摘要间隔（每N轮触发一次摘要）
)
```

### 上下文配置

```python
from RAG.config import ContextConfig

context_config = ContextConfig(
    max_turns=30,                    # 最大对话轮次
    context_format="markdown",       # 上下文格式
    include_timestamps=False,        # 包含时间戳
    compression_method="summary",    # 压缩方法：summary
    summary_interval=3,              # 摘要间隔
)
```

## 高级功能

### 获取对话历史

```python
# 获取对话历史
history = assistant.get_history(conv_id, max_turns=30)
for msg in history:
    print(f"[{msg['role']}] {msg['content']}")
```

### 自定义配置

```python
from RAG.config import RAGConfig, ConversationConfig, ContextConfig

# 创建自定义配置
config = RAGConfig()

# 配置对话
config.conversation.max_turns = 50
config.conversation.summary_interval = 5  # 每5轮触发一次摘要

# 配置上下文
config.context.summary_interval = 5
config.context.context_format = "plain"

# 创建对话助手
assistant = ConversationAssistant(knowledge_base=kb, config=config)
```

## 注意事项

1. **环境变量**：需要设置 `DASHSCOPE_API_KEY` 环境变量
2. **知识库**：确保知识库已初始化并包含相关文档
3. **摘要触发**：摘要会在每N轮（默认3轮）自动触发
4. **对话存储**：对话记录会自动保存到 `RAG/data/conversations/` 目录

## 示例

完整示例请参考 `RAG/examples/conversation_example.py`

---

**文档版本**：v1.0  
**更新日期**：2025年1月

