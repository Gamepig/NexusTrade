#!/usr/bin/env node

/**
 * 測試 LM Studio 移除驗證
 * 不依賴資料庫，只檢查程式碼結構
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 LM Studio 移除驗證測試');
console.log('========================');

const testResults = [];

// 測試 1: 檢查 LM Studio 服務檔案是否已刪除
console.log('\n1. 檢查 LM Studio 服務檔案:');
const lmStudioServicePath = './src/services/lm-studio.service.js';
const lmStudioExists = fs.existsSync(lmStudioServicePath);

if (!lmStudioExists) {
  console.log('✅ LM Studio 服務檔案已成功刪除');
  testResults.push({ test: 'LM Studio 服務檔案刪除', status: 'pass' });
} else {
  console.log('❌ LM Studio 服務檔案仍然存在');
  testResults.push({ test: 'LM Studio 服務檔案刪除', status: 'fail' });
}

// 測試 2: 檢查服務檔案中的 LM Studio 引用
console.log('\n2. 檢查服務檔案中的 LM Studio 引用:');
const serviceFiles = [
  './src/services/ai-currency-analysis.service.js',
  './src/services/ai-analysis.service.js',
  './src/services/ai-homepage-analysis.service.js'
];

let totalReferences = 0;
serviceFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 搜尋 LM Studio 相關關鍵字
    const keywords = [
      'getLMStudioService',
      'lm-studio.service',
      'LM_STUDIO_ENABLED',
      'LM_STUDIO_BASE_URL',
      'lmStudioService',
      'preferLMStudio'
    ];
    
    let fileReferences = 0;
    keywords.forEach(keyword => {
      const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
      fileReferences += matches;
      if (matches > 0) {
        console.log(`   ⚠️ ${path.basename(filePath)}: 找到 ${matches} 個 "${keyword}" 引用`);
      }
    });
    
    if (fileReferences === 0) {
      console.log(`   ✅ ${path.basename(filePath)}: 無 LM Studio 引用`);
    }
    
    totalReferences += fileReferences;
  }
});

if (totalReferences === 0) {
  console.log('✅ 所有服務檔案中的 LM Studio 引用已清除');
  testResults.push({ test: '服務檔案 LM Studio 引用清除', status: 'pass' });
} else {
  console.log(`❌ 仍有 ${totalReferences} 個 LM Studio 引用需要清理`);
  testResults.push({ test: '服務檔案 LM Studio 引用清除', status: 'fail' });
}

// 測試 3: 測試服務類別是否可以正常載入
console.log('\n3. 測試服務類別載入:');
try {
  // 測試不依賴 LM Studio 的服務載入
  const { AICurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');
  const service = new AICurrencyAnalysisService();
  
  // 檢查建構子是否成功
  if (service && service.isConfigured !== undefined) {
    console.log('✅ AI 服務類別可正常載入和實例化');
    testResults.push({ test: 'AI 服務類別載入', status: 'pass' });
  } else {
    console.log('❌ AI 服務類別載入異常');
    testResults.push({ test: 'AI 服務類別載入', status: 'fail' });
  }
} catch (error) {
  console.log('❌ AI 服務類別載入失敗:', error.message);
  testResults.push({ test: 'AI 服務類別載入', status: 'fail' });
}

// 測試 4: 檢查基本方法是否存在且不依賴 LM Studio
console.log('\n4. 測試基本方法可用性:');
try {
  const { AICurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');
  const service = new AICurrencyAnalysisService();
  
  const requiredMethods = [
    'isConfigured',
    'calculateTechnicalIndicators',
    'generateFallbackAnalysis'
  ];
  
  let methodsAvailable = 0;
  requiredMethods.forEach(methodName => {
    if (typeof service[methodName] === 'function') {
      console.log(`   ✅ ${methodName} 方法可用`);
      methodsAvailable++;
    } else {
      console.log(`   ❌ ${methodName} 方法不可用`);
    }
  });
  
  if (methodsAvailable === requiredMethods.length) {
    console.log('✅ 所有必要方法都可用');
    testResults.push({ test: '基本方法可用性', status: 'pass' });
  } else {
    console.log(`❌ ${requiredMethods.length - methodsAvailable} 個方法不可用`);
    testResults.push({ test: '基本方法可用性', status: 'fail' });
  }
} catch (error) {
  console.log('❌ 方法可用性測試失敗:', error.message);
  testResults.push({ test: '基本方法可用性', status: 'fail' });
}

// 總結測試結果
console.log('\n========================');
console.log('測試結果總結:');
console.log('========================');

const passedTests = testResults.filter(r => r.status === 'pass').length;
const totalTests = testResults.length;

testResults.forEach(result => {
  const icon = result.status === 'pass' ? '✅' : '❌';
  console.log(`${icon} ${result.test}: ${result.status.toUpperCase()}`);
});

console.log(`\n通過率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);

if (passedTests === totalTests) {
  console.log('\n🎉 所有測試通過！LM Studio 已成功移除');
  console.log('✅ 系統現在只使用 OpenRouter API，避免了本地端 AI 服務依賴問題');
} else {
  console.log('\n⚠️ 部分測試失敗，請檢查剩餘的 LM Studio 依賴');
}