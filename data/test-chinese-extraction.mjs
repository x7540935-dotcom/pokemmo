#!/usr/bin/env node
/**
 * 测试中文名称提取功能
 * 用于验证脚本是否能正确从52poke百科提取中文名称
 */

import fetch from 'node-fetch';

const API_BASE = 'https://wiki.52poke.com/api.php';

async function callAPI(params) {
  const url = new URL(API_BASE);
  Object.keys(params).forEach(key => {
    url.searchParams.append(key, params[key]);
  });

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API调用失败: ${error.message}`);
    return null;
  }
}

async function testExtraction(englishName) {
  console.log(`\n测试: ${englishName}`);
  console.log('='.repeat(60));

  // 搜索页面
  const searchData = await callAPI({
    action: 'opensearch',
    format: 'json',
    search: englishName,
    namespace: '0',
    limit: '5'
  });

  if (!searchData || !searchData[1] || searchData[1].length === 0) {
    console.log('❌ 未找到页面');
    return;
  }

  console.log(`找到 ${searchData[1].length} 个页面:`);
  searchData[1].forEach((title, index) => {
    console.log(`  ${index + 1}. ${title}`);
  });

  // 获取第一个页面的内容
  const title = searchData[1][0];
  console.log(`\n获取页面内容: ${title}`);

  const pageData = await callAPI({
    action: 'query',
    format: 'json',
    prop: 'revisions',
    rvprop: 'content',
    titles: title,
    rvslots: 'main'
  });

  if (pageData && pageData.query && pageData.query.pages) {
    const page = Object.values(pageData.query.pages)[0];
    if (page && page.revisions && page.revisions[0]) {
      const content = page.revisions[0].slots.main['*'];
      
      // 查找模板
      const templateMatch = content.match(/\{\{Pokémon[^}]*\}\}/i) || 
                           content.match(/\{\{Pokémon[\s\S]*?\}\}/i);
      
      if (templateMatch) {
        console.log('\n找到模板:');
        console.log(templateMatch[0].substring(0, 500));
        
        // 提取name3
        const name3Match = templateMatch[0].match(/name3\s*=\s*([^|\n}]+)/i);
        if (name3Match) {
          console.log(`\n✅ 提取到中文名称: ${name3Match[1].trim()}`);
        } else {
          console.log('\n❌ 未找到name3参数');
        }
      } else {
        console.log('\n❌ 未找到Pokémon模板');
        console.log('页面内容前500字符:');
        console.log(content.substring(0, 500));
      }
    }
  }
}

// 测试几个宝可梦
async function main() {
  console.log('测试中文名称提取功能\n');
  
  await testExtraction('Weedle');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testExtraction('Pidgey');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testExtraction('Rattata');
}

main().catch(console.error);

