const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const User = require('../../src/models/User.model');
const Watchlist = require('../../src/models/Watchlist');
const jwt = require('../../src/utils/jwt');

describe('Watchlist Controller Integration Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // 連接測試資料庫
    await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/nexustrade_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    // 關閉資料庫連接
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // 創建測試用戶並生成 JWT
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    await testUser.save();

    authToken = jwt.generateToken(testUser);
  });

  afterEach(async () => {
    // 清除測試資料
    await User.deleteMany({});
    await Watchlist.deleteMany({});
  });

  describe('GET /api/watchlist', () => {
    it('should return user\'s watchlist', async () => {
      // 預先添加兩個關注清單項目
      await Watchlist.create([
        { user: testUser._id, symbol: 'BTCUSDT', priority: 1 },
        { user: testUser._id, symbol: 'ETHUSDT', priority: 2 }
      ]);

      const response = await request(app)
        .get('/api/watchlist')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].symbol).toBe('BTCUSDT');
      expect(response.body.data[1].symbol).toBe('ETHUSDT');
    });

    it('should support pagination', async () => {
      // 創建 35 個關注清單項目
      const symbols = Array.from({ length: 35 }, (_, i) => `SYMBOL${i}USDT`);
      await Watchlist.create(symbols.map(symbol => ({
        user: testUser._id,
        symbol,
        priority: Math.floor(Math.random() * 5) + 1
      })));

      const response = await request(app)
        .get('/api/watchlist?page=2&limit=20')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.data).toHaveLength(15);
      expect(response.body.pagination.totalItems).toBe(35);
      expect(response.body.pagination.currentPage).toBe(2);
    });
  });

  describe('POST /api/watchlist', () => {
    it('should add a new watchlist item', async () => {
      const response = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ symbol: 'BTCUSDT', priority: 1, category: 'Top Crypto' });

      expect(response.statusCode).toBe(201);
      expect(response.body.data.symbol).toBe('BTCUSDT');
      expect(response.body.data.priority).toBe(1);
      expect(response.body.data.category).toBe('Top Crypto');
    });

    it('should prevent adding duplicate symbols', async () => {
      await Watchlist.create({
        user: testUser._id,
        symbol: 'BTCUSDT',
        priority: 1
      });

      const response = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ symbol: 'BTCUSDT', priority: 2 });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('已存在於關注清單');
    });

    it('should prevent adding more than 30 items', async () => {
      const symbols = Array.from({ length: 30 }, (_, i) => `SYMBOL${i}USDT`);
      await Watchlist.create(symbols.map(symbol => ({
        user: testUser._id,
        symbol,
        priority: 1
      })));

      const response = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ symbol: 'NEWUSDT', priority: 1 });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('關注清單已達到上限');
    });
  });

  describe('DELETE /api/watchlist/:symbol', () => {
    it('should remove a watchlist item', async () => {
      await Watchlist.create({
        user: testUser._id,
        symbol: 'BTCUSDT',
        priority: 1
      });

      const response = await request(app)
        .delete('/api/watchlist/BTCUSDT')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toContain('已成功移除');

      const remainingItems = await Watchlist.findUserWatchlist(testUser._id);
      expect(remainingItems).toHaveLength(0);
    });

    it('should return 404 when symbol not found', async () => {
      const response = await request(app)
        .delete('/api/watchlist/BTCUSDT')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toContain('未找到');
    });
  });

  describe('GET /api/watchlist/status/:symbol', () => {
    it('should return watchlist status for a symbol', async () => {
      await Watchlist.create({
        user: testUser._id,
        symbol: 'BTCUSDT',
        priority: 1
      });

      const response = await request(app)
        .get('/api/watchlist/status/BTCUSDT')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.isInWatchlist).toBe(true);
    });

    it('should return false for symbol not in watchlist', async () => {
      const response = await request(app)
        .get('/api/watchlist/status/BTCUSDT')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.isInWatchlist).toBe(false);
    });
  });
}); 