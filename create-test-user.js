/**
 * 創建測試用戶和有效的 JWT token
 */

const jwt = require('jsonwebtoken');
const { MockUser } = require('./src/controllers/auth.controller.mock');

async function createTestUser() {
    try {
        console.log('🧪 創建測試用戶...');
        
        // 設定 JWT secret (使用 .env 中的值)
        if (!process.env.JWT_SECRET) {
            process.env.JWT_SECRET = 'dev_super_secret_jwt_key_for_nexustrade_2025';
        }
        
        // 創建測試用戶
        const testUser = new MockUser({
            _id: 'ue5cc188e1d2cdbac5cfda2abb6f6a34b', // 使用與之前一致的 ID
            name: 'Vic Huang',
            email: 'vic.huang@example.com',
            provider: 'line',
            lineId: 'ue5cc188e1d2cdbac5cfda2abb6f6a34b',
            lineUserId: 'ue5cc188e1d2cdbac5cfda2abb6f6a34b',
            status: 'active',
            membershipLevel: 'premium' // 設為付費會員，可設定多個警報
        });
        
        // 保存測試用戶
        await testUser.save();
        console.log('✅ 測試用戶已創建:', testUser.name);
        
        // 生成 JWT token
        const tokenPayload = {
            userId: testUser._id,
            email: testUser.email,
            name: testUser.name,
            provider: testUser.provider,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24小時過期
        };
        
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET);
        
        console.log('\n🔐 生成的測試認證資訊:');
        console.log('Token:', token);
        console.log('\n📋 前端設定指令:');
        console.log(`localStorage.setItem('nexustrade_token', '${token}');`);
        console.log(`localStorage.setItem('nexustrade_user', '${JSON.stringify({
            id: testUser._id,
            name: testUser.name,
            email: testUser.email,
            provider: testUser.provider,
            lineUserId: testUser.lineUserId
        })}');`);
        
        console.log('\n🧪 API 測試指令:');
        console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/notifications/alerts/ETHUSDT`);
        
        // 驗證 token
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('\n✅ Token 驗證成功:', decoded.name);
        } catch (error) {
            console.error('❌ Token 驗證失敗:', error.message);
        }
        
        return {
            user: testUser,
            token: token
        };
        
    } catch (error) {
        console.error('❌ 創建測試用戶失敗:', error);
        throw error;
    }
}

// 如果直接執行此檔案
if (require.main === module) {
    createTestUser()
        .then(() => {
            console.log('\n🎉 測試用戶創建完成！');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 執行失敗:', error);
            process.exit(1);
        });
}

module.exports = { createTestUser };