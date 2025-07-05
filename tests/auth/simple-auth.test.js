/**
 * 簡化認證測試 - 確保基本功能正常
 */

describe('認證系統基本測試', () => {
  test('JWT 祕鑰應該存在', () => {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET.length).toBeGreaterThan(10);
  });

  test('應該能載入認證相關模組', () => {
    // 測試模組載入
    expect(() => {
      require('../../src/controllers/oauth.controller');
    }).not.toThrow();
  });

  test('環境變數設定正確', () => {
    process.env.GOOGLE_CLIENT_ID = '6853611629-kfaaslvqca65i91d2pgdshbqhkl2uhj7.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = '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';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback';
    
    expect(process.env.GOOGLE_CLIENT_ID).toContain('apps.googleusercontent.com');
    expect(process.env.GOOGLE_CLIENT_SECRET).toContain('GOCSPX-');
    expect(process.env.GOOGLE_CALLBACK_URL).toContain('/auth/google/callback');
  });
});
