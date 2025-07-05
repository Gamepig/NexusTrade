#!/usr/bin/env node

/**
 * 測試和除錯檔案整理腳本
 * 
 * 將散佈在專案中的測試和除錯檔案歸類整理
 */

const fs = require('fs');
const path = require('path');

console.log('📁 開始整理測試和除錯檔案...\n');

const projectRoot = '/Users/gamepig/projects/NexusTrade';

// 創建目錄結構
const directories = [
  'debug/auth',
  'debug/api', 
  'debug/data',
  'debug/frontend',
  'debug/integration',
  'debug/performance',
  'tests/auth',
  'tests/api',
  'tests/integration',
  'tests/unit',
  'tests/e2e'
];

directories.forEach(dir => {
  const dirPath = path.join(projectRoot, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ 創建目錄: ${dir}`);
  }
});

// 定義檔案分類規則
const fileCategories = {
  // 測試檔案
  'tests/auth': [
    'test-auth-watchlist-integration.js',
    'test_login_flow_fix.js',
    'test_oauth_line_binding_fix.js'
  ],
  'tests/api': [
    'test-line-messaging-real.js',
    'test-line-messaging-standalone.js', 
    'test-line-messaging.js',
    'test-line-user-manager.js'
  ],
  'tests/integration': [
    'test_line_status_fix.js',
    'test_notification_system.js',
    'test_price_alert_simple.js'
  ],
  'tests/unit': [
    // 單元測試檔案
  ],
  
  // 除錯檔案
  'debug/auth': [
    'fix-auth-state-init.js',
    'debug_line_binding.js'
  ],
  'debug/data': [
    'check_database_content.js',
    'clear_analysis_cache.js',
    'clear_cache.js'
  ],
  'debug/frontend': [
    'browser_debug_check.js',
    'debug_browser_state.js',
    'immediate_console_fix.js',
    'instant_fix.js',
    'fix_homepage_analysis.js'
  ],
  'debug/api': [
    'get-line-userid.js',
    'monitor-line-webhook.js',
    'quick-line-test.js'
  ]
};

// 移動檔案到對應目錄
let movedFiles = 0;
let totalFiles = 0;

for (const [targetDir, files] of Object.entries(fileCategories)) {
  files.forEach(filename => {
    const sourcePath = path.join(projectRoot, filename);
    const targetPath = path.join(projectRoot, targetDir, filename);
    
    totalFiles++;
    
    if (fs.existsSync(sourcePath)) {
      try {
        fs.renameSync(sourcePath, targetPath);
        console.log(`📦 移動: ${filename} → ${targetDir}/`);
        movedFiles++;
      } catch (error) {
        console.log(`⚠️ 無法移動 ${filename}: ${error.message}`);
      }
    } else {
      console.log(`ℹ️ 檔案不存在: ${filename}`);
    }
  });
}

// 處理 HTML 測試檔案
const htmlTestFiles = [
  'test_login_line_status.html',
  'test_auth_debug.html',
  'test_basic_routing.html',
  'test_currency_ai.html',
  'test_currency_navigation.html',
  'test_currency_routing.html',
  'test_currency_widgets.html',
  'test_fix_verification.html',
  'test_layout_fixed.html',
  'test_manual_click.html',
  'test_navigation_simple.html',
  'test_new_layout.html',
  'test_responsive.html',
  'test_screenshot.html',
  'test_single_widget.html',
  'test_verification_final.html',
  'test_widgets_simple.html',
  'test_auth_state.html'
];

// 移動 HTML 測試檔案到 debug/frontend
htmlTestFiles.forEach(filename => {
  const sourcePath = path.join(projectRoot, 'public', filename);
  const targetPath = path.join(projectRoot, 'debug/frontend', filename);
  
  if (fs.existsSync(sourcePath)) {
    try {
      fs.renameSync(sourcePath, targetPath);
      console.log(`📦 移動 HTML 測試: ${filename} → debug/frontend/`);
      movedFiles++;
    } catch (error) {
      console.log(`⚠️ 無法移動 ${filename}: ${error.message}`);
    }
  }
  totalFiles++;
});

// 創建 README 檔案說明目錄結構
const readmeContent = `# 測試和除錯檔案目錄結構

## 📂 目錄說明

### tests/ - 測試檔案
- **auth/** - 認證相關測試
- **api/** - API 接口測試  
- **integration/** - 整合測試
- **unit/** - 單元測試
- **e2e/** - 端到端測試

### debug/ - 除錯檔案
- **auth/** - 認證除錯腳本
- **data/** - 資料庫和快取除錯
- **frontend/** - 前端除錯和測試頁面
- **api/** - API 除錯工具
- **integration/** - 整合除錯
- **performance/** - 效能測試

## 🧪 執行測試

### 認證系統測試
\`\`\`bash
npm run test -- tests/auth
\`\`\`

### API 測試  
\`\`\`bash
npm run test -- tests/api
\`\`\`

### 整合測試
\`\`\`bash
npm run test -- tests/integration
\`\`\`

## 🔧 除錯工具

### 認證除錯
\`\`\`bash
node debug/auth/fix-auth-state-init.js
\`\`\`

### 資料除錯
\`\`\`bash
node debug/data/check_database_content.js
\`\`\`

### 前端除錯
訪問: http://localhost:3001/debug/frontend/ 中的測試頁面

## 📝 測試報告

最後更新: ${new Date().toISOString()}
檔案整理統計: ${movedFiles}/${totalFiles} 個檔案已整理
`;

fs.writeFileSync(path.join(projectRoot, 'tests/README.md'), readmeContent);
fs.writeFileSync(path.join(projectRoot, 'debug/README.md'), readmeContent);

console.log('\n📊 整理完成統計:');
console.log(`📦 已移動檔案: ${movedFiles}`);
console.log(`📁 總計檔案: ${totalFiles}`);
console.log(`📂 創建目錄: ${directories.length}`);
console.log(`📄 創建說明文件: 2`);

console.log('\n🎯 下一步建議:');
console.log('1. 檢查 tests/ 目錄中的測試檔案');
console.log('2. 檢查 debug/ 目錄中的除錯工具');
console.log('3. 運行 npm test 確保測試正常');
console.log('4. 清理不需要的臨時檔案');

console.log('\n✨ 檔案整理完成！');