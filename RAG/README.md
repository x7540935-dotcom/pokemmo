# RAG知识库系统

模块化的RAG（Retrieval-Augmented Generation）知识库系统，支持文档处理、向量化、存储和检索。

## 功能特性

- **模块化设计**：清晰的模块划分，易于扩展和维护
- **多格式支持**：支持文本、PDF、Word等多种文档格式
- **数据处理流水线**：转换、清洗、切块一体化处理
- **向量化存储**：基于ChromaDB的向量存储
- **智能检索**：支持相似度检索和过滤
- **问答系统**：基于LangChain的问答链
- **多轮对话**：支持上下文理解的多轮对话助手（新增）
  - 增量摘要：每3轮自动触发增量摘要，压缩token数量
  - 对话记录：每次对话独立文件夹存储
  - 上下文管理：智能的上下文管理和压缩机制

## 项目结构

```
RAG/
├── config.py                 # 配置管理
├── knowledge_base.py         # 知识库主类
├── data_processing/          # 数据处理模块
│   ├── converters/          # 数据转换器
│   ├── cleaners/            # 数据清洗器
│   ├── chunkers/            # 文本切块器
│   └── pipeline.py          # 数据处理流水线
├── vectorization/            # 向量化模块
│   ├── embeddings.py        # 嵌入模型管理
│   └── vectorizer.py        # 向量化处理器
├── storage/                  # 存储模块
│   ├── vector_store.py      # 向量存储接口
│   └── chroma_store.py      # ChromaDB实现
├── retrieval/                # 检索模块
│   └── retriever.py         # 检索器
├── query/                    # 查询模块
│   ├── prompt.py            # 提示词管理
│   └── chain.py             # 问答链
├── scripts/                  # 脚本目录
│   ├── process_documents.py # 处理文档脚本
│   ├── query.py             # 查询脚本
│   ├── build_index.py       # 构建索引脚本
│   └── manage_db.py         # 数据库管理脚本
├── utils/                    # 工具函数
│   ├── file_utils.py        # 文件工具
│   ├── text_utils.py        # 文本工具
│   └── logging_utils.py     # 日志工具
└── data/                     # 数据目录
    ├── raw/                 # 原始数据
    ├── processed/           # 处理后数据
    ├── vectors/             # 向量数据
    └── metadata/            # 元数据
```

## 快速开始

### 1. 环境配置

```bash
# 设置环境变量
export DASHSCOPE_API_KEY=your_api_key
export EMBEDDING_MODEL_PATH=/path/to/embedding/model  # 可选
```

### 2. 基本使用（知识库）

```python
from RAG.knowledge_base import KnowledgeBase
from RAG.config import RAGConfig
from pathlib import Path

# 初始化知识库
config = RAGConfig()
kb = KnowledgeBase(config)

# 添加文档
file_paths = [Path("document1.txt"), Path("document2.pdf")]
document_ids = kb.add_documents(file_paths)

# 查询
answer = kb.query("什么是人工智能？")
print(answer)

# 搜索
documents = kb.search("人工智能", top_k=5)
for doc in documents:
    print(doc.page_content)
```

### 3. 多轮对话助手（新增）

```python
from RAG.knowledge_base import KnowledgeBase
from RAG.conversation import ConversationAssistant

# 初始化知识库
kb = KnowledgeBase()

# 创建对话助手
assistant = ConversationAssistant(knowledge_base=kb)

# 创建新对话
conv_id = assistant.create_conversation()

# 多轮对话
answer1 = assistant.chat(conv_id, "什么是人工智能？")
answer2 = assistant.chat(conv_id, "它有哪些应用领域？")  # 带上下文
answer3 = assistant.chat(conv_id, "请详细介绍一下机器学习")  # 继续上下文
```

详细使用指南请参考 [RAG/README_CONVERSATION.md](README_CONVERSATION.md)

### 3. 使用脚本

#### 处理文档
```bash
python RAG/scripts/process_documents.py document1.txt document2.pdf
```

#### 查询知识库
```bash
python RAG/scripts/query.py "什么是人工智能？"
```

#### 构建索引
```bash
python RAG/scripts/build_index.py RAG/data/raw
```

#### 管理数据库
```bash
# 搜索文档
python RAG/scripts/manage_db.py search "人工智能" --top-k 5

# 删除文档
python RAG/scripts/manage_db.py delete doc_id1 doc_id2
```

## 配置说明

### 默认配置

系统使用默认配置，可以通过环境变量或配置文件自定义：

