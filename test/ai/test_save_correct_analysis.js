/**
 * 執行完整分析並儲存到資料庫，確認修復是否正確
 */

require('dotenv').config();

const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');

async function testSaveCorrectAnalysis() {
  console.log('🔍 執行完整分析並儲存到資料庫\n');
  
  try {
    const currencyService = getCurrencyAnalysisService();
    const symbol = 'ETHUSDT';
    
    console.log('=== 1. 執行完整的單一貨幣分析 ===');
    const result = await currencyService.performCurrencyAnalysis(symbol);
    
    console.log('分析成功:', !!result);
    console.log('分析 ID:', result._id);
    console.log('分析日期:', result.analysisDate);
    console.log('來源模型:', result.dataSources?.analysisModel);
    
    console.log('\n=== 2. 檢查儲存到資料庫的結果 ===');
    console.log('Williams %R 儲存結果:', {
      value: result.analysis?.technicalAnalysis?.williamsR?.value,
      interpretation: result.analysis?.technicalAnalysis?.williamsR?.interpretation?.substring(0, 50) + '...',
      signal: result.analysis?.technicalAnalysis?.williamsR?.signal
    });
    
    console.log('市場情緒儲存結果:', {
      score: result.analysis?.marketSentiment?.score,
      label: result.analysis?.marketSentiment?.label,
      summary: result.analysis?.marketSentiment?.summary?.substring(0, 50) + '...'
    });
    
    console.log('\n=== 3. 驗證分析結果品質 ===');
    
    // 檢查 Williams %R 是否正確
    const williamsR = result.analysis?.technicalAnalysis?.williamsR;
    const hasCorrectWilliamsR = 
      typeof williamsR?.value === 'number' && 
      williamsR.value !== -50 && 
      williamsR.interpretation && 
      !williamsR.interpretation.includes('數據分析中');
    
    console.log('Williams %R 是否正確:', hasCorrectWilliamsR);
    if (hasCorrectWilliamsR) {
      console.log('  ✅ value 為數字:', typeof williamsR.value === 'number');
      console.log('  ✅ value 不是預設值 -50:', williamsR.value !== -50);
      console.log('  ✅ interpretation 包含具體分析:', !williamsR.interpretation.includes('數據分析中'));
      console.log('  實際 value:', williamsR.value);
    } else {
      console.log('  ❌ Williams %R 仍為預設分析');
    }
    
    // 檢查市場情緒是否正確
    const sentiment = result.analysis?.marketSentiment;
    const hasCorrectSentiment = 
      sentiment?.score !== 50 &&
      sentiment?.summary &&
      !sentiment.summary.includes('暫時不可用');
    
    console.log('市場情緒是否正確:', hasCorrectSentiment);
    if (hasCorrectSentiment) {
      console.log('  ✅ score 不是預設值 50:', sentiment.score !== 50);
      console.log('  ✅ summary 不包含"暫時不可用":', !sentiment.summary.includes('暫時不可用'));
      console.log('  實際 score:', sentiment.score);
    } else {
      console.log('  ❌ 市場情緒仍為預設分析');
    }
    
    console.log('\n=== 4. 測試 API 端點 ===');
    console.log('請稍等，讓我們測試 API 是否返回正確結果...');
    
    // 等待 2 秒確保資料庫操作完成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return result._id;
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error(error);
  }
}

testSaveCorrectAnalysis().then(resultId => {
  console.log('\n🎯 測試完成，分析 ID:', resultId);
  console.log('請檢查前端頁面或 API 端點以確認修復效果');
}).catch(console.error);