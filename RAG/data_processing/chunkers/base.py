"""
文本切块器基类
"""
from abc import ABC, abstractmethod
from langchain_core.documents import Document
from typing import List, Dict, Any


class BaseChunker(ABC):
    """文本切块器基类"""
    
    def __init__(self, config: Dict[str, Any] = None):
        """
        初始化切块器
        
        Args:
            config: 切块器配置
        """
        self.config = config or {}
    
    @abstractmethod
    def chunk(self, documents: List[Document]) -> List[Document]:
        """
        切分文档列表
        
        Args:
            documents: 文档列表
            
        Returns:
            List[Document]: 切分后的文档列表
        """
        pass

