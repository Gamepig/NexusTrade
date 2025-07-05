/**
 * 測試完整的分析流程，找出問題所在
 */

require('dotenv').config();

const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');

async function testFullAnalysisFlow() {
  console.log('🔍 測試完整的分析流程\n');
  
  try {
    const currencyService = getCurrencyAnalysisService();
    const symbol = 'ETHUSDT';
    
    console.log('=== 步驟 1: 數據收集 ===');
    const currencyData = await currencyService.collectCurrencyData(symbol);
    console.log('Williams %R 計算結果:', currencyData.technicalIndicators.williamsR);
    
    console.log('\n=== 步驟 2: AI 分析 ===');
    const aiAnalysis = await currencyService.performAIAnalysis(symbol, currencyData);
    console.log('AI 分析狀態:', aiAnalysis.success);
    console.log('AI 提供者:', aiAnalysis.provider);
    console.log('AI 模型:', aiAnalysis.model);
    
    if (aiAnalysis.analysis) {
      console.log('AI 分析中的 Williams %R:', aiAnalysis.analysis.technicalAnalysis?.williamsR);
      console.log('AI 分析中的市場情緒:', {
        score: aiAnalysis.analysis.marketSentiment?.score,
        label: aiAnalysis.analysis.marketSentiment?.label,
        summary: aiAnalysis.analysis.marketSentiment?.summary?.substring(0, 50) + '...'
      });
    } else {
      console.log('❌ AI 分析結果為空');
    }
    
    console.log('\n=== 步驟 3: 合併邏輯 ===');
    if (aiAnalysis.analysis && currencyData.technicalIndicators) {
      const mergedResult = currencyService.mergeTechnicalIndicatorsWithAI(
        aiAnalysis.analysis, 
        currencyData.technicalIndicators
      );
      
      console.log('合併後 Williams %R:', mergedResult.technicalAnalysis?.williamsR);
      console.log('合併後市場情緒:', {
        score: mergedResult.marketSentiment?.score,
        label: mergedResult.marketSentiment?.label,
        summary: mergedResult.marketSentiment?.summary?.substring(0, 50) + '...'
      });
    }
    
    console.log('\n=== 步驟 4: 完整分析流程 ===');
    const fullAnalysis = await currencyService.performCurrencyAnalysis(symbol);
    console.log('最終結果 Williams %R:', fullAnalysis.analysis?.technicalAnalysis?.williamsR);
    console.log('最終結果市場情緒:', {
      score: fullAnalysis.analysis?.marketSentiment?.score,
      label: fullAnalysis.analysis?.marketSentiment?.label,
      summary: fullAnalysis.analysis?.marketSentiment?.summary?.substring(0, 50) + '...'
    });
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error(error);
  }
}

testFullAnalysisFlow().catch(console.error);