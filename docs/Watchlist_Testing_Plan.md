# NexusTrade 關注清單測試計畫

**版本**: 1.0  
**日期**: 2025-06-29  
**作者**: AI Assistant  

## 📋 測試策略概述

本文件定義了 NexusTrade 關注清單功能的完整測試策略，涵蓋單元測試、整合測試、端對端測試和效能測試，確保功能的可靠性和穩定性。

## 🎯 測試目標

### 主要目標
- 確保關注清單功能穩定運作
- 驗證前後端整合的正確性
- 保證使用者體驗的一致性
- 驗證安全性和效能要求

### 品質標準
- **程式碼覆蓋率**: ≥ 80%
- **API 回應時間**: ≤ 200ms
- **前端載入時間**: ≤ 2s
- **錯誤率**: ≤ 0.1%

## 🧪 測試類型與範圍

### 1. 單元測試 (Unit Tests)

#### 後端 API 測試

```javascript
// tests/unit/watchlist.controller.test.js
const request = require('supertest');
const app = require('../../src/server');
const Watchlist = require('../../src/models/Watchlist');

describe('Watchlist Controller', () => {
  let authToken;
  let testUserId = 'test-user-123';

  beforeEach(async () => {
    // 清理測試資料
    await Watchlist.deleteMany({ userId: testUserId });
    
    // 取得測試用認證令牌
    authToken = await getTestAuthToken(testUserId);
  });

  describe('GET /api/watchlist', () => {
    it('應該回傳空的關注清單', async () => {
      const response = await request(app)
        .get('/api/watchlist')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.watchlist).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('應該回傳使用者的關注清單', async () => {
      // 準備測試資料
      await Watchlist.create({
        userId: testUserId,
        symbol: 'BTCUSDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        priority: 5
      });

      const response = await request(app)
        .get('/api/watchlist')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.watchlist).toHaveLength(1);
      expect(response.body.data.watchlist[0].symbol).toBe('BTCUSDT');
    });

    it('應該支援分頁查詢', async () => {
      // 建立 15 個測試項目
      const symbols = Array.from({length: 15}, (_, i) => 
        `TEST${i.toString().padStart(2, '0')}USDT`
      );
      
      for (const symbol of symbols) {
        await Watchlist.create({
          userId: testUserId,
          symbol,
          baseAsset: symbol.replace('USDT', ''),
          quoteAsset: 'USDT',
          priority: 3
        });
      }

      const response = await request(app)
        .get('/api/watchlist?limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.watchlist).toHaveLength(10);
      expect(response.body.data.total).toBe(15);
      expect(response.body.data.hasMore).toBe(true);
    });
  });

  describe('POST /api/watchlist', () => {
    it('應該成功新增關注項目', async () => {
      const newItem = {
        symbol: 'ETHUSDT',
        priority: 4
      };

      const response = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newItem)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('ETHUSDT');

      // 驗證資料庫中的資料
      const dbItem = await Watchlist.findOne({ 
        userId: testUserId, 
        symbol: 'ETHUSDT' 
      });
      expect(dbItem).toBeTruthy();
    });

    it('應該拒絕重複的交易對', async () => {
      // 先新增一個項目
      await Watchlist.create({
        userId: testUserId,
        symbol: 'BTCUSDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT'
      });

      const response = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ symbol: 'BTCUSDT' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('已經在關注清單中');
    });

    it('應該驗證交易對格式', async () => {
      const invalidSymbols = ['BTC', 'INVALID', '123USDT'];

      for (const symbol of invalidSymbols) {
        const response = await request(app)
          .post('/api/watchlist')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ symbol })
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    it('應該驗證優先級範圍', async () => {
      const invalidPriorities = [-1, 0, 6, 10];

      for (const priority of invalidPriorities) {
        const response = await request(app)
          .post('/api/watchlist')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ symbol: 'ETHUSDT', priority })
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('DELETE /api/watchlist/:symbol', () => {
    beforeEach(async () => {
      await Watchlist.create({
        userId: testUserId,
        symbol: 'BTCUSDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT'
      });
    });

    it('應該成功移除關注項目', async () => {
      const response = await request(app)
        .delete('/api/watchlist/BTCUSDT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // 驗證資料庫中的資料已移除
      const dbItem = await Watchlist.findOne({ 
        userId: testUserId, 
        symbol: 'BTCUSDT' 
      });
      expect(dbItem).toBeNull();
    });

    it('應該處理不存在的項目', async () => {
      const response = await request(app)
        .delete('/api/watchlist/NONEXISTENT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/watchlist/:symbol', () => {
    beforeEach(async () => {
      await Watchlist.create({
        userId: testUserId,
        symbol: 'BTCUSDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        priority: 3
      });
    });

    it('應該成功更新優先級', async () => {
      const response = await request(app)
        .patch('/api/watchlist/BTCUSDT')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);

      // 驗證資料庫中的資料已更新
      const dbItem = await Watchlist.findOne({ 
        userId: testUserId, 
        symbol: 'BTCUSDT' 
      });
      expect(dbItem.priority).toBe(5);
    });

    it('應該成功更新備註', async () => {
      const notes = '長期持有的比特幣';
      const response = await request(app)
        .patch('/api/watchlist/BTCUSDT')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes })
        .expect(200);

      expect(response.body.success).toBe(true);

      const dbItem = await Watchlist.findOne({ 
        userId: testUserId, 
        symbol: 'BTCUSDT' 
      });
      expect(dbItem.notes).toBe(notes);
    });
  });

  describe('GET /api/watchlist/stats', () => {
    beforeEach(async () => {
      const testItems = [
        { symbol: 'BTCUSDT', priority: 5, category: 'trading' },
        { symbol: 'ETHUSDT', priority: 4, category: 'longterm' },
        { symbol: 'BNBUSDT', priority: 3, category: 'watchonly' }
      ];

      for (const item of testItems) {
        await Watchlist.create({
          userId: testUserId,
          baseAsset: item.symbol.replace('USDT', ''),
          quoteAsset: 'USDT',
          ...item
        });
      }
    });

    it('應該回傳正確的統計資訊', async () => {
      const response = await request(app)
        .get('/api/watchlist/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalItems).toBe(3);
      expect(response.body.data.categoryCounts).toEqual({
        trading: 1,
        longterm: 1,
        watchonly: 1
      });
    });
  });
});

// 輔助函數
async function getTestAuthToken(userId) {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}
```

