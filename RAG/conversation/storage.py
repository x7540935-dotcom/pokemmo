"""
对话记录存储
"""
import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime
from RAG.conversation.history import ConversationHistory
from RAG.utils.logging_utils import get_logger

logger = get_logger(__name__)


class ConversationStorage:
    """对话记录存储"""
    
    def __init__(self, storage_dir: Path):
        """
        初始化对话存储
        
        Args:
            storage_dir: 存储目录
        """
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.index_file = self.storage_dir / "index.json"
        self._index_cache: Optional[Dict[str, Any]] = None
    
    def _load_index(self) -> Dict[str, Any]:
        """加载索引文件"""
        if self._index_cache is not None:
            return self._index_cache
        
        if self.index_file.exists():
            try:
                with open(self.index_file, 'r', encoding='utf-8') as f:
                    self._index_cache = json.load(f)
            except Exception as e:
                logger.warning(f"加载索引文件失败: {e}，创建新索引")
                self._index_cache = {"conversations": [], "total_conversations": 0}
        else:
            self._index_cache = {"conversations": [], "total_conversations": 0}
        
        return self._index_cache
    
    def _save_index(self):
        """保存索引文件"""
        try:
            index_data = self._load_index()
            index_data["last_updated"] = datetime.now().isoformat()
            with open(self.index_file, 'w', encoding='utf-8') as f:
                json.dump(index_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"保存索引文件失败: {e}")
    
    def _update_index(self, conversation_id: str, history: ConversationHistory):
        """更新索引"""
        index_data = self._load_index()
        conversations = index_data.get("conversations", [])
        
        # 查找是否已存在
        existing_index = None
        for i, conv in enumerate(conversations):
            if conv["conversation_id"] == conversation_id:
                existing_index = i
                break
        
        conv_info = {
            "conversation_id": conversation_id,
            "created_at": history.created_at,
            "updated_at": history.updated_at,
            "total_turns": history.get_turns(),
            "file_path": f"{conversation_id}/history.json",
            "metadata": history.metadata or {}
        }
        
        if existing_index is not None:
            # 更新现有记录
            conversations[existing_index] = conv_info
        else:
            # 添加新记录
            conversations.append(conv_info)
        
        index_data["conversations"] = conversations
        index_data["total_conversations"] = len(conversations)
        self._index_cache = index_data
        self._save_index()
    
    def save_conversation(self, conversation_id: str, history: ConversationHistory):
        """保存对话记录"""
        try:
            # 创建对话目录
            conv_dir = self.storage_dir / conversation_id
            conv_dir.mkdir(parents=True, exist_ok=True)
            
            # 保存对话历史
            history_file = conv_dir / "history.json"
            with open(history_file, 'w', encoding='utf-8') as f:
                json.dump(history.to_dict(), f, ensure_ascii=False, indent=2)
            
            # 更新索引
            self._update_index(conversation_id, history)
            
            logger.info(f"保存对话记录: {conversation_id}, 轮次: {history.get_turns()}")
        except Exception as e:
            logger.error(f"保存对话记录失败: {conversation_id}, 错误: {e}")
            raise
    
    def load_conversation(self, conversation_id: str) -> Optional[ConversationHistory]:
        """加载对话记录"""
        try:
            history_file = self.storage_dir / conversation_id / "history.json"
            if not history_file.exists():
                logger.warning(f"对话记录不存在: {conversation_id}")
                return None
            
            with open(history_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            history = ConversationHistory.from_dict(data)
            logger.info(f"加载对话记录: {conversation_id}, 轮次: {history.get_turns()}")
            return history
        except Exception as e:
            logger.error(f"加载对话记录失败: {conversation_id}, 错误: {e}")
            return None
    
    def list_conversations(self) -> List[Dict[str, Any]]:
        """列出所有对话"""
        index_data = self._load_index()
        return index_data.get("conversations", [])
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话记录"""
        try:
            # 删除对话目录
            conv_dir = self.storage_dir / conversation_id
            if conv_dir.exists():
                import shutil
                shutil.rmtree(conv_dir)
            
            # 更新索引
            index_data = self._load_index()
            conversations = index_data.get("conversations", [])
            conversations = [c for c in conversations if c["conversation_id"] != conversation_id]
            index_data["conversations"] = conversations
            index_data["total_conversations"] = len(conversations)
            self._index_cache = index_data
            self._save_index()
            
            logger.info(f"删除对话记录: {conversation_id}")
            return True
        except Exception as e:
            logger.error(f"删除对话记录失败: {conversation_id}, 错误: {e}")
            return False
    
    def search_conversations(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """搜索对话记录（简单实现）"""
        conversations = self.list_conversations()
        results = []
        
        for conv in conversations:
            # 简单的关键词匹配
            if query.lower() in conv.get("conversation_id", "").lower():
                results.append(conv)
            elif query.lower() in conv.get("metadata", {}).get("title", "").lower():
                results.append(conv)
            
            if len(results) >= max_results:
                break
        
        return results

