/**
 * 測試實際 AI 回應格式
 */

// 這次的實際回應格式
const newResponse = `"{\n  \"trend\": {\"direction\": \"neutral\", \"confidence\": 75, \"summary\": \"ETHUSDT目前處於中性趨勢，價格波動不大，短期內可能維持橫盤整理。\"},\n  \"technicalAnalysis\": {\n    \"rsi\": {\"signal\": \"持有\", \"interpretation\": \"RSI值為52.34，接近中性區域，顯示市場既不超買也不超賣，建議持有。\"},\n    \"macd\": {\"signal\": \"買入\", \"interpretation\": \"MACD值為15.72，顯示正向動能，可能預示著上漲趨勢的開始，建議考慮買入。\"},\n    \"movingAverage\": {\"signal\": \"看漲\", \"interpretation\": \"7日均線為2376.5，低於當前價格，顯示短期內市場有上漲的動能。\"},\n    \"bollingerBands\": {\"signal\": \"等待突破\", \"interpretation\": \"未提供布林帶數據，無法進行具體分析，建議等待價格突破上下軌道。\"},\n    \"volume\": {\"signal\": \"觀望\", \"interpretation\": \"未提供成交量數據，無法進行具體分析，建議觀望。\"},\n    \"williamsR\": {\"signal\": \"持有\", \"interpretation\": \"威廉指標為-31.07，處於中性區域，顯示市場既不超買也不超賣，建議持有。\"}\n  },\n  \"marketSentiment\": {\"score\": 65, \"label\": \"neutral\", \"summary\": \"市場情緒中性偏樂觀，投資者對ETHUSDT的態度較為謹慎，但仍有上漲的潛力。\"}\n}"`;

console.log('🔍 測試實際 AI 回應格式\n');

console.log('=== 檢查回應格式 ===');
console.log('是否以雙引號開始:', newResponse.startsWith('"'));
console.log('是否以雙引號結束:', newResponse.endsWith('"'));
console.log('長度:', newResponse.length);

console.log('\n=== 測試解析 ===');
try {
  // 這應該是字串化 JSON，所以我們需要先解析
  const firstStep = JSON.parse(newResponse);
  console.log('第一步解析成功，結果類型:', typeof firstStep);
  console.log('第一步結果長度:', firstStep.length);
  
  // 清理內容
  const cleaned = firstStep
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字符
    .replace(/,(\s*[}\]])/g, '$1') // 移除尾隨逗號
    .trim();
  
  console.log('清理後長度:', cleaned.length);
  
  // 第二步解析
  try {
    const finalResult = JSON.parse(cleaned);
    console.log('✅ 最終解析成功');
    console.log('Williams %R 數據:', finalResult.technicalAnalysis?.williamsR);
    console.log('市場情緒數據:', {
      score: finalResult.marketSentiment?.score,
      label: finalResult.marketSentiment?.label,
      summary: finalResult.marketSentiment?.summary
    });
  } catch (secondError) {
    console.log('❌ 第二步解析失敗:', secondError.message);
    
    // 檢查問題位置
    const errorPos = parseInt(secondError.message.match(/position (\d+)/)?.[1] || '0');
    console.log('問題位置前後內容:');
    console.log('"' + cleaned.substring(Math.max(0, errorPos - 20), errorPos + 20) + '"');
  }
  
} catch (firstError) {
  console.log('❌ 第一步解析失敗:', firstError.message);
}