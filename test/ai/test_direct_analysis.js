const { getHomepageAnalysisService } = require('./src/services/ai-homepage-analysis.service');

async function testDirectAnalysis() {
  try {
    const service = getHomepageAnalysisService();
    console.log('開始測試分析...');
    
    const result = await service.performHomepageTrendAnalysis();
    console.log('分析成功，結果結構:');
    console.log('- ID:', result._id);
    console.log('- analysisType:', result.analysisType);
    console.log('- analysisDate:', result.analysisDate);
    console.log('- analysis 物件存在:', !!result.analysis);
    
    if (result.analysis) {
      console.log('  - trend:', !!result.analysis.trend);
      console.log('  - marketSentiment:', !!result.analysis.marketSentiment);
      console.log('  - timeframeAnalysis:', !!result.analysis.timeframeAnalysis);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('測試失敗:', error.message);
    process.exit(1);
  }
}

testDirectAnalysis();