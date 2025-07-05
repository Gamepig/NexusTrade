# NexusTrade 價格警報通知設定系統企劃書

## 📋 專案概述

### 專案背景
NexusTrade 的價格警報通知系統已完成 **85% 的核心功能**，包括完整的警報管理、LINE 整合和監控服務。但缺少專門的**通知設定管理介面**，用戶無法統一管理通知偏好、測試通知效果或查看通知歷史。

### 專案目標
建立一個完整的價格警報通知設定系統，專注於提供：
1. **專門的通知設定頁面** - 統一管理所有通知偏好
2. **全域通知偏好管理** - 一次設定，全系統生效
3. **通知測試和預覽功能** - 即時測試通知效果
4. **通知歷史記錄查看** - 完整的通知追蹤
5. **進階通知控制** - 頻率、模板、條件管理

### 🚨 **重要：與現有任務規劃的衝突修正**

**現有 `tasks/line-price-alert-feature.md` 存在重大誤解：**

| 任務規劃 | 實際狀況 | 修正方案 |
|---------|----------|----------|
| 建立 `/api/alerts` | 已存在 `/api/notifications/alerts` | 使用現有端點 |
| 建立 PriceAlert 模型 | ✅ 已完整實作 | 直接使用 |
| 建立監控服務 | ✅ 已有兩個服務，需整合 | 整合重複服務 |
| 建立 LINE 整合 | ✅ 已完整實作 | 直接使用 |
| 建立前端頁面 | ✅ 已完整實作 | 新增設定子頁面 |

## 🔍 現況分析

### ✅ 已完成功能（85%）

#### 1. 價格警報核心系統
```javascript
// PriceAlert 模型 - 功能完整 ✅
- 4種警報類型：price_above, price_below, percent_change, volume_spike
- 完整的觸發條件和歷史記錄
- 優先級管理：low, medium, high, critical
- 過期時間和最大觸發次數控制
- 完整的通知方式支援架構
```

#### 2. 通知方式支援
```javascript
// 已支援的通知方式 ✅
notificationMethods: {
  lineMessaging: { enabled: Boolean, userId: String },  // 取代已停用的 LINE Notify
  email: { enabled: Boolean, address: String },
  webhook: { enabled: Boolean, url: String }
}

// ⚠️ 重要：LINE Notify 遷移說明
deprecatedMethods: {
  lineNotify: "已於 2025/3/31 停用，系統已自動遷移至 LINE Messaging API"
}
```

#### 3. LINE 整合系統
```javascript
// LINE Messaging API - 完整實作 ✅
- LineUser 模型：完整的通知設定和偏好管理
- LINE Messaging 服務：push/reply/webhook 完整實作
- 使用者綁定機制：bind/unbind 功能完整
- 訊息模板系統：text/flex/quickReply 模板齊全
- Webhook 事件處理：完整的事件處理流程
```

#### 4. API 端點系統
```javascript
// 現有 API 端點 ✅
GET    /api/notifications/alerts        - 取得使用者警報
POST   /api/notifications/alerts        - 建立警報
PUT    /api/notifications/alerts/:id    - 更新警報
DELETE /api/notifications/alerts/:id    - 刪除警報
POST   /api/line/push/price-alert       - 推送價格警報
GET    /api/line/bind/status            - 檢查綁定狀態
```

#### 5. 前端管理介面
```javascript
// PriceAlertsPage.js - 完整實作 ✅
- 警報列表顯示和過濾
- 建立/編輯/刪除警報功能
- 個別警報通知設定
- 警報狀態管理
```

#### 6. 基本設定系統
```javascript
// SettingsPage.js - 基本通知設定 ✅
- 瀏覽器通知開關
- 電子郵件通知開關
- 價格警報通知開關
- 新聞通知開關
```

### ❌ 缺失功能（15%）

#### 1. **專門的價格警報通知設定頁面**
```javascript
// 目前缺失 ❌
- 專門的價格警報通知管理介面
- 全域通知偏好統一設定
- 通知頻率和時間控制
- 通知內容格式設定
```

#### 2. **進階通知控制功能**
```javascript
// 目前缺失 ❌
- 通知頻率限制設定
- 安靜時間設定
- 通知優先級規則
- 批量通知管理
```

#### 3. **通知測試和預覽功能**
```javascript
// 目前缺失 ❌
- 實時通知測試
- 訊息模板預覽
- 通知格式選擇
- 測試通知發送
```

