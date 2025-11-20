"""
RAG知识库主类
"""
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime
from langchain_core.documents import Document

from RAG.config import RAGConfig
from RAG.data_processing.pipeline import DataProcessingPipeline
from RAG.vectorization.embeddings import EmbeddingModel
from RAG.storage.chroma_store import ChromaVectorStore
from RAG.retrieval.retriever import Retriever
from RAG.query.chain import QueryChain
from RAG.utils.logging_utils import get_logger

logger = get_logger(__name__)


class KnowledgeBase:
    """RAG知识库主类"""
    
    def __init__(self, config: Optional[RAGConfig] = None):
        """
        初始化知识库
        
        Args:
            config: RAG配置，如果为None则使用默认配置
        """
        self.config = config or RAGConfig()
        
        # 初始化嵌入模型
        logger.info("初始化嵌入模型...")
        self.embedding_model = EmbeddingModel(self.config.embedding)
        
        # 初始化向量存储
        logger.info("初始化向量存储...")
        self.vector_store = ChromaVectorStore(
            embedding_function=self.embedding_model.get_embedding_function(),
            config=self.config.storage
        )
        
        # 初始化检索器
        logger.info("初始化检索器...")
        self.retriever = Retriever(
            vector_store=self.vector_store,
            config=self.config.retrieval
        )
        
        # 初始化查询链（可选，知识库构建不需要）
        self.query_chain = None
        try:
            logger.info("初始化查询链...")
            from RAG.query.chain import QueryChain
            self.query_chain = QueryChain(
                retriever=self.retriever,
                llm_config=self.config.llm
            )
            logger.info("查询链初始化完成")
        except Exception as e:
            error_msg = str(e)
            # 如果是LLM初始化失败，给出更友好的提示
            # 知识库构建不需要LLM功能，所以这些错误可以静默处理
            if "ChatOpenAI" in error_msg or "proxies" in error_msg.lower() or "unexpected keyword" in error_msg.lower():
                # 使用debug级别，避免在生产环境中显示不必要的警告
                logger.debug(f"查询链初始化跳过（LLM未配置或依赖问题，不影响知识库构建）: {error_msg}")
            else:
                # 其他类型的错误仍然使用warning级别
                logger.warning(f"查询链初始化失败（不影响知识库构建功能）: {error_msg}")
        
        # 初始化数据处理流水线
        logger.info("初始化数据处理流水线...")
        self.data_pipeline = DataProcessingPipeline()
        
        logger.info("知识库初始化完成")
    
    def add_documents(
        self,
        file_paths: List[Path],
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[str]:
        """
        添加文档到知识库
        
        Args:
            file_paths: 文件路径列表
            metadata: 额外的元数据
            
        Returns:
            List[str]: 文档ID列表
        """
        logger.info(f"开始添加 {len(file_paths)} 个文件到知识库")
        
        # 处理文档
        documents = self.data_pipeline.process_files(file_paths, metadata)
        
        if not documents:
            logger.warning("没有文档需要添加")
            return []
        
        # 添加时间戳
        timestamp = datetime.now().isoformat()
        for doc in documents:
            if "timestamp" not in doc.metadata:
                doc.metadata["timestamp"] = timestamp
        
        # 添加到向量存储
        document_ids = self.vector_store.add_documents(documents)
        
        logger.info(f"成功添加 {len(document_ids)} 个文档到知识库")
        return document_ids
    
    def add_text(
        self,
        text: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[str]:
        """
        添加文本到知识库
        
        Args:
            text: 文本内容
            metadata: 元数据
            
        Returns:
            List[str]: 文档ID列表
        """
        # 创建文档
        doc_metadata = {
            "source": "user_input",
            "timestamp": datetime.now().isoformat(),
            **(metadata or {})
        }
        
        document = Document(
            page_content=text,
            metadata=doc_metadata
        )
        
        # 处理文档（清洗和切块）
        documents = self.data_pipeline.cleaners[0].clean([document])
        if self.data_pipeline.chunker:
            documents = self.data_pipeline.chunker.chunk(documents)
        
        # 添加到向量存储
        document_ids = self.vector_store.add_documents(documents)
        
        logger.info(f"成功添加 {len(document_ids)} 个文档块到知识库")
        return document_ids
    
    def search(
        self,
        query: str,
        top_k: Optional[int] = None,
        filter: Optional[Dict[str, Any]] = None
    ) -> List[Document]:
        """
        搜索相似文档
        
        Args:
            query: 查询文本
            top_k: 返回前k个结果
            filter: 过滤条件
            
        Returns:
            List[Document]: 相似文档列表
        """
        return self.retriever.retrieve(query, top_k=top_k, filter=filter)
    
    def query(self, question: str) -> str:
        """
        查询问题
        
        Args:
            question: 问题文本
            
        Returns:
            str: 回答
        """
        if self.query_chain is None:
            raise RuntimeError("查询链未初始化，请确保已安装langchain-openai")
        return self.query_chain.query(question)
    
    def stream_query(self, question: str):
        """
        流式查询问题
        
        Args:
            question: 问题文本
            
        Yields:
            str: 回答片段
        """
        if self.query_chain is None:
            raise RuntimeError("查询链未初始化，请确保已安装langchain-openai")
        for chunk in self.query_chain.stream(question):
            yield chunk
    
    def delete_documents(self, document_ids: List[str]) -> bool:
        """
        删除文档
        
        Args:
            document_ids: 文档ID列表
            
        Returns:
            bool: 是否删除成功
        """
        return self.vector_store.delete(document_ids)
    
    def get_retriever(self):
        """
        获取检索器（用于外部使用）
        
        Returns:
            Retriever: 检索器实例
        """
        return self.retriever
    
    def get_query_chain(self):
        """
        获取查询链（用于外部使用）
        
        Returns:
            QueryChain: 查询链实例
        """
        return self.query_chain