#### 前端組件測試

```javascript
// tests/unit/watchlist-page.test.js
/**
 * @jest-environment jsdom
 */

const WatchlistPage = require('../../public/js/components/WatchlistPage');

// Mock fetch
global.fetch = jest.fn();

// Mock window objects
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

global.window = {
  location: { hash: '' },
  AuthStateManager: {
    getToken: jest.fn(),
    isTokenExpired: jest.fn()
  }
};

describe('WatchlistPage', () => {
  let watchlistPage;

  beforeEach(() => {
    watchlistPage = new WatchlistPage();
    fetch.mockClear();
    
    // Mock DOM elements
    document.body.innerHTML = '<div id="watchlist-container"></div>';
  });

  describe('初始化', () => {
    it('應該正確建立實例', () => {
      expect(watchlistPage).toBeInstanceOf(WatchlistPage);
      expect(watchlistPage.watchlist).toEqual([]);
      expect(watchlistPage.isLoading).toBe(false);
    });
  });

  describe('認證系統', () => {
    it('getAuthToken 應該從 AuthStateManager 取得令牌', () => {
      const mockToken = 'mock.jwt.token';
      window.AuthStateManager.getToken.mockReturnValue(mockToken);
      window.AuthStateManager.isTokenExpired.mockReturnValue(false);

      const token = watchlistPage.getAuthToken();
      expect(token).toBe(mockToken);
    });

    it('getAuthToken 應該處理過期的令牌', () => {
      window.AuthStateManager.getToken.mockReturnValue('expired.token');
      window.AuthStateManager.isTokenExpired.mockReturnValue(true);
      localStorage.getItem.mockReturnValue(null);

      const token = watchlistPage.getAuthToken();
      expect(token).toBeNull();
    });

    it('checkLoginStatus 應該正確檢查登入狀態', () => {
      window.AuthStateManager.getToken.mockReturnValue('valid.token');
      window.AuthStateManager.isTokenExpired.mockReturnValue(false);

      const isLoggedIn = watchlistPage.checkLoginStatus();
      expect(isLoggedIn).toBe(true);
    });
  });

  describe('API 請求', () => {
    it('loadWatchlist 應該成功載入資料', async () => {
      const mockResponse = {
        success: true,
        data: {
          watchlist: [
            { symbol: 'BTCUSDT', baseAsset: 'BTC', priority: 5 }
          ],
          total: 1
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      window.AuthStateManager.getToken.mockReturnValue('valid.token');
      window.AuthStateManager.isTokenExpired.mockReturnValue(false);

      await watchlistPage.loadWatchlist();

      expect(watchlistPage.watchlist).toHaveLength(1);
      expect(watchlistPage.watchlist[0].symbol).toBe('BTCUSDT');
    });

    it('addToWatchlist 應該發送正確的 API 請求', async () => {
      const mockResponse = {
        success: true,
        data: { symbol: 'ETHUSDT' }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      window.AuthStateManager.getToken.mockReturnValue('valid.token');

      await watchlistPage.addToWatchlist('ETHUSDT', 4);

      expect(fetch).toHaveBeenCalledWith('/api/watchlist', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid.token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: 'ETHUSDT',
          priority: 4
        })
      });
    });

    it('應該處理 API 錯誤', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      window.AuthStateManager.getToken.mockReturnValue('valid.token');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await watchlistPage.loadWatchlist();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('排序和篩選', () => {
    beforeEach(() => {
      watchlistPage.watchlist = [
        { symbol: 'BTCUSDT', baseAsset: 'BTC', priority: 5, category: 'trading' },
        { symbol: 'ETHUSDT', baseAsset: 'ETH', priority: 3, category: 'longterm' },
        { symbol: 'BNBUSDT', baseAsset: 'BNB', priority: 4, category: 'trading' }
      ];
    });

    it('應該正確排序（按優先級降冪）', () => {
      watchlistPage.sortBy = 'priority';
      watchlistPage.sortOrder = 'desc';

      const sorted = watchlistPage.sortWatchlist(watchlistPage.watchlist);

      expect(sorted[0].priority).toBe(5);
      expect(sorted[1].priority).toBe(4);
      expect(sorted[2].priority).toBe(3);
    });

    it('應該正確篩選（按分類）', () => {
      watchlistPage.categoryFilter = 'trading';

      const filtered = watchlistPage.filterWatchlist(watchlistPage.watchlist);

      expect(filtered).toHaveLength(2);
      expect(filtered.every(item => item.category === 'trading')).toBe(true);
    });

    it('應該正確搜尋', () => {
      watchlistPage.searchQuery = 'btc';

      const filtered = watchlistPage.filterWatchlist(watchlistPage.watchlist);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].baseAsset).toBe('BTC');
    });
  });
});
```

