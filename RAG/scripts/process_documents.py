"""
文档处理脚本
用于批量处理文档并添加到知识库
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


def process_documents(
    file_paths: List[Path],
    config: RAGConfig = None,
    metadata: dict = None
):
    """
    处理文档并添加到知识库
    
    Args:
        file_paths: 文件路径列表
        config: RAG配置
        metadata: 额外的元数据
    """
    # 初始化知识库
    kb = KnowledgeBase(config)
    
    # 处理文档
    document_ids = kb.add_documents(file_paths, metadata)
    
    print(f"成功处理 {len(document_ids)} 个文档块")
    return document_ids


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="处理文档并添加到知识库")
    parser.add_argument(
        "files",
        nargs="+",
        type=Path,
        help="要处理的文件路径"
    )
    parser.add_argument(
        "--config",
        type=Path,
        help="配置文件路径（可选）"
    )
    parser.add_argument(
        "--metadata",
        type=str,
        help="额外的元数据（JSON格式，可选）"
    )
    
    args = parser.parse_args()
    
    # 加载配置
    config = None
    if args.config:
        import json
        with open(args.config, 'r', encoding='utf-8') as f:
            config_dict = json.load(f)
            config = RAGConfig.from_dict(config_dict)
    
    # 加载元数据
    metadata = None
    if args.metadata:
        import json
        metadata = json.loads(args.metadata)
    
    # 处理文档
    try:
        document_ids = process_documents(args.files, config, metadata)
        print(f"处理完成，共添加 {len(document_ids)} 个文档块")
    except Exception as e:
        logger.error(f"处理文档失败: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()

