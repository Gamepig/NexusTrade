/**
 * 測試完整的數據流程：AI 分析 → mergeTechnicalIndicatorsWithAI → normalizeAnalysisForSchema
 */

require('dotenv').config();

const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');

async function testFullDataFlow() {
  console.log('🔍 測試完整數據流程\n');
  
  try {
    const currencyService = getCurrencyAnalysisService();
    const symbol = 'ETHUSDT';
    
    console.log('=== 1. 收集貨幣數據 ===');
    const sourceData = await currencyService.collectCurrencyData(symbol);
    console.log('Williams %R 計算值:', sourceData.technicalIndicators.williamsR.value);
    console.log('技術指標完整性:', Object.keys(sourceData.technicalIndicators));
    
    console.log('\n=== 2. 執行 AI 分析 ===');
    const aiAnalysis = await currencyService.performAIAnalysis(symbol, sourceData);
    console.log('AI 分析成功:', aiAnalysis.success);
    console.log('AI 提供者:', aiAnalysis.provider);
    
    // 檢查 AI 分析結果
    if (aiAnalysis.analysis) {
      console.log('\nAI 分析 Williams %R:', aiAnalysis.analysis.technicalAnalysis?.williamsR);
      console.log('AI 分析市場情緒:', {
        score: aiAnalysis.analysis.marketSentiment?.score,
        label: aiAnalysis.analysis.marketSentiment?.label,
        summary: aiAnalysis.analysis.marketSentiment?.summary?.substring(0, 50) + '...'
      });
    }
    
    console.log('\n=== 3. 執行 mergeTechnicalIndicatorsWithAI ===');
    const mergedAnalysis = currencyService.mergeTechnicalIndicatorsWithAI(
      aiAnalysis.analysis, 
      sourceData.technicalIndicators
    );
    
    console.log('合併後 Williams %R:', mergedAnalysis.technicalAnalysis?.williamsR);
    console.log('合併後市場情緒:', {
      score: mergedAnalysis.marketSentiment?.score,
      label: mergedAnalysis.marketSentiment?.label,
      summary: mergedAnalysis.marketSentiment?.summary?.substring(0, 50) + '...'
    });
    
    console.log('\n=== 4. 執行 normalizeAnalysisForSchema ===');
    const normalizedAnalysis = currencyService.normalizeAnalysisForSchema(mergedAnalysis);
    
    console.log('正規化後 Williams %R:', normalizedAnalysis.technicalAnalysis?.williamsR);
    console.log('正規化後市場情緒:', {
      score: normalizedAnalysis.marketSentiment?.score,
      label: normalizedAnalysis.marketSentiment?.label,
      summary: normalizedAnalysis.marketSentiment?.summary?.substring(0, 50) + '...'
    });
    
    console.log('\n=== 5. 問題分析 ===');
    
    // 檢查各階段的數據變化
    const stages = [
      { name: 'AI 分析', data: aiAnalysis.analysis },
      { name: '合併後', data: mergedAnalysis },
      { name: '正規化後', data: normalizedAnalysis }
    ];
    
    stages.forEach((stage, index) => {
      if (stage.data) {
        const williamsR = stage.data.technicalAnalysis?.williamsR;
        const sentiment = stage.data.marketSentiment;
        
        console.log(`\n${stage.name} Williams %R:`);
        console.log('  value:', williamsR?.value);
        console.log('  interpretation 包含數值:', williamsR?.interpretation?.includes('-3'));
        console.log('  signal:', williamsR?.signal);
        
        console.log(`${stage.name} 市場情緒:`);
        console.log('  score:', sentiment?.score);
        console.log('  非預設 summary:', !sentiment?.summary?.includes('暫時不可用'));
      }
    });
    
    console.log('\n=== 6. 檢查是否使用了預設分析 ===');
    const defaultAnalysis = currencyService.getDefaultAnalysis();
    
    const usingDefaultWilliamsR = 
      normalizedAnalysis.technicalAnalysis?.williamsR?.value === defaultAnalysis.technicalAnalysis.williamsR.value &&
      normalizedAnalysis.technicalAnalysis?.williamsR?.interpretation === defaultAnalysis.technicalAnalysis.williamsR.interpretation;
    
    const usingDefaultSentiment = 
      normalizedAnalysis.marketSentiment?.summary === defaultAnalysis.marketSentiment.summary;
    
    console.log('最終結果是否為預設 Williams %R:', usingDefaultWilliamsR);
    console.log('最終結果是否為預設市場情緒:', usingDefaultSentiment);
    
    if (usingDefaultWilliamsR || usingDefaultSentiment) {
      console.log('\n🚨 發現使用預設分析的問題！');
      console.log('可能原因：');
      console.log('1. AI 分析失敗，使用了預設分析');
      console.log('2. mergeTechnicalIndicatorsWithAI 覆蓋了正確數據');
      console.log('3. normalizeAnalysisForSchema 重置了數據');
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

testFullDataFlow().catch(console.error);