### 2. 整合測試 (Integration Tests)

```javascript
// tests/integration/watchlist.integration.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');

describe('Watchlist Integration Tests', () => {
  beforeAll(async () => {
    // 連接測試資料庫
    await mongoose.connect(process.env.MONGODB_TEST_URI);
  });

  afterAll(async () => {
    // 清理並關閉資料庫連接
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe('完整的使用者流程', () => {
    let authToken;
    const testUser = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('應該完成完整的關注清單操作流程', async () => {
      // 1. 使用者註冊
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // 2. 使用者登入
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);

      authToken = loginResponse.body.data.token;

      // 3. 查看空的關注清單
      const emptyListResponse = await request(app)
        .get('/api/watchlist')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(emptyListResponse.body.data.watchlist).toEqual([]);

      // 4. 新增第一個關注項目
      await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ symbol: 'BTCUSDT', priority: 5 })
        .expect(201);

      // 5. 新增第二個關注項目
      await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ symbol: 'ETHUSDT', priority: 4 })
        .expect(201);

      // 6. 查看關注清單
      const listResponse = await request(app)
        .get('/api/watchlist')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.data.watchlist).toHaveLength(2);

      // 7. 更新項目優先級
      await request(app)
        .patch('/api/watchlist/BTCUSDT')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 3 })
        .expect(200);

      // 8. 查看統計資訊
      const statsResponse = await request(app)
        .get('/api/watchlist/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statsResponse.body.data.totalItems).toBe(2);

      // 9. 移除一個項目
      await request(app)
        .delete('/api/watchlist/ETHUSDT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 10. 確認項目已移除
      const finalListResponse = await request(app)
        .get('/api/watchlist')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalListResponse.body.data.watchlist).toHaveLength(1);
      expect(finalListResponse.body.data.watchlist[0].symbol).toBe('BTCUSDT');
    });
  });

  describe('錯誤處理', () => {
    it('應該處理無效的認證令牌', async () => {
      await request(app)
        .get('/api/watchlist')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('應該處理缺少認證令牌', async () => {
      await request(app)
        .get('/api/watchlist')
        .expect(401);
    });

    it('應該處理無效的交易對', async () => {
      const authToken = await getValidAuthToken();

      await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ symbol: 'INVALIDPAIR' })
        .expect(400);
    });
  });

  describe('速率限制', () => {
    it('應該執行 API 速率限制', async () => {
      const authToken = await getValidAuthToken();

      // 發送大量請求以觸發速率限制
      const promises = Array.from({length: 101}, () => 
        request(app)
          .get('/api/watchlist')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);
      
      // 檢查是否有請求被速率限制
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});

// 輔助函數
async function getValidAuthToken() {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'test@example.com',
      password: 'password123'
    });
  
  return response.body.data.token;
}
```

