"""
文本清洗器
"""
from langchain_core.documents import Document
from typing import List
from RAG.data_processing.cleaners.base import BaseCleaner
from RAG.utils.text_utils import TextUtils


class TextCleaner(BaseCleaner):
    """文本清洗器"""
    
    def __init__(self, config: dict = None):
        """
        初始化文本清洗器
        
        Args:
            config: 配置字典
        """
        super().__init__(config)
        self.text_utils = TextUtils()
        self.remove_empty = self.config.get("remove_empty", True)
        self.min_length = self.config.get("min_length", 10)
    
    def clean(self, documents: List[Document]) -> List[Document]:
        """
        清洗文档列表
        
        Args:
            documents: 文档列表
            
        Returns:
            List[Document]: 清洗后的文档列表
        """
        cleaned_documents = []
        
        for doc in documents:
            # 清洗文本内容
            cleaned_text = self.clean_text(doc.page_content)
            
            # 过滤空文档
            if self.remove_empty and not cleaned_text.strip():
                continue
            
            # 过滤过短文档
            if len(cleaned_text) < self.min_length:
                continue
            
            # 创建清洗后的文档
            cleaned_doc = Document(
                page_content=cleaned_text,
                metadata=doc.metadata
            )
            cleaned_documents.append(cleaned_doc)
        
        return cleaned_documents
    
    def clean_text(self, text: str) -> str:
        """
        清洗单个文本
        
        Args:
            text: 文本内容
            
        Returns:
            str: 清洗后的文本
        """
        if not text:
            return ""
        
        # 使用TextUtils清洗文本
        text = self.text_utils.clean_text(text)
        text = self.text_utils.normalize_whitespace(text)
        
        return text

