"""
上下文问答链
"""
from typing import Optional, Iterator, List, Tuple
from langchain_core.documents import Document
from langchain_openai import ChatOpenAI
from RAG.retrieval.retriever import Retriever
from RAG.query.prompt import PromptManager
from RAG.conversation.history import ConversationHistory
from RAG.conversation.context import ContextManager
from RAG.config import LLMConfig, ContextConfig
from RAG.utils.logging_utils import get_logger

logger = get_logger(__name__)


class ContextQueryChain:
    """上下文问答链"""
    
    def __init__(
        self,
        retriever: Retriever,
        context_manager: ContextManager,
        llm_config: LLMConfig,
        prompt_manager: Optional[PromptManager] = None
    ):
        """
        初始化上下文问答链
        
        Args:
            retriever: 检索器
            context_manager: 上下文管理器
            llm_config: LLM配置
            prompt_manager: 提示词管理器，如果为None则使用默认管理器
        """
        self.retriever = retriever
        self.context_manager = context_manager
        self.llm_config = llm_config
        self.prompt_manager = prompt_manager or PromptManager()
        
        # 初始化LLM（用于普通查询）
        self.llm = ChatOpenAI(
            model=llm_config.model,
            base_url=llm_config.base_url,
            api_key=llm_config.api_key,
            streaming=False,  # 普通查询不使用流式
            temperature=llm_config.temperature,
            max_tokens=llm_config.max_tokens,
        )
        
        # 初始化流式LLM（用于流式查询）
        self.streaming_llm = ChatOpenAI(
            model=llm_config.model,
            base_url=llm_config.base_url,
            api_key=llm_config.api_key,
            streaming=True,  # 流式查询使用流式
            temperature=llm_config.temperature,
            max_tokens=llm_config.max_tokens,
        )
        
        logger.info("上下文问答链初始化完成")
    
    def _format_knowledge(self, documents: List[Document]) -> str:
        """
        格式化知识库文档
        
        Args:
            documents: 文档列表
            
        Returns:
            str: 格式化后的知识库上下文
        """
        if not documents:
            return "未找到相关知识库内容。"
        
        knowledge_parts = []
        for i, doc in enumerate(documents, 1):
            content = doc.page_content
            source = doc.metadata.get("source", "未知来源")
            knowledge_parts.append(f"[{i}] 来源：{source}\n{content}")
        
        return "\n\n".join(knowledge_parts)
    
    def query_with_context(
        self,
        question: str,
        history: ConversationHistory,
        max_turns: Optional[int] = None
    ) -> str:
        """
        带上下文的查询
        
        Args:
            question: 问题文本
            history: 对话历史
            max_turns: 最大轮次
            
        Returns:
            str: 回答
        """
        logger.info(f"带上下文的查询: {question}")
        
        try:
            # 1. 从知识库检索相关文档
            knowledge_docs = self.retriever.retrieve(question, top_k=5)
            knowledge_context = self._format_knowledge(knowledge_docs)
            
            # 2. 构建对话上下文（包含摘要检查）
            conversation_context = self.context_manager.get_context_with_summary(
                history, max_turns
            )
            
            # 3. 构建提示词
            prompt = self.prompt_manager.format_context_prompt(
                conversation_context=conversation_context,
                knowledge_context=knowledge_context,
                question=question
            )
            
            # 4. 生成回答
            response = self.llm.invoke(prompt)
            answer = response.content if hasattr(response, 'content') else str(response)
            
            # 5. 记录知识来源
            knowledge_sources = [
                doc.metadata.get("source", "未知来源")
                for doc in knowledge_docs
            ]
            
            logger.info(f"查询完成，知识来源: {knowledge_sources}")
            return answer, knowledge_sources
            
        except Exception as e:
            logger.error(f"查询失败: {str(e)}")
            raise
    
    def stream_query_with_context(
        self,
        question: str,
        history: ConversationHistory,
        max_turns: Optional[int] = None
    ) -> Tuple[Iterator[str], List[str]]:
        """
        流式查询（带上下文）
        
        Args:
            question: 问题文本
            history: 对话历史
            max_turns: 最大轮次
            
        Returns:
            tuple[Iterator[str], List[str]]: (回答流, 知识来源列表)
        """
        logger.info(f"流式查询（带上下文）: {question}")
        
        try:
            # 1. 从知识库检索相关文档
            knowledge_docs = self.retriever.retrieve(question, top_k=5)
            knowledge_context = self._format_knowledge(knowledge_docs)
            
            # 记录知识来源
            knowledge_sources = [
                doc.metadata.get("source", "未知来源")
                for doc in knowledge_docs
            ]
            
            # 2. 构建对话上下文（包含摘要检查）
            conversation_context = self.context_manager.get_context_with_summary(
                history, max_turns
            )
            
            # 3. 构建提示词
            prompt = self.prompt_manager.format_context_prompt(
                conversation_context=conversation_context,
                knowledge_context=knowledge_context,
                question=question
            )
            
            # 4. 流式生成回答
            def answer_generator():
                for chunk in self.streaming_llm.stream(prompt):
                    if hasattr(chunk, 'content'):
                        yield chunk.content
                    else:
                        yield str(chunk)
            
            return answer_generator(), knowledge_sources
                    
        except Exception as e:
            logger.error(f"流式查询失败: {str(e)}")
            raise

