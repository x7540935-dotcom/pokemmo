"""
RAG系统配置管理
"""
import os
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass, field


@dataclass
class EmbeddingConfig:
    """嵌入模型配置"""
    model_name: str = "BAAI/bge-large-zh-v1"
    model_path: Optional[str] = None  # 本地模型路径
    device: str = "cpu"  # cpu, cuda
    normalize_embeddings: bool = True


@dataclass
class LLMConfig:
    """LLM模型配置"""
    model: str = "qwen-plus"
    base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    api_key: Optional[str] = None
    temperature: float = 0.7
    streaming: bool = True
    max_tokens: int = 2048


@dataclass
class ChunkConfig:
    """文本切块配置"""
    chunk_size: int = 500
    chunk_overlap: int = 100
    separator: str = "\n\n"
    length_function: str = "len"  # len, token_count


@dataclass
class StorageConfig:
    """存储配置"""
    persist_directory: str = ""  # 将在RAGConfig.__post_init__中设置
    collection_name: str = "knowledge_base"
    distance_metric: str = "cosine"  # cosine, euclidean, dotproduct


@dataclass
class RetrievalConfig:
    """检索配置"""
    top_k: int = 5
    score_threshold: float = 0.0
    search_type: str = "similarity"  # similarity, mmr, similarity_score_threshold


@dataclass
class ConversationConfig:
    """对话配置"""
    max_turns: int = 30                    # 最大对话轮次
    storage_dir: str = ""                  # 存储目录（将在RAGConfig.__post_init__中设置）
    auto_save: bool = True                 # 自动保存
    save_interval: int = 1                 # 保存间隔（每N轮保存一次）
    context_window_size: int = 30          # 上下文窗口大小
    enable_context_compression: bool = True # 启用上下文压缩
    compression_threshold: int = 50        # 压缩阈值（超过N轮开始压缩）
    summary_interval: int = 3              # 摘要间隔（每N轮触发一次摘要）
    summary_method: str = "incremental"    # 摘要方法：incremental, full


@dataclass
class ContextConfig:
    """上下文配置"""
    max_turns: int = 30                    # 最大对话轮次
    context_format: str = "markdown"       # 上下文格式：markdown, plain
    include_timestamps: bool = False       # 包含时间戳
    include_metadata: bool = False         # 包含元数据
    compression_method: str = "summary"    # 压缩方法：summary, truncate
    summary_interval: int = 3              # 摘要间隔


