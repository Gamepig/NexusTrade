/**
 * 測試布林通道數值修復效果
 */

require('dotenv').config();
process.env.LOG_LEVEL = 'info';

const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');

async function testBollingerBandsFix() {
  console.log('🔧 測試布林通道數值修復效果\n');
  
  try {
    const currencyService = getCurrencyAnalysisService();
    
    console.log('=== 1. 檢查服務配置 ===');
    console.log('AI 服務配置:', currencyService.isConfigured());
    
    console.log('\n=== 2. 直接測試技術指標計算 ===');
    
    // 模擬一些測試數據
    const testPrices = [100000, 101000, 99000, 102000, 98000, 103000, 97000];
    const testHighs = [101000, 102000, 100000, 103000, 99000, 104000, 98000];
    const testLows = [99000, 100000, 98000, 101000, 97000, 102000, 96000];
    const testVolumes = [1000, 1100, 900, 1200, 800, 1300, 700];
    
    const technicalIndicators = currencyService.calculateTechnicalIndicators(
      testHighs, testLows, testPrices, testVolumes
    );
    
    console.log('布林通道計算結果:');
    console.log('  上軌:', technicalIndicators.bollingerBands.upper);
    console.log('  中軌:', technicalIndicators.bollingerBands.middle);
    console.log('  下軌:', technicalIndicators.bollingerBands.lower);
    console.log('  位置:', technicalIndicators.bollingerBands.position);
    console.log('  信號:', technicalIndicators.bollingerBands.signal);
    
    console.log('\n=== 3. 測試合併邏輯 ===');
    
    // 模擬 AI 分析結果（只有位置信息，沒有數值）
    const mockAIAnalysis = {
      trend: { direction: 'neutral', confidence: 60, summary: '測試趨勢' },
      technicalAnalysis: {
        bollingerBands: {
          position: '中軌',
          signal: '等待',
          interpretation: 'AI 分析的布林通道解讀'
        }
      },
      marketSentiment: { score: 50, label: 'neutral', summary: '測試情緒' }
    };
    
    // 測試合併邏輯
    const mergedResult = currencyService.mergeTechnicalIndicatorsWithAI(
      mockAIAnalysis, 
      { bollingerBands: technicalIndicators.bollingerBands }
    );
    
    console.log('合併後布林通道結果:');
    const bb = mergedResult.technicalAnalysis.bollingerBands;
    console.log('  上軌:', bb.upper);
    console.log('  中軌:', bb.middle);
    console.log('  下軌:', bb.lower);
    console.log('  位置:', bb.position);
    console.log('  信號:', bb.signal);
    console.log('  解讀:', bb.interpretation);
    
    // 驗證修復效果
    if (bb.upper && bb.middle && bb.lower && 
        bb.upper > 0 && bb.middle > 0 && bb.lower > 0) {
      console.log('\n✅ 布林通道數值修復成功！');
      console.log('   - 數值正確保留');
      console.log('   - AI 分析也被保留');
      console.log('   - 前端應該能顯示完整的數值信息');
    } else {
      console.log('\n❌ 布林通道數值修復失敗');
      console.log('   數值狀況:', { upper: bb.upper, middle: bb.middle, lower: bb.lower });
    }
    
    console.log('\n=== 4. 測試前端格式化預期 ===');
    
    // 模擬前端 formatIndicatorValue 邏輯
    const { upper, middle, lower, position } = bb;
    if (upper && upper > 0 && middle && middle > 0 && lower && lower > 0) {
      const frontendDisplay = `上軌: ${upper.toFixed(2)}<br>中軌: ${middle.toFixed(2)}<br>下軌: ${lower.toFixed(2)}`;
      console.log('前端預期顯示:');
      console.log('  ', frontendDisplay.replace('<br>', ', ').replace('<br>', ', '));
    } else {
      console.log('前端將顯示降級信息:', position || '待確認');
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error(error);
  }
}

testBollingerBandsFix().catch(console.error);