### 3. 端對端測試 (E2E Tests)

```javascript
// tests/e2e/watchlist.e2e.test.js
const { test, expect } = require('@playwright/test');

test.describe('關注清單 E2E 測試', () => {
  test.beforeEach(async ({ page }) => {
    // 模擬登入狀態
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'valid.test.token');
    });
  });

  test('應該顯示關注清單頁面', async ({ page }) => {
    await page.goto('http://localhost:3000/#watchlist');
    
    await expect(page.locator('h1')).toContainText('我的關注清單');
    await expect(page.locator('#watchlist-container')).toBeVisible();
  });

  test('應該能新增關注項目', async ({ page }) => {
    // Mock API 回應
    await page.route('/api/watchlist', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: '成功新增關注項目',
            data: { symbol: 'BTCUSDT' }
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { watchlist: [], total: 0, hasMore: false }
          })
        });
      }
    });

    await page.goto('http://localhost:3000/#watchlist');
    
    // 填寫快速新增表單
    await page.fill('#quick-symbol', 'BTCUSDT');
    await page.selectOption('#quick-priority', '5');
    await page.click('#quick-add-btn');
    
    // 驗證成功訊息
    await expect(page.locator('.toast-success')).toContainText('成功新增');
  });

  test('應該能移除關注項目', async ({ page }) => {
    // Mock API 回應
    await page.route('/api/watchlist', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              watchlist: [{
                id: '1',
                symbol: 'BTCUSDT',
                baseAsset: 'BTC',
                quoteAsset: 'USDT',
                priority: 5
              }],
              total: 1,
              hasMore: false
            }
          })
        });
      }
    });

    await page.route('/api/watchlist/BTCUSDT', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: '成功移除關注項目'
          })
        });
      }
    });

    await page.goto('http://localhost:3000/#watchlist');
    
    // 等待關注清單載入
    await expect(page.locator('.watchlist-item')).toBeVisible();
    
    // 點擊移除按鈕
    await page.click('[data-symbol="BTCUSDT"] .remove-btn');
    
    // 確認移除
    await page.click('.confirm-remove');
    
    // 驗證成功訊息
    await expect(page.locator('.toast-success')).toContainText('成功移除');
  });

  test('應該能排序關注清單', async ({ page }) => {
    // Mock 包含多個項目的關注清單
    await page.route('/api/watchlist', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            watchlist: [
              { symbol: 'BTCUSDT', baseAsset: 'BTC', priority: 3 },
              { symbol: 'ETHUSDT', baseAsset: 'ETH', priority: 5 },
              { symbol: 'BNBUSDT', baseAsset: 'BNB', priority: 1 }
            ],
            total: 3,
            hasMore: false
          }
        })
      });
    });

    await page.goto('http://localhost:3000/#watchlist');
    
    // 選擇按優先級排序
    await page.selectOption('#sort-select', 'priority-desc');
    
    // 驗證排序結果
    const items = await page.locator('.watchlist-item').all();
    const firstItemSymbol = await items[0].getAttribute('data-symbol');
    expect(firstItemSymbol).toBe('ETHUSDT'); // 優先級最高
  });

  test('應該支援搜尋功能', async ({ page }) => {
    // Mock 包含多個項目的關注清單
    await page.route('/api/watchlist', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            watchlist: [
              { symbol: 'BTCUSDT', baseAsset: 'BTC', priority: 3 },
              { symbol: 'ETHUSDT', baseAsset: 'ETH', priority: 5 },
              { symbol: 'BNBUSDT', baseAsset: 'BNB', priority: 1 }
            ],
            total: 3,
            hasMore: false
          }
        })
      });
    });

    await page.goto('http://localhost:3000/#watchlist');
    
    // 輸入搜尋關鍵字
    await page.fill('#search-input', 'BTC');
    
    // 驗證搜尋結果
    await expect(page.locator('.watchlist-item')).toHaveCount(1);
    await expect(page.locator('[data-symbol="BTCUSDT"]')).toBeVisible();
  });

  test('應該在未登入時顯示登入提示', async ({ page }) => {
    // 清除認證資料
    await page.evaluate(() => {
      localStorage.removeItem('auth_token');
    });

    await page.goto('http://localhost:3000/#watchlist');
    
    // 驗證登入提示
    await expect(page.locator('.login-required')).toBeVisible();
    await expect(page.locator('.login-required h2')).toContainText('需要登入');
  });

  test('應該在手機裝置上正常顯示', async ({ page }) => {
    // 設定手機視窗尺寸
    await page.setViewportSize({ width: 375, height: 667 });

    await page.route('/api/watchlist', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { watchlist: [], total: 0, hasMore: false }
        })
      });
    });

    await page.goto('http://localhost:3000/#watchlist');
    
    // 驗證響應式設計
    await expect(page.locator('.watchlist-grid')).toHaveCSS('grid-template-columns', '1fr');
    await expect(page.locator('#watchlist-container')).toBeVisible();
  });
});
```

