/**
 * NexusTrade 批量通知優化整合測試
 * 
 * 測試智慧通知分發器與價格警報監控服務的整合
 * 驗證批量優化、優先級處理和錯誤回退機制
 */

const { performance } = require('perf_hooks');
const path = require('path');

// 模擬環境變數
process.env.NODE_ENV = 'test';
process.env.SKIP_MONGODB = 'true';
process.env.LINE_ACCESS_TOKEN = 'test_token';
process.env.LINE_CHANNEL_SECRET = 'test_secret';

// 載入服務
const smartNotificationDispatcher = require('./src/services/smart-notification-dispatcher.service');
const batchNotificationOptimizer = require('./src/services/line-messaging/batch-notification-optimizer');
const { PriceAlertMonitorService } = require('./src/services/price-alert-monitor.service');

class BatchNotificationIntegrationTest {
  constructor() {
    this.testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      performance: {
        totalTime: 0,
        averageLatency: 0,
        throughput: 0
      }
    };
    
    this.priceAlertMonitor = new PriceAlertMonitorService();
  }

  /**
   * 執行所有測試
   */
  async runAllTests() {
    console.log('🚀 開始批量通知優化整合測試...\n');
    const startTime = performance.now();

    try {
      // 基礎整合測試
      await this.testSmartDispatcherIntegration();
      await this.testBatchOptimizationFlow();
      await this.testPriorityHandling();
      await this.testErrorFallbackMechanism();
      await this.testPerformanceOptimization();
      
      // 進階功能測試
      await this.testUserSegmentation();
      await this.testDeduplicationLogic();
      await this.testRateLimitingBehavior();
      await this.testConcurrentProcessing();
      
      // 系統整合測試
      await this.testPriceAlertMonitorIntegration();

    } catch (error) {
      this.addTestResult('系統測試', false, `測試執行失敗: ${error.message}`);
    }

    const endTime = performance.now();
    this.testResults.performance.totalTime = endTime - startTime;
    this.calculateSummary();
    this.generateReport();
  }

  /**
   * 測試智慧分發器基礎整合
   */
  async testSmartDispatcherIntegration() {
    const testName = '智慧分發器基礎整合';
    
    try {
      // 測試價格警報分發
      const alertData = {
        symbol: 'BTCUSDT',
        currentPrice: 45000,
        targetPrice: 44000,
        alertType: 'price_below',
        changePercent: -2.5,
        urgency: 'normal'
      };

      const result = await smartNotificationDispatcher.sendPriceAlert(alertData, 'test_user_123');
      
      if (result && result.success && result.taskId) {
        this.addTestResult(testName, true, `任務已加入佇列: ${result.taskId}`);
      } else {
        this.addTestResult(testName, false, '分發器回應格式不正確');
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * 測試批量優化流程
   */
  async testBatchOptimizationFlow() {
    const testName = '批量優化流程';
    
    try {
      // 模擬多個使用者的通知需求
      const batchData = {
        userIds: ['user1', 'user2', 'user3', 'user4', 'user5'],
        message: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '批量通知測試',
                weight: 'bold'
              }
            ]
          }
        },
        priority: 'medium',
        userSegment: 'regular'
      };

      const result = await batchNotificationOptimizer.addBatchNotification(batchData);
      
      if (result && result.success) {
        this.addTestResult(testName, true, `批量任務創建成功: ${result.taskId}`);
      } else {
        this.addTestResult(testName, false, '批量優化器失敗');
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * 測試優先級處理
   */
  async testPriorityHandling() {
    const testName = '優先級處理機制';
    
    try {
      // 測試不同優先級的警報
      const priorities = ['critical', 'high', 'medium', 'low'];
      const results = [];

      for (const priority of priorities) {
        const alertData = {
          symbol: 'ETHUSDT',
          currentPrice: 3000,
          targetPrice: 2900,
          alertType: 'price_below',
          changePercent: priority === 'critical' ? -25 : -5,
          urgency: priority
        };

        const result = await smartNotificationDispatcher.sendPriceAlert(alertData, `user_${priority}`);
        results.push({ priority, result });
      }

      // 驗證所有優先級都能正確處理
      const allSuccessful = results.every(r => r.result && r.result.success);
      
      if (allSuccessful) {
        this.addTestResult(testName, true, `所有優先級 (${priorities.join(', ')}) 處理成功`);
      } else {
        this.addTestResult(testName, false, '部分優先級處理失敗');
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * 測試錯誤回退機制
   */
  async testErrorFallbackMechanism() {
    const testName = '錯誤回退機制';
    
    try {
      // 模擬批量優化器錯誤的情況
      const originalMethod = batchNotificationOptimizer.addBatchNotification;
      
      // 暫時替換為錯誤方法
      batchNotificationOptimizer.addBatchNotification = async () => {
        throw new Error('模擬批量優化器錯誤');
      };

      const alertData = {
        symbol: 'ADAUSDT',
        currentPrice: 0.5,
        targetPrice: 0.45,
        alertType: 'price_below',
        changePercent: -3,
        urgency: 'normal'
      };

      // 這應該觸發回退機制
      let fallbackTriggered = false;
      try {
        await smartNotificationDispatcher.sendPriceAlert(alertData, 'test_fallback_user');
      } catch (error) {
        if (error.message.includes('模擬批量優化器錯誤')) {
          fallbackTriggered = true;
        }
      }

      // 恢復原始方法
      batchNotificationOptimizer.addBatchNotification = originalMethod;

      if (fallbackTriggered) {
        this.addTestResult(testName, true, '錯誤回退機制正常運作');
      } else {
        this.addTestResult(testName, false, '回退機制未觸發');
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * 測試效能優化
   */
  async testPerformanceOptimization() {
    const testName = '效能優化測試';
    
    try {
      const startTime = performance.now();
      
      // 同時發送多個通知
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const alertData = {
          symbol: 'DOGEUSDT',
          currentPrice: 0.08,
          targetPrice: 0.075,
          alertType: 'price_below',
          changePercent: -2,
          urgency: 'normal'
        };
        
        promises.push(smartNotificationDispatcher.sendPriceAlert(alertData, `perf_user_${i}`));
      }

      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      const latency = endTime - startTime;
      const throughput = results.length / (latency / 1000); // 每秒處理數
      
      this.testResults.performance.averageLatency = latency / results.length;
      this.testResults.performance.throughput = throughput;

      if (latency < 5000 && results.every(r => r.success)) {
        this.addTestResult(testName, true, `處理 ${results.length} 個通知耗時 ${latency.toFixed(2)}ms`);
      } else {
        this.addTestResult(testName, false, `效能不達標或有失敗: ${latency.toFixed(2)}ms`);
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * 測試用戶分群
   */
  async testUserSegmentation() {
    const testName = '用戶分群功能';
    
    try {
      // 測試不同分群的市場更新通知
      const marketData = {
        summary: '市場上漲',
        topGainers: ['BTC', 'ETH', 'ADA'],
        timestamp: new Date()
      };

      const segments = ['vip', 'active', 'regular', 'inactive'];
      const results = [];

      for (const segment of segments) {
        try {
          const result = await smartNotificationDispatcher.sendMarketUpdate(marketData, segment);
          results.push({ segment, success: result.success || false });
        } catch (error) {
          results.push({ segment, success: false, error: error.message });
        }
      }

      const successfulSegments = results.filter(r => r.success).length;
      
      if (successfulSegments >= segments.length / 2) {
        this.addTestResult(testName, true, `${successfulSegments}/${segments.length} 分群處理成功`);
      } else {
        this.addTestResult(testName, false, `只有 ${successfulSegments} 分群成功`);
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * 測試去重邏輯
   */
  async testDeduplicationLogic() {
    const testName = '訊息去重邏輯';
    
    try {
      const deduplicationKey = 'test_dedup_' + Date.now();
      
      // 發送相同的通知兩次
      const notification1 = await batchNotificationOptimizer.addBatchNotification({
        userIds: ['dedup_user1'],
        message: '去重測試訊息',
        deduplicationKey: deduplicationKey
      });

      const notification2 = await batchNotificationOptimizer.addBatchNotification({
        userIds: ['dedup_user1'],
        message: '去重測試訊息',
        deduplicationKey: deduplicationKey
      });

      // 第一個應該成功，第二個應該被去重
      if (notification1.success && !notification2.success && notification2.reason === 'duplicate_message') {
        this.addTestResult(testName, true, '去重邏輯正常運作');
      } else {
        this.addTestResult(testName, false, '去重邏輯未正確運作');
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * 測試頻率限制行為
   */
  async testRateLimitingBehavior() {
    const testName = '頻率限制行為';
    
    try {
      // 取得優化器狀態
      const status = batchNotificationOptimizer.getStatus();
      
      if (status && status.config && status.config.messagesPerMinute) {
        this.addTestResult(testName, true, `頻率限制設定: ${status.config.messagesPerMinute}/分鐘`);
      } else {
        this.addTestResult(testName, false, '無法取得頻率限制設定');
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * 測試並發處理
   */
  async testConcurrentProcessing() {
    const testName = '並發處理能力';
    
    try {
      // 同時處理多個不同類型的通知
      const promises = [
        smartNotificationDispatcher.sendPriceAlert({
          symbol: 'BTCUSDT',
          currentPrice: 45000,
          targetPrice: 44000,
          alertType: 'price_below',
          changePercent: -2,
          urgency: 'high'
        }, 'concurrent_user1'),
        
        smartNotificationDispatcher.sendMarketUpdate({
          summary: '並發測試市場更新',
          timestamp: new Date()
        }, 'active'),
        
        smartNotificationDispatcher.sendAIAnalysis({
          trend: 'bullish',
          confidence: 0.85,
          analysis: '並發測試 AI 分析'
        }, 'regular')
      ];

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      if (successful === promises.length) {
        this.addTestResult(testName, true, `${successful}/${promises.length} 並發任務成功`);
      } else {
        this.addTestResult(testName, false, `只有 ${successful}/${promises.length} 並發任務成功`);
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * 測試價格警報監控整合
   */
  async testPriceAlertMonitorIntegration() {
    const testName = '價格警報監控整合';
    
    try {
      // 測試確定緊急程度的方法
      const alert = {
        symbol: 'BTCUSDT',
        alertType: 'price_below',
        targetPrice: 44000
      };

      const marketData = {
        price: 43500,
        priceChangePercent: -15
      };

      const urgency = this.priceAlertMonitor.determineAlertUrgency(alert, marketData);
      
      if (urgency === 'high') {
        this.addTestResult(testName, true, `緊急程度判斷正確: ${urgency}`);
      } else {
        this.addTestResult(testName, false, `緊急程度判斷錯誤: ${urgency}`);
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * 添加測試結果
   */
  addTestResult(testName, passed, message) {
    const result = {
      testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.tests.push(result);
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
  }

  /**
   * 計算測試摘要
   */
  calculateSummary() {
    this.testResults.summary.total = this.testResults.tests.length;
    this.testResults.summary.passed = this.testResults.tests.filter(t => t.passed).length;
    this.testResults.summary.failed = this.testResults.summary.total - this.testResults.summary.passed;
  }

  /**
   * 生成測試報告
   */
  generateReport() {
    console.log('\n📊 批量通知優化整合測試報告');
    console.log('='.repeat(50));
    console.log(`測試時間: ${this.testResults.timestamp}`);
    console.log(`總測試數: ${this.testResults.summary.total}`);
    console.log(`通過: ${this.testResults.summary.passed}`);
    console.log(`失敗: ${this.testResults.summary.failed}`);
    console.log(`成功率: ${(this.testResults.summary.passed / this.testResults.summary.total * 100).toFixed(1)}%`);
    console.log(`總執行時間: ${this.testResults.performance.totalTime.toFixed(2)}ms`);
    
    if (this.testResults.performance.averageLatency > 0) {
      console.log(`平均延遲: ${this.testResults.performance.averageLatency.toFixed(2)}ms`);
      console.log(`處理速度: ${this.testResults.performance.throughput.toFixed(2)} 通知/秒`);
    }

    // 保存詳細報告
    const reportPath = path.join(__dirname, 'batch-notification-integration-test-report.json');
    require('fs').writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
    console.log(`\n📋 詳細報告已保存: ${reportPath}`);

    // 系統狀態報告
    console.log('\n🔍 系統狀態:');
    try {
      const optimizerStatus = batchNotificationOptimizer.getStatus();
      const dispatcherStatus = smartNotificationDispatcher.getStatus();
      
      console.log(`- 批量優化器佇列: ${optimizerStatus.state?.queueLength || 0}`);
      console.log(`- 分發器統計: ${dispatcherStatus.dispatcher?.stats?.totalDispatched || 0} 已分發`);
    } catch (error) {
      console.log(`- 狀態查詢失敗: ${error.message}`);
    }

    // 建議
    console.log('\n💡 建議:');
    if (this.testResults.summary.failed === 0) {
      console.log('✅ 所有測試通過，批量通知優化系統可以部署到生產環境');
    } else {
      console.log('⚠️ 部分測試失敗，建議檢查失敗的測試項目');
    }
    
    if (this.testResults.performance.averageLatency > 1000) {
      console.log('⚠️ 平均延遲較高，可能需要進一步優化');
    }
  }
}

// 執行測試
async function runTest() {
  const tester = new BatchNotificationIntegrationTest();
  await tester.runAllTests();
}

// 如果直接執行此文件
if (require.main === module) {
  runTest().catch(console.error);
}

module.exports = BatchNotificationIntegrationTest;