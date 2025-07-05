/**
 * 調試 Williams %R 和市場情緒問題
 */

require('dotenv').config();

const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');

async function debugWilliamsAndSentiment() {
  console.log('🔍 調試 Williams %R 和市場情緒問題\n');
  
  try {
    const currencyService = getCurrencyAnalysisService();
    
    console.log('=== 1. 檢查技術指標計算結果 ===');
    const symbol = 'ETHUSDT';
    const currencyData = await currencyService.collectCurrencyData(symbol);
    
    console.log('Williams %R 計算結果:');
    const williamsR = currencyData.technicalIndicators?.williamsR;
    if (williamsR) {
      console.log('  數值:', williamsR.value);
      console.log('  解讀:', williamsR.interpretation);
      console.log('  信號:', williamsR.signal);
      console.log('  完整物件:', williamsR);
    } else {
      console.log('  ❌ Williams %R 計算失敗');
    }
    
    console.log('\n=== 2. 模擬 AI 分析結果 ===');
    
    // 模擬一個完整的 AI 分析，包含市場情緒
    const mockAIAnalysis = {
      trend: {
        direction: 'neutral',
        confidence: 60,
        summary: '測試趨勢分析'
      },
      technicalAnalysis: {
        rsi: { value: 53.4, signal: '持有', interpretation: 'RSI 中性' },
        macd: { value: 17.76, signal: '持有', interpretation: 'MACD 多頭動能' },
        movingAverage: { signal: '持有', interpretation: '移動平均線分析' },
        bollingerBands: { signal: '等待突破', interpretation: 'AI 布林帶分析' },
        volume: { signal: '中性', interpretation: '成交量正常' },
        williamsR: { 
          value: -27.63, // AI 可能會提供這個數值，但被覆蓋了
          signal: '持有', 
          interpretation: 'Williams %R 顯示偏強勢' 
        }
      },
      marketSentiment: {
        score: 65,
        label: 'neutral',
        summary: '市場情緒中性偏樂觀，投資者保持謹慎但樂觀態度',
        factors: [
          { factor: '技術面', impact: '中性', description: '技術指標顯示平衡' },
          { factor: '市場波動', impact: '低', description: '波動率處於正常範圍' }
        ]
      }
    };
    
    console.log('\n=== 3. 測試數值合併邏輯 ===');
    
    const mergedResult = currencyService.mergeTechnicalIndicatorsWithAI(
      mockAIAnalysis, 
      currencyData.technicalIndicators
    );
    
    console.log('合併後 Williams %R:');
    const mergedWilliamsR = mergedResult.technicalAnalysis?.williamsR;
    if (mergedWilliamsR) {
      console.log('  數值:', mergedWilliamsR.value);
      console.log('  解讀:', mergedWilliamsR.interpretation);
      console.log('  信號:', mergedWilliamsR.signal);
      
      if (mergedWilliamsR.value && mergedWilliamsR.value !== 'N/A' && mergedWilliamsR.value !== '數據計算中') {
        console.log('  ✅ Williams %R 數值正確傳遞');
      } else {
        console.log('  ❌ Williams %R 數值傳遞失敗');
      }
    }
    
    console.log('\n合併後市場情緒:');
    const mergedSentiment = mergedResult.marketSentiment;
    if (mergedSentiment) {
      console.log('  分數:', mergedSentiment.score);
      console.log('  標籤:', mergedSentiment.label);
      console.log('  總結:', mergedSentiment.summary);
      console.log('  因素:', mergedSentiment.factors);
      
      if (mergedSentiment.score && mergedSentiment.score > 0) {
        console.log('  ✅ 市場情緒數據正確傳遞');
      } else {
        console.log('  ❌ 市場情緒數據傳遞失敗');
      }
    } else {
      console.log('  ❌ 市場情緒資料不存在');
    }
    
    console.log('\n=== 4. 測試前端格式化 ===');
    
    // 模擬前端 formatIndicatorValue 對 Williams %R 的處理
    function formatWilliamsR(indicator) {
      if (!indicator || indicator.value === undefined || indicator.value === null) {
        return '數據計算中';
      }
      
      const value = typeof indicator.value === 'number' ? indicator.value : parseFloat(indicator.value);
      if (isNaN(value)) {
        return '數據計算中';
      }
      
      let interpretation = '';
      if (value > -20) interpretation = ' (超買)';
      else if (value < -80) interpretation = ' (超賣)';
      else if (value > -40) interpretation = ' (偏強勢)';
      else if (value < -60) interpretation = ' (偏弱勢)';
      else interpretation = ' (中性)';
      
      return `${value.toFixed(2)}${interpretation}`;
    }
    
    const williamsFormatted = formatWilliamsR(mergedWilliamsR);
    console.log('Williams %R 前端顯示:', williamsFormatted);
    
    console.log('\n=== 5. 診斷結論 ===');
    
    // 檢查原始計算是否正確
    if (williamsR && typeof williamsR.value === 'number') {
      console.log('✅ Williams %R 原始計算正確');
    } else {
      console.log('❌ Williams %R 原始計算有問題');
    }
    
    // 檢查合併邏輯是否保留數值
    if (mergedWilliamsR && typeof mergedWilliamsR.value === 'number') {
      console.log('✅ Williams %R 合併邏輯正確');
    } else {
      console.log('❌ Williams %R 合併邏輯有問題');
    }
    
    // 檢查市場情緒是否正確處理
    if (mergedSentiment && mergedSentiment.score > 0) {
      console.log('✅ 市場情緒處理正確');
    } else {
      console.log('❌ 市場情緒處理有問題');
    }
    
  } catch (error) {
    console.error('❌ 調試失敗:', error.message);
    console.error(error);
  }
}

debugWilliamsAndSentiment().catch(console.error);