### 4. 效能測試

```javascript
// tests/performance/watchlist.performance.test.js
const autocannon = require('autocannon');
const { test } = require('@playwright/test');

describe('關注清單效能測試', () => {
  const baseURL = 'http://localhost:3000';
  const authToken = 'test.jwt.token';

  test('API 效能測試', async () => {
    // 測試取得關注清單 API
    const result = await autocannon({
      url: `${baseURL}/api/watchlist`,
      connections: 100,
      duration: 30,
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    console.log('API 效能測試結果:');
    console.log(`平均延遲: ${result.latency.average}ms`);
    console.log(`每秒請求數: ${result.requests.average}`);
    console.log(`錯誤率: ${result.errors / result.requests.total * 100}%`);

    // 效能要求檢查
    expect(result.latency.average).toBeLessThan(200); // 平均回應時間 < 200ms
    expect(result.errors / result.requests.total).toBeLessThan(0.01); // 錯誤率 < 1%
  });

  test('前端載入效能測試', async ({ page }) => {
    // 監控效能指標
    await page.goto(`${baseURL}/#watchlist`);
    
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime
      };
    });

    console.log('前端效能指標:');
    console.log(`DOM 載入時間: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`頁面載入完成時間: ${performanceMetrics.loadComplete}ms`);
    console.log(`首次繪製: ${performanceMetrics.firstPaint}ms`);
    console.log(`首次內容繪製: ${performanceMetrics.firstContentfulPaint}ms`);

    // 效能要求檢查
    expect(performanceMetrics.domContentLoaded).toBeLessThan(1000); // DOM 載入 < 1s
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2000); // 首次內容繪製 < 2s
  });

  test('大數據集載入測試', async ({ page }) => {
    // Mock 大量關注清單資料
    await page.route('/api/watchlist', async route => {
      const largeWatchlist = Array.from({length: 30}, (_, i) => ({
        id: i + 1,
        symbol: `TEST${i.toString().padStart(2, '0')}USDT`,
        baseAsset: `TEST${i.toString().padStart(2, '0')}`,
        quoteAsset: 'USDT',
        priority: (i % 5) + 1,
        priceData: {
          price: Math.random() * 1000,
          priceChangePercent: (Math.random() - 0.5) * 20
        }
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { watchlist: largeWatchlist, total: 30, hasMore: false }
        })
      });
    });

    const startTime = Date.now();
    await page.goto(`${baseURL}/#watchlist`);
    
    // 等待所有項目載入
    await page.waitForSelector('.watchlist-item:nth-child(30)', { timeout: 5000 });
    
    const loadTime = Date.now() - startTime;
    console.log(`大數據集載入時間: ${loadTime}ms`);
    
    // 檢查載入時間
    expect(loadTime).toBeLessThan(3000); // 載入時間 < 3s
    
    // 檢查所有項目都已渲染
    const itemCount = await page.locator('.watchlist-item').count();
    expect(itemCount).toBe(30);
  });
});
```

## 📋 測試執行指南

### 環境設置

```bash
# 安裝測試依賴
npm install --save-dev jest supertest @playwright/test autocannon

