"""
检索器
"""
from typing import List, Dict, Any, Optional
from langchain_core.documents import Document
from RAG.storage.vector_store import VectorStore
from RAG.config import RetrievalConfig
from RAG.utils.logging_utils import get_logger

logger = get_logger(__name__)


class Retriever:
    """检索器"""
    
    def __init__(self, vector_store: VectorStore, config: RetrievalConfig):
        """
        初始化检索器
        
        Args:
            vector_store: 向量存储
            config: 检索配置
        """
        self.vector_store = vector_store
        self.config = config
        self._retriever = None
        self._initialize_retriever()
    
    def _initialize_retriever(self):
        """初始化检索器"""
        search_kwargs = {
            "k": self.config.top_k,
        }
        
        if self.config.search_type == "similarity_score_threshold":
            search_kwargs["score_threshold"] = self.config.score_threshold
        
        self._retriever = self.vector_store.get_retriever(search_kwargs=search_kwargs)
        logger.info(f"检索器初始化完成: {self.config.search_type}, top_k={self.config.top_k}")
    
    def retrieve(
        self,
        query: str,
        top_k: Optional[int] = None,
        filter: Optional[Dict[str, Any]] = None
    ) -> List[Document]:
        """
        检索相似文档
        
        Args:
            query: 查询文本
            top_k: 返回前k个结果（如果为None则使用配置中的top_k）
            filter: 过滤条件
            
        Returns:
            List[Document]: 相似文档列表
        """
        if top_k is None:
            top_k = self.config.top_k
        
        logger.info(f"检索查询: {query}, top_k: {top_k}")
        
        # 使用向量存储的搜索方法
        documents = self.vector_store.search(
            query=query,
            top_k=top_k,
            filter=filter
        )
        
        return documents
    
    def get_retriever(self):
        """
        获取LangChain检索器
        
        Returns:
            LangChain检索器实例
        """
        return self._retriever

