/**
 * 調試 JSON 解析問題 - Williams %R 和市場情緒
 */

require('dotenv').config();

const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');

async function debugJSONParsingIssue() {
  console.log('🔍 調試 JSON 解析問題\n');
  
  try {
    const currencyService = getCurrencyAnalysisService();
    const symbol = 'ETHUSDT';
    
    console.log('=== 1. 測試 AI 分析原始回應 ===');
    const currencyData = await currencyService.collectCurrencyData(symbol);
    const aiAnalysis = await currencyService.performAIAnalysis(symbol, currencyData);
    
    console.log('AI 分析成功:', aiAnalysis.success);
    console.log('AI 提供者:', aiAnalysis.provider);
    console.log('AI 原始回應 (前200字符):', aiAnalysis.rawResponse?.substring(0, 200));
    
    if (aiAnalysis.analysis) {
      console.log('\n=== 2. 檢查解析後的 AI 分析結構 ===');
      console.log('AI 分析結構鍵值:', Object.keys(aiAnalysis.analysis));
      
      if (aiAnalysis.analysis.technicalAnalysis) {
        console.log('technicalAnalysis 結構鍵值:', Object.keys(aiAnalysis.analysis.technicalAnalysis));
        
        const williamsR = aiAnalysis.analysis.technicalAnalysis.williamsR;
        console.log('\nWilliams %R 解析結果:');
        console.log('  類型:', typeof williamsR);
        console.log('  數值:', williamsR);
        console.log('  是否為陣列:', Array.isArray(williamsR));
        if (typeof williamsR === 'object' && williamsR !== null) {
          console.log('  物件鍵值:', Object.keys(williamsR));
          console.log('  原始內容:', JSON.stringify(williamsR, null, 2));
        }
      }
      
      if (aiAnalysis.analysis.marketSentiment) {
        const marketSentiment = aiAnalysis.analysis.marketSentiment;
        console.log('\n市場情緒解析結果:');
        console.log('  類型:', typeof marketSentiment);
        console.log('  數值:', marketSentiment);
        console.log('  是否為陣列:', Array.isArray(marketSentiment));
        if (typeof marketSentiment === 'object' && marketSentiment !== null) {
          console.log('  物件鍵值:', Object.keys(marketSentiment));
          console.log('  原始內容:', JSON.stringify(marketSentiment, null, 2));
        }
      }
    }
    
    console.log('\n=== 3. 測試原始 JSON 內容 ===');
    // 如果可以訪問原始回應，嘗試手動解析
    if (aiAnalysis.rawResponse) {
      const testJsonContent = currencyService.parseGenericResponse(aiAnalysis.rawResponse);
      console.log('提取的 JSON 內容 (前300字符):', testJsonContent?.substring(0, 300));
      
      if (testJsonContent) {
        try {
          const manualParsed = JSON.parse(testJsonContent);
          console.log('\n手動解析結果:');
          console.log('手動解析結構鍵值:', Object.keys(manualParsed));
          
          if (manualParsed.technicalAnalysis?.williamsR) {
            console.log('手動解析 Williams %R:', manualParsed.technicalAnalysis.williamsR);
          }
          
          if (manualParsed.marketSentiment) {
            console.log('手動解析市場情緒:', {
              score: manualParsed.marketSentiment.score,
              label: manualParsed.marketSentiment.label,
              summary: manualParsed.marketSentiment.summary?.substring(0, 50) + '...'
            });
          }
        } catch (parseError) {
          console.log('手動解析失敗:', parseError.message);
        }
      }
    }
    
    console.log('\n=== 4. 比較預設分析結果 ===');
    const defaultAnalysis = currencyService.getDefaultAnalysis();
    console.log('預設 Williams %R:', defaultAnalysis.technicalAnalysis.williamsR);
    console.log('預設市場情緒:', defaultAnalysis.marketSentiment);
    
    // 檢查是否使用了預設分析
    if (aiAnalysis.analysis && 
        aiAnalysis.analysis.marketSentiment?.summary === defaultAnalysis.marketSentiment.summary) {
      console.log('\n🚨 問題確認: 系統使用了預設分析，而非 AI 分析結果');
      console.log('這表示 JSON 解析過程中出現了問題');
    }
    
  } catch (error) {
    console.error('❌ 調試失敗:', error.message);
    console.error(error);
  }
}

debugJSONParsingIssue().catch(console.error);