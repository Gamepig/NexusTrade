/**
 * 認證測試設定檔
 */

const { MockUser } = require('../../src/controllers/auth.controller.mock');

beforeEach(() => {
  // 清理 Mock 資料
  MockUser.clearAll();
  
  // 設定測試環境變數
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
});

afterEach(() => {
  // 清理環境
  jest.clearAllMocks();
});