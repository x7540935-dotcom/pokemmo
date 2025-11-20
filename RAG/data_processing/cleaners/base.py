"""
数据清洗器基类
"""
from abc import ABC, abstractmethod
from langchain_core.documents import Document
from typing import List, Dict, Any


class BaseCleaner(ABC):
    """数据清洗器基类"""
    
    def __init__(self, config: Dict[str, Any] = None):
        """
        初始化清洗器
        
        Args:
            config: 清洗器配置
        """
        self.config = config or {}
    
    @abstractmethod
    def clean(self, documents: List[Document]) -> List[Document]:
        """
        清洗文档列表
        
        Args:
            documents: 文档列表
            
        Returns:
            List[Document]: 清洗后的文档列表
        """
        pass
    
    def clean_text(self, text: str) -> str:
        """
        清洗单个文本（可选实现）
        
        Args:
            text: 文本内容
            
        Returns:
            str: 清洗后的文本
        """
        return text

