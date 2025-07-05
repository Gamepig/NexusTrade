/**
 * 測試清除快取後的新分析
 */

require('dotenv').config();
process.env.LOG_LEVEL = 'info';

const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');

async function testFreshAnalysis() {
  console.log('🆕 測試清除快取後的新分析...\n');
  
  try {
    const service = getCurrencyAnalysisService();
    const symbol = 'BTCUSDT';
    
    console.log('=== 1. 檢查是否需要新分析 ===');
    const needsAnalysis = await service.needsAnalysis(symbol);
    console.log(`${symbol} 是否需要新分析:`, needsAnalysis);
    
    console.log('\n=== 2. 執行完整貨幣分析 ===');
    console.log('⚠️ 注意：OpenRouter 可能因429錯誤失敗，將使用降級分析');
    
    const startTime = Date.now();
    const analysisResult = await service.performCurrencyAnalysis(symbol);
    const endTime = Date.now();
    
    console.log(`\n✅ ${symbol} 分析完成，耗時: ${endTime - startTime}ms`);
    
    console.log('\n=== 3. 分析結果檢查 ===');
    console.log('3.1 基本信息:');
    console.log('  - 分析日期:', analysisResult.analysisDate);
    console.log('  - 貨幣符號:', analysisResult.symbol);
    console.log('  - 數據來源模型:', analysisResult.dataSources?.analysisModel);
    
    console.log('\n3.2 趨勢分析:');
    const trend = analysisResult.analysis?.trend;
    console.log('  - 方向:', trend?.direction);
    console.log('  - 信心度:', trend?.confidence);
    console.log('  - 摘要:', trend?.summary);
    
    console.log('\n3.3 技術指標檢查:');
    const technical = analysisResult.analysis?.technicalAnalysis;
    if (technical) {
      console.log('  - RSI:', {
        value: technical.rsi?.value,
        signal: technical.rsi?.signal,
        interpretation: technical.rsi?.interpretation
      });
      
      console.log('  - 移動平均線:', {
        signal: technical.movingAverage?.signal,
        interpretation: technical.movingAverage?.interpretation
      });
      
      console.log('  - 布林帶:', {
        signal: technical.bollingerBands?.signal,
        interpretation: technical.bollingerBands?.interpretation
      });
      
      console.log('  - 成交量:', {
        signal: technical.volume?.signal,
        interpretation: technical.volume?.interpretation
      });
    }
    
    console.log('\n3.4 市場情緒:');
    const sentiment = analysisResult.analysis?.marketSentiment;
    console.log('  - 評分:', sentiment?.score);
    console.log('  - 標籤:', sentiment?.label);
    console.log('  - 摘要:', sentiment?.summary);
    
    console.log('\n3.5 品質指標:');
    const quality = analysisResult.qualityMetrics;
    console.log('  - 處理時間:', quality?.processingTime, 'ms');
    console.log('  - 數據完整性:', quality?.dataCompleteness, '%');
    console.log('  - 信心度:', quality?.confidence);
    console.log('  - 使用Token:', quality?.tokensUsed);
    
    console.log('\n=== 4. 檢查數據是否為真實值 ===');
    
    // 檢查是否為預設值
    const isDefault = (
      trend?.confidence === 50 && 
      technical?.rsi?.value === 50 && 
      sentiment?.score === 50
    );
    
    if (isDefault) {
      console.log('❌ 分析結果仍為預設值，存在問題');
    } else {
      console.log('✅ 分析結果為真實計算值');
    }
    
    // 檢查RSI是否合理（應該在0-100之間且不為整數50）
    const rsiValue = technical?.rsi?.value;
    if (rsiValue && rsiValue !== 50 && rsiValue > 0 && rsiValue < 100) {
      console.log('✅ RSI 值看起來是真實計算的:', rsiValue);
    } else {
      console.log('⚠️ RSI 值可能有問題:', rsiValue);
    }
    
    console.log('\n=== 5. 立即測試 API 端點 ===');
    
    // 現在應該有新的快取數據了
    console.log('測試 API 端點是否返回新數據...');
    
    const http = require('http');
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/ai/currency-analysis/${symbol}`,
      method: 'GET'
    };
    
    const apiResult = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      });
      
      req.on('error', reject);
      req.end();
    });
    
    if (apiResult.status === 'success') {
      const apiTrend = apiResult.data?.analysis?.trend;
      const apiRsi = apiResult.data?.analysis?.technicalAnalysis?.rsi?.value;
      
      console.log('✅ API 測試成功');
      console.log('  - API 趨勢信心度:', apiTrend?.confidence);
      console.log('  - API RSI 值:', apiRsi);
      console.log('  - 是否從快取:', apiResult.data?.isFromCache);
      
      // 檢查是否為新數據
      if (apiTrend?.confidence !== 50 || apiRsi !== 50) {
        console.log('🎉 API 返回新的真實分析數據！');
      } else {
        console.log('⚠️ API 仍返回預設值');
      }
    } else {
      console.log('❌ API 測試失敗:', apiResult.message);
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error('錯誤堆疊:', error.stack);
  }
}

testFreshAnalysis().catch(console.error);