# 設置測試資料庫
export MONGODB_TEST_URI="mongodb://localhost:27017/nexustrade_test"
export JWT_SECRET="test_secret_key"
```

### 執行指令

```bash
# 執行所有測試
npm test

# 執行單元測試
npm run test:unit

# 執行整合測試
npm run test:integration

# 執行 E2E 測試
npm run test:e2e

# 執行效能測試
npm run test:performance

# 產生測試覆蓋率報告
npm run test:coverage
```

### 測試報告

```bash
# 產生 HTML 測試報告
npm run test:report

# 查看測試覆蓋率
npm run coverage:view
```

## 📊 測試報告範本

### 測試結果摘要

| 測試類型 | 測試數量 | 通過 | 失敗 | 覆蓋率 | 狀態 |
|----------|----------|------|------|--------|------|
| 單元測試 | 45 | 45 | 0 | 92% | ✅ 通過 |
| 整合測試 | 12 | 12 | 0 | 85% | ✅ 通過 |
| E2E 測試 | 8 | 8 | 0 | N/A | ✅ 通過 |
| 效能測試 | 3 | 3 | 0 | N/A | ✅ 通過 |

### 效能指標

| 指標 | 目標 | 實際 | 狀態 |
|------|------|------|------|
| API 回應時間 | ≤ 200ms | 145ms | ✅ |
| 頁面載入時間 | ≤ 2s | 1.2s | ✅ |
| 錯誤率 | ≤ 0.1% | 0.02% | ✅ |
| 程式碼覆蓋率 | ≥ 80% | 89% | ✅ |

## 🚀 部署前檢查清單

### 功能測試
- [ ] 所有 API 端點正常運作
- [ ] 前端組件完整載入
- [ ] 認證系統正確整合
- [ ] 通知系統正常顯示
- [ ] 排序和篩選功能正常
- [ ] 響應式設計在各裝置正常

### 效能測試
- [ ] API 回應時間符合要求
- [ ] 前端載入速度符合要求
- [ ] 大數據集處理正常
- [ ] 記憶體使用量在合理範圍

### 安全性測試
- [ ] 認證保護生效
- [ ] 輸入驗證正常
- [ ] 速率限制生效
- [ ] XSS 防護啟用

### 相容性測試
- [ ] Chrome 瀏覽器相容
- [ ] Firefox 瀏覽器相容
- [ ] Safari 瀏覽器相容
- [ ] 手機瀏覽器相容

---

**建議測試週期**: 每次發布前執行完整測試套件  
**自動化執行**: 使用 CI/CD 管道自動執行測試  
**監控**: 部署後持續監控效能和錯誤指標 