#### 4. **通知歷史和統計功能**
```javascript
// 目前缺失 ❌
- 通知發送歷史記錄
- 通知統計分析
- 通知效果追蹤
- 通知失敗分析
```

#### 5. **設定同步API後端**
```javascript
// 目前缺失 ❌
GET    /api/users/notification-settings    - 取得通知設定
PUT    /api/users/notification-settings    - 更新通知設定
POST   /api/notifications/test             - 測試通知
GET    /api/notifications/history          - 通知歷史
```

#### 6. **系統整合問題**
```javascript
// 目前問題 ⚠️
- 兩個重複的監控服務（需要整合）
- 前端設定與後端不同步
- LINE 綁定與警報系統未完全整合
```

## 🎯 解決方案設計

### 階段一：專門的價格警報通知設定頁面

#### 1.1 **PriceAlertNotificationSettingsPage 組件**
```javascript
// 新建 /public/js/components/PriceAlertNotificationSettingsPage.js
class PriceAlertNotificationSettingsPage {
  // 全域通知偏好設定
  renderGlobalSettings() {
    return {
      defaultNotificationMethods: ['line', 'email'],
      notificationFrequency: {
        maxPerHour: 10,
        minInterval: 300,
        quietHours: { start: '22:00', end: '08:00' }
      },
      messageFormat: {
        template: 'detailed',
        language: 'zh-TW',
        includeChart: true
      }
    };
  }
  
  // 通知方式管理
  renderNotificationMethods() {
    return {
      line: { enabled: true, verified: true },
      email: { enabled: false, address: '' },
      webhook: { enabled: false, url: '' }
    };
  }
  
  // 通知條件設定
  renderNotificationConditions() {
    return {
      priority: ['high', 'critical'],
      onlyTradingHours: false,
      confirmationRequired: true
    };
  }
}
```

#### 1.2 **通知設定統一管理**
```javascript
// 整合現有 SettingsPage 和新的專門設定
const notificationSettings = {
  global: {
    enabled: true,
    quietHours: { start: '22:00', end: '08:00' }
  },
  priceAlerts: {
    enabled: true,
    methods: ['line', 'email'],
    frequency: { maxPerHour: 10, minInterval: 300 },
    priority: ['medium', 'high', 'critical'],
    template: 'detailed'
  },
  marketUpdates: {
    enabled: false,
    methods: ['line'],
    frequency: { maxPerDay: 3 }
  },
  aiAnalysis: {
    enabled: true,
    methods: ['line'],
    frequency: { maxPerDay: 5 }
  }
};
```

### 階段二：後端設定 API 實作

#### 2.1 **通知設定控制器**
```javascript
// 新建 /src/controllers/notification-settings.controller.js
class NotificationSettingsController {
  // GET /api/users/notification-settings
  async getUserNotificationSettings(req, res) {
    const userId = req.userId;
    const lineUser = await LineUser.findByNexusTradeUserId(userId);
    
    return {
      global: lineUser?.notificationSettings || defaultSettings.global,
      priceAlerts: lineUser?.preferences?.notifications?.priceAlerts || defaultSettings.priceAlerts
    };
  }
  
  // PUT /api/users/notification-settings
  async updateUserNotificationSettings(req, res) {
    const userId = req.userId;
    const settings = req.body;
    
    // 更新 LineUser 和 User 模型
    await this.syncNotificationSettings(userId, settings);
  }
  
  // POST /api/notifications/test
  async testNotification(req, res) {
    const { method, template, data } = req.body;
    
    // 發送測試通知
    const result = await this.sendTestNotification(req.userId, method, template, data);
    return { success: result.success, messageId: result.messageId };
  }
}
```

#### 2.2 **通知歷史管理**
```javascript
// 擴展現有模型以支援歷史記錄
const NotificationHistorySchema = new mongoose.Schema({
  userId: String,
  type: String, // 'price_alert', 'market_update', 'ai_analysis'
  method: String, // 'line', 'email', 'webhook'
  status: String, // 'sent', 'failed', 'pending'
  content: Object,
  sentAt: Date,
  deliveredAt: Date,
  error: String
});
```

### 階段三：通知測試和預覽功能

