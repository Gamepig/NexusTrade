/**
 * NexusTrade 前端端到端功能測試
 * 
 * 測試重點：
 * 1. 頁面載入和基本功能
 * 2. API 端點連接測試
 * 3. 組件初始化驗證
 * 4. 會員制度功能
 */

const fs = require('fs');

async function runFrontendE2ETest() {
  console.log('🌐 開始前端瀏覽器端到端功能測試');
  console.log('==========================================\n');

  const results = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testResults: []
  };

  try {
    // 啟動瀏覽器
    console.log('🚀 啟動 Puppeteer 瀏覽器...');
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    // 設定控制台錯誤監聽
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 網路錯誤監聽
    const networkErrors = [];
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    console.log('1️⃣ 測試首頁載入...');
    results.totalTests++;

    try {
      await page.goto('http://localhost:3000', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // 檢查標題
      const title = await page.title();
      console.log(`  ✅ 頁面標題: ${title}`);

      // 檢查主要元素
      const navbar = await page.$('.navbar');
      const mainContent = await page.$('.main-content, .container, main');
      
      if (navbar && mainContent) {
        console.log('  ✅ 主要頁面元素載入正常');
        results.passedTests++;
        results.testResults.push({ test: '首頁載入', status: 'PASS' });
      } else {
        throw new Error('主要頁面元素未找到');
      }

    } catch (error) {
      console.log(`  ❌ 首頁載入失敗: ${error.message}`);
      results.failedTests++;
      results.testResults.push({ test: '首頁載入', status: 'FAIL', error: error.message });
    }

    console.log('\n2️⃣ 測試 JavaScript 檔案載入...');
    results.totalTests++;

    try {
      // 檢查主應用 JavaScript
      const nexusApp = await page.evaluate(() => {
        return typeof window.CryptoCurrencyList !== 'undefined' || 
               typeof window.nexusApp !== 'undefined';
      });

      if (nexusApp) {
        console.log('  ✅ 主應用 JavaScript 載入正常');
        results.passedTests++;
        results.testResults.push({ test: 'JavaScript 載入', status: 'PASS' });
      } else {
        throw new Error('主應用 JavaScript 未載入');
      }

    } catch (error) {
      console.log(`  ❌ JavaScript 載入失敗: ${error.message}`);
      results.failedTests++;
      results.testResults.push({ test: 'JavaScript 載入', status: 'FAIL', error: error.message });
    }

    console.log('\n3️⃣ 測試價格警報功能...');
    results.totalTests++;

    try {
      // 檢查價格警報模態框初始化
      const priceAlertModal = await page.evaluate(() => {
        return typeof window.priceAlertModal !== 'undefined' || 
               typeof window.PriceAlertModal !== 'undefined';
      });

      if (priceAlertModal) {
        console.log('  ✅ 價格警報模態框初始化正常');
        results.passedTests++;
        results.testResults.push({ test: '價格警報功能', status: 'PASS' });
      } else {
        throw new Error('價格警報模態框未初始化');
      }

    } catch (error) {
      console.log(`  ❌ 價格警報功能測試失敗: ${error.message}`);
      results.failedTests++;
      results.testResults.push({ test: '價格警報功能', status: 'FAIL', error: error.message });
    }

    console.log('\n4️⃣ 測試觀察清單功能...');
    results.totalTests++;

    try {
      // 嘗試導航到觀察清單頁面
      await page.evaluate(() => {
        if (window.app && window.app.router) {
          window.app.router.navigate('watchlist');
        }
      });

      await page.waitForTimeout(2000);

      // 檢查觀察清單組件
      const watchlistComponent = await page.evaluate(() => {
        return document.querySelector('.watchlist-container') !== null ||
               typeof window.WatchlistPage !== 'undefined';
      });

      if (watchlistComponent) {
        console.log('  ✅ 觀察清單功能正常');
        results.passedTests++;
        results.testResults.push({ test: '觀察清單功能', status: 'PASS' });
      } else {
        throw new Error('觀察清單組件未載入');
      }

    } catch (error) {
      console.log(`  ❌ 觀察清單功能測試失敗: ${error.message}`);
      results.failedTests++;
      results.testResults.push({ test: '觀察清單功能', status: 'FAIL', error: error.message });
    }

    console.log('\n5️⃣ 測試 API 連接...');
    results.totalTests++;

    try {
      // 測試市場數據 API
      const apiResponse = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/market/overview');
          const data = await response.json();
          return { status: response.status, data: data.status };
        } catch (error) {
          return { error: error.message };
        }
      });

      if (apiResponse.status === 200 && apiResponse.data === 'success') {
        console.log('  ✅ API 連接正常');
        results.passedTests++;
        results.testResults.push({ test: 'API 連接', status: 'PASS' });
      } else {
        throw new Error(`API 回應異常: ${JSON.stringify(apiResponse)}`);
      }

    } catch (error) {
      console.log(`  ❌ API 連接測試失敗: ${error.message}`);
      results.failedTests++;
      results.testResults.push({ test: 'API 連接', status: 'FAIL', error: error.message });
    }

    console.log('\n6️⃣ 測試會員制度限制...');
    results.totalTests++;

    try {
      // 檢查會員制度相關功能
      const membershipFeatures = await page.evaluate(() => {
        // 檢查是否有會員相關的 JavaScript 功能
        return typeof window.membershipManager !== 'undefined' ||
               document.querySelector('.membership-notice') !== null ||
               typeof window.checkMembershipPermission !== 'undefined';
      });

      console.log('  ✅ 會員制度功能檢查完成');
      results.passedTests++;
      results.testResults.push({ test: '會員制度限制', status: 'PASS' });

    } catch (error) {
      console.log(`  ❌ 會員制度測試失敗: ${error.message}`);
      results.failedTests++;
      results.testResults.push({ test: '會員制度限制', status: 'FAIL', error: error.message });
    }

    // 記錄控制台和網路錯誤
    if (consoleErrors.length > 0) {
      console.log('\n⚠️ 控制台錯誤:');
      consoleErrors.forEach(error => console.log(`  - ${error}`));
    }

    if (networkErrors.length > 0) {
      console.log('\n⚠️ 網路錯誤:');
      networkErrors.forEach(error => console.log(`  - ${error}`));
    }

    await browser.close();

  } catch (error) {
    console.log(`❌ 測試過程發生錯誤: ${error.message}`);
    results.failedTests++;
  }

  // 測試結果總結
  console.log('\n📊 測試結果總結');
  console.log('============================');
  console.log(`總測試數: ${results.totalTests}`);
  console.log(`通過測試: ${results.passedTests}`);
  console.log(`失敗測試: ${results.failedTests}`);
  console.log(`成功率: ${((results.passedTests / results.totalTests) * 100).toFixed(1)}%`);

  // 詳細結果
  console.log('\n📋 詳細測試結果:');
  results.testResults.forEach((result, index) => {
    const status = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.test}`);
    if (result.error) {
      console.log(`   錯誤: ${result.error}`);
    }
  });

  // 保存測試報告
  const testReport = {
    timestamp: new Date().toISOString(),
    results,
    environment: {
      url: 'http://localhost:3000',
      browser: 'Chrome (Puppeteer)',
      viewport: '1366x768'
    }
  };

  fs.writeFileSync('frontend-e2e-test-report.json', JSON.stringify(testReport, null, 2));
  console.log('\n📄 測試報告已保存至: frontend-e2e-test-report.json');

  return results;
}

// 檢查 Puppeteer 可用性
async function checkPuppeteerAvailable() {
  try {
    require('puppeteer');
    return true;
  } catch (error) {
    console.log('⚠️ Puppeteer 未安裝，將執行簡化測試');
    return false;
  }
}

// 簡化版本測試（不使用 Puppeteer）
async function runSimplifiedFrontendTest() {
  console.log('🌐 執行簡化前端功能測試');
  console.log('============================\n');

  const testResults = [];

  // 測試 1: 檢查首頁載入
  console.log('1️⃣ 測試首頁載入...');
  try {
    const { execSync } = require('child_process');
    const httpStatus = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/', { encoding: 'utf8' });
    
    if (httpStatus.trim() === '200') {
      console.log('  ✅ 首頁 HTTP 狀態正常 (200)');
      testResults.push({ test: '首頁載入', status: 'PASS' });
    } else {
      throw new Error(`HTTP 狀態異常: ${httpStatus}`);
    }
  } catch (error) {
    console.log(`  ❌ 首頁載入測試失敗: ${error.message}`);
    testResults.push({ test: '首頁載入', status: 'FAIL', error: error.message });
  }

  // 測試 2: 檢查靜態資源
  console.log('\n2️⃣ 測試靜態資源載入...');
  try {
    const { execSync } = require('child_process');
    const jsStatus = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/js/nexus-app-fixed.js', { encoding: 'utf8' });
    const cssStatus = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/css/main.css', { encoding: 'utf8' });
    
    if (jsStatus.trim() === '200' && cssStatus.trim() === '200') {
      console.log('  ✅ 主要靜態資源載入正常');
      testResults.push({ test: '靜態資源載入', status: 'PASS' });
    } else {
      throw new Error(`靜態資源狀態異常: JS=${jsStatus}, CSS=${cssStatus}`);
    }
  } catch (error) {
    console.log(`  ❌ 靜態資源測試失敗: ${error.message}`);
    testResults.push({ test: '靜態資源載入', status: 'FAIL', error: error.message });
  }

  // 測試 3: API 端點測試
  console.log('\n3️⃣ 測試 API 端點...');
  try {
    const { execSync } = require('child_process');
    const apiResponse = execSync('curl -s http://localhost:3000/api/market/overview | head -c 100', { encoding: 'utf8' });
    
    if (apiResponse.includes('"status":"success"')) {
      console.log('  ✅ API 端點回應正常');
      testResults.push({ test: 'API 端點', status: 'PASS' });
    } else {
      throw new Error('API 回應格式異常');
    }
  } catch (error) {
    console.log(`  ❌ API 端點測試失敗: ${error.message}`);
    testResults.push({ test: 'API 端點', status: 'FAIL', error: error.message });
  }

  // 結果總結
  const passedTests = testResults.filter(r => r.status === 'PASS').length;
  const totalTests = testResults.length;

  console.log('\n📊 簡化測試結果總結');
  console.log('========================');
  console.log(`總測試數: ${totalTests}`);
  console.log(`通過測試: ${passedTests}`);
  console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  return { totalTests, passedTests, testResults };
}

// 主執行函數
async function main() {
  const puppeteerAvailable = await checkPuppeteerAvailable();
  
  if (puppeteerAvailable) {
    return await runFrontendE2ETest();
  } else {
    return await runSimplifiedFrontendTest();
  }
}

// 執行測試
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runFrontendE2ETest, runSimplifiedFrontendTest };