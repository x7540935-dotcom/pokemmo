"""
对话管理模块
"""
from __future__ import annotations

import importlib
from typing import TYPE_CHECKING, Any

__all__ = [
    "ConversationManager",
    "ConversationHistory",
    "ConversationMessage",
    "ConversationStorage",
    "ContextManager",
    "ConversationAssistant",
]

_MODULE_MAP = {
    "ConversationManager": ("RAG.conversation.manager", "ConversationManager"),
    "ConversationHistory": ("RAG.conversation.history", "ConversationHistory"),
    "ConversationMessage": ("RAG.conversation.history", "ConversationMessage"),
    "ConversationStorage": ("RAG.conversation.storage", "ConversationStorage"),
    "ContextManager": ("RAG.conversation.context", "ContextManager"),
    "ConversationAssistant": ("RAG.conversation.assistant", "ConversationAssistant"),
}

if TYPE_CHECKING:  # pragma: no cover
    from RAG.conversation.manager import ConversationManager as _ConversationManager
    from RAG.conversation.history import (
        ConversationHistory as _ConversationHistory,
        ConversationMessage as _ConversationMessage,
    )
    from RAG.conversation.storage import ConversationStorage as _ConversationStorage
    from RAG.conversation.context import ContextManager as _ContextManager
    from RAG.conversation.assistant import (
        ConversationAssistant as _ConversationAssistant,
    )


def __getattr__(name: str) -> Any:
    if name not in _MODULE_MAP:
        raise AttributeError(f"module 'RAG.conversation' has no attribute '{name}'")
    module_name, attr_name = _MODULE_MAP[name]
    module = importlib.import_module(module_name)
    attr = getattr(module, attr_name)
    globals()[name] = attr
    return attr


def __dir__() -> list[str]:
    return sorted(__all__ + [k for k in globals().keys() if not k.startswith("_")])

