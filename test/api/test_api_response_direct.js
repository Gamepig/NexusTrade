/**
 * 直接測試 API 端點的完整流程
 */

require('dotenv').config();

const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');

async function testAPIResponseDirect() {
  console.log('🔍 直接測試 API 完整流程\n');
  
  try {
    const currencyService = getCurrencyAnalysisService();
    const symbol = 'ETHUSDT';
    
    console.log('=== 1. 執行單一貨幣分析 ===');
    const result = await currencyService.performCurrencyAnalysis(symbol);
    
    console.log('分析成功:', !!result);
    console.log('分析日期:', result.analysisDate);
    console.log('來源模型:', result.dataSources?.analysisModel);
    
    console.log('\n=== 2. 檢查 Williams %R 結果 ===');
    const williamsR = result.analysis?.technicalAnalysis?.williamsR;
    console.log('Williams %R 完整物件:', JSON.stringify(williamsR, null, 2));
    
    console.log('\n=== 3. 檢查市場情緒結果 ===');
    const marketSentiment = result.analysis?.marketSentiment;
    console.log('市場情緒 完整物件:', JSON.stringify({
      score: marketSentiment?.score,
      label: marketSentiment?.label,
      summary: marketSentiment?.summary
    }, null, 2));
    
    console.log('\n=== 4. 比較預期結果 ===');
    console.log('Williams %R 是否包含計算值:');
    console.log('  有 value 屬性:', 'value' in williamsR);
    console.log('  value 值:', williamsR?.value);
    console.log('  interpretation 包含數值:', williamsR?.interpretation?.includes('-3'));
    
    console.log('\n市場情緒是否為真實分析:');
    console.log('  score 不為預設 50:', marketSentiment?.score !== 50);
    console.log('  summary 不為預設訊息:', !marketSentiment?.summary?.includes('暫時不可用'));
    
    console.log('\n=== 5. 檢查整體趨勢分析 ===');
    const trend = result.analysis?.trend;
    console.log('趨勢分析:', {
      direction: trend?.direction,
      confidence: trend?.confidence,
      isDefault: trend?.summary?.includes('數據處理問題')
    });
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error(error);
  }
}

testAPIResponseDirect().catch(console.error);