const mongoose = require('mongoose');
const Watchlist = require('../../src/models/Watchlist');
const User = require('../../src/models/User.model');

describe('Watchlist Model Test', () => {
  let testUser;
  let validWatchlistData;

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
    // 創建測試用戶
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    await testUser.save();

    // 準備有效的關注清單資料
    validWatchlistData = {
      user: testUser._id,
      symbol: 'BTCUSDT',
      priority: 1,
      category: 'Top Cryptocurrencies'
    };
  });

  afterEach(async () => {
    // 清除測試資料
    await User.deleteMany({});
    await Watchlist.deleteMany({});
  });

  describe('Watchlist Creation', () => {
    it('should create a valid watchlist item', async () => {
      const watchlistItem = new Watchlist(validWatchlistData);
      const savedItem = await watchlistItem.save();

      expect(savedItem._id).toBeDefined();
      expect(savedItem.user.toString()).toBe(testUser._id.toString());
      expect(savedItem.symbol).toBe('BTCUSDT');
      expect(savedItem.priority).toBe(1);
      expect(savedItem.category).toBe('Top Cryptocurrencies');
    });

    it('should not create a watchlist item without a user', async () => {
      const watchlistItem = new Watchlist({ symbol: 'ETHUSDT' });
      
      await expect(watchlistItem.save()).rejects.toThrow();
    });

    it('should not create a watchlist item with an invalid symbol', async () => {
      const invalidWatchlistData = { ...validWatchlistData, symbol: 'INVALID' };
      const watchlistItem = new Watchlist(invalidWatchlistData);
      
      await expect(watchlistItem.save()).rejects.toThrow();
    });
  });

  describe('Watchlist Static Methods', () => {
    it('findUserWatchlist should return user\'s watchlist', async () => {
      const watchlistItem1 = new Watchlist(validWatchlistData);
      const watchlistItem2 = new Watchlist({
        ...validWatchlistData,
        symbol: 'ETHUSDT',
        priority: 2
      });

      await watchlistItem1.save();
      await watchlistItem2.save();

      const userWatchlist = await Watchlist.findUserWatchlist(testUser._id);
      
      expect(userWatchlist).toHaveLength(2);
      expect(userWatchlist[0].symbol).toBe('BTCUSDT');
      expect(userWatchlist[1].symbol).toBe('ETHUSDT');
    });

    it('addToWatchlist should add a new item', async () => {
      const result = await Watchlist.addToWatchlist(testUser._id, 'ETHUSDT');
      
      expect(result).toBeDefined();
      expect(result.symbol).toBe('ETHUSDT');
      expect(result.user.toString()).toBe(testUser._id.toString());
    });

    it('removeFromWatchlist should remove an item', async () => {
      const watchlistItem = await Watchlist.addToWatchlist(testUser._id, 'ETHUSDT');
      
      const result = await Watchlist.removeFromWatchlist(testUser._id, 'ETHUSDT');
      
      expect(result).toBeDefined();
      
      const remainingItems = await Watchlist.findUserWatchlist(testUser._id);
      expect(remainingItems).toHaveLength(0);
    });
  });

  describe('Watchlist Validation', () => {
    it('should limit watchlist to 30 items', async () => {
      const symbols = Array.from({ length: 31 }, (_, i) => `SYMBOL${i}USDT`);
      
      for (const symbol of symbols.slice(0, 30)) {
        await Watchlist.addToWatchlist(testUser._id, symbol);
      }

      await expect(Watchlist.addToWatchlist(testUser._id, symbols[30])).rejects.toThrow('Watchlist limit exceeded');
    });
  });
}); 