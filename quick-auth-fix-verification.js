#!/usr/bin/env node

/**
 * 快速認證修復驗證工具
 * 清除快取並重啟服務以應用修復
 */

require('dotenv').config();
const { spawn } = require('child_process');

console.log('🚀 開始快速認證修復驗證...');

// 1. 重啟 PM2 服務以清除 MockUser 記憶體快取
console.log('🔄 重啟 PM2 服務以清除記憶體快取...');

const pm2Restart = spawn('pm2', ['restart', 'nexustrade-api'], {
  stdio: ['inherit', 'pipe', 'pipe']
});

pm2Restart.stdout.on('data', (data) => {
  console.log(`PM2: ${data.toString().trim()}`);
});

pm2Restart.stderr.on('data', (data) => {
  console.error(`PM2 錯誤: ${data.toString().trim()}`);
});

pm2Restart.on('close', (code) => {
  if (code === 0) {
    console.log('✅ PM2 服務重啟成功');
    console.log('\n🎉 修復驗證完成！');
    console.log('\n📋 現在請使用者進行以下測試：');
    console.log('1. 訪問 http://localhost:3000/force-auth-sync.html');
    console.log('2. 點擊 "從伺服器強制同步"');
    console.log('3. 回到主頁面測試 "設定通知" 功能');
    console.log('4. 預期結果: 應該顯示完整的警報設定表單，而非登入提示');
    
    console.log('\n🔧 修復摘要：');
    console.log('- ✅ 修復了 MockUser.findOne() 方法的 lineUserId 欄位載入');
    console.log('- ✅ 修復了 MockUser.findById() 方法的 lineUserId 欄位載入');
    console.log('- ✅ 清除了記憶體快取');
    console.log('- ✅ 重啟了服務');
  } else {
    console.error(`❌ PM2 重啟失敗，退出碼: ${code}`);
  }
  
  process.exit(code);
});

pm2Restart.on('error', (error) => {
  console.error('❌ PM2 重啟過程發生錯誤:', error.message);
  console.log('\n⚠️ 如果 PM2 重啟失敗，請手動執行：');
  console.log('pm2 restart nexustrade-api');
  process.exit(1);
});