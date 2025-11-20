"""
数据转换器基类
"""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Dict, Any, Optional
from langchain_core.documents import Document


class BaseConverter(ABC):
    """数据转换器基类"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        初始化转换器
        
        Args:
            config: 转换器配置
        """
        self.config = config or {}
    
    @abstractmethod
    def can_convert(self, file_path: Path) -> bool:
        """
        判断是否可以转换该文件
        
        Args:
            file_path: 文件路径
            
        Returns:
            bool: 是否可以转换
        """
        pass
    
    @abstractmethod
    def convert(self, file_path: Path, metadata: Optional[Dict[str, Any]] = None) -> List[Document]:
        """
        转换文件为Document列表
        
        Args:
            file_path: 文件路径
            metadata: 额外的元数据
            
        Returns:
            List[Document]: Document列表
        """
        pass
    
    def get_supported_extensions(self) -> List[str]:
        """
        获取支持的文件扩展名
        
        Returns:
            List[str]: 支持的文件扩展名列表
        """
        return []
    
    def _create_document(
        self,
        content: str,
        source: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Document:
        """
        创建Document对象
        
        Args:
            content: 文档内容
            source: 文档来源
            metadata: 元数据
            
        Returns:
            Document: Document对象
        """
        doc_metadata = {
            "source": source,
            **(metadata or {})
        }
        
        return Document(
            page_content=content,
            metadata=doc_metadata
        )
