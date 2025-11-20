#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
RAG知识库查询脚本
用于从Node.js调用Python RAG系统
"""
import json
import sys
import argparse
from pathlib import Path

# 添加项目路径
PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

PM_DIR = PROJECT_ROOT / "pokemmo myself"
if PM_DIR.exists():
    sys.path.insert(0, str(PM_DIR))

try:
    from RAG.knowledge_base import KnowledgeBase
except ImportError as e:
    print(json.dumps({"error": f"无法导入RAG模块: {e}"}), file=sys.stderr)
    sys.exit(1)


def query_knowledge_base(query_text: str, top_k: int = 3):
    """
    查询知识库
    
    Args:
        query_text: 查询文本
        top_k: 返回前k个结果
        
    Returns:
        List[Dict]: 查询结果列表
    """
    try:
        kb = KnowledgeBase()
        results = kb.search(query_text, top_k=top_k)
        
        # 转换为JSON格式
        output = []
        for doc in results:
            output.append({
                "content": doc.page_content[:500],  # 限制长度
                "metadata": doc.metadata,
                "score": getattr(doc, 'similarity_score', 0)
            })
        
        return output
    except Exception as e:
        return [{"error": str(e)}]


def main():
    parser = argparse.ArgumentParser(description="查询RAG知识库")
    parser.add_argument("--query", required=True, help="查询文本")
    parser.add_argument("--top-k", type=int, default=3, help="返回前k个结果")
    
    args = parser.parse_args()
    
    results = query_knowledge_base(args.query, args.top_k)
    
    # 输出JSON格式的结果
    print(json.dumps(results, ensure_ascii=False))


if __name__ == "__main__":
    main()
