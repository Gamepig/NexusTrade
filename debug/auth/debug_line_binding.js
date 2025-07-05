/**
 * LINE 綁定問題診斷腳本
 * 
 * 用於測試和診斷 LINE 綁定狀態的問題
 */

const { MockUser } = require('./src/controllers/auth.controller.mock');
const { lineUserService } = require('./src/models/LineUser');
const { generateToken } = require('./src/utils/jwt');

async function debugLineBinding() {
  console.log('🔍 開始診斷 LINE 綁定問題...\n');

  try {
    // 1. 檢查當前系統中的使用者
    console.log('📋 1. 檢查系統中的所有使用者:');
    
    // 獲取模組內部的 mockUsers Map
    const mockUsersModule = require('./src/controllers/auth.controller.mock');
    
    // 使用靜態方法創建一個測試使用者來檢查系統狀態
    // 或直接查詢已有的使用者（通過已知 ID 或 email）
    
    console.log('嘗試查找現有使用者...');
    
    // 創建一個測試使用者來模擬登入狀態
    const testUser = new MockUser({
      email: 'test@example.com',
      password: 'testpass',
      username: 'testuser',
      profile: {
        displayName: 'Test User'
      },
      settings: {
        notifications: {
          email: true,
          line: false
        }
      }
    });
    
    await testUser.save();
    console.log('已創建測試使用者:', testUser._id);
    
    // 查找所有使用者（這裡我們知道至少有一個測試使用者）
    const allUsers = [testUser];
    console.log(`找到 ${allUsers.length} 個使用者:`);
    
    allUsers.forEach((user, index) => {
      console.log(`  使用者 ${index + 1}:`);
      console.log(`    ID: ${user._id}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Google ID: ${user.googleId || '未設定'}`);
      console.log(`    LINE ID: ${user.lineId || '未設定'}`);
      console.log(`    LINE 通知設定: ${user.settings?.notifications?.line || false}`);
      console.log('');
    });

    // 2. 檢查 LineUser 服務中的記錄
    console.log('📋 2. 檢查 LineUser 服務中的記錄:');
    const lineUsers = await lineUserService.list();
    console.log(`找到 ${lineUsers.length} 個 LINE 使用者記錄:`);
    
    lineUsers.forEach((lineUser, index) => {
      console.log(`  LINE 使用者 ${index + 1}:`);
      console.log(`    LINE User ID: ${lineUser.lineUserId}`);
      console.log(`    NexusTrade User ID: ${lineUser.nexusTradeUserId || '未綁定'}`);
      console.log(`    綁定狀態: ${lineUser.isBound}`);
      console.log(`    綁定時間: ${lineUser.bindTime || '未綁定'}`);
      console.log('');
    });

    // 3. 測試綁定狀態檢查邏輯
    console.log('📋 3. 測試綁定狀態檢查邏輯:');
    
    if (allUsers.length > 0) {
      const testUser = allUsers[0];
      console.log(`測試使用者: ${testUser.email} (ID: ${testUser._id})`);
      
      // 模擬 /api/line/bind/status 的邏輯
      const isOAuthLineBound = !!(testUser.lineId);
      console.log(`OAuth 系統綁定狀態: ${isOAuthLineBound}`);
      
      let lineUser = null;
      let isLineUserServiceBound = false;
      
      if (isOAuthLineBound) {
        lineUser = await lineUserService.findByLineUserId(testUser.lineId);
        isLineUserServiceBound = lineUser ? lineUser.isBound : false;
      } else {
        lineUser = await lineUserService.findByNexusTradeUserId(testUser._id);
        isLineUserServiceBound = lineUser ? lineUser.isBound : false;
      }
      
      console.log(`LineUser 服務綁定狀態: ${isLineUserServiceBound}`);
      console.log(`最終綁定狀態: ${isOAuthLineBound && isLineUserServiceBound}`);
      
      if (lineUser) {
        console.log(`找到 LineUser 記錄:`, lineUser.getSummary());
      } else {
        console.log(`未找到對應的 LineUser 記錄`);
      }
    }

    // 4. 模擬正確的綁定流程
    console.log('\n📋 4. 測試建立正確的綁定:');
    
    if (allUsers.length > 0) {
      const testUser = allUsers[0];
      
      // 如果使用者沒有 LINE ID，模擬 LINE OAuth 登入
      if (!testUser.lineId) {
        console.log('使用者沒有 LINE ID，模擬 LINE OAuth 登入...');
        
        // 模擬 LINE OAuth 回調
        const mockLineProfile = {
          userId: 'U' + Date.now().toString(36),
          displayName: testUser.profile?.displayName || testUser.username,
          pictureUrl: testUser.profile?.avatar || null
        };
        
        // 設定 LINE ID
        testUser.lineId = mockLineProfile.userId;
        testUser.settings.notifications.line = true;
        await testUser.save();
        
        console.log(`已設定 LINE ID: ${mockLineProfile.userId}`);
        
        // 在 LineUser 服務中建立記錄
        try {
          const lineUser = await lineUserService.bind(
            mockLineProfile.userId,
            testUser._id,
            {
              displayName: mockLineProfile.displayName,
              pictureUrl: mockLineProfile.pictureUrl
            }
          );
          
          console.log('已在 LineUser 服務中建立綁定記錄');
          console.log('綁定詳情:', lineUser.getSummary());
          
          // 再次測試綁定狀態
          const finalOAuthBound = !!(testUser.lineId);
          const finalLineUser = await lineUserService.findByLineUserId(testUser.lineId);
          const finalLineUserBound = finalLineUser ? finalLineUser.isBound : false;
          const finalStatus = finalOAuthBound && finalLineUserBound;
          
          console.log('\n✅ 綁定完成後的狀態:');
          console.log(`OAuth 綁定: ${finalOAuthBound}`);
          console.log(`LineUser 綁定: ${finalLineUserBound}`);
          console.log(`最終綁定狀態: ${finalStatus}`);
          
        } catch (error) {
          console.error('綁定過程中發生錯誤:', error.message);
        }
      } else {
        console.log('使用者已有 LINE ID，檢查是否需要同步到 LineUser 服務...');
        
        let lineUser = await lineUserService.findByLineUserId(testUser.lineId);
        if (!lineUser) {
          console.log('在 LineUser 服務中未找到記錄，建立新記錄...');
          
          lineUser = await lineUserService.bind(
            testUser.lineId,
            testUser._id,
            {
              displayName: testUser.profile?.displayName || testUser.username,
              pictureUrl: testUser.profile?.avatar || null
            }
          );
          
          console.log('已建立 LineUser 記錄:', lineUser.getSummary());
        } else {
          console.log('找到現有 LineUser 記錄:', lineUser.getSummary());
        }
      }
    }

    console.log('\n🎉 診斷完成！');

  } catch (error) {
    console.error('❌ 診斷過程中發生錯誤:', error);
    console.error('錯誤堆疊:', error.stack);
  }
}

// 執行診斷
if (require.main === module) {
  debugLineBinding().catch(console.error);
}

module.exports = { debugLineBinding };