#### 3.1 **實時通知測試**
```javascript
// 通知測試介面
class NotificationTester {
  async testLineNotification(userId, template, data) {
    const message = messageTemplates.render(template, data);
    const result = await lineMessagingService.pushMessage(userId, message);
    
    return {
      success: result.success,
      preview: message,
      deliveryTime: result.deliveryTime,
      error: result.error
    };
  }
  
  async testEmailNotification(email, template, data) {
    // 實作 Email 測試
  }
  
  async previewMessage(template, data) {
    return {
      line: messageTemplates.line.render(template, data),
      email: messageTemplates.email.render(template, data),
      webhook: messageTemplates.webhook.render(template, data)
    };
  }
}
```

#### 3.2 **訊息模板自定義**
```javascript
// 擴展現有的 line-message-templates.service.js
const customTemplates = {
  priceAlert: {
    minimal: (data) => `🚨 ${data.symbol} 價格 ${data.alertType === 'above' ? '突破' : '跌破'} ${data.targetPrice}`,
    detailed: (data) => this.createPriceAlertFlex(data),
    custom: (data, userTemplate) => this.renderCustomTemplate(userTemplate, data)
  }
};
```

### 階段四：系統整合和優化

#### 4.1 **監控服務整合**
```javascript
// 整合 alert-monitor.service.js 和 price-alert-monitor.service.js
class UnifiedAlertMonitorService {
  constructor() {
    // 合併兩個服務的功能
    this.priceMonitor = new PriceAlertMonitorService();
    this.alertMonitor = new AlertMonitorService();
  }
  
  async start() {
    // 統一啟動監控
    await this.priceMonitor.start();
    await this.alertMonitor.start();
  }
  
  async sendNotification(alert, marketData) {
    // 使用統一的通知發送邏輯
    // 根據使用者的通知設定決定發送方式
    const userSettings = await this.getUserNotificationSettings(alert.userId);
    return this.processNotificationWithSettings(alert, marketData, userSettings);
  }
}
```

#### 4.2 **LINE 使用者綁定完善**
```javascript
// 完善 PriceAlert 和 LineUser 的關聯
class PriceAlertService {
  async createAlert(userId, alertData) {
    // 檢查 LINE 綁定狀態
    const lineUser = await LineUser.findByNexusTradeUserId(userId);
    
    if (alertData.notificationMethods.line && !lineUser?.isBound) {
      throw new Error('請先綁定 LINE 帳號才能使用 LINE 通知');
    }
    
    // 在 alertData 中加入 lineUserId
    if (lineUser?.isBound) {
      alertData.lineUserId = lineUser.lineUserId;
    }
    
    const alert = new PriceAlert(alertData);
    return alert.save();
  }
}
```

## 📊 功能完整性對比

| 功能模組 | 現有狀況 | 需要新增 | 優先級 |
|---------|----------|----------|--------|
| 價格警報核心 | ✅ 完整 | - | - |
| LINE 整合 | ✅ 完整 | - | - |
| 基本通知設定 | ✅ 完整 | - | - |
| **專門設定頁面** | ❌ 缺失 | ✅ 核心功能 | 🔥 高 |
| **全域偏好管理** | ❌ 缺失 | ✅ 統一設定 | 🔥 高 |
| **通知測試功能** | ❌ 缺失 | ✅ 預覽測試 | 🟡 中 |
| **通知歷史記錄** | ❌ 缺失 | ✅ 歷史追蹤 | 🟡 中 |
| **進階控制功能** | ❌ 缺失 | ✅ 頻率/模板 | 🟢 低 |
| **系統整合** | ⚠️ 部分 | ✅ 服務整合 | 🔥 高 |

## 🛠️ 實作計劃

### Phase 1：核心設定頁面（第1週）
- [ ] 建立 `PriceAlertNotificationSettingsPage.js`
- [ ] 設計統一的設定管理介面
- [ ] 整合現有 SettingsPage 的通知設定
- [ ] 實作前端設定狀態管理

### Phase 2：後端設定 API（第2週）
- [ ] 建立 `notification-settings.controller.js`
- [ ] 實作設定同步 API 端點
- [ ] 完善 LineUser 和 User 模型關聯
- [ ] 建立設定驗證和預設值邏輯

### Phase 3：通知測試功能（第3週）
- [ ] 實作通知測試 API
- [ ] 建立訊息預覽功能
- [ ] 新增通知模板自定義選項
- [ ] 實作即時測試結果回饋

### Phase 4：系統整合優化（第4週）
- [ ] 整合重複的監控服務
- [ ] 完善 LINE 綁定與警報的關聯
- [ ] 實作通知歷史記錄功能
- [ ] 進行全系統測試和優化

