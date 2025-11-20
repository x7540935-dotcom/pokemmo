"""
数据处理流水线
"""
from pathlib import Path
from typing import List, Dict, Any, Optional
from langchain_core.documents import Document
from RAG.data_processing.converters.base import BaseConverter
from RAG.data_processing.cleaners.base import BaseCleaner
from RAG.data_processing.chunkers.base import BaseChunker
from RAG.data_processing.converters.text_converter import TextConverter
from RAG.data_processing.converters.pdf_converter import PDFConverter
from RAG.data_processing.converters.docx_converter import DocxConverter
from RAG.data_processing.cleaners.text_cleaner import TextCleaner
from RAG.data_processing.chunkers.recursive_chunker import RecursiveChunker
from RAG.utils.logging_utils import get_logger

logger = get_logger(__name__)


class DataProcessingPipeline:
    """数据处理流水线"""
    
    def __init__(
        self,
        converters: Optional[List[BaseConverter]] = None,
        cleaners: Optional[List[BaseCleaner]] = None,
        chunker: Optional[BaseChunker] = None
    ):
        """
        初始化数据处理流水线
        
        Args:
            converters: 转换器列表，如果为None则使用默认转换器
            cleaners: 清洗器列表，如果为None则使用默认清洗器
            chunker: 切块器，如果为None则使用默认切块器
        """
        # 初始化转换器
        if converters is None:
            self.converters = [
                TextConverter(),
                PDFConverter(),
                DocxConverter(),
            ]
        else:
            self.converters = converters
        
        # 初始化清洗器
        if cleaners is None:
            self.cleaners = [TextCleaner()]
        else:
            self.cleaners = cleaners
        
        # 初始化切块器
        if chunker is None:
            self.chunker = RecursiveChunker({
                "chunk_size": 500,
                "chunk_overlap": 100,
            })
        else:
            self.chunker = chunker
    
    def add_converter(self, converter: BaseConverter):
        """
        添加转换器
        
        Args:
            converter: 转换器实例
        """
        self.converters.append(converter)
        logger.info(f"添加转换器: {converter.__class__.__name__}")
    
    def add_cleaner(self, cleaner: BaseCleaner):
        """
        添加清洗器
        
        Args:
            cleaner: 清洗器实例
        """
        self.cleaners.append(cleaner)
        logger.info(f"添加清洗器: {cleaner.__class__.__name__}")
    
    def set_chunker(self, chunker: BaseChunker):
        """
        设置切块器
        
        Args:
            chunker: 切块器实例
        """
        self.chunker = chunker
        logger.info(f"设置切块器: {chunker.__class__.__name__}")
    
    def _find_converter(self, file_path: Path) -> Optional[BaseConverter]:
        """
        查找合适的转换器
        
        Args:
            file_path: 文件路径
            
        Returns:
            Optional[BaseConverter]: 转换器实例，如果找不到则返回None
        """
        for converter in self.converters:
            if converter.can_convert(file_path):
                return converter
        return None
    
    def process_file(
        self,
        file_path: Path,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[Document]:
        """
        处理单个文件
        
        Args:
            file_path: 文件路径
            metadata: 额外的元数据
            
        Returns:
            List[Document]: 处理后的文档列表
        """
        logger.info(f"开始处理文件: {file_path}")
        
        # 1. 转换：将文件转换为Document列表
        converter = self._find_converter(file_path)
        if not converter:
            raise ValueError(f"不支持的文件类型: {file_path.suffix}")
        
        documents = converter.convert(file_path, metadata)
        logger.info(f"转换完成，得到 {len(documents)} 个文档")
        
        # 2. 清洗：清洗文档内容
        for cleaner in self.cleaners:
            documents = cleaner.clean(documents)
            logger.info(f"清洗完成，剩余 {len(documents)} 个文档")
        
        # 3. 切块：切分文档
        if self.chunker:
            documents = self.chunker.chunk(documents)
            logger.info(f"切块完成，得到 {len(documents)} 个文档块")
        
        return documents
    
    def process_files(
        self,
        file_paths: List[Path],
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[Document]:
        """
        处理多个文件
        
        Args:
            file_paths: 文件路径列表
            metadata: 额外的元数据
            
        Returns:
            List[Document]: 处理后的文档列表
        """
        all_documents = []
        
        for file_path in file_paths:
            try:
                documents = self.process_file(file_path, metadata)
                all_documents.extend(documents)
            except Exception as e:
                logger.error(f"处理文件失败: {file_path}, 错误: {str(e)}")
                continue
        
        logger.info(f"处理完成，共得到 {len(all_documents)} 个文档块")
        return all_documents