@dataclass
class RAGConfig:
    """RAG系统配置"""
    # 项目根目录
    project_root: Path = field(default_factory=lambda: Path(__file__).parent.parent.parent)
    
    # 数据目录配置
    data_dir: Path = field(init=False)
    raw_data_dir: Path = field(init=False)
    processed_data_dir: Path = field(init=False)
    vectors_dir: Path = field(init=False)
    metadata_dir: Path = field(init=False)
    
    # 模型配置
    embedding: EmbeddingConfig = field(default_factory=EmbeddingConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
    
    # 处理配置
    chunk: ChunkConfig = field(default_factory=ChunkConfig)
    
    # 存储配置
    storage: StorageConfig = field(default_factory=StorageConfig)
    
    # 检索配置
    retrieval: RetrievalConfig = field(default_factory=RetrievalConfig)
    
    # 对话配置
    conversation: ConversationConfig = field(default_factory=ConversationConfig)
    
    # 上下文配置
    context: ContextConfig = field(default_factory=ContextConfig)
    
    def __post_init__(self):
        """初始化后处理"""
        # 设置数据目录
        self.data_dir = self.project_root / "RAG" / "data"
        self.raw_data_dir = self.data_dir / "raw"
        self.processed_data_dir = self.data_dir / "processed"
        self.vectors_dir = self.data_dir / "vectors"
        self.metadata_dir = self.data_dir / "metadata"
        self.conversations_dir = self.data_dir / "conversations"
        
        # 创建目录
        self._create_directories()
        
        # 加载环境变量
        self._load_env_vars()
        
        # 更新存储目录为绝对路径
        if not os.path.isabs(self.storage.persist_directory):
            # 如果是相对路径，转换为基于项目根目录的绝对路径
            self.storage.persist_directory = str(self.vectors_dir)
        else:
            # 如果已经是绝对路径，直接使用
            self.vectors_dir = Path(self.storage.persist_directory)
            self.vectors_dir.mkdir(parents=True, exist_ok=True)
        
        # 更新对话存储目录
        if not self.conversation.storage_dir:
            self.conversation.storage_dir = str(self.conversations_dir)
        elif not os.path.isabs(self.conversation.storage_dir):
            self.conversation.storage_dir = str(self.conversations_dir)
    
    def _create_directories(self):
        """创建必要的目录"""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.raw_data_dir.mkdir(parents=True, exist_ok=True)
        self.processed_data_dir.mkdir(parents=True, exist_ok=True)
        self.vectors_dir.mkdir(parents=True, exist_ok=True)
        self.metadata_dir.mkdir(parents=True, exist_ok=True)
        self.conversations_dir.mkdir(parents=True, exist_ok=True)
    
    def _load_env_vars(self):
        """从环境变量加载配置"""
        # LLM API Key
        if not self.llm.api_key:
            self.llm.api_key = os.environ.get("DASHSCOPE_API_KEY")
            if not self.llm.api_key:
                raise ValueError("请设置DASHSCOPE_API_KEY环境变量")
        
        # 嵌入模型路径
        if not self.embedding.model_path:
            # 尝试从环境变量获取
            model_path = os.environ.get("EMBEDDING_MODEL_PATH")
            if model_path:
                model_path_obj = Path(model_path)
                if model_path_obj.exists():
                    self.embedding.model_path = str(model_path_obj)
                else:
                    # 如果路径不存在，尝试使用模型名称
                    self.embedding.model_name = model_path
            # 注意：如果没有设置环境变量，将使用HuggingFace模型名称
            # 模型将从HuggingFace Hub下载或使用本地缓存
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "embedding": {
                "model_name": self.embedding.model_name,
                "model_path": self.embedding.model_path,
                "device": self.embedding.device,
                "normalize_embeddings": self.embedding.normalize_embeddings,
            },
            "llm": {
                "model": self.llm.model,
                "base_url": self.llm.base_url,
                "temperature": self.llm.temperature,
                "streaming": self.llm.streaming,
                "max_tokens": self.llm.max_tokens,
            },
            "chunk": {
                "chunk_size": self.chunk.chunk_size,
                "chunk_overlap": self.chunk.chunk_overlap,
                "separator": self.chunk.separator,
            },
            "storage": {
                "persist_directory": self.storage.persist_directory,
                "collection_name": self.storage.collection_name,
                "distance_metric": self.storage.distance_metric,
            },
            "retrieval": {
                "top_k": self.retrieval.top_k,
                "score_threshold": self.retrieval.score_threshold,
                "search_type": self.retrieval.search_type,
            },
        }
    
    @classmethod
    def from_dict(cls, config_dict: Dict[str, Any]) -> "RAGConfig":
        """从字典创建配置"""
        config = cls()
        
        if "embedding" in config_dict:
            embedding_config = config_dict["embedding"]
            config.embedding = EmbeddingConfig(**embedding_config)
        
        if "llm" in config_dict:
            llm_config = config_dict["llm"]
            config.llm = LLMConfig(**llm_config)
        
        if "chunk" in config_dict:
            chunk_config = config_dict["chunk"]
            config.chunk = ChunkConfig(**chunk_config)
        
        if "storage" in config_dict:
            storage_config = config_dict["storage"]
            config.storage = StorageConfig(**storage_config)
        
        if "retrieval" in config_dict:
            retrieval_config = config_dict["retrieval"]
            config.retrieval = RetrievalConfig(**retrieval_config)
        
        return config

