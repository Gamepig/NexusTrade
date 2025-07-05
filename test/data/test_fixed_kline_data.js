/**
 * 測試修復後的 K線數據處理
 */

require('dotenv').config();

const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');

async function testFixedKlineData() {
  console.log('🔧 測試修復後的 K線數據處理\n');
  
  try {
    const currencyService = getCurrencyAnalysisService();
    
    console.log('=== 1. 直接測試數據收集功能 ===');
    
    const symbol = 'ETHUSDT';
    const currencyData = await currencyService.collectCurrencyData(symbol);
    
    console.log('\n收集到的數據:');
    console.log('  當前價格:', currencyData.currentPrice);
    console.log('  24h 統計:', currencyData.ticker24h?.symbol, currencyData.ticker24h?.priceChangePercent);
    console.log('  K線數據量:', currencyData.weeklyKlines?.length);
    console.log('  技術指標:', Object.keys(currencyData.technicalIndicators || {}));
    
    console.log('\n=== 2. 檢查布林通道計算結果 ===');
    const bb = currencyData.technicalIndicators?.bollingerBands;
    if (bb) {
      console.log('布林通道結果:');
      console.log('  上軌:', bb.upper);
      console.log('  中軌:', bb.middle);
      console.log('  下軌:', bb.lower);
      console.log('  位置:', bb.position);
      console.log('  信號:', bb.signal);
      
      if (bb.upper > 0 && bb.middle > 0 && bb.lower > 0) {
        console.log('✅ 布林通道數值計算成功！');
      } else {
        console.log('❌ 布林通道數值仍然無效');
      }
    } else {
      console.log('❌ 布林通道計算失敗');
    }
    
    console.log('\n=== 3. 檢查其他技術指標 ===');
    const ti = currencyData.technicalIndicators;
    if (ti) {
      console.log('RSI:', ti.rsi?.value);
      console.log('MACD:', ti.macd?.value);
      console.log('MA7:', ti.movingAverages?.ma7);
      console.log('Williams %R:', ti.williamsR?.value);
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error(error);
  }
}

testFixedKlineData().catch(console.error);