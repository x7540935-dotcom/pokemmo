"""
文件工具函数
"""
import os
import shutil
import hashlib
from pathlib import Path
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)


class FileUtils:
    """文件工具类"""
    
    @staticmethod
    def ensure_dir(directory: Path) -> Path:
        """确保目录存在"""
        directory.mkdir(parents=True, exist_ok=True)
        return directory
    
    @staticmethod
    def get_file_hash(file_path: Path) -> str:
        """获取文件哈希值"""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    
    @staticmethod
    def copy_to_dir(source: Path, target_dir: Path, preserve_name: bool = True) -> Path:
        """复制文件到目录"""
        target_dir = FileUtils.ensure_dir(target_dir)
        
        if preserve_name:
            target = target_dir / source.name
        else:
            # 使用哈希值作为文件名
            file_hash = FileUtils.get_file_hash(source)
            target = target_dir / f"{file_hash}{source.suffix}"
        
        shutil.copy2(source, target)
        logger.info(f"文件已复制: {source} -> {target}")
        return target
    
    @staticmethod
    def get_files_by_extensions(directory: Path, extensions: List[str]) -> List[Path]:
        """根据扩展名获取文件列表"""
        files = []
        for ext in extensions:
            files.extend(directory.glob(f"*{ext}"))
            files.extend(directory.glob(f"**/*{ext}"))
        return files
    
    @staticmethod
    def get_file_size(file_path: Path) -> int:
        """获取文件大小（字节）"""
        return file_path.stat().st_size
    
    @staticmethod
    def is_text_file(file_path: Path) -> bool:
        """判断是否为文本文件"""
        text_extensions = {'.txt', '.md', '.py', '.js', '.html', '.css', '.json', '.xml', '.yaml', '.yml'}
        return file_path.suffix.lower() in text_extensions

