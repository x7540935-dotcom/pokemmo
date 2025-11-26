#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
用户攻略导入脚本
将用户编写的攻略导入RAG知识库

使用方法:
    python RAG/scripts/ingest_user_strategies.py
    python RAG/scripts/ingest_user_strategies.py --update  # 强制更新已存在的攻略
    python RAG/scripts/ingest_user_strategies.py --pokemon Pikachu  # 只导入特定精灵攻略
"""

import json
import sys
import argparse
from pathlib import Path
from typing import List, Optional

# 添加项目路径
PROJECT_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(PROJECT_ROOT))

try:
    from RAG.knowledge_base import KnowledgeBase
    from RAG.config import RAGConfig
except ImportError as e:
    print(f"错误: 无法导入RAG模块: {e}", file=sys.stderr)
    print("请确保在项目根目录运行此脚本", file=sys.stderr)
    sys.exit(1)


def get_user_strategies_dir(config: RAGConfig) -> Path:
    """获取用户攻略目录"""
    strategy_dir = config.data_dir / "raw" / "strategy" / "user"
    strategy_dir.mkdir(parents=True, exist_ok=True)
    return strategy_dir


def load_strategy_files(strategy_dir: Path, pokemon: Optional[str] = None) -> List[Path]:
    """加载攻略文件"""
    strategy_files = []
    
    for file_path in strategy_dir.glob("*.json"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 筛选特定精灵的攻略
            if pokemon:
                strategy_pokemon = data.get('metadata', {}).get('pokemon')
                if not strategy_pokemon or strategy_pokemon.lower() != pokemon.lower():
                    continue
            
            strategy_files.append(file_path)
            
        except Exception as e:
            print(f"警告: 无法读取攻略文件 {file_path}: {e}", file=sys.stderr)
            continue
    
    return strategy_files


def format_strategy_content(strategy_data: dict) -> str:
    """格式化攻略内容为文本"""
    metadata = strategy_data.get('metadata', {})
    data = strategy_data.get('data', {})
    
    pokemon = metadata.get('pokemon')
    title = metadata.get('title', '未命名攻略')
    content = data.get('strategy') or data.get('text', '')
    format_name = metadata.get('format', 'gen9ou')
    
    # 构建格式化的文本
    parts = []
    
    if pokemon:
        parts.append(f"精灵: {pokemon}")
    else:
        parts.append("类型: 全局战术攻略")
    
    parts.append(f"标题: {title}")
    parts.append(f"对战格式: {format_name}")
    parts.append("")
    parts.append("攻略内容:")
    parts.append(content)
    
    return "\n".join(parts)


def ingest_strategies(
    kb: KnowledgeBase,
    strategy_dir: Path,
    pokemon: Optional[str] = None,
    update: bool = False
) -> int:
    """导入攻略到知识库"""
    strategy_files = load_strategy_files(strategy_dir, pokemon)
    
    if not strategy_files:
        print(f"未找到攻略文件{f' (精灵: {pokemon})' if pokemon else ''}")
        return 0
    
    print(f"找到 {len(strategy_files)} 个攻略文件")
    
    ingested_count = 0
    
    for file_path in strategy_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                strategy_data = json.load(f)
            
            metadata = strategy_data.get('metadata', {})
            filename = file_path.name
            
            # 构建元数据
            doc_metadata = {
                "source": "user",
                "type": metadata.get('type', 'strategy'),
                "pokemon": metadata.get('pokemon'),
                "title": metadata.get('title'),
                "format": metadata.get('format', 'gen9ou'),
                "created_at": metadata.get('createdAt'),
                "filename": filename,
                "author": metadata.get('author', 'user')
            }
            
            # 格式化内容
            content = format_strategy_content(strategy_data)
            
            # 检查是否已存在（通过文件名）
            if not update:
                # 简单检查：如果知识库已有相同文件名的文档，跳过
                # 这里可以进一步优化，实际查询知识库
                pass
            
            # 添加到知识库
            print(f"正在导入: {filename} ({metadata.get('title', '未命名')})")
            document_ids = kb.add_text(content, metadata=doc_metadata)
            
            if document_ids:
                ingested_count += 1
                print(f"  ✓ 成功导入 ({len(document_ids)} 个文档块)")
            else:
                print(f"  ✗ 导入失败")
            
        except Exception as e:
            print(f"错误: 导入攻略失败 {file_path}: {e}", file=sys.stderr)
            continue
    
    return ingested_count


def main():
    parser = argparse.ArgumentParser(description="导入用户编写的攻略到RAG知识库")
    parser.add_argument('--update', action='store_true', help='强制更新已存在的攻略')
    parser.add_argument('--pokemon', type=str, help='只导入特定精灵的攻略')
    
    args = parser.parse_args()
    
    try:
        # 初始化知识库
        print("正在初始化RAG知识库...")
        config = RAGConfig()
        kb = KnowledgeBase(config)
        print("✓ 知识库初始化完成")
        
        # 获取攻略目录
        strategy_dir = get_user_strategies_dir(config)
        print(f"攻略目录: {strategy_dir}")
        
        # 导入攻略
        print("\n开始导入攻略...")
        count = ingest_strategies(
            kb=kb,
            strategy_dir=strategy_dir,
            pokemon=args.pokemon,
            update=args.update
        )
        
        print(f"\n✓ 导入完成，共导入 {count} 个攻略")
        
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()


