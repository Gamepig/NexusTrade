/**
 * 調試 JSON 解析位置 938 的問題
 */

// 從日誌中複製的實際 AI 回應
const actualAIResponse = `{
  "trend": {
    "direction": "neutral",
    "confidence": 75,
    "summary": "ETHUSDT目前處於中性趨勢，沒有明確的看漲或看跌信號。"
  },
  "technicalAnalysis": {
    "rsi": {
      "signal": "持有",
      "interpretation": "RSI值為50.12，接近中性區域，顯示市場既不超買也不超賣，建議持幣觀望。"
    },
    "macd": {
      "signal": "買入",
      "interpretation": "MACD值為11.56，顯示短期均線高於長期均線，可能預示著上漲趨勢的開始，建議關注買入機會。"
    },
    "movingAverage": {
      "signal": "看漲",
      "interpretation": "當前價格$2407.59高於7日均線2373.73，顯示短期內市場處於上行趨勢，支持看漲信號。"
    },
    "bollingerBands": {
      "signal": "等待突破",
      "interpretation": "未提供布林帶數據，無法進行具體分析，建議等待價格突破上下軌道再做決策。"
    },
    "volume": {
      "signal": "觀望",
      "interpretation": "未提供成交量數據，無法進行具體分析，建議關注成交量變化以確認趨勢。"
    },
    "williamsR": {
      "signal": "持有",
      "interpretation": "Williams %R值為-35.31，處於中性區域，顯示市場既不超買也不超賣，建議持幣觀望。"
    }
  },
  "marketSentiment": {
    "score": 65,
    "label": "neutral",
    "summary": "市場情緒中性偏正面，投資者對ETHUSDT的態度既不極端樂觀也不悲觀，建議保持謹慎並關注市場動態。"
  }
}`;

console.log('🔍 調試 JSON 解析位置 938 問題\n');

console.log('=== 1. 檢查 JSON 總長度 ===');
console.log('JSON 總長度:', actualAIResponse.length);

console.log('\n=== 2. 檢查位置 938 附近的內容 ===');
const problemPos = 938;
const contextStart = Math.max(0, problemPos - 50);
const contextEnd = Math.min(actualAIResponse.length, problemPos + 50);
console.log(`位置 ${contextStart}-${contextEnd} 的內容:`);
console.log('"' + actualAIResponse.substring(contextStart, contextEnd) + '"');

console.log('\n=== 3. 檢查位置 938 的具體字符 ===');
if (problemPos < actualAIResponse.length) {
  const charAtPos = actualAIResponse[problemPos];
  console.log(`位置 ${problemPos} 的字符: "${charAtPos}" (ASCII: ${charAtPos.charCodeAt(0)})`);
  console.log(`前一個字符: "${actualAIResponse[problemPos - 1]}" (ASCII: ${actualAIResponse[problemPos - 1].charCodeAt(0)})`);
  console.log(`後一個字符: "${actualAIResponse[problemPos + 1]}" (ASCII: ${actualAIResponse[problemPos + 1].charCodeAt(0)})`);
} else {
  console.log(`位置 ${problemPos} 超出字符串長度`);
}

console.log('\n=== 4. 嘗試直接解析 ===');
try {
  const parsed = JSON.parse(actualAIResponse);
  console.log('✅ 直接解析成功');
  console.log('解析後結構鍵值:', Object.keys(parsed));
  
  if (parsed.technicalAnalysis?.williamsR) {
    console.log('Williams %R:', parsed.technicalAnalysis.williamsR);
  }
  
  if (parsed.marketSentiment) {
    console.log('市場情緒:', {
      score: parsed.marketSentiment.score,
      label: parsed.marketSentiment.label,
      summary: parsed.marketSentiment.summary?.substring(0, 50) + '...'
    });
  }
  
} catch (error) {
  console.log('❌ 直接解析失敗:', error.message);
  
  // 檢查是否有隱藏字符
  console.log('\n=== 5. 檢查隱藏字符 ===');
  const hiddenChars = [];
  for (let i = 0; i < actualAIResponse.length; i++) {
    const char = actualAIResponse[i];
    const code = char.charCodeAt(0);
    if (code < 32 || code > 126) {
      hiddenChars.push({ pos: i, char: char, code: code });
    }
  }
  
  if (hiddenChars.length > 0) {
    console.log('發現隱藏字符:', hiddenChars);
  } else {
    console.log('未發現隱藏字符');
  }
}