"""
对话管理器
"""
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
from RAG.conversation.history import ConversationHistory, ConversationMessage
from RAG.conversation.storage import ConversationStorage
from RAG.config import ConversationConfig
from RAG.utils.logging_utils import get_logger

logger = get_logger(__name__)


class ConversationManager:
    """对话管理器"""
    
    def __init__(self, config: ConversationConfig):
        """
        初始化对话管理器
        
        Args:
            config: 对话配置
        """
        self.config = config
        self.storage = ConversationStorage(Path(config.storage_dir))
        self.conversations: Dict[str, ConversationHistory] = {}  # 内存缓存
    
    def generate_conversation_id(self) -> str:
        """生成对话ID"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        return f"conv_{timestamp}_{unique_id}"
    
    def create_conversation(self, conversation_id: Optional[str] = None) -> str:
        """
        创建新对话
        
        Args:
            conversation_id: 对话ID，如果为None则自动生成
            
        Returns:
            str: 对话ID
        """
        if conversation_id is None:
            conversation_id = self.generate_conversation_id()
        
        # 创建对话历史
        history = ConversationHistory(
            conversation_id=conversation_id,
            max_turns=self.config.max_turns
        )
        
        # 保存到内存缓存
        self.conversations[conversation_id] = history
        
        # 保存到文件
        if self.config.auto_save:
            self.storage.save_conversation(conversation_id, history)
        
        logger.info(f"创建新对话: {conversation_id}")
        return conversation_id
    
    def load_conversation(self, conversation_id: str) -> Optional[ConversationHistory]:
        """
        加载历史对话
        
        Args:
            conversation_id: 对话ID
            
        Returns:
            Optional[ConversationHistory]: 对话历史，如果不存在则返回None
        """
        # 先检查内存缓存
        if conversation_id in self.conversations:
            return self.conversations[conversation_id]
        
        # 从文件加载
        history = self.storage.load_conversation(conversation_id)
        if history:
            # 添加到内存缓存
            self.conversations[conversation_id] = history
            logger.info(f"加载对话: {conversation_id}, 轮次: {history.get_turns()}")
        else:
            logger.warning(f"对话不存在: {conversation_id}")
        
        return history
    
    def get_conversation(self, conversation_id: str) -> Optional[ConversationHistory]:
        """
        获取对话历史
        
        Args:
            conversation_id: 对话ID
            
        Returns:
            Optional[ConversationHistory]: 对话历史
        """
        if conversation_id not in self.conversations:
            return self.load_conversation(conversation_id)
        return self.conversations[conversation_id]
    
    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        knowledge_sources: Optional[List[str]] = None
    ):
        """
        添加消息到对话历史
        
        Args:
            conversation_id: 对话ID
            role: 消息角色（user, assistant, system）
            content: 消息内容
            metadata: 元数据
            knowledge_sources: 知识来源
        """
        history = self.get_conversation(conversation_id)
        if history is None:
            raise ValueError(f"对话不存在: {conversation_id}")
        
        # 创建消息
        message = ConversationMessage(
            role=role,
            content=content,
            timestamp=datetime.now().isoformat(),
            metadata=metadata,
            knowledge_sources=knowledge_sources
        )
        
        # 添加消息
        history.add_message(message)
        
        # 自动保存
        if self.config.auto_save:
            # 根据保存间隔决定是否保存
            if history.get_turns() % self.config.save_interval == 0:
                self.save_conversation(conversation_id)
    
    def save_conversation(self, conversation_id: str):
        """保存对话记录"""
        history = self.get_conversation(conversation_id)
        if history is None:
            logger.warning(f"对话不存在: {conversation_id}")
            return
        
        self.storage.save_conversation(conversation_id, history)
        logger.info(f"保存对话: {conversation_id}")
    
    def get_history(self, conversation_id: str, max_turns: Optional[int] = None) -> List[ConversationMessage]:
        """
        获取对话历史
        
        Args:
            conversation_id: 对话ID
            max_turns: 最大轮次，如果为None则使用配置中的max_turns
            
        Returns:
            List[ConversationMessage]: 消息列表
        """
        history = self.get_conversation(conversation_id)
        if history is None:
            return []
        
        max_turns = max_turns or self.config.max_turns
        return history.get_recent_messages(max_turns)
    
    def list_conversations(self) -> List[Dict[str, Any]]:
        """列出所有对话"""
        return self.storage.list_conversations()
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话"""
        # 从内存缓存删除
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]
        
        # 从文件删除
        return self.storage.delete_conversation(conversation_id)
    
    def search_conversations(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """搜索对话记录"""
        return self.storage.search_conversations(query, max_results)

