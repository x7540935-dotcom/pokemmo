"""
RAG知识库简单使用示例
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from RAG.knowledge_base import KnowledgeBase


def main():
    """简单使用示例"""
    
    print("=" * 50)
    print("RAG知识库简单使用示例")
    print("=" * 50)
    
    # 1. 初始化知识库
    print("\n1. 初始化知识库...")
    try:
        kb = KnowledgeBase()
        print("✅ 知识库初始化成功")
    except Exception as e:
        print(f"❌ 知识库初始化失败: {e}")
        return
    
    # 2. 添加文本到知识库
    print("\n2. 添加文本到知识库...")
    try:
        text = """
        人工智能（Artificial Intelligence，AI）是计算机科学的一个分支，
        旨在创建能够执行通常需要人类智能的任务的系统。
        人工智能包括机器学习、深度学习、自然语言处理等领域。
        """
        document_ids = kb.add_text(text, metadata={"source": "example", "type": "definition"})
        print(f"✅ 成功添加 {len(document_ids)} 个文档块")
    except Exception as e:
        print(f"❌ 添加文本失败: {e}")
        return
    
    # 3. 查询知识库
    print("\n3. 查询知识库...")
    try:
        question = "什么是人工智能？"
        print(f"问题：{question}")
        print("回答：", end='', flush=True)
        
        answer_parts = []
        for chunk in kb.stream_query(question):
            print(chunk, end='', flush=True)
            answer_parts.append(chunk)
        print()
        print("✅ 查询成功")
    except Exception as e:
        print(f"\n❌ 查询失败: {e}")
        return
    
    # 4. 搜索相似文档
    print("\n4. 搜索相似文档...")
    try:
        query = "人工智能"
        documents = kb.search(query, top_k=3)
        print(f"✅ 找到 {len(documents)} 个相关文档")
        for i, doc in enumerate(documents, 1):
            print(f"\n文档 {i}:")
            print(f"  来源: {doc.metadata.get('source', 'unknown')}")
            print(f"  内容: {doc.page_content[:100]}...")
    except Exception as e:
        print(f"❌ 搜索失败: {e}")
        return
    
    print("\n" + "=" * 50)
    print("示例执行完成")
    print("=" * 50)


if __name__ == "__main__":
    main()

