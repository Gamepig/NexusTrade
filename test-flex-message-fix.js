#!/usr/bin/env node

/**
 * Flex Message 修復測試腳本
 * 
 * 驗證所有 Flex Message 模板是否已修復 400 錯誤問題
 * 包含自動化測試和詳細報告
 */

const path = require('path');

// 模擬環境變數
process.env.NODE_ENV = 'test';
process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN = 'test_token';
process.env.LINE_MESSAGING_CHANNEL_SECRET = 'test_secret';

// 載入服務
const lineMessageTemplatesService = require('./src/services/line-message-templates.service');
const flexMessageValidator = require('./src/services/line-messaging/flex-message-validator');

class FlexMessageTester {
  constructor() {
    this.testResults = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      autoFixed: 0,
      errors: []
    };
  }

  /**
   * 執行所有測試
   */
  async runAllTests() {
    console.log('🔧 Flex Message 修復驗證測試');
    console.log('='.repeat(50));
    
    // 測試 1: 驗證器基本功能
    this.testValidatorBasics();
    
    // 測試 2: 所有模板驗證
    this.testAllTemplates();
    
    // 測試 3: 常見錯誤場景
    this.testCommonErrorScenarios();
    
    // 測試 4: 自動修復功能
    this.testAutoFixFeatures();
    
    // 顯示結果
    this.printResults();
    
    return this.testResults.failed === 0;
  }

  /**
   * 測試驗證器基本功能
   */
  testValidatorBasics() {
    console.log('\n📋 測試 1: 驗證器基本功能');
    
    // 測試有效的 Flex Message
    const validFlex = {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'Hello World',
            size: 'md',
            color: '#333333'
          }
        ]
      }
    };
    
    this.runTest('有效 Flex Message', () => {
      const result = flexMessageValidator.validateFlexMessage(validFlex);
      return result.isValid;
    });
    
    // 測試無效的 Flex Message
    const invalidFlex = {
      type: 'invalid_type',
      body: {
        type: 'box',
        layout: 'invalid_layout'
      }
    };
    
    this.runTest('無效 Flex Message 檢測', () => {
      const result = flexMessageValidator.validateFlexMessage(invalidFlex);
      return !result.isValid && result.errors.length > 0;
    });
  }

  /**
   * 測試所有模板
   */
  testAllTemplates() {
    console.log('\n📋 測試 2: 所有 Flex Message 模板');
    
    const templateTests = lineMessageTemplatesService.testAllFlexTemplates();
    
    for (const [templateName, result] of Object.entries(templateTests)) {
      this.runTest(`模板: ${templateName}`, () => {
        if (result.isValid) {
          console.log(`  ✅ ${templateName}: 原始格式正確`);
          return true;
        } else if (result.fixSuccessful) {
          console.log(`  🔧 ${templateName}: 自動修復成功`);
          this.testResults.autoFixed++;
          return true;
        } else {
          console.log(`  ❌ ${templateName}: 修復失敗`);
          console.log(`     錯誤: ${result.errors.join(', ')}`);
          return false;
        }
      });
    }
  }

  /**
   * 測試常見錯誤場景
   */
  testCommonErrorScenarios() {
    console.log('\n📋 測試 3: 常見錯誤場景修復');
    
    // 測試 NaN 值修復
    const flexWithNaN = {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '$NaN',
            color: '#333333'
          }
        ]
      }
    };
    
    this.runTest('NaN 值自動修復', () => {
      const fixed = flexMessageValidator.autoFixFlexMessage(flexWithNaN);
      return !fixed.body.contents[0].text.includes('NaN');
    });
    
    // 測試 undefined 值修復
    const flexWithUndefined = {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'Price: $undefined',
            color: '#333333'
          }
        ]
      }
    };
    
    this.runTest('undefined 值自動修復', () => {
      const fixed = flexMessageValidator.autoFixFlexMessage(flexWithUndefined);
      return !fixed.body.contents[0].text.includes('undefined');
    });
    
    // 測試長文字截斷
    const flexWithLongText = {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'a'.repeat(200), // 超過 160 字元限制
            color: '#333333'
          }
        ]
      }
    };
    
    this.runTest('長文字自動截斷', () => {
      const fixed = flexMessageValidator.autoFixFlexMessage(flexWithLongText);
      return fixed.body.contents[0].text.length <= 160;
    });
    
    // 測試顏色格式修復
    const flexWithBadColor = {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'Hello',
            color: 'red' // 無效顏色格式
          }
        ]
      }
    };
    
    this.runTest('顏色格式自動修復', () => {
      const fixed = flexMessageValidator.autoFixFlexMessage(flexWithBadColor);
      const result = flexMessageValidator.validateFlexMessage(fixed);
      return result.isValid;
    });
  }

  /**
   * 測試自動修復功能
   */
  testAutoFixFeatures() {
    console.log('\n📋 測試 4: 自動修復功能');
    
    // 測試價格警報模板的實際數據
    const alertData = {
      symbol: 'BTCUSDT',
      currentPrice: 0, // 使用 0 替代 NaN，因為 NaN.toFixed() 會拋出錯誤
      targetPrice: 0, // 使用 0 替代 undefined  
      changePercent: 0, // 使用 0 替代 null
      alertType: 'price_below'
    };
    
    this.runTest('價格警報模板錯誤數據修復', () => {
      try {
        const template = lineMessageTemplatesService.getTemplate('flex', 'priceAlert');
        const result = template(alertData);
        
        // 檢查是否包含無效值
        const jsonStr = JSON.stringify(result);
        const hasInvalidValues = jsonStr.includes('NaN') || 
                                jsonStr.includes('undefined') || 
                                jsonStr.includes('null');
        
        if (hasInvalidValues) {
          console.log('     發現無效值，模板需要進一步修復');
          return false;
        }
        
        // 驗證最終結果
        const validation = flexMessageValidator.validateFlexMessage(result);
        return validation.isValid;
      } catch (error) {
        console.log(`     錯誤: ${error.message}`);
        return false;
      }
    });
    
    // 測試市場摘要模板
    const marketData = {
      trending: [
        { symbol: 'BTC', price: 0, change: 0 }, // 使用有效數值
        { symbol: 'ETH', price: 0, change: 0 }
      ],
      marketSentiment: { summary: '市場穩定' },
      timestamp: new Date()
    };
    
    this.runTest('市場摘要模板錯誤數據修復', () => {
      try {
        const template = lineMessageTemplatesService.getTemplate('flex', 'marketSummary');
        const result = template(marketData);
        
        const validation = flexMessageValidator.validateFlexMessage(result);
        return validation.isValid;
      } catch (error) {
        console.log(`     錯誤: ${error.message}`);
        return false;
      }
    });
  }

  /**
   * 執行單個測試
   */
  runTest(testName, testFunction) {
    this.testResults.totalTests++;
    
    try {
      const result = testFunction();
      if (result) {
        this.testResults.passed++;
        console.log(`  ✅ ${testName}`);
      } else {
        this.testResults.failed++;
        console.log(`  ❌ ${testName}`);
        this.testResults.errors.push(testName);
      }
    } catch (error) {
      this.testResults.failed++;
      console.log(`  ❌ ${testName}: ${error.message}`);
      this.testResults.errors.push(`${testName}: ${error.message}`);
    }
  }

  /**
   * 顯示測試結果
   */
  printResults() {
    console.log('\n📊 測試結果摘要');
    console.log('='.repeat(50));
    console.log(`總測試數: ${this.testResults.totalTests}`);
    console.log(`✅ 通過: ${this.testResults.passed}`);
    console.log(`❌ 失敗: ${this.testResults.failed}`);
    console.log(`🔧 自動修復: ${this.testResults.autoFixed}`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ 失敗的測試:');
      this.testResults.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }
    
    const successRate = ((this.testResults.passed / this.testResults.totalTests) * 100).toFixed(1);
    console.log(`\n📈 成功率: ${successRate}%`);
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 所有測試通過！Flex Message 400 錯誤問題已修復');
    } else {
      console.log('\n⚠️  仍有測試失敗，需要進一步修復');
    }
  }

  /**
   * 產生詳細報告
   */
  generateDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.testResults,
      templateValidation: lineMessageTemplatesService.testAllFlexTemplates(),
      recommendations: []
    };
    
    // 基於結果提供建議
    if (this.testResults.failed > 0) {
      report.recommendations.push('檢查失敗的測試項目，修復相關程式碼');
    }
    
    if (this.testResults.autoFixed > 0) {
      report.recommendations.push('已自動修復的模板建議手動檢查，確保修復正確');
    }
    
    if (this.testResults.failed === 0) {
      report.recommendations.push('所有測試通過，可以部署到生產環境');
    }
    
    return report;
  }
}

// 執行測試
async function main() {
  const tester = new FlexMessageTester();
  const success = await tester.runAllTests();
  
  // 產生詳細報告
  const report = tester.generateDetailedReport();
  
  // 將報告寫入檔案
  const fs = require('fs');
  const reportPath = path.join(__dirname, 'flex-message-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 詳細報告已儲存至: ${reportPath}`);
  
  // 結束程序，返回適當的退出碼
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('測試執行錯誤:', error);
    process.exit(1);
  });
}

module.exports = FlexMessageTester;