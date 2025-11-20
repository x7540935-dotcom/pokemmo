"""
上下文管理
"""
from typing import List, Optional, Dict, Any
from langchain_openai import ChatOpenAI
from RAG.conversation.history import ConversationHistory, ConversationMessage
from RAG.config import ContextConfig, LLMConfig
from RAG.utils.logging_utils import get_logger

logger = get_logger(__name__)


class ContextManager:
    """上下文管理器"""
    
    def __init__(self, config: ContextConfig, llm_config: LLMConfig):
        """
        初始化上下文管理器
        
        Args:
            config: 上下文配置
            llm_config: LLM配置（用于生成摘要）
        """
        self.config = config
        self.llm_config = llm_config
        self.llm = ChatOpenAI(
            model=llm_config.model,
            base_url=llm_config.base_url,
            api_key=llm_config.api_key,
            streaming=False,  # 摘要不需要流式输出
            temperature=0.3,  # 摘要使用较低温度
            max_tokens=llm_config.max_tokens,
        )
    
    def format_message(self, message: ConversationMessage) -> str:
        """格式化单条消息"""
        role_name = "用户" if message.role == "user" else "助手"
        content = message.content
        
        if self.config.include_timestamps:
            content = f"[{message.timestamp}] {content}"
        
        return f"{role_name}：{content}"
    
    def format_context(self, messages: List[ConversationMessage]) -> str:
        """
        格式化上下文
        
        Args:
            messages: 消息列表
            
        Returns:
            str: 格式化后的上下文文本
        """
        if not messages:
            return ""
        
        context_lines = []
        for msg in messages:
            context_lines.append(self.format_message(msg))
        
        if self.config.context_format == "markdown":
            return "\n\n".join(context_lines)
        else:
            return "\n".join(context_lines)
    
    def build_context(
        self,
        history: ConversationHistory,
        max_turns: Optional[int] = None
    ) -> str:
        """
        构建上下文
        
        Args:
            history: 对话历史
            max_turns: 最大轮次
            
        Returns:
            str: 上下文文本
        """
        max_turns = max_turns or self.config.max_turns
        
        # 如果有摘要，使用摘要+后续消息
        if history.summary and history.summary_turn > 0:
            # 获取摘要之后的消息
            messages_since_summary = history.get_messages_since_summary()
            
            # 构建上下文：摘要 + 后续消息
            context_parts = []
            
            # 添加摘要
            context_parts.append(f"【对话摘要（前{history.summary_turn}轮）】\n{history.summary}")
            
            # 添加后续消息
            if messages_since_summary:
                context_parts.append("\n【后续对话】")
                context_parts.append(self.format_context(messages_since_summary))
            
            return "\n".join(context_parts)
        else:
            # 没有摘要，直接使用最近的消息
            messages = history.get_recent_messages(max_turns)
            return self.format_context(messages)
    
    def should_create_summary(self, history: ConversationHistory) -> bool:
        """
        判断是否应该创建摘要
        
        Args:
            history: 对话历史
            
        Returns:
            bool: 是否应该创建摘要
        """
        # 如果未启用压缩，不创建摘要
        if not self.config.compression_method == "summary":
            return False
        
        # 检查最后一条消息的角色
        # 如果最后一条消息是user，说明当前轮次还未完成（缺少assistant回答）
        # 此时不应该触发摘要，因为摘要应该在完整的轮次（user+assistant）之后触发
        if not history.messages or history.messages[-1].role == "user":
            # 最后一条是user消息或没有消息，当前轮次未完成，不触发摘要
            return False
        
        # 获取当前完整的轮次数（已完成user+assistant的轮次）
        # 此时最后一条消息是assistant，所以get_turns()返回的是完整轮次数
        current_turn = history.get_turns()
        
        # 如果当前轮次小于摘要间隔，不创建摘要
        if current_turn < self.config.summary_interval:
            return False
        
        # 如果已经有摘要，检查是否需要更新摘要
        if history.summary and history.summary_turn > 0:
            # 计算摘要之后的轮次
            turns_since_summary = current_turn - history.summary_turn
            # 如果摘要之后的轮次达到摘要间隔，需要更新摘要
            return turns_since_summary >= self.config.summary_interval
        else:
            # 没有摘要，如果当前轮次达到摘要间隔，创建摘要
            # 注意：这里current_turn是已完成轮次数（最后一条消息是assistant）
            return current_turn >= self.config.summary_interval
    
    def create_incremental_summary(
        self,
        history: ConversationHistory
    ) -> str:
        """
        创建增量摘要
        
        Args:
            history: 对话历史
            
        Returns:
            str: 摘要文本
        """
        current_turn = history.get_turns()
        
        # 确定要摘要的消息范围
        if history.summary and history.summary_turn > 0:
            # 有旧摘要，摘要从旧摘要之后的轮次到当前轮次
            start_turn = history.summary_turn
            end_turn = current_turn
            messages_to_summarize = history.get_messages_since_summary()
            previous_summary = history.summary
        else:
            # 没有旧摘要，摘要前N轮（摘要间隔）
            start_turn = 0
            end_turn = min(self.config.summary_interval, current_turn)
            # 获取前end_turn轮的消息（每轮2条消息）
            messages_to_summarize = history.messages[:end_turn * 2] if end_turn > 0 else []
            previous_summary = None
        
        if not messages_to_summarize:
            return ""
        
        # 格式化要摘要的消息
        messages_text = self.format_context(messages_to_summarize)
        
        # 构建摘要提示词
        if previous_summary:
            # 增量摘要：基于旧摘要和新消息
            prompt = f"""请对以下对话内容进行增量摘要。

之前的摘要：
{previous_summary}

新的对话内容（第{start_turn + 1}到{end_turn}轮）：
{messages_text}

请创建一个新的摘要，整合之前的摘要和新的对话内容。摘要应该：
1. 保留之前摘要中的关键信息
2. 添加新对话中的关键信息
3. 保持简洁，突出重要点
4. 用中文输出

新摘要："""
        else:
            # 首次摘要
            prompt = f"""请对以下对话内容进行摘要。

对话内容（第1到{end_turn}轮）：
{messages_text}

请创建一个简洁的摘要，突出对话中的关键信息。摘要应该：
1. 总结对话的主要话题和内容
2. 保留重要的细节和信息
3. 保持简洁
4. 用中文输出

摘要："""
        
        try:
            # 调用LLM生成摘要
            response = self.llm.invoke(prompt)
            summary = response.content if hasattr(response, 'content') else str(response)
            logger.info(f"生成增量摘要，轮次: {start_turn}到{end_turn}, 摘要长度: {len(summary)}")
            return summary.strip()
        except Exception as e:
            logger.error(f"生成摘要失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return ""
    
    def update_summary(self, history: ConversationHistory) -> bool:
        """
        更新摘要
        
        Args:
            history: 对话历史
            
        Returns:
            bool: 是否成功更新摘要
        """
        if not self.should_create_summary(history):
            return False
        
        # 创建增量摘要
        summary = self.create_incremental_summary(history)
        
        if not summary:
            return False
        
        # 更新历史记录的摘要
        current_turn = history.get_turns()
        history.update_summary(summary, current_turn)
        
        return True
    
    def get_context_with_summary(
        self,
        history: ConversationHistory,
        max_turns: Optional[int] = None,
        check_summary: bool = False
    ) -> str:
        """
        获取带摘要的上下文
        
        Args:
            history: 对话历史
            max_turns: 最大轮次
            check_summary: 是否检查并更新摘要（默认False，因为在构建上下文时不应该触发摘要）
            
        Returns:
            str: 上下文文本
        """
        # 注意：在构建上下文时，我们不应该触发摘要
        # 摘要应该在完整轮次（user+assistant）完成后触发
        # 所以这里只使用已有的摘要，不检查是否需要更新
        
        # 构建上下文（使用已有的摘要）
        return self.build_context(history, max_turns)

