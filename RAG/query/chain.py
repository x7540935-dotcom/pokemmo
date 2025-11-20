"""
问答链
"""
from operator import itemgetter
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from typing import Optional, Iterator
from RAG.retrieval.retriever import Retriever
from RAG.query.prompt import PromptManager
from RAG.config import LLMConfig
from RAG.utils.logging_utils import get_logger

# 尝试导入ChatOpenAI，如果失败则使用占位符
try:
    from langchain_openai import ChatOpenAI
except ImportError:
    try:
        # 尝试使用langchain_community
        from langchain_community.chat_models import ChatOpenAI
    except ImportError:
        # 如果都失败，创建一个占位符类
        logger = get_logger(__name__)
        logger.warning("无法导入ChatOpenAI，LLM功能将不可用。知识库构建功能不受影响。")
        class ChatOpenAI:
            def __init__(self, **kwargs):
                raise ImportError("需要安装langchain-openai或langchain-community才能使用LLM功能")

logger = get_logger(__name__)


class QueryChain:
    """问答链"""
    
    def __init__(
        self,
        retriever: Retriever,
        llm_config: LLMConfig,
        prompt_manager: Optional[PromptManager] = None
    ):
        """
        初始化问答链
        
        Args:
            retriever: 检索器
            llm_config: LLM配置
            prompt_manager: 提示词管理器，如果为None则使用默认管理器
        """
        self.retriever = retriever
        self.llm_config = llm_config
        self.prompt_manager = prompt_manager or PromptManager()
        
        # 初始化LLM
        # 注意：知识库构建不需要LLM功能，如果初始化失败不影响构建
        try:
            # 尝试使用兼容的参数名初始化
            llm_kwargs = {
                "model": llm_config.model,
                "temperature": llm_config.temperature,
                "streaming": llm_config.streaming,
                "max_tokens": llm_config.max_tokens,
            }
            
            # 添加API配置（使用环境变量优先，如果配置中有则使用）
            if llm_config.api_key:
                # 设置环境变量，某些版本的ChatOpenAI会读取环境变量
                import os
                os.environ["OPENAI_API_KEY"] = llm_config.api_key
            
            # 尝试不同的参数组合
            if llm_config.base_url:
                # 先尝试使用base_url参数（新版本）
                try:
                    llm_kwargs["base_url"] = llm_config.base_url
                    self.llm = ChatOpenAI(**llm_kwargs)
                except (TypeError, ValueError) as e:
                    # 如果base_url不支持，尝试openai_api_base（旧版本）
                    try:
                        llm_kwargs.pop("base_url", None)
                        llm_kwargs["openai_api_base"] = llm_config.base_url
                        self.llm = ChatOpenAI(**llm_kwargs)
                    except Exception as e2:
                        # 如果还是失败，只使用基本参数
                        llm_kwargs.pop("openai_api_base", None)
                        logger.warning(f"base_url配置可能不支持，使用默认配置: {e2}")
                        self.llm = ChatOpenAI(**llm_kwargs)
            else:
                self.llm = ChatOpenAI(**llm_kwargs)
                
        except Exception as e:
            # 捕获所有初始化错误，给出明确的错误信息
            error_msg = str(e)
            # 检查是否是参数兼容性问题
            if "proxies" in error_msg.lower() or "unexpected keyword" in error_msg.lower():
                # 尝试不传递可能有问题的参数，使用最简化的初始化
                try:
                    logger.debug(f"检测到参数兼容性问题，尝试简化初始化: {error_msg}")
                    # 只使用最基本的参数
                    basic_kwargs = {
                        "model": llm_config.model,
                        "temperature": llm_config.temperature,
                    }
                    if llm_config.api_key:
                        import os
                        os.environ["OPENAI_API_KEY"] = llm_config.api_key
                    self.llm = ChatOpenAI(**basic_kwargs)
                    logger.info("LLM已使用简化参数初始化（部分功能可能受限）")
                except Exception as e2:
                    # 如果简化初始化也失败，记录错误但不立即抛出
                    # 使用debug级别记录，因为知识库构建不需要LLM功能
                    logger.debug(f"ChatOpenAI初始化失败（不影响知识库构建）: {error_msg}")
                    # 抛出异常，让上层代码决定是否继续
                    raise RuntimeError(f"无法初始化ChatOpenAI: {error_msg}") from e
            else:
                logger.error(f"ChatOpenAI初始化失败: {error_msg}")
                raise RuntimeError(f"无法初始化ChatOpenAI: {error_msg}") from e
        
        # 构建问答链
        self.chain = self._build_chain()
        logger.info("问答链初始化完成")
    
    def _build_chain(self):
        """构建问答链"""
        # 获取LangChain检索器
        R = self.retriever.get_retriever()
        
        # 构建链
        chain = (
            {'question': RunnablePassthrough()}
            | RunnablePassthrough.assign(context=itemgetter('question') | R)
            | self.prompt_manager.get_template()
            | self.llm
            | StrOutputParser()
        )
        
        return chain
    
    def query(self, question: str) -> str:
        """
        查询问题
        
        Args:
            question: 问题文本
            
        Returns:
            str: 回答
        """
        logger.info(f"查询问题: {question}")
        
        try:
            answer = self.chain.invoke(question)
            logger.info("查询完成")
            return answer
        except Exception as e:
            logger.error(f"查询失败: {str(e)}")
            raise
    
    def stream(self, question: str) -> Iterator[str]:
        """
        流式查询问题
        
        Args:
            question: 问题文本
            
        Returns:
            Iterator[str]: 回答流
        """
        logger.info(f"流式查询问题: {question}")
        
        try:
            for chunk in self.chain.stream(question):
                yield chunk
        except Exception as e:
            logger.error(f"流式查询失败: {str(e)}")
            raise