### Phase 5：進階功能（第5週）
- [ ] 實作通知頻率控制
- [ ] 新增安靜時間功能
- [ ] 建立通知統計分析
- [ ] 實作批量通知管理

## 📁 檔案結構規劃

### 新建檔案
```
src/
├── controllers/
│   └── notification-settings.controller.js      # 通知設定控制器
├── models/
│   └── NotificationHistory.js                   # 通知歷史模型
├── services/
│   ├── unified-alert-monitor.service.js         # 統一監控服務
│   └── notification-tester.service.js           # 通知測試服務
└── routes/
    └── notification-settings.js                 # 設定路由

public/js/components/
├── PriceAlertNotificationSettingsPage.js        # 專門設定頁面
├── NotificationTester.js                        # 通知測試組件
└── NotificationHistory.js                       # 通知歷史組件
```

### 修改檔案
```
src/
├── controllers/
│   └── notification.controller.js               # 整合新的設定端點
├── models/
│   ├── LineUser.js                              # 擴展通知設定
│   └── PriceAlert.js                            # 新增 lineUserId 關聯
├── services/
│   ├── alert-monitor.service.js                 # 標記為廢棄
│   └── price-alert-monitor.service.js           # 整合到統一服務
└── routes/
    └── api.js                                    # 新增設定路由

public/js/components/
├── SettingsPage.js                              # 整合專門設定頁面
└── PriceAlertsPage.js                           # 新增設定快捷入口
```

## 🔄 與現有系統的整合方式

### 1. **保持現有 API 端點**
```javascript
// 繼續使用現有端點，不破壞相容性
/api/notifications/alerts          # 警報管理（保持不變）
/api/line/push/price-alert         # LINE 通知（保持不變）

// 新增設定管理端點
/api/users/notification-settings   # 新增：通知設定管理
/api/notifications/test            # 新增：通知測試
/api/notifications/history         # 新增：通知歷史
```

### 2. **逐步整合重複服務**
```javascript
// 階段性整合策略
階段1：保持兩個監控服務並行運行
階段2：實作統一監控服務
階段3：逐步遷移到統一服務
階段4：移除重複服務
```

### 3. **前端模組化整合**
```javascript
// 在現有 SettingsPage 中新增專門設定頁面入口
class SettingsPage {
  renderNotificationSettings() {
    return `
      <div class="settings-item">
        <button onclick="this.openPriceAlertSettings()">
          🔔 價格警報通知設定
        </button>
      </div>
    `;
  }
  
  openPriceAlertSettings() {
    // 開啟專門的價格警報通知設定頁面
    window.router.navigateTo('/settings/price-alert-notifications');
  }
}
```

## 🎯 成功指標

### 使用者體驗指標
- [ ] 通知設定完成率 > 80%
- [ ] 使用者自定義通知偏好使用率 > 60%
- [ ] 通知測試功能使用率 > 40%
- [ ] 使用者對通知相關性的滿意度 > 85%

### 技術效能指標
- [ ] 設定頁面載入時間 < 2秒
- [ ] 通知設定更新響應時間 < 1秒
- [ ] 通知測試回饋時間 < 3秒
- [ ] 系統通知發送成功率 > 95%

### 功能完整性指標
- [ ] 所有通知方式可統一管理
- [ ] 通知偏好可即時預覽和測試
- [ ] 通知歷史可完整追蹤
- [ ] 系統服務無重複和衝突

## 🚀 結論

本企劃書基於 NexusTrade 現有系統的 **85% 完成度**，專注於建立缺失的 **15% 核心功能**：

### 🎯 **核心價值**
1. **避免重複開發** - 充分利用現有的完整系統
2. **填補功能缺口** - 專注於真正缺失的通知設定管理
3. **提升使用者體驗** - 提供統一、直觀的通知管理介面
4. **系統整合優化** - 解決現有重複服務和整合問題

### ⚡ **快速實現**
由於基礎設施已完備，預計可在 **5週內完成全部功能**，大幅提升用戶對通知系統的控制能力和滿意度。

### 📈 **預期效果**
- 使用者通知體驗從 **良好** 提升到 **優秀**
- 系統功能完整度從 **85%** 提升到 **100%**
- 為後續進階功能擴展建立穩固基礎

---

**文件版本：v1.0.0**  
**建立日期：2025-01-19**  
**最後更新：2025-01-19**  
**負責團隊：NexusTrade 開發團隊** 