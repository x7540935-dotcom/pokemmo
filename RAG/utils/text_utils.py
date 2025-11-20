"""
文本工具函数
"""
import re
from typing import List, Optional


class TextUtils:
    """文本工具类"""
    
    @staticmethod
    def clean_text(text: str) -> str:
        """清洗文本"""
        if not text:
            return ""
        
        # 移除多余的空白字符
        text = re.sub(r'\s+', ' ', text)
        
        # 移除特殊字符（保留中文、英文、数字、常用标点）
        text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9\s\.\,\!\?\;\:\-\（\）\《\》\「\」\『\』]', '', text)
        
        # 移除首尾空白
        text = text.strip()
        
        return text
    
    @staticmethod
    def remove_html_tags(text: str) -> str:
        """移除HTML标签"""
        if not text:
            return ""
        
        # 移除HTML标签
        text = re.sub(r'<[^>]+>', '', text)
        
        # 解码HTML实体
        import html
        text = html.unescape(text)
        
        return text
    
    @staticmethod
    def normalize_whitespace(text: str) -> str:
        """标准化空白字符"""
        if not text:
            return ""
        
        # 将多个空白字符替换为单个空格
        text = re.sub(r'\s+', ' ', text)
        
        # 移除首尾空白
        text = text.strip()
        
        return text
    
    @staticmethod
    def split_sentences(text: str) -> List[str]:
        """分割句子"""
        if not text:
            return []
        
        # 使用正则表达式分割句子
        sentences = re.split(r'[。！？\.\!\?]\s*', text)
        
        # 过滤空句子
        sentences = [s.strip() for s in sentences if s.strip()]
        
        return sentences
    
    @staticmethod
    def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
        """截断文本"""
        if not text or len(text) <= max_length:
            return text
        
        return text[:max_length - len(suffix)] + suffix
    
    @staticmethod
    def extract_keywords(text: str, max_keywords: int = 10) -> List[str]:
        """提取关键词（简单实现）"""
        if not text:
            return []
        
        # 移除标点符号
        text = re.sub(r'[^\w\s]', '', text)
        
        # 分割单词
        words = text.split()
        
        # 统计词频
        word_freq = {}
        for word in words:
            if len(word) > 1:  # 忽略单字符
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # 按频率排序
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        
        # 返回前N个关键词
        keywords = [word for word, freq in sorted_words[:max_keywords]]
        
        return keywords

