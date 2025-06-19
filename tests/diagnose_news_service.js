#!/usr/bin/env node

/**
 * 新聞服務診斷工具
 * 用於診斷新聞API無法載入的問題
 */

const axios = require('axios');
const xml2js = require('xml2js');

// 測試單個RSS源
async function testRSSSource(source) {
  console.log(`\n🔍 測試 RSS 來源: ${source.name}`);
  console.log(`📡 URL: ${source.url}`);
  
  try {
    const response = await axios.get(source.url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NexusTrade-NewsBot/1.0)'
      }
    });
    
    console.log(`✅ HTTP 狀態: ${response.status}`);
    console.log(`📄 內容長度: ${response.data.length} 字元`);
    
    // 嘗試解析XML
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    
    const items = result.rss?.channel?.[0]?.item || [];
    console.log(`📰 解析到 ${items.length} 則新聞`);
    
    if (items.length > 0) {
      console.log(`📌 第一則新聞: ${items[0].title?.[0] || 'N/A'}`);
      return { success: true, count: items.length, source: source.name };
    }
    
    return { success: false, error: '無新聞項目', source: source.name };
    
  } catch (error) {
    console.log(`❌ 錯誤: ${error.message}`);
    return { success: false, error: error.message, source: source.name };
  }
}

// 測試 NexusTrade 新聞API
async function testNewsAPI() {
  console.log('\n🔍 測試 NexusTrade 新聞 API');
  
  const endpoints = [
    'http://localhost:3000/api/news/latest?limit=3',
    'http://localhost:3000/api/news?limit=3&page=1',
    'http://localhost:3000/health'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 測試: ${endpoint}`);
      const response = await axios.get(endpoint, { timeout: 5000 });
      console.log(`✅ 狀態: ${response.status}`);
      console.log(`📄 回應: ${JSON.stringify(response.data).substring(0, 200)}...`);
    } catch (error) {
      console.log(`❌ 錯誤: ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log(`📄 錯誤詳情: ${JSON.stringify(error.response.data)}`);
      }
    }
  }
}

// 主要診斷函數
async function diagnoseNewsService() {
  console.log('🔧 NexusTrade 新聞服務診斷工具');
  console.log('=====================================');
  
  // RSS 來源列表
  const rssSources = [
    { name: 'CoinTelegraph', url: 'https://cointelegraph.com/rss' },
    { name: 'CryptoSlate', url: 'https://cryptoslate.com/feed/' },
    { name: 'NewsBTC', url: 'https://www.newsbtc.com/feed/' },
    { name: 'CoinDesk', url: 'https://feeds.feedburner.com/CoinDesk' }
  ];
  
  // 測試 RSS 來源
  console.log('\n📡 第一階段: 測試 RSS 來源');
  const results = [];
  
  for (const source of rssSources) {
    const result = await testRSSSource(source);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 避免請求過快
  }
  
  // 測試本地API
  console.log('\n🏠 第二階段: 測試本地 API');
  await testNewsAPI();
  
  // 總結報告
  console.log('\n📊 診斷總結');
  console.log('=====================================');
  
  const successfulSources = results.filter(r => r.success);
  const failedSources = results.filter(r => !r.success);
  
  console.log(`✅ 成功的 RSS 來源: ${successfulSources.length}/${results.length}`);
  successfulSources.forEach(r => {
    console.log(`  - ${r.source}: ${r.count} 則新聞`);
  });
  
  if (failedSources.length > 0) {
    console.log(`❌ 失敗的 RSS 來源: ${failedSources.length}/${results.length}`);
    failedSources.forEach(r => {
      console.log(`  - ${r.source}: ${r.error}`);
    });
  }
  
  // 建議
  console.log('\n💡 建議修復方案:');
  if (failedSources.length === results.length) {
    console.log('  1. 檢查網路連接');
    console.log('  2. 檢查防火牆設定');
    console.log('  3. 考慮使用 Mock 新聞數據');
  } else if (failedSources.length > 0) {
    console.log('  1. 部分 RSS 來源有問題，考慮移除或替換');
    console.log('  2. 增加錯誤處理機制');
  } else {
    console.log('  1. RSS 來源正常，檢查新聞服務邏輯');
    console.log('  2. 檢查 API 速率限制設定');
  }
}

// 執行診斷
if (require.main === module) {
  diagnoseNewsService().catch(console.error);
}

module.exports = { diagnoseNewsService, testRSSSource, testNewsAPI };