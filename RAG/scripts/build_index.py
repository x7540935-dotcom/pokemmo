"""
构建索引脚本
用于批量构建知识库索引
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


def build_index(
    data_dir: Path,
    config: RAGConfig = None,
    extensions: List[str] = None
):
    """
    构建知识库索引
    
    Args:
        data_dir: 数据目录
        config: RAG配置
        extensions: 支持的文件扩展名列表
    """
    if extensions is None:
        extensions = ['.txt', '.md', '.pdf', '.docx']
    
    # 获取所有文件
    file_paths = []
    for ext in extensions:
        file_paths.extend(data_dir.glob(f"*{ext}"))
        file_paths.extend(data_dir.glob(f"**/*{ext}"))
    
    if not file_paths:
        logger.warning(f"在 {data_dir} 中未找到支持的文件")
        return
    
    logger.info(f"找到 {len(file_paths)} 个文件")
    
    # 初始化知识库
    kb = KnowledgeBase(config)
    
    # 处理文件
    document_ids = kb.add_documents(file_paths)
    
    logger.info(f"构建索引完成，共添加 {len(document_ids)} 个文档块")
    return document_ids


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="构建知识库索引")
    parser.add_argument(
        "data_dir",
        type=Path,
        help="数据目录路径"
    )
    parser.add_argument(
        "--config",
        type=Path,
        help="配置文件路径（可选）"
    )
    parser.add_argument(
        "--extensions",
        nargs="+",
        default=['.txt', '.md', '.pdf', '.docx'],
        help="支持的文件扩展名（默认: .txt .md .pdf .docx）"
    )
    
    args = parser.parse_args()
    
    # 加载配置
    config = None
    if args.config:
        import json
        with open(args.config, 'r', encoding='utf-8') as f:
            config_dict = json.load(f)
            config = RAGConfig.from_dict(config_dict)
    
    # 构建索引
    try:
        build_index(args.data_dir, config, args.extensions)
        print("索引构建完成")
    except Exception as e:
        logger.error(f"构建索引失败: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()

