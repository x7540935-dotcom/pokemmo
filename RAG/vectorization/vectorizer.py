"""
向量化处理器
"""
from typing import List, Optional
from langchain_core.documents import Document
from RAG.vectorization.embeddings import EmbeddingModel
from RAG.utils.logging_utils import get_logger

logger = get_logger(__name__)


class Vectorizer:
    """向量化处理器"""
    
    def __init__(self, embedding_model: EmbeddingModel, batch_size: int = 32):
        """
        初始化向量化处理器
        
        Args:
            embedding_model: 嵌入模型
            batch_size: 批处理大小
        """
        self.embedding_model = embedding_model
        self.batch_size = batch_size
    
    def vectorize_texts(self, texts: List[str]) -> List[List[float]]:
        """
        向量化文本列表
        
        Args:
            texts: 文本列表
            
        Returns:
            List[List[float]]: 向量列表
        """
        if not texts:
            return []
        
        logger.info(f"开始向量化 {len(texts)} 个文本")
        
        # 批量处理
        vectors = []
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i + self.batch_size]
            batch_vectors = self.embedding_model.embed_documents(batch)
            vectors.extend(batch_vectors)
            logger.info(f"已向量化 {min(i + self.batch_size, len(texts))}/{len(texts)} 个文本")
        
        logger.info(f"向量化完成，共生成 {len(vectors)} 个向量")
        return vectors
    
    def vectorize_documents(self, documents: List[Document]) -> List[List[float]]:
        """
        向量化文档列表
        
        Args:
            documents: 文档列表
            
        Returns:
            List[List[float]]: 向量列表
        """
        texts = [doc.page_content for doc in documents]
        return self.vectorize_texts(texts)
    
    def vectorize_query(self, query: str) -> List[float]:
        """
        向量化查询文本
        
        Args:
            query: 查询文本
            
        Returns:
            List[float]: 查询向量
        """
        return self.embedding_model.embed_query(query)

