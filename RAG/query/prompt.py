"""
提示词管理
"""
from langchain_core.prompts import PromptTemplate
from typing import Optional, Dict, Any
from RAG.utils.logging_utils import get_logger

logger = get_logger(__name__)


class PromptManager:
    """提示词管理器"""
    
    def __init__(self, template: Optional[str] = None):
        """
        初始化提示词管理器
        
        Args:
            template: 提示词模板，如果为None则使用默认模板
        """
        if template is None:
            template = self._get_default_template()
        
        self.template = template
        self.prompt_template = PromptTemplate.from_template(template)
        logger.info("提示词管理器初始化完成")
    
    def _get_default_template(self) -> str:
        """获取默认提示词模板"""
        return """你是一个严谨的RAG助手。
请根据以下提供的上下文信息回答问题。
如果上下文信息不足以回答问题，请直接说"根据提供的信息无法回答"。
如果回答时使用了上下文中的信息，在回答后输出使用了哪些上下文。

上下文信息：
{context}

问题：{question}"""
    
    def get_context_template(self) -> str:
        """获取带对话上下文的提示词模板"""
        return """你是一个严谨的RAG助手，能够根据知识库和对话历史回答问题。

历史对话上下文：
{conversation_context}

知识库相关信息：
{knowledge_context}

当前问题：{question}

请根据以上信息回答问题。如果需要引用历史对话或知识库内容，请明确指出。
如果信息不足以回答问题，请直接说"根据提供的信息无法回答"。

回答："""
    
    def format_context_prompt(
        self,
        conversation_context: str,
        knowledge_context: str,
        question: str
    ) -> str:
        """
        格式化带上下文的提示词
        
        Args:
            conversation_context: 对话上下文
            knowledge_context: 知识库上下文
            question: 问题
            
        Returns:
            str: 格式化后的提示词
        """
        template = self.get_context_template()
        return template.format(
            conversation_context=conversation_context,
            knowledge_context=knowledge_context,
            question=question
        )
    
    def format_prompt(self, context: str, question: str) -> str:
        """
        格式化提示词
        
        Args:
            context: 上下文信息
            question: 问题
            
        Returns:
            str: 格式化后的提示词
        """
        return self.prompt_template.format(context=context, question=question)
    
    def get_template(self) -> PromptTemplate:
        """
        获取提示词模板
        
        Returns:
            PromptTemplate: 提示词模板
        """
        return self.prompt_template
    
    def update_template(self, template: str):
        """
        更新提示词模板
        
        Args:
            template: 新的提示词模板
        """
        self.template = template
        self.prompt_template = PromptTemplate.from_template(template)
        logger.info("提示词模板已更新")

