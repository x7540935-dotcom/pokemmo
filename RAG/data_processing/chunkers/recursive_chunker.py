"""
递归文本切块器
"""
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List, Dict, Any
from RAG.data_processing.chunkers.base import BaseChunker


class RecursiveChunker(BaseChunker):
    """递归文本切块器"""
    
    def __init__(self, config: Dict[str, Any] = None):
        """
        初始化递归切块器
        
        Args:
            config: 配置字典，支持以下参数：
                - chunk_size: 块大小，默认500
                - chunk_overlap: 块重叠大小，默认100
                - separators: 分隔符列表，默认None
        """
        super().__init__(config)
        
        # 获取配置参数
        chunk_size = self.config.get("chunk_size", 500)
        chunk_overlap = self.config.get("chunk_overlap", 100)
        separators = self.config.get("separators", None)
        
        # 创建切块器
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=separators,
        )
    
    def chunk(self, documents: List[Document]) -> List[Document]:
        """
        切分文档列表
        
        Args:
            documents: 文档列表
            
        Returns:
            List[Document]: 切分后的文档列表
        """
        if not documents:
            return []
        
        # 使用RecursiveCharacterTextSplitter切分文档
        chunked_documents = self.splitter.split_documents(documents)
        
        return chunked_documents

