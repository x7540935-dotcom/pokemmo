"""
PDF文件转换器
"""
from pathlib import Path
from typing import List, Dict, Any, Optional
from langchain_core.documents import Document
from langchain_community.document_loaders import UnstructuredFileLoader
from RAG.data_processing.converters.base import BaseConverter


class PDFConverter(BaseConverter):
    """PDF文件转换器"""
    
    def can_convert(self, file_path: Path) -> bool:
        """判断是否可以转换PDF文件"""
        return file_path.suffix.lower() == '.pdf'
    
    def convert(self, file_path: Path, metadata: Optional[Dict[str, Any]] = None) -> List[Document]:
        """
        转换PDF文件为Document列表
        
        Args:
            file_path: 文件路径
            metadata: 额外的元数据
            
        Returns:
            List[Document]: Document列表
        """
        try:
            loader = UnstructuredFileLoader(str(file_path))
            documents = loader.load()
            
            # 添加文件信息到元数据
            file_metadata = {
                "file_path": str(file_path),
                "file_name": file_path.name,
                "file_type": "pdf",
                **(metadata or {})
            }
            
            # 更新文档元数据
            for doc in documents:
                doc.metadata.update(file_metadata)
            
            return documents
            
        except Exception as e:
            raise ValueError(f"转换PDF文件失败: {file_path}, 错误: {str(e)}")
    
    def get_supported_extensions(self) -> List[str]:
        """获取支持的文件扩展名"""
        return ['.pdf']

