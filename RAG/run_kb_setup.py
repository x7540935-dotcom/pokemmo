#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
运行 RAG 知识库搭建脚本并收集所有错误
"""
import sys
import traceback
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

errors = []

def run_script(script_path, description):
    """运行脚本并收集错误"""
    global errors
    print(f"\n{'='*60}")
    print(f"运行: {description}")
    print(f"脚本: {script_path}")
    print(f"{'='*60}")
    
    try:
        # 尝试导入并运行脚本
        import importlib.util
        spec = importlib.util.spec_from_file_location("script", script_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        if hasattr(module, 'main'):
            module.main()
            print(f"✅ {description} 执行成功")
        else:
            print(f"⚠️ {description} 脚本没有 main() 函数")
            
    except Exception as e:
        error_info = {
            'script': str(script_path),
            'description': description,
            'error_type': type(e).__name__,
            'error_message': str(e),
            'traceback': traceback.format_exc()
        }
        errors.append(error_info)
        print(f"❌ {description} 执行失败")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        print(f"详细堆栈:\n{traceback.format_exc()}")

def main():
    """主函数"""
    global errors
    
    # 确定脚本目录
    scripts_dir = Path(__file__).parent / "scripts"
    root_scripts_dir = project_root / "RAG" / "scripts"
    
    # 要运行的脚本列表
    scripts_to_run = [
        # (脚本路径, 描述)
    ]
    
    # 检查是否存在 ingest_showdown_data.py
    showdown_script = root_scripts_dir / "ingest_showdown_data.py"
    if showdown_script.exists():
        scripts_to_run.append((showdown_script, "导入 Pokemon Showdown 基础数据"))
    
    # 检查是否存在 ingest_smogon_analyses.py
    smogon_script = root_scripts_dir / "ingest_smogon_analyses.py"
    if smogon_script.exists():
        scripts_to_run.append((smogon_script, "导入 Smogon 对战分析"))
    
    # 检查是否存在 build_index.py
    build_index_script = scripts_dir / "build_index.py"
    if build_index_script.exists():
        # 检查是否有数据目录
        data_dir = Path(__file__).parent.parent / "RAG" / "data" / "raw"
        if data_dir.exists():
            scripts_to_run.append((build_index_script, f"构建索引（从 {data_dir}）"))
    
    if not scripts_to_run:
        print("未找到可运行的脚本")
        return
    
    print("="*60)
    print("开始运行 RAG 知识库搭建脚本")
    print("="*60)
    
    for script_path, description in scripts_to_run:
        run_script(script_path, description)
    
    # 输出错误总结
    print(f"\n{'='*60}")
    print("错误总结")
    print(f"{'='*60}")
    
    if errors:
        print(f"\n共发现 {len(errors)} 个错误:\n")
        for i, error in enumerate(errors, 1):
            print(f"{'='*60}")
            print(f"错误 #{i}")
            print(f"{'='*60}")
            print(f"脚本: {error['script']}")
            print(f"描述: {error['description']}")
            print(f"错误类型: {error['error_type']}")
            print(f"错误信息: {error['error_message']}")
            print(f"\n详细堆栈:")
            print(error['traceback'])
            print()
    else:
        print("✅ 所有脚本执行成功，未发现错误！")

if __name__ == "__main__":
    main()

