"""
RAG知识库基本使用示例
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from RAG.knowledge_base import KnowledgeBase
from RAG.config import RAGConfig


def main():
    """基本使用示例"""
    
    # 1. 初始化知识库
    print("初始化知识库...")
    config = RAGConfig()
    kb = KnowledgeBase(config)
    
    # 2. 添加文档
    print("\n添加文档到知识库...")
    # 假设有文档文件
    # file_paths = [Path("RAG/data/raw/document1.txt")]
    # document_ids = kb.add_documents(file_paths)
    # print(f"成功添加 {len(document_ids)} 个文档块")
    
    # 3. 添加文本
    print("\n添加文本到知识库...")
    text = "人工智能是计算机科学的一个分支，旨在创建能够执行通常需要人类智能的任务的系统。"
    document_ids = kb.add_text(text, metadata={"source": "example"})
    print(f"成功添加 {len(document_ids)} 个文档块")
    
    # 4. 查询
    print("\n查询知识库...")
    question = "什么是人工智能？"
    answer = kb.query(question)
    print(f"问题：{question}")
    print(f"回答：{answer}")
    
    # 5. 搜索
    print("\n搜索相似文档...")
    documents = kb.search("人工智能", top_k=3)
    print(f"找到 {len(documents)} 个相关文档：")
    for i, doc in enumerate(documents, 1):
        print(f"\n{i}. 来源: {doc.metadata.get('source', 'unknown')}")
        print(f"   内容: {doc.page_content[:100]}...")


if __name__ == "__main__":
    main()

