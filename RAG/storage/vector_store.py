"""
向量存储接口
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from langchain_core.documents import Document


class VectorStore(ABC):
    """向量存储接口"""
    
    @abstractmethod
    def add_documents(self, documents: List[Document]) -> List[str]:
        """
        添加文档到向量存储
        
        Args:
            documents: 文档列表
            
        Returns:
            List[str]: 文档ID列表
        """
        pass
    
    @abstractmethod
    def search(
        self,
        query: str,
        top_k: int = 5,
        filter: Optional[Dict[str, Any]] = None
    ) -> List[Document]:
        """
        搜索相似文档
        
        Args:
            query: 查询文本
            top_k: 返回前k个结果
            filter: 过滤条件
            
        Returns:
            List[Document]: 相似文档列表
        """
        pass
    
    @abstractmethod
    def delete(self, document_ids: List[str]) -> bool:
        """
        删除文档
        
        Args:
            document_ids: 文档ID列表
            
        Returns:
            bool: 是否删除成功
        """
        pass
    
    @abstractmethod
    def get_retriever(self, search_kwargs: Optional[Dict[str, Any]] = None):
        """
        获取检索器
        
        Args:
            search_kwargs: 搜索参数
            
        Returns:
            检索器实例
        """
        pass

