"""
RAG知识库系统 - 模块化实现
"""
from __future__ import annotations

import importlib
from typing import TYPE_CHECKING, Any

__version__ = "1.0.0"

__all__ = [
    "RAGConfig",
    "KnowledgeBase",
    "VectorStore",
    "ChromaVectorStore",
    "Retriever",
    "QueryChain",
    "ContextQueryChain",
    "ConversationAssistant",
    "ConversationManager",
    "ConversationHistory",
    "ConversationMessage",
]

_MODULE_MAP = {
    "RAGConfig": ("RAG.config", "RAGConfig"),
    "KnowledgeBase": ("RAG.knowledge_base", "KnowledgeBase"),
    "VectorStore": ("RAG.storage.vector_store", "VectorStore"),
    "ChromaVectorStore": ("RAG.storage.chroma_store", "ChromaVectorStore"),
    "Retriever": ("RAG.retrieval.retriever", "Retriever"),
    "QueryChain": ("RAG.query.chain", "QueryChain"),
    "ContextQueryChain": ("RAG.query.context_chain", "ContextQueryChain"),
    "ConversationAssistant": (
        "RAG.conversation.assistant",
        "ConversationAssistant",
    ),
    "ConversationManager": (
        "RAG.conversation.manager",
        "ConversationManager",
    ),
    "ConversationHistory": (
        "RAG.conversation.history",
        "ConversationHistory",
    ),
    "ConversationMessage": (
        "RAG.conversation.history",
        "ConversationMessage",
    ),
}

if TYPE_CHECKING:  # pragma: no cover
    from RAG.config import RAGConfig as _RAGConfig
    from RAG.knowledge_base import KnowledgeBase as _KnowledgeBase
    from RAG.storage.vector_store import VectorStore as _VectorStore
    from RAG.storage.chroma_store import ChromaVectorStore as _ChromaVectorStore
    from RAG.retrieval.retriever import Retriever as _Retriever
    from RAG.query.chain import QueryChain as _QueryChain
    from RAG.query.context_chain import ContextQueryChain as _ContextQueryChain
    from RAG.conversation.assistant import (
        ConversationAssistant as _ConversationAssistant,
    )
    from RAG.conversation.manager import ConversationManager as _ConversationManager
    from RAG.conversation.history import (
        ConversationHistory as _ConversationHistory,
        ConversationMessage as _ConversationMessage,
    )


def __getattr__(name: str) -> Any:
    """延迟加载模块，避免导入时的循环依赖。"""
    if name not in _MODULE_MAP:
        raise AttributeError(f"module 'RAG' has no attribute '{name}'")

    module_name, attr_name = _MODULE_MAP[name]
    module = importlib.import_module(module_name)
    attr = getattr(module, attr_name)
    globals()[name] = attr
    return attr


def __dir__() -> list[str]:
    """支持 dir(RAG) 输出 __all__."""
    return sorted(__all__ + [k for k in globals().keys() if not k.startswith("_")])


