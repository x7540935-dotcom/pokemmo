"""
查询模块
"""
from __future__ import annotations

import importlib
from typing import TYPE_CHECKING, Any

__all__ = ["QueryChain", "PromptManager", "ContextQueryChain"]

_MODULE_MAP = {
    "QueryChain": ("RAG.query.chain", "QueryChain"),
    "PromptManager": ("RAG.query.prompt", "PromptManager"),
    "ContextQueryChain": ("RAG.query.context_chain", "ContextQueryChain"),
}

if TYPE_CHECKING:  # pragma: no cover
    from RAG.query.chain import QueryChain as _QueryChain
    from RAG.query.prompt import PromptManager as _PromptManager
    from RAG.query.context_chain import ContextQueryChain as _ContextQueryChain


def __getattr__(name: str) -> Any:
    if name not in _MODULE_MAP:
        raise AttributeError(f"module 'RAG.query' has no attribute '{name}'")
    module_name, attr_name = _MODULE_MAP[name]
    module = importlib.import_module(module_name)
    attr = getattr(module, attr_name)
    globals()[name] = attr
    return attr


def __dir__() -> list[str]:
    return sorted(__all__ + [k for k in globals().keys() if not k.startswith("_")])


