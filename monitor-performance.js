/**
 * NexusTrade 生產環境效能監控
 * 
 * 監控項目：
 * 1. API 回應時間
 * 2. MongoDB 連接狀態
 * 3. Binance API 調用頻率
 * 4. LINE 訊息發送成功率
 * 5. 記憶體和 CPU 使用率
 * 6. 事件驅動警報系統效能
 */

const fs = require('fs');
const path = require('path');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      api: {
        totalRequests: 0,
        successfulRequests: 0,
        averageResponseTime: 0,
        slowestEndpoint: '',
        fastestEndpoint: '',
        responseTimes: []
      },
      database: {
        connectionStatus: 'unknown',
        queryCount: 0,
        averageQueryTime: 0,
        slowQueries: []
      },
      system: {
        memoryUsage: 0,
        cpuUsage: 0,
        uptime: 0
      },
      binance: {
        apiCalls: 0,
        rateLimit: 0,
        errors: []
      },
      line: {
        messagesSent: 0,
        successRate: 0,
        failures: []
      },
      alerts: {
        activeAlerts: 0,
        triggeredAlerts: 0,
        averageProcessingTime: 0
      }
    };
    
    this.startTime = Date.now();
    this.logFile = 'performance-monitor.log';
    this.reportFile = 'performance-report.json';
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(this.logFile, logEntry);
  }

  async testAPIEndpoint(endpoint, expectedStatus = 200) {
    const startTime = Date.now();
    
    try {
      const { execSync } = require('child_process');
      const curlCommand = `curl -s -o /dev/null -w "%{http_code}:%{time_total}" http://localhost:3000${endpoint}`;
      const result = execSync(curlCommand, { encoding: 'utf8' });
      
      const [statusCode, responseTime] = result.trim().split(':');
      const responseTimeMs = parseFloat(responseTime) * 1000;
      
      this.metrics.api.totalRequests++;
      this.metrics.api.responseTimes.push(responseTimeMs);
      
      if (parseInt(statusCode) === expectedStatus) {
        this.metrics.api.successfulRequests++;
        return {
          success: true,
          statusCode: parseInt(statusCode),
          responseTime: responseTimeMs,
          endpoint
        };
      } else {
        return {
          success: false,
          statusCode: parseInt(statusCode),
          responseTime: responseTimeMs,
          endpoint,
          error: `Unexpected status code: ${statusCode}`
        };
      }
      
    } catch (error) {
      this.metrics.api.totalRequests++;
      return {
        success: false,
        endpoint,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  async testDatabaseConnection() {
    try {
      const result = await this.testAPIEndpoint('/health');
      
      if (result.success) {
        // 嘗試獲取更詳細的數據庫資訊
        const { execSync } = require('child_process');
        const dbHealthCommand = 'curl -s http://localhost:3000/health | grep -o "healthy"';
        const dbStatus = execSync(dbHealthCommand, { encoding: 'utf8' }).trim();
        
        this.metrics.database.connectionStatus = dbStatus === 'healthy' ? 'connected' : 'unknown';
        return {
          success: true,
          status: this.metrics.database.connectionStatus,
          responseTime: result.responseTime
        };
      } else {
        this.metrics.database.connectionStatus = 'disconnected';
        return {
          success: false,
          status: 'disconnected',
          error: result.error
        };
      }
      
    } catch (error) {
      this.metrics.database.connectionStatus = 'error';
      return {
        success: false,
        status: 'error',
        error: error.message
      };
    }
  }

  async getSystemMetrics() {
    try {
      const { execSync } = require('child_process');
      
      // 記憶體使用率 (使用 ps 命令獲取 Node.js 進程資訊)
      try {
        const memoryCommand = 'ps -o pid,rss,vsz,comm -p $(pgrep -f "node.*server.js") | tail -n +2';
        const memoryResult = execSync(memoryCommand, { encoding: 'utf8' });
        
        if (memoryResult.trim()) {
          const memoryLines = memoryResult.trim().split('\\n');
          const memoryData = memoryLines[0].split(/\\s+/);
          const rssMemory = parseInt(memoryData[1]) || 0; // KB
          
          this.metrics.system.memoryUsage = Math.round(rssMemory / 1024); // MB
        }
      } catch (memError) {
        this.log(`記憶體監控錯誤: ${memError.message}`);
      }

      // 系統運行時間
      const uptimeCommand = 'uptime';
      const uptimeResult = execSync(uptimeCommand, { encoding: 'utf8' });
      
      // 提取負載平均值
      const loadMatch = uptimeResult.match(/load averages?:\\s*([\\d.]+)/);
      const systemLoad = loadMatch ? parseFloat(loadMatch[1]) : 0;
      
      // 進程運行時間
      this.metrics.system.uptime = Math.round((Date.now() - this.startTime) / 1000);
      
      return {
        success: true,
        memory: this.metrics.system.memoryUsage,
        uptime: this.metrics.system.uptime,
        systemLoad
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testMarketDataAPI() {
    const endpoints = [
      '/api/market/overview',
      '/api/market/ticker?symbol=BTCUSDT',
      '/health'
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      const result = await this.testAPIEndpoint(endpoint);
      results.push(result);
      
      // 更新最快/最慢端點記錄
      if (result.success) {
        if (!this.metrics.api.fastestEndpoint || 
            result.responseTime < this.getFastestResponseTime()) {
          this.metrics.api.fastestEndpoint = `${endpoint} (${result.responseTime.toFixed(2)}ms)`;
        }
        
        if (!this.metrics.api.slowestEndpoint || 
            result.responseTime > this.getSlowestResponseTime()) {
          this.metrics.api.slowestEndpoint = `${endpoint} (${result.responseTime.toFixed(2)}ms)`;
        }
      }
    }
    
    return results;
  }

  getFastestResponseTime() {
    return Math.min(...this.metrics.api.responseTimes);
  }

  getSlowestResponseTime() {
    return Math.max(...this.metrics.api.responseTimes);
  }

  calculateMetrics() {
    // 計算平均回應時間
    if (this.metrics.api.responseTimes.length > 0) {
      const sum = this.metrics.api.responseTimes.reduce((a, b) => a + b, 0);
      this.metrics.api.averageResponseTime = sum / this.metrics.api.responseTimes.length;
    }
    
    // 計算成功率
    const successRate = this.metrics.api.totalRequests > 0 
      ? (this.metrics.api.successfulRequests / this.metrics.api.totalRequests) * 100 
      : 0;
    
    return {
      apiSuccessRate: successRate,
      averageResponseTime: this.metrics.api.averageResponseTime,
      totalRequests: this.metrics.api.totalRequests,
      systemMetrics: this.metrics.system
    };
  }

  async runMonitoringCycle() {
    this.log('🔍 開始效能監控週期...');
    
    // 1. 測試資料庫連接
    this.log('📊 測試資料庫連接...');
    const dbResult = await this.testDatabaseConnection();
    this.log(`  資料庫狀態: ${dbResult.status} (${dbResult.responseTime?.toFixed(2)}ms)`);
    
    // 2. 測試 API 端點
    this.log('🌐 測試 API 端點效能...');
    const apiResults = await this.testMarketDataAPI();
    
    apiResults.forEach(result => {
      if (result.success) {
        this.log(`  ✅ ${result.endpoint}: ${result.responseTime.toFixed(2)}ms`);
      } else {
        this.log(`  ❌ ${result.endpoint}: ${result.error}`);
      }
    });
    
    // 3. 系統指標
    this.log('💻 收集系統指標...');
    const systemMetrics = await this.getSystemMetrics();
    
    if (systemMetrics.success) {
      this.log(`  記憶體使用: ${systemMetrics.memory}MB`);
      this.log(`  運行時間: ${systemMetrics.uptime}秒`);
      this.log(`  系統負載: ${systemMetrics.systemLoad || 'N/A'}`);
    }
    
    // 4. 計算整體指標
    const overallMetrics = this.calculateMetrics();
    this.log(`📈 API 成功率: ${overallMetrics.apiSuccessRate.toFixed(1)}%`);
    this.log(`⏱️  平均回應時間: ${overallMetrics.averageResponseTime.toFixed(2)}ms`);
    
    return {
      database: dbResult,
      apiTests: apiResults,
      system: systemMetrics,
      overall: overallMetrics,
      timestamp: new Date().toISOString()
    };
  }

  generateReport(monitoringResults) {
    const report = {
      monitoringSession: {
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: Math.round((Date.now() - this.startTime) / 1000)
      },
      results: monitoringResults,
      metrics: this.metrics,
      summary: {
        totalAPIRequests: this.metrics.api.totalRequests,
        successfulRequests: this.metrics.api.successfulRequests,
        averageResponseTime: this.metrics.api.averageResponseTime.toFixed(2),
        fastestEndpoint: this.metrics.api.fastestEndpoint,
        slowestEndpoint: this.metrics.api.slowestEndpoint,
        databaseStatus: this.metrics.database.connectionStatus,
        systemMemoryMB: this.metrics.system.memoryUsage,
        uptimeSeconds: this.metrics.system.uptime
      },
      recommendations: this.generateRecommendations()
    };
    
    // 保存報告
    fs.writeFileSync(this.reportFile, JSON.stringify(report, null, 2));
    this.log(`📄 效能報告已保存至: ${this.reportFile}`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.metrics.api.averageResponseTime > 200) {
      recommendations.push({
        type: 'performance',
        severity: 'warning',
        message: '平均 API 回應時間超過 200ms，建議優化查詢或增加快取'
      });
    }
    
    if (this.metrics.api.totalRequests > 0) {
      const successRate = (this.metrics.api.successfulRequests / this.metrics.api.totalRequests) * 100;
      if (successRate < 95) {
        recommendations.push({
          type: 'reliability',
          severity: 'error',
          message: `API 成功率僅 ${successRate.toFixed(1)}%，需要調查失敗原因`
        });
      }
    }
    
    if (this.metrics.system.memoryUsage > 512) {
      recommendations.push({
        type: 'resource',
        severity: 'warning',
        message: `記憶體使用量 ${this.metrics.system.memoryUsage}MB 較高，建議監控記憶體洩漏`
      });
    }
    
    if (this.metrics.database.connectionStatus !== 'connected') {
      recommendations.push({
        type: 'database',
        severity: 'error',
        message: '資料庫連接異常，需要立即檢查'
      });
    }
    
    return recommendations;
  }

  displayResults(report) {
    console.log('\\n📊 效能監控結果總結');
    console.log('=====================================');
    
    console.log(`\\n🔗 連接狀態:`);
    console.log(`  資料庫: ${report.summary.databaseStatus}`);
    console.log(`  API 成功率: ${((report.summary.successfulRequests / report.summary.totalAPIRequests) * 100).toFixed(1)}%`);
    
    console.log(`\\n⏱️  效能指標:`);
    console.log(`  平均回應時間: ${report.summary.averageResponseTime}ms`);
    console.log(`  最快端點: ${report.summary.fastestEndpoint}`);
    console.log(`  最慢端點: ${report.summary.slowestEndpoint}`);
    
    console.log(`\\n💻 系統資源:`);
    console.log(`  記憶體使用: ${report.summary.systemMemoryMB}MB`);
    console.log(`  運行時間: ${report.summary.uptimeSeconds}秒`);
    
    if (report.recommendations.length > 0) {
      console.log(`\\n⚠️  建議事項:`);
      report.recommendations.forEach((rec, index) => {
        const emoji = rec.severity === 'error' ? '🔴' : '🟡';
        console.log(`  ${emoji} ${rec.message}`);
      });
    } else {
      console.log(`\\n✅ 所有效能指標均在正常範圍內`);
    }
    
    console.log(`\\n📁 詳細報告: ${this.reportFile}`);
    console.log(`📋 監控日誌: ${this.logFile}`);
  }
}

async function runPerformanceMonitoring() {
  const monitor = new PerformanceMonitor();
  
  console.log('🚀 啟動 NexusTrade 效能監控系統');
  console.log('=====================================\\n');
  
  try {
    // 執行監控週期
    const results = await monitor.runMonitoringCycle();
    
    // 生成報告
    const report = monitor.generateReport(results);
    
    // 顯示結果
    monitor.displayResults(report);
    
    return report;
    
  } catch (error) {
    monitor.log(`❌ 監控過程發生錯誤: ${error.message}`);
    console.error('監控系統錯誤:', error);
  }
}

async function runContinuousMonitoring(intervalMinutes = 5) {
  console.log(`🔄 啟動持續監控模式 (每 ${intervalMinutes} 分鐘一次)`);
  
  const monitor = new PerformanceMonitor();
  
  const runCycle = async () => {
    try {
      await monitor.runMonitoringCycle();
    } catch (error) {
      monitor.log(`監控週期錯誤: ${error.message}`);
    }
  };
  
  // 立即執行一次
  await runCycle();
  
  // 設定定期執行
  setInterval(runCycle, intervalMinutes * 60 * 1000);
  
  monitor.log(`持續監控已啟動，間隔 ${intervalMinutes} 分鐘`);
}

// 主執行函數
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--continuous')) {
    const interval = parseInt(args[args.indexOf('--continuous') + 1]) || 5;
    runContinuousMonitoring(interval);
  } else {
    runPerformanceMonitoring().catch(console.error);
  }
}

module.exports = { PerformanceMonitor, runPerformanceMonitoring };