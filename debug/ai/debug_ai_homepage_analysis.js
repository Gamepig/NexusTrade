/**
 * 調試首頁 AI 分析問題
 */

require('dotenv').config();

const { getHomepageAnalysisService } = require('./src/services/ai-homepage-analysis.service');

async function debugAIAnalysis() {
  console.log('🔍 開始調試首頁 AI 分析...\n');
  
  try {
    const homepageService = getHomepageAnalysisService();
    
    console.log('=== 1. 檢查 OpenRouter 配置 ===');
    console.log('配置狀態:', homepageService.isConfigured());
    console.log('API Key 存在:', !!process.env.OPENROUTER_API_KEY);
    
    console.log('\n=== 2. 檢查 OpenRouter 健康狀態 ===');
    const healthStatus = await homepageService.checkOpenRouterHealth();
    console.log('健康狀態:', healthStatus);
    
    if (!healthStatus.healthy) {
      console.log('❌ OpenRouter 服務不可用，停止測試');
      return;
    }
    
    console.log('\n=== 3. 收集分析數據 ===');
    const marketData = await homepageService.collectMarketData();
    console.log('市場數據收集成功:', {
      currencies: marketData.currencies.length,
      totalVolume: marketData.statistics.totalVolume,
      avgPriceChange: marketData.statistics.avgPriceChange
    });
    
    const newsData = await homepageService.collectNewsData();
    console.log('新聞數據收集成功:', {
      articles: newsData.articles.length,
      sentiment: newsData.sentimentAnalysis.overallSentiment
    });
    
    const analysisData = {
      market: marketData,
      news: newsData,
      timestamp: new Date().toISOString()
    };
    
    console.log('\n=== 4. 測試 AI 分析 ===');
    const aiAnalysis = await homepageService.performAIAnalysis(analysisData);
    
    console.log('AI 分析成功:', {
      success: aiAnalysis.success,
      provider: aiAnalysis.provider,
      model: aiAnalysis.model,
      tokensUsed: aiAnalysis.usage?.total_tokens || 0
    });
    
    // 詳細檢查 AI 回應內容
    if (aiAnalysis.analysis && aiAnalysis.analysis.rawResponse) {
      console.log('\n=== AI 回應內容詳細檢查 ===');
      console.log('回應總長度:', aiAnalysis.analysis.rawResponse.length);
      console.log('前 1500 字符:');
      console.log('---');
      console.log(aiAnalysis.analysis.rawResponse.substring(0, 1500));
      console.log('---');
      
      if (aiAnalysis.analysis.rawResponse.length > 1500) {
        console.log('後 500 字符:');
        console.log('---');
        console.log(aiAnalysis.analysis.rawResponse.substring(aiAnalysis.analysis.rawResponse.length - 500));
        console.log('---');
      }
    }
    
    console.log('\n=== 5. 檢查分析結果結構 ===');
    const analysis = aiAnalysis.analysis;
    
    console.log('aiAnalysis 完整結構:');
    console.log('- analysis 是否存在:', !!analysis);
    console.log('- analysis 類型:', typeof analysis);
    
    // 檢查實際的分析數據位置
    const actualAnalysis = analysis.analysis || analysis;
    console.log('- 實際分析數據:', !!actualAnalysis);
    
    if (actualAnalysis) {
      console.log('\n實際分析結果結構檢查:');
      console.log('✓ trend:', !!actualAnalysis.trend);
      console.log('✓ technicalAnalysis:', !!actualAnalysis.technicalAnalysis);  
      console.log('✓ marketSentiment:', !!actualAnalysis.marketSentiment);
      console.log('✓ timeframeAnalysis:', !!actualAnalysis.timeframeAnalysis);
      
      if (actualAnalysis.trend) {
        console.log('\ntrend 詳細內容:');
        console.log('- direction:', actualAnalysis.trend.direction);
        console.log('- confidence:', actualAnalysis.trend.confidence);
        console.log('- summary:', actualAnalysis.trend.summary);
      }
    }
    
    if (analysis.timeframeAnalysis) {
      console.log('timeframeAnalysis 詳細:');
      console.log('  - daily:', !!analysis.timeframeAnalysis.daily);
      console.log('  - weekly:', !!analysis.timeframeAnalysis.weekly);
      console.log('  - monthly:', !!analysis.timeframeAnalysis.monthly);
    }
    
    console.log('\n=== 6. 測試資料庫儲存 ===');
    try {
      const savedResult = await homepageService.saveAnalysisResult(aiAnalysis, analysisData);
      console.log('✅ 資料庫儲存成功');
      console.log('儲存結果 ID:', savedResult._id);
    } catch (saveError) {
      console.log('❌ 資料庫儲存失敗:', saveError.message);
      
      // 詳細分析驗證錯誤
      if (saveError.message.includes('validation failed')) {
        console.log('\n=== 驗證錯誤詳細分析 ===');
        console.log('錯誤詳情:', saveError.message);
      }
    }
    
  } catch (error) {
    console.error('\n❌ 調試過程中發生錯誤:', error.message);
    console.error('完整錯誤:', error);
  }
}

debugAIAnalysis().catch(console.error);