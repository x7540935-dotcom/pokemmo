"""
对话历史管理
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from RAG.utils.logging_utils import get_logger

logger = get_logger(__name__)


@dataclass
class ConversationMessage:
    """对话消息"""
    role: str              # user, assistant, system
    content: str           # 消息内容
    timestamp: str         # 时间戳 (ISO格式)
    metadata: Optional[Dict[str, Any]] = None  # 元数据（可选）
    knowledge_sources: Optional[List[str]] = None  # 知识来源（可选）
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp,
            "metadata": self.metadata or {},
            "knowledge_sources": self.knowledge_sources or []
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConversationMessage":
        """从字典创建"""
        return cls(
            role=data["role"],
            content=data["content"],
            timestamp=data["timestamp"],
            metadata=data.get("metadata"),
            knowledge_sources=data.get("knowledge_sources")
        )


@dataclass
class ConversationHistory:
    """对话历史"""
    conversation_id: str   # 对话ID
    messages: List[ConversationMessage] = field(default_factory=list)  # 消息列表
    created_at: str = ""   # 创建时间 (ISO格式)
    updated_at: str = ""   # 更新时间 (ISO格式)
    metadata: Optional[Dict[str, Any]] = None  # 元数据
    max_turns: int = 30    # 最大对话轮次
    summary: str = ""      # 对话摘要（用于压缩）
    summary_turn: int = 0  # 摘要对应的轮次
    
    def __post_init__(self):
        """初始化后处理"""
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if not self.updated_at:
            self.updated_at = datetime.now().isoformat()
        if self.metadata is None:
            self.metadata = {}
    
    def add_message(self, message: ConversationMessage):
        """添加消息"""
        self.messages.append(message)
        self.updated_at = datetime.now().isoformat()
        
        # 限制历史对话数量（每轮包含user和assistant两条消息）
        if len(self.messages) > self.max_turns * 2:
            # 保留最近的max_turns轮对话
            self.messages = self.messages[-self.max_turns * 2:]
            # 清除旧的摘要
            self.summary = ""
            self.summary_turn = 0
    
    def get_turns(self) -> int:
        """获取对话轮次"""
        return len(self.messages) // 2
    
    def get_messages_since_summary(self) -> List[ConversationMessage]:
        """获取摘要之后的消息"""
        if not self.summary:
            return self.messages
        # 计算摘要对应的消息索引
        summary_index = self.summary_turn * 2
        return self.messages[summary_index:]
    
    def get_recent_messages(self, max_turns: Optional[int] = None) -> List[ConversationMessage]:
        """获取最近的消息"""
        max_turns = max_turns or self.max_turns
        return self.messages[-max_turns * 2:]
    
    def update_summary(self, summary: str, turn: int):
        """更新摘要"""
        self.summary = summary
        self.summary_turn = turn
        logger.info(f"更新对话摘要，轮次: {turn}, 摘要长度: {len(summary)}")
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "conversation_id": self.conversation_id,
            "messages": [msg.to_dict() for msg in self.messages],
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "metadata": self.metadata or {},
            "total_turns": self.get_turns(),
            "max_turns": self.max_turns,
            "summary": self.summary,
            "summary_turn": self.summary_turn
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConversationHistory":
        """从字典创建"""
        messages = [
            ConversationMessage.from_dict(msg) 
            for msg in data.get("messages", [])
        ]
        history = cls(
            conversation_id=data["conversation_id"],
            messages=messages,
            created_at=data.get("created_at", ""),
            updated_at=data.get("updated_at", ""),
            metadata=data.get("metadata"),
            max_turns=data.get("max_turns", 30)
        )
        # 恢复摘要
        history.summary = data.get("summary", "")
        history.summary_turn = data.get("summary_turn", 0)
        return history

