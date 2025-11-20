#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
爬取52poke wiki的特性列表
URL: https://wiki.52poke.com/wiki/%E7%89%B9%E6%80%A7%E5%88%97%E8%A1%A8
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

def normalize_ability_id(ability_name_en):
    """标准化特性ID（小写，移除空格和特殊字符）"""
    if not ability_name_en:
        return ''
    return re.sub(r'[^a-z0-9]+', '', ability_name_en.lower())

def scrape_abilities():
    """爬取特性列表"""
    url = 'https://wiki.52poke.com/wiki/%E7%89%B9%E6%80%A7%E5%88%97%E8%A1%A8'
    
    print(f'正在爬取: {url}')
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        response.encoding = 'utf-8'
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 查找特性表格
        # 52poke wiki的特性列表通常在表格中
        tables = soup.find_all('table', class_='wikitable') or soup.find_all('table')
        
        abilities = {}
        
        for table in tables:
            rows = table.find_all('tr')
            
            for row in rows[1:]:  # 跳过表头
                cells = row.find_all(['td', 'th'])
                if len(cells) < 2:
                    continue
                
                # 尝试不同的表格格式
                # 格式1: 中文名 | 英文名 | 描述
                # 格式2: 英文名 | 中文名 | 描述
                
                chinese_name = None
                english_name = None
                
                for i, cell in enumerate(cells):
                    text = cell.get_text(strip=True)
                    
                    # 检查是否是英文名（包含英文字母）
                    if re.match(r'^[A-Za-z\s]+$', text) and len(text) > 1:
                        if not english_name:
                            english_name = text
                    # 检查是否是中文名（包含中文字符）
                    elif re.search(r'[\u4e00-\u9fff]', text):
                        if not chinese_name:
                            chinese_name = text
                
                if english_name and chinese_name:
                    ability_id = normalize_ability_id(english_name)
                    if ability_id:
                        abilities[ability_id] = chinese_name
                        print(f'  [{ability_id}] {english_name} -> {chinese_name}')
        
        # 如果表格方式没找到，尝试查找所有链接
        if not abilities:
            print('  表格方式未找到特性，尝试查找链接...')
            
            # 查找所有指向特性页面的链接
            links = soup.find_all('a', href=re.compile(r'/wiki/.*特性'))
            
            for link in links:
                text = link.get_text(strip=True)
                href = link.get('href', '')
                
                # 提取英文名（通常在title或data-title中）
                title = link.get('title', '') or link.get('data-title', '')
                
                # 如果链接文本是中文，title可能是英文
                if re.search(r'[\u4e00-\u9fff]', text):
                    if title and re.match(r'^[A-Za-z\s]+$', title):
                        ability_id = normalize_ability_id(title)
                        if ability_id and ability_id not in abilities:
                            abilities[ability_id] = text
                            print(f'  [{ability_id}] {title} -> {text}')
        
        # 如果还是没找到，尝试查找div或span中的特性信息
        if not abilities:
            print('  链接方式未找到特性，尝试查找页面内容...')
            
            # 查找所有包含特性的div
            divs = soup.find_all(['div', 'span'], string=re.compile(r'.*特性.*'))
            
            for div in divs:
                text = div.get_text(strip=True)
                # 尝试提取中英文对照
                match = re.search(r'([A-Za-z\s]+)[\s\u3000]*([\u4e00-\u9fff]+)', text)
                if match:
                    english = match.group(1).strip()
                    chinese = match.group(2).strip()
                    ability_id = normalize_ability_id(english)
                    if ability_id and ability_id not in abilities:
                        abilities[ability_id] = chinese
                        print(f'  [{ability_id}] {english} -> {chinese}')
        
        print(f'\n总共找到 {len(abilities)} 个特性')
        
        return abilities
        
    except Exception as e:
        print(f'❌ 爬取失败: {e}')
        import traceback
        traceback.print_exc()
        return {}

def load_pokemon_showdown_abilities():
    """从Pokemon Showdown数据中加载特性列表作为补充"""
    try:
        showdown_path = project_root.parent / 'pokemon-showdown' / 'data' / 'abilities.ts'
        
        if not showdown_path.exists():
            print(f'  Pokemon Showdown abilities.ts 不存在: {showdown_path}')
            return {}
        
        with open(showdown_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 提取特性定义
        # 格式: 'abilityid': { name: 'Ability Name', ... }
        abilities = {}
        pattern = r"'([a-z0-9]+)':\s*{\s*name:\s*'([^']+)'"
        matches = re.findall(pattern, content)
        
        for ability_id, english_name in matches:
            if ability_id not in abilities:
                abilities[ability_id] = english_name  # 临时使用英文，后续会被中文替换
        
        print(f'  从Pokemon Showdown加载了 {len(abilities)} 个特性定义')
        return abilities
        
    except Exception as e:
        print(f'  加载Pokemon Showdown数据失败: {e}')
        return {}

def save_abilities_json(abilities, output_path):
    """保存特性JSON文件"""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 按ID排序
    sorted_abilities = dict(sorted(abilities.items()))
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(sorted_abilities, f, ensure_ascii=False, indent=2)
    
    print(f'\n✅ 已保存到: {output_path}')
    print(f'   共 {len(sorted_abilities)} 个特性')

def main():
    print('=' * 60)
    print('开始爬取52poke wiki特性列表')
    print('=' * 60)
    
    # 爬取特性
    wiki_abilities = scrape_abilities()
    
    # 加载Pokemon Showdown的特性列表作为补充
    showdown_abilities = load_pokemon_showdown_abilities()
    
    # 合并结果（wiki优先）
    final_abilities = {}
    
    # 先添加Showdown的特性（使用英文名）
    for ability_id, english_name in showdown_abilities.items():
        final_abilities[ability_id] = english_name
    
    # 然后用wiki的中文名替换
    for ability_id, chinese_name in wiki_abilities.items():
        final_abilities[ability_id] = chinese_name
    
    if not final_abilities:
        print('\n⚠️  警告: 未找到任何特性数据！')
        print('   可能需要手动检查网页结构或使用其他方式获取数据。')
        return
    
    # 保存到两个位置（兼容性）
    output_paths = [
        project_root / 'data' / 'chinese' / 'abilities.json',
        project_root / 'data' / 'data' / 'chinese' / 'abilities.json'
    ]
    
    for output_path in output_paths:
        save_abilities_json(final_abilities, output_path)
    
    print('\n' + '=' * 60)
    print('爬取完成！')
    print('=' * 60)

if __name__ == '__main__':
    main()

