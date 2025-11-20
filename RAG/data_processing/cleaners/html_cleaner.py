"""
HTML清洗器
"""
from langchain_core.documents import Document
from typing import List
from RAG.data_processing.cleaners.base import BaseCleaner
from RAG.utils.text_utils import TextUtils


class HTMLCleaner(BaseCleaner):
    """HTML清洗器"""
    
    def __init__(self, config: dict = None):
        """
        初始化HTML清洗器
        
        Args:
            config: 配置字典
        """
        super().__init__(config)
        self.text_utils = TextUtils()
    
    def clean(self, documents: List[Document]) -> List[Document]:
        """
        清洗文档列表（移除HTML标签）
        
        Args:
            documents: 文档列表
            
        Returns:
            List[Document]: 清洗后的文档列表
        """
        cleaned_documents = []
        
        for doc in documents:
            # 移除HTML标签
            cleaned_text = self.text_utils.remove_html_tags(doc.page_content)
            
            # 标准化空白字符
            cleaned_text = self.text_utils.normalize_whitespace(cleaned_text)
            
            # 创建清洗后的文档
            cleaned_doc = Document(
                page_content=cleaned_text,
                metadata=doc.metadata
            )
            cleaned_documents.append(cleaned_doc)
        
        return cleaned_documents
    
    def clean_text(self, text: str) -> str:
        """
        清洗单个文本（移除HTML标签）
        
        Args:
            text: 文本内容
            
        Returns:
            str: 清洗后的文本
        """
        if not text:
            return ""
        
        # 移除HTML标签
        text = self.text_utils.remove_html_tags(text)
        text = self.text_utils.normalize_whitespace(text)
        
        return text

