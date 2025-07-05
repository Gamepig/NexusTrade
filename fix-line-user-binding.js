/**
 * 修復 LINE 用戶綁定
 */

// 載入環境變數
require('dotenv').config();

const { lineUserService } = require('./src/models/LineUser');

async function fixLineUserBinding() {
  console.log('🔧 修復 LINE 用戶綁定...\n');

  const nexusTradeUserId = 'ue5cc188e1d2cdbac5cfda2abb6f6a34b';
  const lineUserId = 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b'; // 正確的 LINE User ID

  try {
    // 檢查現有綁定
    console.log('🔍 檢查現有 LINE 用戶綁定...');
    let lineUser = await lineUserService.findByNexusTradeUserId(nexusTradeUserId);
    
    if (lineUser) {
      console.log('✅ 找到現有綁定:', {
        lineUserId: lineUser.lineUserId,
        nexusTradeUserId: lineUser.nexusTradeUserId,
        isBound: lineUser.isBound,
        displayName: lineUser.displayName
      });
      
      if (!lineUser.isBound) {
        console.log('🔧 更新綁定狀態...');
        lineUser.isBound = true;
        await lineUser.save();
        console.log('✅ 綁定狀態已更新');
      }
    } else {
      console.log('❌ 未找到 LINE 用戶綁定，創建新的...');
      
      await lineUserService.create({
        lineUserId: lineUserId,
        nexusTradeUserId: nexusTradeUserId,
        displayName: 'Vic Huang',
        isBound: true,
        bindTime: new Date(),
        preferences: {
          language: 'zh-TW',
          timezone: 'Asia/Taipei',
          notifications: {
            priceAlerts: true,
            marketNews: true,
            aiAnalysis: true
          }
        }
      });
      console.log('✅ 新的 LINE 用戶綁定已創建');
    }

    // 驗證綁定
    console.log('\n🧪 驗證綁定狀態...');
    const verifyUser = await lineUserService.findByNexusTradeUserId(nexusTradeUserId);
    
    if (verifyUser && verifyUser.isBound) {
      console.log('✅ LINE 用戶綁定驗證成功');
      console.log('綁定詳情:', {
        lineUserId: verifyUser.lineUserId,
        nexusTradeUserId: verifyUser.nexusTradeUserId,
        displayName: verifyUser.displayName,
        isBound: verifyUser.isBound,
        bindTime: verifyUser.bindTime
      });
    } else {
      console.log('❌ LINE 用戶綁定驗證失敗');
    }

  } catch (error) {
    console.error('❌ 修復失敗:', error.message);
    console.error(error.stack);
  }
}

// 執行修復
fixLineUserBinding();