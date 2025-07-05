/**
 * 測試 JSON 解析修復
 */

// 模擬真實的 AI 回應內容
const realAIResponse = `"{\n  \"trend\": {\n    \"direction\": \"neutral\",\n    \"confidence\": 75,\n    \"summary\": \"ETHUSDT目前處於中性趨勢，沒有明確的強烈買賣信號。\"\n  },\n  \"technicalAnalysis\": {\n    \"rsi\": {\n      \"signal\": \"持有\",\n      \"interpretation\": \"RSI值為52.15，處於中性區域，市場既不超買也不超賣，建議持有。\"\n    },\n    \"macd\": {\n      \"signal\": \"買入\",\n      \"interpretation\": \"MACD值為15.35，顯示正向動能，可能預示著上漲趨勢，建議考慮買入。\"\n    },\n    \"movingAverage\": {\n      \"signal\": \"看漲\",\n      \"interpretation\": \"當前價格高於7日均線2376.25，顯示短期內市場偏向看漲。\"\n    },\n    \"bollingerBands\": {\n      \"signal\": \"等待突破\",\n      \"interpretation\": \"未提供布林帶具體數據，無法做出精確判斷，建議等待價格突破上下軌道。\"\n    },\n    \"volume\": {\n      \"signal\": \"觀望\",\n      \"interpretation\": \"未提供成交量數據，無法評估市場參與度，建議觀望。\"\n    },\n    \"williamsR\": {\n      \"signal\": \"持有\",\n      \"interpretation\": \"Williams %R值為-31.45，處於中性區域，市場既不超買也不超賣，建議持有。\"\n    }\n  },\n  \"marketSentiment\": {\n    \"score\": 65,\n    \"label\": \"neutral\",\n    \"summary\": \"市場情緒中性偏樂觀，投資者對ETHUSDT的態度既不極端看多也不極端看空。\"\n  }\n}"`;

console.log('🔍 測試 JSON 解析修復\n');

console.log('=== 1. 檢查原始回應格式 ===');
console.log('回應開始字符:', realAIResponse.substring(0, 5));
console.log('回應結束字符:', realAIResponse.substring(realAIResponse.length - 5));
console.log('是否以雙引號開始:', realAIResponse.startsWith('"'));
console.log('是否以雙引號結束:', realAIResponse.endsWith('"'));
console.log('回應長度:', realAIResponse.length);

console.log('\n=== 2. 測試第一步解析 ===');
try {
  const firstStep = JSON.parse(realAIResponse);
  console.log('第一步解析成功');
  console.log('第一步結果類型:', typeof firstStep);
  console.log('第一步結果 (前200字符):', firstStep.substring(0, 200));
  
  console.log('\n=== 3. 測試第二步解析 ===');
  try {
    const secondStep = JSON.parse(firstStep);
    console.log('✅ 第二步解析成功');
    console.log('最終結構鍵值:', Object.keys(secondStep));
    
    if (secondStep.technicalAnalysis && secondStep.technicalAnalysis.williamsR) {
      console.log('Williams %R 解析結果:', secondStep.technicalAnalysis.williamsR);
    }
    
    if (secondStep.marketSentiment) {
      console.log('市場情緒解析結果:', {
        score: secondStep.marketSentiment.score,
        label: secondStep.marketSentiment.label,
        summary: secondStep.marketSentiment.summary
      });
    }
    
  } catch (secondError) {
    console.log('❌ 第二步解析失敗:', secondError.message);
    console.log('問題位置:', secondError.message.match(/position (\d+)/)?.[1]);
    
    // 檢查問題位置的字符
    const errorPos = parseInt(secondError.message.match(/position (\d+)/)?.[1] || '0');
    console.log('問題位置前後內容:', firstStep.substring(errorPos - 10, errorPos + 10));
  }
  
} catch (firstError) {
  console.log('❌ 第一步解析失敗:', firstError.message);
}

console.log('\n=== 4. 測試清理策略 ===');
try {
  const unescaped = JSON.parse(realAIResponse);
  console.log('原始清理前 (問題字符檢查):');
  
  // 檢查控制字符
  const controlChars = unescaped.match(/[\u0000-\u001F\u007F-\u009F]/g);
  if (controlChars) {
    console.log('發現控制字符:', controlChars.map(c => c.charCodeAt(0)));
  } else {
    console.log('未發現控制字符');
  }
  
  // 檢查尾隨逗號
  const trailingCommas = unescaped.match(/,(\s*[}\]])/g);
  if (trailingCommas) {
    console.log('發現尾隨逗號:', trailingCommas);
  } else {
    console.log('未發現尾隨逗號');
  }
  
  // 應用清理
  const cleaned = unescaped
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字符
    .replace(/,(\s*[}\]])/g, '$1') // 移除尾隨逗號
    .trim();
  
  console.log('清理後嘗試解析:');
  try {
    const cleanedParsed = JSON.parse(cleaned);
    console.log('✅ 清理後解析成功');
    console.log('清理後結構鍵值:', Object.keys(cleanedParsed));
  } catch (cleanError) {
    console.log('❌ 清理後仍然解析失敗:', cleanError.message);
  }
  
} catch (e) {
  console.log('清理測試失敗:', e.message);
}