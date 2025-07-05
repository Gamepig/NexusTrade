const mongoose = require('mongoose');
const User = require('../../src/models/User.model');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const binanceService = require('../../src/services/binance.service');

// 設置 axios 基礎 URL
axios.defaults.baseURL = process.env.TEST_API_URL || 'http://localhost:3000';

// 模擬 Binance 服務
global.mockBinanceAPI = (symbols = []) => {
  jest.mock('../../src/services/binance.service', () => ({
    getPriceData: jest.fn((symbol) => ({
      symbol,
      price: Math.random() * 1000,
      priceChange: Math.random() * 10
    }))
  }));
};

// 創建測試用戶
global.createTestUser = async () => {
  const testUser = new User({
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!'
  });
  
  await testUser.save();
  
  const token = jwt.sign(
    { userId: testUser._id.toString() }, 
    process.env.JWT_SECRET || 'default_secret', 
    { expiresIn: '1h' }
  );
  
  return { user: testUser, token };
};

// 在測試開始前連接到測試資料庫
beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexustrade_test';
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

// 在測試結束後斷開資料庫連接
afterAll(async () => {
  await mongoose.connection.close();
});