#!/usr/bin/env node

/**
 * 快速認證測試腳本
 */

const jwt = require('jsonwebtoken');

console.log('🧪 快速認證測試\n');

// 測試 JWT 生成
console.log('1. 測試 JWT 生成...');
try {
  const testUser = {
    userId: 'test-123',
    email: 'test@example.com',
    name: 'Test User'
  };
  
  const token = jwt.sign(testUser, process.env.JWT_SECRET || 'dev_super_secret_jwt_key_for_nexustrade_2025', {
    expiresIn: '7d'
  });
  
  console.log('✅ JWT 生成成功');
  console.log('Token:', token.substring(0, 50) + '...');
  
  // 測試解析
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_super_secret_jwt_key_for_nexustrade_2025');
  console.log('✅ JWT 解析成功');
  console.log('解析結果:', decoded);
  
} catch (error) {
  console.log('❌ JWT 測試失敗:', error.message);
}

// 測試環境變數
console.log('\n2. 測試環境變數...');
const requiredEnvs = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'JWT_SECRET'];
requiredEnvs.forEach(env => {
  const value = process.env[env];
  if (value) {
    console.log(`✅ ${env}: ${env === 'GOOGLE_CLIENT_SECRET' || env === 'JWT_SECRET' ? '***' : value}`);
  } else {
    console.log(`❌ ${env}: 未設定`);
  }
});

console.log('\n✨ 測試完成！');
