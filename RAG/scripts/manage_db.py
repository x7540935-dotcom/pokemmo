"""
数据库管理脚本
用于管理知识库数据库
"""
import sys
import argparse
from pathlib import Path
from typing import List

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from RAG.knowledge_base import KnowledgeBase
from RAG.config import RAGConfig
from RAG.utils.logging_utils import get_logger

logger = get_logger(__name__)


def search_documents(
    query: str,
    top_k: int = 5,
    config: RAGConfig = None
):
    """
    搜索文档
    
    Args:
        query: 查询文本
        top_k: 返回前k个结果
        config: RAG配置
    """
    # 初始化知识库
    kb = KnowledgeBase(config)
    
    # 搜索
    documents = kb.search(query, top_k=top_k)
    
    print(f"找到 {len(documents)} 个相关文档：")
    for i, doc in enumerate(documents, 1):
        print(f"\n{i}. 来源: {doc.metadata.get('source', 'unknown')}")
        print(f"   内容: {doc.page_content[:100]}...")
        print(f"   元数据: {doc.metadata}")


def delete_documents(
    document_ids: List[str],
    config: RAGConfig = None
):
    """
    删除文档
    
    Args:
        document_ids: 文档ID列表
        config: RAG配置
    """
    # 初始化知识库
    kb = KnowledgeBase(config)
    
    # 删除
    success = kb.delete_documents(document_ids)
    
    if success:
        print(f"成功删除 {len(document_ids)} 个文档")
    else:
        print("删除文档失败")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="管理知识库数据库")
    subparsers = parser.add_subparsers(dest='command', help='命令')
    
    # 搜索命令
    search_parser = subparsers.add_parser('search', help='搜索文档')
    search_parser.add_argument('query', type=str, help='查询文本')
    search_parser.add_argument('--top-k', type=int, default=5, help='返回前k个结果')
    search_parser.add_argument('--config', type=Path, help='配置文件路径（可选）')
    
    # 删除命令
    delete_parser = subparsers.add_parser('delete', help='删除文档')
    delete_parser.add_argument('ids', nargs='+', type=str, help='文档ID列表')
    delete_parser.add_argument('--config', type=Path, help='配置文件路径（可选）')
    
    args = parser.parse_args()
    
    # 加载配置
    config = None
    if args.config:
        import json
        with open(args.config, 'r', encoding='utf-8') as f:
            config_dict = json.load(f)
            config = RAGConfig.from_dict(config_dict)
    
    # 执行命令
    try:
        if args.command == 'search':
            search_documents(args.query, args.top_k, config)
        elif args.command == 'delete':
            delete_documents(args.ids, config)
        else:
            parser.print_help()
    except Exception as e:
        logger.error(f"执行命令失败: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()

