"""
RAG模块适配器
保持与旧代码的兼容性

注意：此文件主要用于兼容旧代码，新代码建议直接使用 KnowledgeBase 类
"""
import os
import datetime
from pathlib import Path
from typing import List, Optional

# 导入新的模块化实现
try:
    from RAG.knowledge_base import KnowledgeBase
    from RAG.config import RAGConfig
    RAG_AVAILABLE = True
except ImportError as e:
    RAG_AVAILABLE = False
    IMPORT_ERROR = str(e)
    # 提供占位类
    class KnowledgeBase:
        def __init__(self, *args, **kwargs):
            raise ImportError(f"无法导入KnowledgeBase: {IMPORT_ERROR}")

# 保持旧接口兼容性
# 注意：这里只实现核心功能，GUI和语音识别等功能可以后续扩展

# 全局知识库实例
_kb_instance: Optional[KnowledgeBase] = None


def _get_kb() -> KnowledgeBase:
    """获取知识库实例（单例模式）"""
    global _kb_instance
    if not RAG_AVAILABLE:
        raise ImportError(f"RAG模块不可用: {IMPORT_ERROR}")
    
    if _kb_instance is None:
        config = RAGConfig()
        _kb_instance = KnowledgeBase(config)
    return _kb_instance


def add_to_knowledge_base(question: str, answer: str):
    """
    将问答对添加到知识库（兼容旧接口）
    
    Args:
        question: 问题
        answer: 回答
    """
    kb = _get_kb()
    text = f"问题：{question}\n回答：{answer}"
    kb.add_text(text, metadata={"source": "user_query"})


def upload_documents():
    """
    上传文档到知识库（兼容旧接口）
    注意：此函数需要GUI支持
    """
    try:
        import tkinter as tk
        from tkinter import filedialog, messagebox
        
        root = tk.Tk()
        root.withdraw()
        
        file_paths = filedialog.askopenfilenames(
            title="选择要上传的文档",
            filetypes=[
                ("文本文件", "*.txt"),
                ("PDF文件", "*.pdf"),
                ("Word文件", "*.docx"),
                ("所有支持的文件", "*.*")
            ]
        )
        
        if not file_paths:
            print("未选择任何文件")
            return
        
        kb = _get_kb()
        file_paths = [Path(f) for f in file_paths]
        document_ids = kb.add_documents(file_paths)
        
        messagebox.showinfo("上传完成", f"共添加 {len(document_ids)} 个文档块到知识库")
        print(f"成功添加 {len(document_ids)} 个文档块到知识库")
        
    except ImportError:
        print("GUI功能需要tkinter支持")
    except Exception as e:
        print(f"上传文档失败: {str(e)}")
    finally:
        try:
            root.destroy()
        except:
            pass


# 为了兼容性，我们创建一个简单的链式调用接口
class ChainAdapter:
    """链式调用适配器"""
    
    def __init__(self):
        self._kb = None
    
    def _get_kb(self):
        if self._kb is None:
            self._kb = _get_kb()
        return self._kb
    
    def stream(self, question: str):
        """流式查询"""
        return self._get_kb().stream_query(question)
    
    def invoke(self, question: str) -> str:
        """查询"""
        return self._get_kb().query(question)


# 兼容旧的chain接口
chain = ChainAdapter()


def chat_loop():
    """
    聊天循环（兼容旧接口）
    """
    print("欢迎使用RAG助手！")
    print("命令选项:")
    print("  输入问题直接提问")
    print("  输入'上传'可添加文档到知识库")
    print("  输入'退出'结束对话")
    
    kb = _get_kb()
    
    while True:
        question = input("\n请输入你的问题或命令：")
        if question.lower() == '退出':
            print("再见！")
            break
        elif question.lower() == '上传':
            upload_documents()
            continue
        
        # 获取回答
        print("\n回答：", end='', flush=True)
        answer = []
        for chunk in kb.stream_query(question):
            print(chunk, end='', flush=True)
            answer.append(chunk)
        answer = ''.join(answer)
        
        # 询问是否保存这次问答
        save = input("\n是否将这次问答添加到知识库？(y/n)：")
        if save.lower() == 'y':
            add_to_knowledge_base(question, answer)


if __name__ == '__main__':
    chat_loop()
