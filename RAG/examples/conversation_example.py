"""
RAG多轮对话助手使用示例
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from RAG.knowledge_base import KnowledgeBase
from RAG.conversation import ConversationAssistant


def main():
    """多轮对话示例"""
    
    print("=" * 60)
    print("RAG多轮对话助手示例")
    print("=" * 60)
    
    # 1. 初始化知识库
    print("\n1. 初始化知识库...")
    try:
        kb = KnowledgeBase()
        print("✅ 知识库初始化成功")
    except Exception as e:
        print(f"❌ 知识库初始化失败: {e}")
        return
    
    # 2. 创建对话助手
    print("\n2. 创建对话助手...")
    try:
        assistant = ConversationAssistant(knowledge_base=kb)
        print("✅ 对话助手创建成功")
    except Exception as e:
        print(f"❌ 对话助手创建失败: {e}")
        return
    
    # 3. 创建新对话
    print("\n3. 创建新对话...")
    try:
        conv_id = assistant.create_conversation()
        print(f"✅ 对话创建成功，对话ID: {conv_id}")
    except Exception as e:
        print(f"❌ 对话创建失败: {e}")
        return
    
    # 4. 第一轮对话
    print("\n4. 第一轮对话...")
    try:
        question1 = "什么是人工智能？"
        print(f"用户：{question1}")
        answer1 = assistant.chat(conv_id, question1)
        print(f"助手：{answer1}")
        print("✅ 第一轮对话完成")
    except Exception as e:
        print(f"❌ 第一轮对话失败: {e}")
        return
    
    # 5. 第二轮对话（带上下文）
    print("\n5. 第二轮对话（带上下文）...")
    try:
        question2 = "它有哪些应用领域？"
        print(f"用户：{question2}")
        answer2 = assistant.chat(conv_id, question2)
        print(f"助手：{answer2}")
        print("✅ 第二轮对话完成")
    except Exception as e:
        print(f"❌ 第二轮对话失败: {e}")
        return
    
    # 6. 第三轮对话（继续上下文）
    print("\n6. 第三轮对话（继续上下文）...")
    try:
        question3 = "请详细介绍一下机器学习"
        print(f"用户：{question3}")
        answer3 = assistant.chat(conv_id, question3)
        print(f"助手：{answer3}")
        print("✅ 第三轮对话完成")
    except Exception as e:
        print(f"❌ 第三轮对话失败: {e}")
        return
    
    # 7. 获取对话历史
    print("\n7. 获取对话历史...")
    try:
        history = assistant.get_history(conv_id)
        print(f"✅ 对话历史获取成功，共 {len(history)} 条消息")
        for i, msg in enumerate(history, 1):
            print(f"  {i}. [{msg['role']}] {msg['content'][:50]}...")
    except Exception as e:
        print(f"❌ 获取对话历史失败: {e}")
    
    # 8. 流式输出示例
    print("\n8. 流式输出示例...")
    try:
        question4 = "什么是深度学习？"
        print(f"用户：{question4}")
        print("助手：", end='', flush=True)
        for chunk in assistant.stream_chat(conv_id, question4):
            print(chunk, end='', flush=True)
        print()
        print("✅ 流式输出完成")
    except Exception as e:
        print(f"❌ 流式输出失败: {e}")
    
    # 9. 列出所有对话
    print("\n9. 列出所有对话...")
    try:
        conversations = assistant.list_conversations()
        print(f"✅ 共有 {len(conversations)} 个对话")
        for conv in conversations:
            print(f"  - {conv['conversation_id']}: {conv['total_turns']} 轮")
    except Exception as e:
        print(f"❌ 列出对话失败: {e}")
    
    print("\n" + "=" * 60)
    print("示例执行完成")
    print("=" * 60)


if __name__ == "__main__":
    main()

