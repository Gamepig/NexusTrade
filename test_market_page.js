#!/usr/bin/env node

/**
 * 市場頁面功能測試腳本
 */

const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testMarketAPIs() {
  console.log('🧪 測試市場頁面相關 API...\n');

  const tests = [
    { name: '健康檢查', path: '/health' },
    { name: '市場統計', path: '/api/market/stats24h' },
    { name: '熱門貨幣 (5個)', path: '/api/market/trending?limit=5' },
    { name: '批量價格查詢', path: '/api/market/batch-prices?symbols=BTCUSDT,ETHUSDT,BNBUSDT' }
  ];

  for (const test of tests) {
    try {
      console.log(`📊 測試: ${test.name}`);
      const result = await makeRequest(test.path);
      
      if (result.status === 200) {
        if (typeof result.data === 'object' && result.data.success) {
          console.log(`✅ ${test.name}: 成功`);
          
          // 顯示關鍵數據
          if (test.path.includes('stats24h')) {
            const stats = result.data.data;
            console.log(`   📈 總貨幣數: ${stats.totalCoins}, 平均變化: ${stats.avgChange?.toFixed(2)}%`);
          } else if (test.path.includes('trending')) {
            const coins = result.data.data;
            console.log(`   🪙 獲取貨幣數: ${coins.length}個`);
          } else if (test.path.includes('batch-prices')) {
            const prices = result.data.data;
            console.log(`   💰 價格數據: ${Object.keys(prices).length}個交易對`);
          }
        } else {
          console.log(`⚠️ ${test.name}: API 返回成功但數據格式異常`);
          console.log(`   回應: ${JSON.stringify(result.data).substring(0, 100)}...`);
        }
      } else {
        console.log(`❌ ${test.name}: HTTP ${result.status}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
    console.log('');
  }
}

async function testComponentRequirements() {
  console.log('🔧 檢查組件相關需求...\n');
  
  try {
    // 檢查 CryptoCurrencyList 組件
    const fs = require('fs');
    const cryptoListPath = './public/js/components/CryptoCurrencyList.js';
    
    if (fs.existsSync(cryptoListPath)) {
      const stats = fs.statSync(cryptoListPath);
      console.log(`✅ CryptoCurrencyList 組件存在 (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
      console.log('❌ CryptoCurrencyList 組件不存在');
    }
    
    // 檢查主應用程式檔案
    const appPath = './public/js/nexus-app-fixed.js';
    if (fs.existsSync(appPath)) {
      const content = fs.readFileSync(appPath, 'utf8');
      
      const hasLoadMarketData = content.includes('loadMarketData');
      const hasCreateTradingViewWidget = content.includes('createTradingViewWidget');
      const hasMarketStats = content.includes('loadMarketStats');
      
      console.log(`✅ 主應用程式檔案存在`);
      console.log(`   📊 loadMarketData 方法: ${hasLoadMarketData ? '✅' : '❌'}`);
      console.log(`   📈 createTradingViewWidget 方法: ${hasCreateTradingViewWidget ? '✅' : '❌'}`);
      console.log(`   📋 loadMarketStats 方法: ${hasMarketStats ? '✅' : '❌'}`);
    } else {
      console.log('❌ 主應用程式檔案不存在');
    }
    
    console.log('');
  } catch (error) {
    console.log(`❌ 檢查組件時出錯: ${error.message}\n`);
  }
}

async function main() {
  console.log('🚀 NexusTrade 市場頁面整合測試\n');
  console.log('='.repeat(50));
  
  await testComponentRequirements();
  await testMarketAPIs();
  
  console.log('='.repeat(50));
  console.log('✅ 測試完成！');
  console.log('\n📝 後續步驟:');
  console.log('1. 在瀏覽器中打開 http://localhost:3000');
  console.log('2. 點擊導航欄的「市場」頁面');
  console.log('3. 檢查是否顯示 200 個加密貨幣列表');
  console.log('4. 檢查 TradingView Widget 是否正常載入');
  console.log('5. 檢查市場統計數據是否正確顯示');
}

// 執行測試
main().catch(console.error);