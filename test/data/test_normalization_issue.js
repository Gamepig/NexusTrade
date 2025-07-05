/**
 * 測試 normalizeAnalysisForSchema 是否覆蓋正確的 AI 分析
 */

require('dotenv').config();

const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');

function testNormalization() {
  console.log('🔍 測試 normalizeAnalysisForSchema 方法\n');
  
  const currencyService = getCurrencyAnalysisService();
  
  // 模擬經過 mergeTechnicalIndicatorsWithAI 合併後的正確分析結果
  const mockMergedAnalysis = {
    trend: {
      direction: 'neutral',
      confidence: 75,
      summary: 'ETHUSDT目前處於中性趨勢'
    },
    technicalAnalysis: {
      rsi: {
        value: 50.56,
        interpretation: 'RSI值為50.56，接近中性區域，顯示市場既不超買也不超賣',
        signal: '持有'
      },
      macd: {
        value: 12.37,
        signal: '買入',
        interpretation: 'MACD值為12.37，顯示正向動能'
      },
      movingAverage: {
        ma7: 2374.27,
        ma20: 2374.27,
        ma50: 0,
        position: '待確認',
        signal: '持有'
      },
      bollingerBands: {
        upper: 2523.4,
        middle: 2374.27,
        lower: 2225.14,
        position: '中軌附近',
        squeeze: false,
        signal: '等待突破'
      },
      volume: {
        trend: '平穩',
        interpretation: '成交量正常',
        signal: '中性'
      },
      williamsR: {
        value: -34.48,
        interpretation: 'Williams %R值為-34.48，處於中性區域，表明市場既不超買也不超賣',
        signal: '持有'
      }
    },
    marketSentiment: {
      score: 65,
      label: 'neutral',
      summary: '市場情緒中性偏樂觀，投資者對ETHUSDT的態度既不極端看漲也不極端看跌'
    }
  };
  
  console.log('=== 1. 輸入到 normalizeAnalysisForSchema 的數據 ===');
  console.log('Williams %R 合併後數據:', {
    value: mockMergedAnalysis.technicalAnalysis.williamsR.value,
    interpretation: mockMergedAnalysis.technicalAnalysis.williamsR.interpretation?.substring(0, 50) + '...',
    signal: mockMergedAnalysis.technicalAnalysis.williamsR.signal
  });
  
  console.log('市場情緒合併後數據:', {
    score: mockMergedAnalysis.marketSentiment.score,
    label: mockMergedAnalysis.marketSentiment.label,
    summary: mockMergedAnalysis.marketSentiment.summary?.substring(0, 50) + '...'
  });
  
  console.log('\n=== 2. 執行 normalizeAnalysisForSchema ===');
  const normalized = currencyService.normalizeAnalysisForSchema(mockMergedAnalysis);
  
  console.log('\n=== 3. normalizeAnalysisForSchema 輸出結果 ===');
  console.log('Williams %R 正規化後數據:', {
    value: normalized.technicalAnalysis.williamsR.value,
    interpretation: normalized.technicalAnalysis.williamsR.interpretation?.substring(0, 50) + '...',
    signal: normalized.technicalAnalysis.williamsR.signal
  });
  
  console.log('市場情緒正規化後數據:', {
    score: normalized.marketSentiment.score,
    label: normalized.marketSentiment.label,
    summary: normalized.marketSentiment.summary?.substring(0, 50) + '...'
  });
  
  console.log('\n=== 4. 問題檢查 ===');
  
  // 檢查 Williams %R 是否被錯誤重置
  const williamsRChanged = 
    mockMergedAnalysis.technicalAnalysis.williamsR.interpretation !== normalized.technicalAnalysis.williamsR.interpretation ||
    mockMergedAnalysis.technicalAnalysis.williamsR.signal !== normalized.technicalAnalysis.williamsR.signal;
  
  console.log('Williams %R 數據是否被 normalizeAnalysisForSchema 修改:', williamsRChanged);
  
  if (williamsRChanged) {
    console.log('🚨 Williams %R 被錯誤重置:');
    console.log('  原始 interpretation:', mockMergedAnalysis.technicalAnalysis.williamsR.interpretation);
    console.log('  正規化後 interpretation:', normalized.technicalAnalysis.williamsR.interpretation);
    console.log('  原始 signal:', mockMergedAnalysis.technicalAnalysis.williamsR.signal);
    console.log('  正規化後 signal:', normalized.technicalAnalysis.williamsR.signal);
  }
  
  // 檢查市場情緒是否被修改
  const sentimentChanged = 
    mockMergedAnalysis.marketSentiment.summary !== normalized.marketSentiment.summary ||
    mockMergedAnalysis.marketSentiment.score !== normalized.marketSentiment.score;
  
  console.log('市場情緒數據是否被 normalizeAnalysisForSchema 修改:', sentimentChanged);
  
  if (sentimentChanged) {
    console.log('🚨 市場情緒被錯誤重置:');
    console.log('  原始 summary:', mockMergedAnalysis.marketSentiment.summary);
    console.log('  正規化後 summary:', normalized.marketSentiment.summary);
    console.log('  原始 score:', mockMergedAnalysis.marketSentiment.score);
    console.log('  正規化後 score:', normalized.marketSentiment.score);
  }
}

testNormalization();