- **LLM配置**：通过 `DASHSCOPE_API_KEY` 环境变量设置API密钥
- **嵌入模型**：通过 `EMBEDDING_MODEL_PATH` 环境变量设置模型路径
- **数据目录**：默认使用 `RAG/data/` 目录
- **向量存储**：默认使用 `RAG/data/vectors/` 目录

### 自定义配置

```python
from RAG.config import RAGConfig, EmbeddingConfig, LLMConfig, ChunkConfig

# 创建自定义配置
config = RAGConfig()

# 修改嵌入模型配置
config.embedding.model_name = "BAAI/bge-large-zh-v1"
config.embedding.device = "cuda"

# 修改LLM配置
config.llm.temperature = 0.5
config.llm.max_tokens = 4096

# 修改切块配置
config.chunk.chunk_size = 1000
config.chunk.chunk_overlap = 200

# 使用配置初始化知识库
kb = KnowledgeBase(config)
```

## 扩展功能

### 添加新的数据转换器

```python
from RAG.data_processing.converters.base import BaseConverter
from langchain_core.documents import Document

class ExcelConverter(BaseConverter):
    def can_convert(self, file_path):
        return file_path.suffix.lower() == '.xlsx'
    
    def convert(self, file_path, metadata=None):
        # 实现转换逻辑
        documents = []
        # ...
        return documents

# 使用新转换器
from RAG.knowledge_base import KnowledgeBase
from RAG.data_processing.pipeline import DataProcessingPipeline

pipeline = DataProcessingPipeline()
pipeline.add_converter(ExcelConverter())

# 在知识库中使用自定义流水线
kb = KnowledgeBase()
kb.data_pipeline = pipeline
```

### 添加新的清洗器

```python
from RAG.data_processing.cleaners.base import BaseCleaner

class CustomCleaner(BaseCleaner):
    def clean(self, documents):
        # 实现清洗逻辑
        cleaned_documents = []
        # ...
        return cleaned_documents

# 使用新清洗器
pipeline = DataProcessingPipeline()
pipeline.add_cleaner(CustomCleaner())
```

### 添加新的切块器

```python
from RAG.data_processing.chunkers.base import BaseChunker

class SemanticChunker(BaseChunker):
    def chunk(self, documents):
        # 实现语义切块逻辑
        chunked_documents = []
        # ...
        return chunked_documents

# 使用新切块器
pipeline = DataProcessingPipeline()
pipeline.set_chunker(SemanticChunker())
```

## 构建知识库

系统提供了脚本帮助快速构建宝可梦对战知识库。

### 1. 导入 Pokemon Showdown 基础数据

```bash
# 导出 Pokemon Showdown 数据为 JSON
node RAG/scripts/export_showdown_data.js

# 将导出的 JSON 写入知识库
python RAG/scripts/ingest_showdown_data.py
```

执行完成后，可在 `RAG/data/raw/showdown/` 看到导出的 JSON 文件，知识库内将包含宝可梦、招式、特性、道具等基础数据。

### 2. 导入 Smogon 对战分析

```bash
# 默认导入内置的常用宝可梦
python RAG/scripts/ingest_smogon_analyses.py

# 指定宝可梦列表（示例）
python RAG/scripts/ingest_smogon_analyses.py --pokemon pikachu,dragonite,garchomp

# 从文件读取宝可梦列表（每行一个名称）
python RAG/scripts/ingest_smogon_analyses.py --file pokemon_list.txt
```

脚本将抓取 Smogon Strategy Dex 的分析页面，并写入知识库。运行脚本前建议确认本地网络可以访问 Smogon。

### 3. 自定义扩展

- 如需导入其他资源，可参考 `ingest_showdown_data.py` 和 `ingest_smogon_analyses.py` 的实现。
- 建议将抓取的原始文件存放在 `RAG/data/raw/`，便于追踪。
- 可结合 `KnowledgeBase` 提供的 `add_text` 或 `vector_store.add_documents` 方法写入自定义文档。

## 兼容性

系统提供了兼容旧接口的适配器 `RAG/RAG.py`，保持与原有代码的兼容性。

## 注意事项

1. **模型路径**：如果使用本地嵌入模型，需要设置 `EMBEDDING_MODEL_PATH` 环境变量
2. **API密钥**：需要设置 `DASHSCOPE_API_KEY` 环境变量
3. **数据目录**：确保数据目录有写入权限
4. **依赖安装**：确保安装了所有必需的依赖包

## 许可证

[待定]

## 贡献

欢迎提交Issue和Pull Request！

---

**最后更新**：2025年1月

