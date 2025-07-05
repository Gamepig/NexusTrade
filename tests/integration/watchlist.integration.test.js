const axios = require('axios');
const Watchlist = require('../../src/models/Watchlist');

describe('Watchlist Integration Tests', () => {
  let authToken;
  let testUser;
  const testSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];

  beforeAll(async () => {
    // 創建測試用戶並獲取授權令牌
    const testUserData = await global.createTestUser();
    authToken = testUserData.token;
    testUser = testUserData.user;
    
    // 模擬 Binance API
    global.mockBinanceAPI(testSymbols);
  });

  describe('新增關注清單項目', () => {
    test('成功新增交易對', async () => {
      const response = await axios.post('/api/watchlist', 
        { symbol: 'BTCUSDT', priority: 1 },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.status).toBe(201);
      expect(response.data.data.symbol).toBe('BTCUSDT');
      expect(response.data.data.priority).toBe(1);
    });

    test('不能超過 30 個關注項目', async () => {
      // 模擬新增 30 個項目
      const addPromises = Array.from({ length: 30 }, (_, i) => 
        axios.post('/api/watchlist', 
          { symbol: `TEST${i}USDT`, priority: 3 },
          { headers: { Authorization: `Bearer ${authToken}` } }
        )
      );

      await Promise.all(addPromises);

      // 嘗試新增第 31 個項目
      await expect(
        axios.post('/api/watchlist', 
          { symbol: 'DOGEUSDT', priority: 3 },
          { headers: { Authorization: `Bearer ${authToken}` } }
        )
      ).rejects.toThrow('關注清單已達上限');
    });
  });

  describe('取得關注清單', () => {
    test('成功取得關注清單', async () => {
      const response = await axios.get('/api/watchlist', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.data.watchlist.length).toBeGreaterThan(0);
      expect(response.data.data.watchlist[0]).toHaveProperty('symbol');
      expect(response.data.data.watchlist[0]).toHaveProperty('priceData');
    });
  });

  describe('移除關注清單項目', () => {
    test('成功移除交易對', async () => {
      const response = await axios.delete('/api/watchlist/BTCUSDT', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.data.symbol).toBe('BTCUSDT');
    });
  });

  describe('關注清單狀態', () => {
    test('檢查交易對關注狀態', async () => {
      // 先新增一個項目
      await axios.post('/api/watchlist', 
        { symbol: 'ETHUSDT', priority: 2 },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      const response = await axios.get('/api/watchlist/status/ETHUSDT', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.data.isWatched).toBe(true);
    });
  });

  afterAll(async () => {
    // 清理測試資料
    await Watchlist.deleteMany({ userId: testUser._id });
  });
}); 