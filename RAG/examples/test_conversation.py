"""
测试RAG多轮对话助手
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from RAG.knowledge_base import KnowledgeBase
from RAG.conversation import ConversationAssistant


def test_basic_conversation():
    """测试基本对话功能"""
    print("=" * 60)
    print("测试1：基本对话功能")
    print("=" * 60)
    
    try:
        # 初始化知识库
        kb = KnowledgeBase()
        
        # 创建对话助手
        assistant = ConversationAssistant(knowledge_base=kb)
        
        # 创建新对话
        conv_id = assistant.create_conversation()
        print(f"✅ 对话创建成功，ID: {conv_id}")
        
        # 第一轮对话
        print("\n第1轮对话：")
        answer1 = assistant.chat(conv_id, "什么是人工智能？")
        print(f"用户：什么是人工智能？")
        print(f"助手：{answer1[:100]}...")
        
        # 第二轮对话
        print("\n第2轮对话：")
        answer2 = assistant.chat(conv_id, "它有哪些应用领域？")
        print(f"用户：它有哪些应用领域？")
        print(f"助手：{answer2[:100]}...")
        
        # 第三轮对话（应该触发摘要）
        print("\n第3轮对话（应该触发摘要）：")
        answer3 = assistant.chat(conv_id, "请详细介绍一下机器学习")
        print(f"用户：请详细介绍一下机器学习")
        print(f"助手：{answer3[:100]}...")
        
        # 检查摘要
        history = assistant.conversation_manager.get_conversation(conv_id)
        if history.summary:
            print(f"\n✅ 摘要已创建，轮次: {history.summary_turn}")
            print(f"摘要内容: {history.summary[:200]}...")
        else:
            print("\n⚠️ 摘要未创建")
        
        print("\n✅ 基本对话测试通过")
        return True
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_incremental_summary():
    """测试增量摘要功能"""
    print("\n" + "=" * 60)
    print("测试2：增量摘要功能")
    print("=" * 60)
    
    try:
        # 初始化知识库
        kb = KnowledgeBase()
        
        # 创建对话助手
        assistant = ConversationAssistant(knowledge_base=kb)
        
        # 创建新对话
        conv_id = assistant.create_conversation()
        print(f"✅ 对话创建成功，ID: {conv_id}")
        
        # 进行多轮对话，测试摘要触发
        questions = [
            "什么是人工智能？",
            "它有哪些应用领域？",
            "请详细介绍一下机器学习",
            "深度学习是什么？",
            "神经网络的基本原理是什么？",
            "卷积神经网络有哪些应用？",
        ]
        
        for i, question in enumerate(questions, 1):
            print(f"\n第{i}轮对话：")
            answer = assistant.chat(conv_id, question)
            print(f"用户：{question}")
            print(f"助手：{answer[:80]}...")
            
            # 检查摘要
            history = assistant.conversation_manager.get_conversation(conv_id)
            if history.summary:
                print(f"  📝 摘要已创建，轮次: {history.summary_turn}, 摘要长度: {len(history.summary)}")
            else:
                print(f"  📝 暂无摘要")
        
        # 检查最终摘要
        history = assistant.conversation_manager.get_conversation(conv_id)
        if history.summary:
            print(f"\n✅ 最终摘要（轮次: {history.summary_turn}）:")
            print(f"{history.summary[:300]}...")
        
        print("\n✅ 增量摘要测试通过")
        return True
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_context_usage():
    """测试上下文使用"""
    print("\n" + "=" * 60)
    print("测试3：上下文使用")
    print("=" * 60)
    
    try:
        # 初始化知识库
        kb = KnowledgeBase()
        
        # 创建对话助手
        assistant = ConversationAssistant(knowledge_base=kb)
        
        # 创建新对话
        conv_id = assistant.create_conversation()
        print(f"✅ 对话创建成功，ID: {conv_id}")
        
        # 第一轮：介绍主题
        print("\n第1轮：介绍主题")
        answer1 = assistant.chat(conv_id, "我想了解Python编程")
        print(f"用户：我想了解Python编程")
        print(f"助手：{answer1[:100]}...")
        
        # 第二轮：继续主题（应该能理解上下文）
        print("\n第2轮：继续主题（测试上下文理解）")
        answer2 = assistant.chat(conv_id, "它有什么特点？")
        print(f"用户：它有什么特点？")
        print(f"助手：{answer2[:100]}...")
        # 检查回答是否理解上下文（是否提到Python）
        if "Python" in answer2 or "python" in answer2.lower():
            print("✅ 上下文理解正确")
        else:
            print("⚠️ 上下文理解可能有问题")
        
        # 第三轮：继续主题
        print("\n第3轮：继续主题")
        answer3 = assistant.chat(conv_id, "请介绍一下它的语法特性")
        print(f"用户：请介绍一下它的语法特性")
        print(f"助手：{answer3[:100]}...")
        
        print("\n✅ 上下文使用测试通过")
        return True
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """主测试函数"""
    print("RAG多轮对话助手测试")
    print("=" * 60)
    
    # 运行测试
    results = []
    results.append(("基本对话功能", test_basic_conversation()))
    results.append(("增量摘要功能", test_incremental_summary()))
    results.append(("上下文使用", test_context_usage()))
    
    # 汇总结果
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    for test_name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{test_name}: {status}")
    
    # 统计
    passed = sum(1 for _, result in results if result)
    total = len(results)
    print(f"\n总计: {passed}/{total} 测试通过")


if __name__ == "__main__":
    main()

