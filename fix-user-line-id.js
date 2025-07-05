/**
 * 修復用戶的 LINE ID
 */

// 載入環境變數
require('dotenv').config();

async function fixUserLineId() {
  console.log('🔧 修復用戶 LINE ID...\n');

  const userId = 'ue5cc188e1d2cdbac5cfda2abb6f6a34b';
  const correctLineId = 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b';

  try {
    // 使用 API 更新用戶資料
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: userId, email: 'vic.huang.tw@gmail.com' }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    // 直接修改 MockUser 資料
    const { MockUser } = require('./src/controllers/auth.controller.mock');
    
    console.log('🔍 查找用戶...');
    const user = await MockUser.findById(userId);
    
    if (user) {
      console.log('✅ 找到用戶:', user.email);
      console.log('現有 LINE ID:', user.lineId);
      console.log('現有 LINE User ID:', user.lineUserId);
      
      // 更新 LINE ID
      user.lineId = correctLineId;
      user.lineUserId = correctLineId;
      
      // 保存更新
      await user.save();
      
      console.log('\n✅ LINE ID 已更新:');
      console.log('新的 LINE ID:', user.lineId);
      console.log('新的 LINE User ID:', user.lineUserId);
      
      // 驗證更新
      console.log('\n🧪 驗證更新...');
      const updatedUser = await MockUser.findById(userId);
      
      if (updatedUser && updatedUser.lineId === correctLineId) {
        console.log('✅ 驗證成功！LINE ID 已正確更新');
      } else {
        console.log('❌ 驗證失敗，更新可能未成功');
      }
      
    } else {
      console.log('❌ 未找到用戶');
    }

  } catch (error) {
    console.error('❌ 修復失敗:', error.message);
    console.error(error.stack);
  }
}

// 執行修復
fixUserLineId();