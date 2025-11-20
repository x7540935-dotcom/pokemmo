"""
ChromaDB向量存储实现（已弃用，改用SimpleVectorStore）
由于chromadb 0.3.23与pydantic 2.x不兼容，改用SimpleVectorStore作为默认实现
保持ChromaVectorStore类名以兼容现有代码
"""
from RAG.storage.simple_vector_store import SimpleVectorStore

# 直接使用SimpleVectorStore作为ChromaVectorStore的实现
ChromaVectorStore = SimpleVectorStore
