/**
 * 調試 K線數據格式問題
 */

require('dotenv').config();

const { getBinanceService } = require('./src/services/binance.service');

async function debugKlineData() {
  console.log('🔍 調試 K線數據格式問題\n');
  
  try {
    const binanceService = getBinanceService();
    
    console.log('=== 1. 測試 ETHUSDT K線數據 ===');
    const weeklyKlines = await binanceService.getKlineData('ETHUSDT', '1d', 7);
    
    console.log('K線數據長度:', weeklyKlines.length);
    console.log('第一條 K線數據:', weeklyKlines[0]);
    console.log('數據類型:', typeof weeklyKlines[0]);
    
    if (Array.isArray(weeklyKlines[0])) {
      console.log('K線數據格式分析:');
      console.log('  [0] 開盤時間:', weeklyKlines[0][0]);
      console.log('  [1] 開盤價:', weeklyKlines[0][1]);
      console.log('  [2] 最高價:', weeklyKlines[0][2]);
      console.log('  [3] 最低價:', weeklyKlines[0][3]);
      console.log('  [4] 收盤價:', weeklyKlines[0][4]);
      console.log('  [5] 成交量:', weeklyKlines[0][5]);
      
      console.log('\n解析後的價格數據:');
      const highs = weeklyKlines.map((kline, index) => {
        const high = parseFloat(kline[2]);
        console.log(`  K線 ${index}: 最高價 ${kline[2]} -> ${high}`);
        return high;
      });
      
      const lows = weeklyKlines.map((kline, index) => {
        const low = parseFloat(kline[3]);
        console.log(`  K線 ${index}: 最低價 ${kline[3]} -> ${low}`);
        return low;
      });
      
      const closes = weeklyKlines.map((kline, index) => {
        const close = parseFloat(kline[4]);
        console.log(`  K線 ${index}: 收盤價 ${kline[4]} -> ${close}`);
        return close;
      });
      
      console.log('\n數據有效性檢查:');
      console.log('  高價陣列:', highs);
      console.log('  低價陣列:', lows);
      console.log('  收盤價陣列:', closes);
      
      const hasNaN = highs.some(isNaN) || lows.some(isNaN) || closes.some(isNaN);
      if (hasNaN) {
        console.log('❌ 發現 NaN 值！');
        console.log('  高價 NaN 數量:', highs.filter(isNaN).length);
        console.log('  低價 NaN 數量:', lows.filter(isNaN).length);
        console.log('  收盤價 NaN 數量:', closes.filter(isNaN).length);
      } else {
        console.log('✅ 所有價格數據都是有效數字');
      }
      
      console.log('\n=== 2. 手動計算布林通道 ===');
      
      // 手動計算布林通道
      const period = 7;
      const multiplier = 2;
      
      if (closes.length >= period) {
        const recentPrices = closes.slice(-period);
        console.log('用於計算的價格:', recentPrices);
        
        const mean = recentPrices.reduce((sum, price) => sum + price, 0) / period;
        console.log('平均價格:', mean);
        
        if (isNaN(mean)) {
          console.log('❌ 平均價格計算出 NaN!');
          console.log('  原始價格總和:', recentPrices.reduce((sum, price) => sum + price, 0));
          console.log('  週期:', period);
        } else {
          const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
          const standardDeviation = Math.sqrt(variance);
          
          console.log('方差:', variance);
          console.log('標準差:', standardDeviation);
          
          const result = {
            upper: Math.round((mean + (standardDeviation * multiplier)) * 100) / 100,
            middle: Math.round(mean * 100) / 100,
            lower: Math.round((mean - (standardDeviation * multiplier)) * 100) / 100
          };
          
          console.log('布林通道計算結果:', result);
        }
      } else {
        console.log('❌ 數據不足以計算布林通道，需要至少', period, '個數據點，實際只有', closes.length);
      }
      
    } else {
      console.log('❌ K線數據格式不正確，期望陣列但得到:', typeof weeklyKlines[0]);
    }
    
  } catch (error) {
    console.error('❌ 調試失敗:', error.message);
    console.error(error);
  }
}

debugKlineData().catch(console.error);