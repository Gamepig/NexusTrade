/**
 * 數據收集除錯腳本
 * 專門檢查我們餵給AI的原始市場數據是否正確
 */

require('dotenv').config();
process.env.LOG_LEVEL = 'debug';

const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');
const { getBinanceService } = require('./src/services/binance.service');

async function debugDataCollection() {
  console.log('🔍 開始數據收集除錯...\n');
  
  try {
    const service = getCurrencyAnalysisService();
    const symbol = 'BTCUSDT';
    
    console.log('=== 1. 直接測試 Binance API ===');
    const binanceService = getBinanceService();
    
    // 測試當前價格
    console.log('1.1 測試當前價格...');
    const currentPrice = await binanceService.getCurrentPrice(symbol);
    console.log('當前價格:', JSON.stringify(currentPrice, null, 2));
    
    // 測試24小時數據
    console.log('\n1.2 測試24小時數據...');
    const ticker24h = await binanceService.get24hrTicker(symbol);
    console.log('24小時數據:', JSON.stringify(ticker24h, null, 2));
    
    // 測試K線數據
    console.log('\n1.3 測試K線數據...');
    const klines = await binanceService.getKlineData(symbol, '1d', 7);
    console.log(`K線數據數量: ${klines ? klines.length : 0}`);
    if (klines && klines.length > 0) {
      console.log('最新K線:', JSON.stringify(klines[klines.length - 1], null, 2));
      console.log('最舊K線:', JSON.stringify(klines[0], null, 2));
    }
    
    console.log('\n=== 2. 測試 collectCurrencyData 方法 ===');
    const currencyData = await service.collectCurrencyData(symbol);
    
    console.log('2.1 收集到的完整數據結構:');
    console.log('- symbol:', currencyData.symbol);
    console.log('- currentPrice:', currencyData.currentPrice);
    console.log('- ticker24h priceChangePercent:', currencyData.ticker24h?.priceChangePercent);
    console.log('- weeklyKlines 長度:', currencyData.weeklyKlines?.length);
    console.log('- technicalIndicators:', Object.keys(currencyData.technicalIndicators || {}));
    
    console.log('\n2.2 技術指標詳細檢查:');
    const indicators = currencyData.technicalIndicators;
    
    console.log('RSI:');
    console.log('  - value:', indicators.rsi?.value);
    console.log('  - interpretation:', indicators.rsi?.interpretation);
    console.log('  - signal:', indicators.rsi?.signal);
    
    console.log('移動平均線:');
    console.log('  - ma3:', indicators.movingAverages?.ma3);
    console.log('  - ma7:', indicators.movingAverages?.ma7);
    console.log('  - position:', indicators.movingAverages?.position);
    console.log('  - signal:', indicators.movingAverages?.signal);
    
    console.log('布林帶:');
    console.log('  - upper:', indicators.bollingerBands?.upper);
    console.log('  - middle:', indicators.bollingerBands?.middle);
    console.log('  - lower:', indicators.bollingerBands?.lower);
    console.log('  - position:', indicators.bollingerBands?.position);
    console.log('  - signal:', indicators.bollingerBands?.signal);
    
    console.log('\n2.3 價格統計:');
    const priceStats = currencyData.priceStats;
    console.log('  - weekHigh:', priceStats?.weekHigh);
    console.log('  - weekLow:', priceStats?.weekLow);
    console.log('  - weekAvg:', priceStats?.weekAvg);
    console.log('  - currentPosition:', priceStats?.currentPosition);
    
    console.log('\n=== 3. 檢查數據合理性 ===');
    
    // 檢查價格是否合理（BTC應該在40000-200000之間）
    const price = currencyData.currentPrice?.price;
    if (price && (price < 40000 || price > 200000)) {
      console.log('❌ 當前價格異常:', price);
    } else {
      console.log('✅ 當前價格合理:', price);
    }
    
    // 檢查技術指標是否為預設值
    const rsi = indicators.rsi?.value;
    if (rsi === 50) {
      console.log('⚠️ RSI 為預設值 50，可能計算有問題');
    } else {
      console.log('✅ RSI 值正常:', rsi);
    }
    
    // 檢查移動平均線是否為0
    const ma7 = indicators.movingAverages?.ma7;
    if (ma7 === 0) {
      console.log('❌ MA7 為 0，計算有問題');
    } else {
      console.log('✅ MA7 值正常:', ma7);
    }
    
    console.log('\n=== 4. 測試建立提示詞 ===');
    const prompt = service.buildAnalysisPrompt(symbol, currencyData);
    console.log('提示詞長度:', prompt.length);
    console.log('提示詞包含的價格:', prompt.match(/當前價格: \$[\d,]+\.?\d*/)?.[0]);
    console.log('提示詞包含的變化:', prompt.match(/24小時變化: [\d.-]+%/)?.[0]);
    console.log('提示詞包含的RSI:', prompt.match(/RSI: [\d.]+/)?.[0]);
    
    console.log('\n=== 5. 原始K線數據檢查 ===');
    if (currencyData.weeklyKlines && currencyData.weeklyKlines.length > 0) {
      console.log('原始K線數據樣本:');
      currencyData.weeklyKlines.forEach((kline, index) => {
        console.log(`第${index + 1}天:`, {
          openTime: new Date(kline.openTime).toISOString(),
          open: parseFloat(kline.open),
          high: parseFloat(kline.high),
          low: parseFloat(kline.low),
          close: parseFloat(kline.close),
          volume: parseFloat(kline.volume)
        });
      });
      
      // 檢查價格數據是否合理
      const closes = currencyData.weeklyKlines.map(k => parseFloat(k.close));
      const minClose = Math.min(...closes);
      const maxClose = Math.max(...closes);
      console.log('\n價格範圍檢查:');
      console.log('最低收盤價:', minClose);
      console.log('最高收盤價:', maxClose);
      console.log('價格波動幅度:', ((maxClose - minClose) / minClose * 100).toFixed(2) + '%');
    }
    
  } catch (error) {
    console.error('❌ 數據收集除錯失敗:', error.message);
    console.error('錯誤堆疊:', error.stack);
  }
}

// 執行除錯
debugDataCollection().catch(console.error);