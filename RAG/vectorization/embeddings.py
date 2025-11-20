"""
嵌入模型管理
"""
from typing import Optional, List
from langchain_huggingface import HuggingFaceEmbeddings
from RAG.config import EmbeddingConfig
from RAG.utils.logging_utils import get_logger

logger = get_logger(__name__)


class EmbeddingModel:
    """嵌入模型管理类"""
    
    def __init__(self, config: EmbeddingConfig):
        """
        初始化嵌入模型
        
        Args:
            config: 嵌入模型配置
        """
        self.config = config
        self.model = None
        self._initialize_model()
    
    def _initialize_model(self):
        """初始化模型"""
        try:
            # 如果指定了本地模型路径，使用本地路径
            model_name = self.config.model_path or self.config.model_name
            
            logger.info(f"初始化嵌入模型: {model_name}")
            
            # 创建嵌入模型
            self.model = HuggingFaceEmbeddings(
                model_name=model_name,
                model_kwargs={
                    "device": self.config.device,
                },
                encode_kwargs={
                    "normalize_embeddings": self.config.normalize_embeddings,
                }
            )
            
            logger.info("嵌入模型初始化完成")
            
        except Exception as e:
            logger.error(f"嵌入模型初始化失败: {str(e)}")
            raise
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        嵌入文档列表
        
        Args:
            texts: 文本列表
            
        Returns:
            List[List[float]]: 嵌入向量列表
        """
        if not self.model:
            raise ValueError("嵌入模型未初始化")
        
        return self.model.embed_documents(texts)
    
    def embed_query(self, text: str) -> List[float]:
        """
        嵌入查询文本
        
        Args:
            text: 查询文本
            
        Returns:
            List[float]: 嵌入向量
        """
        if not self.model:
            raise ValueError("嵌入模型未初始化")
        
        return self.model.embed_query(text)
    
    def get_embedding_function(self):
        """
        获取嵌入函数（用于向量存储）
        
        Returns:
            HuggingFaceEmbeddings: 嵌入模型实例
        """
        if not self.model:
            raise ValueError("嵌入模型未初始化")
        
        return self.model

