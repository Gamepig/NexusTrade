const { getCurrencyAnalysisService } = require('../src/services/ai-currency-analysis.service');

let service;

beforeAll(() => {
  service = getCurrencyAnalysisService();
});

describe('AI Analysis Service', () => {
  test('should return bollinger values', async () => {
    const mockData = {
      symbol: 'TEST',
      currentPrice: { price: 100 },
      ticker24h: { priceChangePercent: 5 },
      weeklyKlines: [
        [0, 0, 105, 95, 100, 50],
        [0, 0, 110, 90, 100, 100],
        [0, 0, 115, 85, 100, 150]
      ],
      technicalIndicators: {
        bollingerBands: {
          upper: 120,
          middle: 100,
          lower: 80
        }
      }
    };

    const result = service.calculateTechnicalIndicators(
      mockData.weeklyKlines.map(k => parseFloat(k[2])),
      mockData.weeklyKlines.map(k => parseFloat(k[3])),
      mockData.weeklyKlines.map(k => parseFloat(k[4])),
      mockData.weeklyKlines.map(k => parseFloat(k[5]))
    );

    console.log('Step 1 - calculateTechnicalIndicators Result:', result);

    expect(result.bollingerBands.upper).toBeGreaterThan(0);
    expect(result.bollingerBands.middle).toBeGreaterThan(0);
    expect(result.bollingerBands.lower).toBeGreaterThan(0);
  });

  test('should trace bollinger bands through data flow', async () => {
    console.log('\n=== 開始布林通道數據流追蹤測試 ===');
    
    // 模擬 AI 回應 JSON
    const mockAIResponse = `{
      "trend": {
        "direction": "bullish",
        "confidence": 75,
        "summary": "測試趨勢"
      },
      "technicalAnalysis": {
        "rsi": {"value": 60, "signal": "持有", "interpretation": "RSI測試"},
        "macd": {"value": 5, "signal": "買入", "interpretation": "MACD測試"},
        "movingAverage": {"value": 100, "signal": "持有", "interpretation": "MA測試"},
        "bollingerBands": {"value": 100, "signal": "等待突破", "interpretation": "布林通道測試"},
        "volume": {"value": null, "signal": "持有", "interpretation": "成交量測試"},
        "williamsR": {"value": -50, "signal": "持有", "interpretation": "威廉指標測試"}
      },
      "marketSentiment": {
        "score": 65,
        "label": "neutral",
        "summary": "市場情緒測試"
      }
    }`;

    const rawResult = {
      usage: { total_tokens: 100 },
      model: 'test-model'
    };

    console.log('\n--- Step 1: parseAIResponse ---');
    const parseResult = service.parseAIResponse(mockAIResponse, rawResult);
    console.log('parseAIResponse 結果:', JSON.stringify(parseResult.analysis, null, 2));

    // 檢查布林通道數值是否在解析過程中被保留
    expect(parseResult.analysis.technicalAnalysis.bollingerBands.value).toBe(100);
    expect(parseResult.analysis.technicalAnalysis.bollingerBands.signal).toBe('等待突破');
    expect(parseResult.analysis.technicalAnalysis.bollingerBands.interpretation).toBe('布林通道測試');

    console.log('\n=== 布林通道數據流追蹤測試完成 ===\n');
  });
});
