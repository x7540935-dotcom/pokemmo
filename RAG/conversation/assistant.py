"""
对话助手主接口
"""
from typing import Optional, List, Dict, Any, Iterator
from RAG.knowledge_base import KnowledgeBase
from RAG.conversation.manager import ConversationManager
from RAG.conversation.history import ConversationHistory
from RAG.conversation.context import ContextManager
from RAG.query.context_chain import ContextQueryChain
from RAG.config import RAGConfig, ConversationConfig, ContextConfig
from RAG.utils.logging_utils import get_logger

logger = get_logger(__name__)

# 导入桌宠事件系统（可选，如果不存在则静默失败）
try:
    import sys
    import os
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    from web.pet_events import pet_events
    PET_EVENTS_AVAILABLE = True
except ImportError:
    PET_EVENTS_AVAILABLE = False
    logger.debug("桌宠事件系统不可用，将跳过事件推送")


class ConversationAssistant:
    """对话助手"""
    
    def __init__(
        self,
        knowledge_base: KnowledgeBase,
        config: Optional[RAGConfig] = None,
        conversation_config: Optional[ConversationConfig] = None,
        context_config: Optional[ContextConfig] = None
    ):
        """
        初始化对话助手
        
        Args:
            knowledge_base: 知识库实例
            config: RAG配置，如果为None则使用知识库的配置
            conversation_config: 对话配置，如果为None则使用默认配置
            context_config: 上下文配置，如果为None则使用默认配置
        """
        self.knowledge_base = knowledge_base
        self.config = config or knowledge_base.config
        
        # 使用配置中的对话配置和上下文配置
        self.conversation_config = conversation_config or self.config.conversation
        self.context_config = context_config or self.config.context
        
        # 初始化对话管理器
        self.conversation_manager = ConversationManager(self.conversation_config)
        
        # 初始化上下文管理器
        self.context_manager = ContextManager(
            self.context_config,
            self.config.llm
        )
        
        # 初始化上下文问答链
        self.query_chain = ContextQueryChain(
            retriever=self.knowledge_base.retriever,
            context_manager=self.context_manager,
            llm_config=self.config.llm
        )
        
        logger.info("对话助手初始化完成")
    
    def create_conversation(self, conversation_id: Optional[str] = None) -> str:
        """
        创建新对话
        
        Args:
            conversation_id: 对话ID，如果为None则自动生成
            
        Returns:
            str: 对话ID
        """
        return self.conversation_manager.create_conversation(conversation_id)
    
    def load_conversation(self, conversation_id: str) -> Optional[ConversationHistory]:
        """
        加载历史对话
        
        Args:
            conversation_id: 对话ID
            
        Returns:
            Optional[ConversationHistory]: 对话历史，如果不存在则返回None
        """
        return self.conversation_manager.load_conversation(conversation_id)
    
    def chat(
        self,
        conversation_id: str,
        message: str,
        max_turns: Optional[int] = None
    ) -> str:
        """
        发送消息并获取回答
        
        Args:
            conversation_id: 对话ID
            message: 用户消息
            max_turns: 最大轮次，如果为None则使用配置中的max_turns
            
        Returns:
            str: 助手回答
        """
        # 获取对话历史
        history = self.conversation_manager.get_conversation(conversation_id)
        if history is None:
            raise ValueError(f"对话不存在: {conversation_id}")
        
        # 添加用户消息
        self.conversation_manager.add_message(
            conversation_id,
            "user",
            message
        )
        
        # 发送"收到问题"事件到桌宠
        if PET_EVENTS_AVAILABLE:
            try:
                # 截取前50个字符作为预览
                preview_text = message[:50] + "..." if len(message) > 50 else message
                pet_events.question_sync(text=preview_text)
            except Exception as e:
                logger.debug(f"发送question事件失败: {e}")
        
        # 获取更新后的历史
        history = self.conversation_manager.get_conversation(conversation_id)
        
        # 查询回答（带上下文）
        # 注意：get_context_with_summary会在内部检查并更新摘要
        max_turns = max_turns or self.conversation_config.max_turns
        answer, knowledge_sources = self.query_chain.query_with_context(
            message,
            history,
            max_turns
        )
        
        # 发送"正在回答"事件到桌宠
        if PET_EVENTS_AVAILABLE:
            try:
                pet_events.answer_sync(text="正在回答...")
            except Exception as e:
                logger.debug(f"发送answer事件失败: {e}")
        
        # 添加助手回答
        self.conversation_manager.add_message(
            conversation_id,
            "assistant",
            answer,
            metadata={
                "model": self.config.llm.model,
                "temperature": self.config.llm.temperature
            },
            knowledge_sources=knowledge_sources
        )
        
        # 获取更新后的历史（助手回答已添加）
        history = self.conversation_manager.get_conversation(conversation_id)
        
        # 检查是否需要更新摘要（在助手回答后检查，此时轮次已完成）
        # 这样可以确保摘要触发在完整的轮次之后
        if self.context_manager.should_create_summary(history):
            self.context_manager.update_summary(history)
            # 重新获取历史（摘要已更新）
            history = self.conversation_manager.get_conversation(conversation_id)
        
        # 保存对话记录（包含摘要）
        self.conversation_manager.save_conversation(conversation_id)
        
        return answer
    
    def stream_chat(
        self,
        conversation_id: str,
        message: str,
        max_turns: Optional[int] = None
    ) -> Iterator[str]:
        """
        流式发送消息并获取回答
        
        Args:
            conversation_id: 对话ID
            message: 用户消息
            max_turns: 最大轮次，如果为None则使用配置中的max_turns
            
        Yields:
            str: 助手回答片段
        """
        # 获取对话历史
        history = self.conversation_manager.get_conversation(conversation_id)
        if history is None:
            raise ValueError(f"对话不存在: {conversation_id}")
        
        # 添加用户消息
        self.conversation_manager.add_message(
            conversation_id,
            "user",
            message
        )
        
        # 发送"收到问题"事件到桌宠
        if PET_EVENTS_AVAILABLE:
            try:
                # 截取前50个字符作为预览
                preview_text = message[:50] + "..." if len(message) > 50 else message
                pet_events.question_sync(text=preview_text)
            except Exception as e:
                logger.debug(f"发送question事件失败: {e}")
        
        # 获取更新后的历史
        history = self.conversation_manager.get_conversation(conversation_id)
        
        # 流式查询回答（带上下文）
        # 注意：get_context_with_summary会在内部检查并更新摘要
        max_turns = max_turns or self.conversation_config.max_turns
        answer_chunks = []
        
        # 发送"正在回答"事件到桌宠
        if PET_EVENTS_AVAILABLE:
            try:
                pet_events.answer_sync(text="正在回答...")
            except Exception as e:
                logger.debug(f"发送answer事件失败: {e}")
        
        # 获取回答流和知识来源
        answer_stream, knowledge_sources = self.query_chain.stream_query_with_context(
            message,
            history,
            max_turns
        )
        
        # 流式输出
        for chunk in answer_stream:
            answer_chunks.append(chunk)
            yield chunk
        
        # 添加助手回答
        answer = "".join(answer_chunks)
        self.conversation_manager.add_message(
            conversation_id,
            "assistant",
            answer,
            metadata={
                "model": self.config.llm.model,
                "temperature": self.config.llm.temperature
            },
            knowledge_sources=knowledge_sources
        )
        
        # 获取更新后的历史（助手回答已添加）
        history = self.conversation_manager.get_conversation(conversation_id)
        
        # 检查是否需要更新摘要（在助手回答后检查，此时轮次已完成）
        # 这样可以确保摘要触发在完整的轮次之后
        if self.context_manager.should_create_summary(history):
            self.context_manager.update_summary(history)
            # 重新获取历史（摘要已更新）
            history = self.conversation_manager.get_conversation(conversation_id)
        
        # 保存对话记录（包含摘要）
        self.conversation_manager.save_conversation(conversation_id)
    
    def get_history(
        self,
        conversation_id: str,
        max_turns: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        获取对话历史
        
        Args:
            conversation_id: 对话ID
            max_turns: 最大轮次
            
        Returns:
            List[Dict[str, Any]]: 消息列表
        """
        messages = self.conversation_manager.get_history(conversation_id, max_turns)
        return [msg.to_dict() for msg in messages]
    
    def list_conversations(self) -> List[Dict[str, Any]]:
        """列出所有对话"""
        return self.conversation_manager.list_conversations()
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话"""
        return self.conversation_manager.delete_conversation(conversation_id)
    
    def search_conversations(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """搜索对话记录"""
        return self.conversation_manager.search_conversations(query, max_results)

