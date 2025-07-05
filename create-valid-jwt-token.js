#!/usr/bin/env node

/**
 * 生成有效的 JWT Token 工具
 * 用於測試和開發環境
 */

const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// 檢查環境變數
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET 環境變數未設置');
  console.log('請確保 .env 檔案存在並包含 JWT_SECRET');
  process.exit(1);
}

// 測試用戶資料 (使用資料庫中真實存在的 Vic Huang 用戶)
const testUser = {
  _id: '6867bc852b8316e0d4b7f2ca', // Vic Huang 的真實 MongoDB ObjectId
  email: 'line_ue5cc188e1d2cdbac5cfda2abb6f6a34b@example.com',
  googleId: null,
  lineId: 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b',
  lineUserId: 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b',
  provider: 'line',
  membership: 'free',
  status: 'active'
};

// 生成 JWT payload
const payload = {
  userId: testUser._id,
  email: testUser.email,
  lineId: testUser.lineId,
  lineUserId: testUser.lineUserId,
  googleId: testUser.googleId,
  provider: testUser.provider,
  membership: testUser.membership
};

try {
  // 生成 Token
  const token = jwt.sign(payload, process.env.JWT_SECRET, { 
    expiresIn: '7d',
    algorithm: 'HS256'
  });

  // 解碼來獲取完整的 payload 信息
  const decoded = jwt.decode(token);

  console.log('✅ JWT Token 生成成功!');
  console.log('');
  console.log('📋 Token 資訊:');
  console.log(`用戶 ID: ${decoded.userId}`);
  console.log(`用戶郵箱: ${decoded.email}`);
  console.log(`LINE ID: ${decoded.lineId}`);
  console.log(`會員等級: ${decoded.membership}`);
  console.log(`發行時間: ${new Date(decoded.iat * 1000).toLocaleString()}`);
  console.log(`過期時間: ${new Date(decoded.exp * 1000).toLocaleString()}`);
  console.log('');
  console.log('🔑 JWT Token:');
  console.log(token);
  console.log('');
  
  // 驗證 Token
  const verified = jwt.verify(token, process.env.JWT_SECRET);
  console.log('✅ Token 驗證通過');
  console.log('');
  
  // 生成 JavaScript 程式碼片段
  console.log('📄 JavaScript 設置程式碼:');
  console.log('```javascript');
  console.log(`const token = '${token}';`);
  console.log(`const user = ${JSON.stringify(testUser, null, 2)};`);
  console.log('localStorage.setItem("nexustrade_token", token);');
  console.log('localStorage.setItem("nexustrade_user", JSON.stringify(user));');
  console.log('```');
  console.log('');
  
  // 測試 API 調用
  console.log('🧪 測試 API 調用:');
  console.log('```bash');
  console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/notifications/alerts`);
  console.log('```');
  
} catch (error) {
  console.error('❌ Token 生成失敗:', error.message);
  process.exit(1);
}