"""
文本切块器模块
"""
from RAG.data_processing.chunkers.base import BaseChunker
from RAG.data_processing.chunkers.recursive_chunker import RecursiveChunker

__all__ = [
    "BaseChunker",
    "RecursiveChunker",
]

