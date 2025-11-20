"""
简化的向量存储实现
使用numpy和pickle，不依赖chromadb，避免依赖冲突
"""
from typing import List, Dict, Any, Optional
from langchain_core.documents import Document
import numpy as np
import pickle
import json
from pathlib import Path
from RAG.storage.vector_store import VectorStore
from RAG.config import StorageConfig
from RAG.utils.logging_utils import get_logger

logger = get_logger(__name__)


class SimpleVectorStore(VectorStore):
    """简化的向量存储实现（使用numpy和文件系统）"""
    
    def __init__(self, embedding_function, config: StorageConfig):
        """
        初始化向量存储
        
        Args:
            embedding_function: 嵌入函数（HuggingFaceEmbeddings实例）
            config: 存储配置
        """
        self.config = config
        self.embedding_function = embedding_function
        
        # 创建存储目录
        self.storage_dir = Path(config.persist_directory)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        # 数据文件路径
        self.vectors_file = self.storage_dir / f"{config.collection_name}_vectors.npy"
        self.metadata_file = self.storage_dir / f"{config.collection_name}_metadata.json"
        self.documents_file = self.storage_dir / f"{config.collection_name}_documents.pkl"
        
        # 加载现有数据
        self.vectors = []
        self.metadata_list = []
        self.documents = []
        self.distance_metric = config.distance_metric
        
        self._load_data()
        
        logger.info(f"简化向量存储初始化完成: {config.persist_directory}, 已有 {len(self.documents)} 个文档")
    
    def _load_data(self):
        """加载已存储的数据"""
        try:
            if self.vectors_file.exists() and self.metadata_file.exists() and self.documents_file.exists():
                # 加载向量
                self.vectors = np.load(self.vectors_file, allow_pickle=True).tolist()
                # 加载元数据
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    self.metadata_list = json.load(f)
                # 加载文档
                with open(self.documents_file, 'rb') as f:
                    self.documents = pickle.load(f)
                logger.info(f"已加载 {len(self.documents)} 个文档")
        except Exception as e:
            logger.warning(f"加载数据失败，将创建新的存储: {e}")
            self.vectors = []
            self.metadata_list = []
            self.documents = []
    
    def _save_data(self):
        """保存数据到文件"""
        try:
            # 保存向量
            if self.vectors:
                np.save(self.vectors_file, np.array(self.vectors, dtype=object), allow_pickle=True)
            # 保存元数据
            with open(self.metadata_file, 'w', encoding='utf-8') as f:
                json.dump(self.metadata_list, f, ensure_ascii=False, indent=2)
            # 保存文档
            with open(self.documents_file, 'wb') as f:
                pickle.dump(self.documents, f)
        except Exception as e:
            logger.error(f"保存数据失败: {e}")
            raise
    
    def _compute_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """计算两个向量的相似度"""
        if self.distance_metric == "cosine":
            # 余弦相似度
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            if norm1 == 0 or norm2 == 0:
                return 0.0
            return dot_product / (norm1 * norm2)
        elif self.distance_metric == "euclidean":
            # 欧氏距离（转换为相似度，距离越小相似度越高）
            distance = np.linalg.norm(vec1 - vec2)
            return 1.0 / (1.0 + distance)
        elif self.distance_metric == "dotproduct":
            # 点积
            return float(np.dot(vec1, vec2))
        else:
            # 默认使用余弦相似度
            return float(np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2)))
    
    def add_documents(self, documents: List[Document]) -> List[str]:
        """
        添加文档到向量存储
        
        Args:
            documents: 文档列表
            
        Returns:
            List[str]: 文档ID列表
        """
        if not documents:
            return []
        
        logger.info(f"添加 {len(documents)} 个文档到向量存储")
        
        try:
            # 提取文本
            texts = [doc.page_content for doc in documents]
            
            # 生成嵌入向量
            embeddings = self.embedding_function.embed_documents(texts)
            
            # 生成文档ID
            ids = []
            start_idx = len(self.documents)
            
            for i, (doc, embedding) in enumerate(zip(documents, embeddings)):
                doc_id = f"doc_{start_idx + i}_{hash(doc.page_content) % 1000000}"
                ids.append(doc_id)
                
                # 存储向量、元数据和文档
                self.vectors.append(np.array(embedding, dtype=np.float32))
                self.metadata_list.append(doc.metadata)
                self.documents.append(doc)
            
            # 保存数据
            self._save_data()
            
            logger.info(f"成功添加 {len(ids)} 个文档")
            return ids
            
        except Exception as e:
            logger.error(f"添加文档失败: {str(e)}")
            raise
    
    def search(
        self,
        query: str,
        top_k: int = 5,
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
        logger.info(f"搜索查询: {query}, top_k: {top_k}")
        
        if not self.documents:
            logger.warning("向量存储为空，无法搜索")
            return []
        
        try:
            # 对查询文本进行嵌入
            query_embedding = np.array(self.embedding_function.embed_query(query), dtype=np.float32)
            
            # 计算相似度
            similarities = []
            for i, vec in enumerate(self.vectors):
                # 应用过滤条件
                if filter:
                    metadata = self.metadata_list[i]
                    match = True
                    for key, value in filter.items():
                        if metadata.get(key) != value:
                            match = False
                            break
                    if not match:
                        continue
                
                # 计算相似度
                similarity = self._compute_similarity(query_embedding, np.array(vec, dtype=np.float32))
                similarities.append((i, similarity))
            
            # 按相似度排序
            similarities.sort(key=lambda x: x[1], reverse=True)
            
            # 返回前k个结果
            results = []
            for idx, score in similarities[:top_k]:
                doc = self.documents[idx]
                # 添加相似度分数到元数据
                doc.metadata = {**doc.metadata, "similarity_score": float(score)}
                results.append(doc)
            
            logger.info(f"搜索完成，找到 {len(results)} 个文档")
            return results
            
        except Exception as e:
            logger.error(f"搜索失败: {str(e)}")
            raise
    
    def delete(self, document_ids: List[str]) -> bool:
        """
        删除文档
        
        Args:
            document_ids: 文档ID列表
            
        Returns:
            bool: 是否删除成功
        """
        if not document_ids:
            return True
        
        logger.info(f"删除 {len(document_ids)} 个文档")
        
        try:
            # 找到要删除的索引
            ids_set = set(document_ids)
            indices_to_remove = []
            
            for i, doc in enumerate(self.documents):
                # 从文档的metadata中提取ID，或者使用索引生成ID
                doc_id = f"doc_{i}_{hash(doc.page_content) % 1000000}"
                if doc_id in ids_set or (i < len(self.metadata_list) and self.metadata_list[i].get('id') in ids_set):
                    indices_to_remove.append(i)
            
            # 从后往前删除，避免索引变化
            for idx in sorted(indices_to_remove, reverse=True):
                if idx < len(self.vectors):
                    del self.vectors[idx]
                if idx < len(self.metadata_list):
                    del self.metadata_list[idx]
                if idx < len(self.documents):
                    del self.documents[idx]
            
            # 保存数据
            self._save_data()
            
            logger.info("删除文档成功")
            return True
            
        except Exception as e:
            logger.error(f"删除文档失败: {str(e)}")
            return False
    
    def get_retriever(self, search_kwargs: Optional[Dict[str, Any]] = None):
        """
        获取检索器（兼容LangChain接口）
        
        Args:
            search_kwargs: 搜索参数
            
        Returns:
            检索器实例
        """
        class SimpleRetriever:
            def __init__(self, store, k=5):
                self.store = store
                self.k = k
            
            def get_relevant_documents(self, query: str):
                return self.store.search(query, top_k=self.k)
        
        k = search_kwargs.get("k", 5) if search_kwargs else 5
        return SimpleRetriever(self, k)

