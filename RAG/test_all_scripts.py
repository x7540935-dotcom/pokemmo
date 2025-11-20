#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试所有 RAG 知识库搭建脚本并收集错误
"""
import sys
import traceback
import subprocess
from pathlib import Path
from datetime import datetime

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

errors = []

def run_script_with_error_capture(script_path, description, args=None):
    """运行脚本并捕获所有输出和错误"""
    global errors
    
    print(f"\n{'='*80}")
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 运行: {description}")
    print(f"脚本路径: {script_path}")
    print(f"{'='*80}")
    
    if not script_path.exists():
        error_info = {
            'script': str(script_path),
            'description': description,
            'error_type': 'FileNotFoundError',
            'error_message': f'脚本文件不存在: {script_path}',
            'traceback': '',
            'stdout': '',
            'stderr': ''
        }
        errors.append(error_info)
        print(f"❌ 脚本文件不存在")
        return False
    
    try:
        # 构建命令
        cmd = [sys.executable, str(script_path)]
        if args:
            cmd.extend(args)
        
        # 运行脚本并捕获输出
        result = subprocess.run(
            cmd,
            cwd=str(script_path.parent),
            capture_output=True,
            text=True,
            timeout=300,  # 5分钟超时
            encoding='utf-8',
            errors='replace'
        )
        
        # 打印输出
        if result.stdout:
            print("STDOUT:")
            print(result.stdout)
        if result.stderr:
            print("STDERR:")
            print(result.stderr)
        
        if result.returncode != 0:
            error_info = {
                'script': str(script_path),
                'description': description,
                'error_type': 'ScriptExecutionError',
                'error_message': f'脚本返回非零退出码: {result.returncode}',
                'traceback': '',
                'stdout': result.stdout,
                'stderr': result.stderr
            }
            errors.append(error_info)
            print(f"❌ 脚本执行失败，退出码: {result.returncode}")
            return False
        else:
            print(f"✅ 脚本执行成功")
            return True
            
    except subprocess.TimeoutExpired:
        error_info = {
            'script': str(script_path),
            'description': description,
            'error_type': 'TimeoutError',
            'error_message': '脚本执行超时（超过5分钟）',
            'traceback': '',
            'stdout': '',
            'stderr': ''
        }
        errors.append(error_info)
        print(f"❌ 脚本执行超时")
        return False
        
    except Exception as e:
        error_info = {
            'script': str(script_path),
            'description': description,
            'error_type': type(e).__name__,
            'error_message': str(e),
            'traceback': traceback.format_exc(),
            'stdout': '',
            'stderr': ''
        }
        errors.append(error_info)
        print(f"❌ 运行脚本时发生异常: {type(e).__name__}: {str(e)}")
        return False

def test_import():
    """测试能否导入 KnowledgeBase"""
    print(f"\n{'='*80}")
    print("测试: 导入 KnowledgeBase")
    print(f"{'='*80}")
    
    try:
        from RAG.knowledge_base import KnowledgeBase
        from RAG.config import RAGConfig
        print("✅ KnowledgeBase 导入成功")
        return True
    except Exception as e:
        error_info = {
            'script': 'import test',
            'description': '导入 KnowledgeBase',
            'error_type': type(e).__name__,
            'error_message': str(e),
            'traceback': traceback.format_exc(),
            'stdout': '',
            'stderr': ''
        }
        errors.append(error_info)
        print(f"❌ 导入失败: {type(e).__name__}: {str(e)}")
        print(f"详细堆栈:\n{traceback.format_exc()}")
        return False

def main():
    """主函数"""
    global errors
    
    print("="*80)
    print("RAG 知识库搭建脚本测试")
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    # 1. 测试导入
    if not test_import():
        print("\n⚠️ 导入失败，无法继续运行脚本")
    
    # 2. 确定脚本目录
    root_scripts_dir = project_root / "RAG" / "scripts"
    pm_scripts_dir = project_root / "pokemmo myself" / "RAG" / "scripts"
    
    scripts_to_run = []
    
    # 3. ingest_showdown_data.py
    showdown_script = root_scripts_dir / "ingest_showdown_data.py"
    if showdown_script.exists():
        scripts_to_run.append((showdown_script, "导入 Pokemon Showdown 基础数据"))
    else:
        print(f"\n⚠️ 未找到脚本: {showdown_script}")
    
    # 4. ingest_smogon_analyses.py
    smogon_script = root_scripts_dir / "ingest_smogon_analyses.py"
    if smogon_script.exists():
        # 只测试一个宝可梦，避免运行时间过长
        scripts_to_run.append((smogon_script, "导入 Smogon 对战分析（测试模式）", ["--pokemon", "pikachu"]))
    else:
        print(f"\n⚠️ 未找到脚本: {smogon_script}")
    
    # 5. build_index.py
    build_index_script = pm_scripts_dir / "build_index.py"
    data_dir = project_root / "pokemmo myself" / "RAG" / "data" / "raw"
    if build_index_script.exists() and data_dir.exists():
        # 只构建一个小测试
        scripts_to_run.append((build_index_script, "构建索引（测试模式）", [str(data_dir)]))
    
    if not scripts_to_run:
        print("\n⚠️ 未找到可运行的脚本")
        return
    
    # 运行所有脚本
    print(f"\n找到 {len(scripts_to_run)} 个脚本，开始运行...\n")
    
    for script_info in scripts_to_run:
        if len(script_info) == 2:
            script_path, description = script_info
            args = None
        else:
            script_path, description, args = script_info
        
        run_script_with_error_capture(script_path, description, args)
    
    # 输出错误总结
    print(f"\n{'='*80}")
    print("错误总结")
    print(f"{'='*80}")
    
    if errors:
        print(f"\n共发现 {len(errors)} 个错误:\n")
        
        # 将错误写入文件
        error_file = project_root / "RAG_知识库搭建错误报告.txt"
        with open(error_file, 'w', encoding='utf-8') as f:
            f.write(f"RAG 知识库搭建错误报告\n")
            f.write(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"{'='*80}\n\n")
            
            for i, error in enumerate(errors, 1):
                f.write(f"{'='*80}\n")
                f.write(f"错误 #{i}\n")
                f.write(f"{'='*80}\n")
                f.write(f"脚本: {error['script']}\n")
                f.write(f"描述: {error['description']}\n")
                f.write(f"错误类型: {error['error_type']}\n")
                f.write(f"错误信息: {error['error_message']}\n")
                if error['traceback']:
                    f.write(f"\n详细堆栈:\n{error['traceback']}\n")
                if error['stdout']:
                    f.write(f"\n标准输出:\n{error['stdout']}\n")
                if error['stderr']:
                    f.write(f"\n标准错误:\n{error['stderr']}\n")
                f.write("\n\n")
        
        print(f"详细错误报告已保存到: {error_file}\n")
        
        # 在控制台输出简化的错误信息
        for i, error in enumerate(errors, 1):
            print(f"{'='*80}")
            print(f"错误 #{i}")
            print(f"{'='*80}")
            print(f"脚本: {error['script']}")
            print(f"描述: {error['description']}")
            print(f"错误类型: {error['error_type']}")
            print(f"错误信息: {error['error_message']}")
            if error['traceback']:
                print(f"\n详细堆栈:\n{error['traceback']}")
            if error['stderr']:
                # 只显示最后几行错误信息
                stderr_lines = error['stderr'].split('\n')
                if len(stderr_lines) > 20:
                    print(f"\n标准错误（最后20行）:\n")
                    print('\n'.join(stderr_lines[-20:]))
                else:
                    print(f"\n标准错误:\n{error['stderr']}")
            print()
    else:
        print("✅ 所有脚本执行成功，未发现错误！")
    
    print(f"\n结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)

if __name__ == "__main__":
    main()

