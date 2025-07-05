# PriceAlertModal 組件技術文件

## 📋 概述

PriceAlertModal (`public/js/components/PriceAlertModal.js`) 是價格警報設定的核心 UI 組件，提供用戶友好的價格警報創建和管理界面，整合了 LINE 通知、認證系統和會員權限控制。

## 🏗️ 類別結構

```javascript
class PriceAlertModal {
  constructor() {
    // 核心狀態
    this.currentSymbol = null;           // 當前交易對
    this.currentPrice = null;            // 當前價格
    this.existingAlerts = [];            // 已存在的警報
    this.isVisible = false;              // 模態框可見狀態
    this.isLineConnected = false;        // LINE 連接狀態
    
    // 認證狀態
    this.isAuthenticated = false;        // 認證狀態
    this.user = null;                    // 用戶資訊
    
    // UI 狀態
    this.isShowingModal = false;         // 防重複顯示
    this.modalCooldown = false;          // 冷卻期間
  }
}
```

## 🔧 核心方法

### 1. 初始化與生命週期

#### constructor()
**功能**: 初始化組件狀態和事件監聽器

```javascript
constructor() {
  // 狀態初始化
  this.currentSymbol = null;
  this.currentPrice = null;
  this.existingAlerts = [];
  this.isVisible = false;
  
  // 方法綁定 (確保 this 指向正確)
  this.show = this.show.bind(this);
  this.hide = this.hide.bind(this);
  this.handleSubmit = this.handleSubmit.bind(this);
  this.handleAlertTypeChange = this.handleAlertTypeChange.bind(this);
  this.handleAuthStateUpdate = this.handleAuthStateUpdate.bind(this);
  
  // 設定事件監聽器
  this.setupAuthStateListeners();
}
```

#### setupAuthStateListeners()
**功能**: 設定認證狀態變化的事件監聽器

```javascript
setupAuthStateListeners() {
  // 監聽認證狀態更新
  window.addEventListener('authStateUpdated', this.handleAuthStateUpdate);
  
  // 監聽認證過期事件
  window.addEventListener('authExpired', () => {
    console.log('🔒 檢測到認證過期，關閉價格警報模態框');
    if (this.isVisible) {
      this.hide();
    }
  });
}
```

### 2. 模態框顯示與隱藏

#### show(symbol)
**功能**: 顯示價格警報設定模態框

```javascript
async show(symbol) {
  try {
    // 防止重複顯示
    if (this.isShowingModal || this.modalCooldown) {
      console.log('⚠️ 模態框正在顯示中或處於冷卻期間');
      return;
    }
    
    this.isShowingModal = true;
    this.modalCooldown = true;
    
    // 設定冷卻期間 (300ms)
    setTimeout(() => {
      this.modalCooldown = false;
    }, 300);
    
    this.currentSymbol = symbol;
    
    // 並行載入數據
    await Promise.all([
      this.loadCurrentPrice(),
      this.loadExistingAlerts()
    ]);
    
    // 檢查認證狀態
    this.checkAuthStatus();
    
    // 渲染模態框
    this.render();
    this.isVisible = true;
    
    console.log(`✅ 價格警報模態框已顯示 - 交易對: ${symbol}`);
  } catch (error) {
    console.error('❌ 顯示價格警報模態框失敗:', error);
    this.handleError(error);
  } finally {
    this.isShowingModal = false;
  }
}
```

#### hide()
**功能**: 隱藏模態框並清理狀態

```javascript
hide() {
  const modal = document.getElementById('price-alert-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.innerHTML = '';
  }
  
  // 重置狀態
  this.isVisible = false;
  this.currentSymbol = null;
  this.currentPrice = null;
  this.existingAlerts = [];
  
  console.log('📴 價格警報模態框已隱藏');
}
```

### 3. 數據載入

#### loadCurrentPrice()
**功能**: 載入當前交易對的最新價格

```javascript
async loadCurrentPrice() {
  try {
    if (!this.currentSymbol) return;
    
    const response = await fetch(`/api/market/price/${this.currentSymbol}`);
    const data = await response.json();
    
    if (data.success) {
      this.currentPrice = data.data.price;
      console.log(`📊 載入 ${this.currentSymbol} 當前價格: $${this.currentPrice}`);
    } else {
      throw new Error(data.error?.message || '獲取價格失敗');
    }
  } catch (error) {
    console.error('❌ 載入當前價格失敗:', error);
    this.currentPrice = 0;
  }
}
```

#### loadExistingAlerts()
**功能**: 載入用戶已設定的警報

```javascript
async loadExistingAlerts() {
  try {
    const token = localStorage.getItem('nexustrade_token');
    if (!token) {
      this.existingAlerts = [];
      return;
    }
    
    const response = await fetch('/api/notifications/alerts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      // 過濾當前交易對的警報
      this.existingAlerts = data.data.filter(alert => 
        alert.symbol === this.currentSymbol && 
        alert.status === 'active'
      );
      console.log(`📋 載入 ${this.existingAlerts.length} 個已存在的警報`);
    } else {
      this.existingAlerts = [];
    }
  } catch (error) {
    console.error('❌ 載入已存在警報失敗:', error);
    this.existingAlerts = [];
  }
}
```

### 4. 認證狀態管理

#### checkAuthStatus()
**功能**: 檢查用戶認證和 LINE 連接狀態

```javascript
checkAuthStatus() {
  const token = localStorage.getItem('nexustrade_token');
  const userStr = localStorage.getItem('nexustrade_user');
  
  if (token && userStr) {
    try {
      this.user = JSON.parse(userStr);
      this.isAuthenticated = true;
      
      // 檢查 LINE 連接狀態
      this.isLineConnected = !!(
        this.user.lineUserId || 
        this.user.lineId || 
        (this.user.provider === 'line')
      );
      
      console.log(`🔐 認證狀態: ${this.isAuthenticated ? '已認證' : '未認證'}`);
      console.log(`📱 LINE 連接: ${this.isLineConnected ? '已連接' : '未連接'}`);
    } catch (error) {
      console.error('❌ 解析用戶資料失敗:', error);
      this.isAuthenticated = false;
      this.user = null;
      this.isLineConnected = false;
    }
  } else {
    this.isAuthenticated = false;
    this.user = null;
    this.isLineConnected = false;
  }
}
```

#### getCurrentUser()
**功能**: 獲取當前認證用戶資訊 (兼容多種認證系統)

```javascript
getCurrentUser() {
  // 方案 1: 使用新的 AuthManager
  if (window.authManager && window.authManager.isAuthenticated()) {
    return window.authManager.getUser();
  }
  
  // 方案 2: 使用全域 currentUser
  if (window.currentUser) {
    return window.currentUser;
  }
  
  // 方案 3: 從 localStorage 讀取
  const userStr = localStorage.getItem('nexustrade_user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('❌ 解析用戶資料失敗:', error);
      return null;
    }
  }
  
  return null;
}
```

### 5. UI 渲染

#### render()
**功能**: 渲染模態框 UI

```javascript
render() {
  const modal = document.getElementById('price-alert-modal');
  if (!modal) return;
  
  // 根據認證狀態渲染不同內容
  if (!this.isAuthenticated) {
    this.renderLoginRequired();
  } else {
    this.renderAlertForm();
  }
  
  modal.style.display = 'flex';
  
  // 設定事件監聽器
  this.setupEventListeners();
}
```

#### renderLoginRequired()
**功能**: 渲染登入要求界面

```javascript
renderLoginRequired() {
  const modal = document.getElementById('price-alert-modal');
  modal.innerHTML = `
    <div class="modal-content price-alert-content">
      <div class="modal-header">
        <h3>🔔 設定價格警報</h3>
        <button class="close-btn" onclick="window.priceAlertModal.hide()">&times;</button>
      </div>
      
      <div class="login-required-section">
        <div class="login-prompt">
          <div class="login-icon">🔐</div>
          <h4>需要登入才能設定價格警報</h4>
          <p>登入後即可享受以下功能：</p>
          <ul class="feature-list">
            <li>✅ 設定即時價格警報</li>
            <li>✅ LINE 通知推送</li>
            <li>✅ 個人化觀察清單</li>
            <li>✅ AI 分析訂閱</li>
          </ul>
        </div>
        
        <div class="login-options">
          <button onclick="window.authManager.login('line')" class="login-btn line-login">
            <span class="login-icon">📱</span>
            使用 LINE 登入
          </button>
          <button onclick="window.authManager.login('google')" class="login-btn google-login">
            <span class="login-icon">🔍</span>
            使用 Google 登入
          </button>
        </div>
      </div>
    </div>
  `;
}
```

#### renderAlertForm()
**功能**: 渲染警報設定表單

```javascript
renderAlertForm() {
  const modal = document.getElementById('price-alert-modal');
  
  // 檢查會員配額
  const { canCreateAlert, quotaMessage } = this.checkAlertQuota();
  
  modal.innerHTML = `
    <div class="modal-content price-alert-content">
      <div class="modal-header">
        <h3>🔔 設定價格警報 - ${this.currentSymbol}</h3>
        <button class="close-btn" onclick="window.priceAlertModal.hide()">&times;</button>
      </div>
      
      ${this.renderCurrentPrice()}
      ${this.renderExistingAlerts()}
      ${canCreateAlert ? this.renderAlertCreationForm() : this.renderQuotaExceeded(quotaMessage)}
      ${this.renderLineStatus()}
    </div>
  `;
}
```

### 6. 警報管理

#### saveAlert()
**功能**: 儲存新的價格警報

```javascript
async saveAlert() {
  try {
    const alertData = this.collectFormData();
    
    // 驗證表單數據
    const validation = this.validateAlertData(alertData);
    if (!validation.isValid) {
      this.showError(validation.message);
      return;
    }
    
    const token = localStorage.getItem('nexustrade_token');
    const response = await fetch('/api/notifications/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(alertData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.showSuccess('✅ 價格警報設定成功！');
      await this.loadExistingAlerts(); // 重新載入警報清單
      this.render(); // 重新渲染界面
    } else {
      throw new Error(data.error?.message || '設定警報失敗');
    }
  } catch (error) {
    console.error('❌ 儲存警報失敗:', error);
    this.showError(`設定失敗: ${error.message}`);
  }
}
```

#### deleteAlert(alertId)
**功能**: 刪除指定的價格警報

```javascript
async deleteAlert(alertId) {
  try {
    if (!confirm('確定要刪除這個價格警報嗎？')) {
      return;
    }
    
    const token = localStorage.getItem('nexustrade_token');
    const response = await fetch(`/api/notifications/alerts/${alertId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.showSuccess('🗑️ 價格警報已刪除');
      await this.loadExistingAlerts();
      this.render();
    } else {
      throw new Error(data.error?.message || '刪除警報失敗');
    }
  } catch (error) {
    console.error('❌ 刪除警報失敗:', error);
    this.showError(`刪除失敗: ${error.message}`);
  }
}
```

### 7. 會員制度整合

#### checkAlertQuota()
**功能**: 檢查用戶警報配額

```javascript
checkAlertQuota() {
  if (!this.user) {
    return { canCreateAlert: false, quotaMessage: '請先登入' };
  }
  
  const membershipLevel = this.user.membershipLevel || 'free';
  const quotaLimits = {
    free: 1,
    premium: 50,
    enterprise: Infinity
  };
  
  const currentLimit = quotaLimits[membershipLevel];
  const currentCount = this.existingAlerts.length;
  
  if (currentCount >= currentLimit) {
    return {
      canCreateAlert: false,
      quotaMessage: `您已達到 ${membershipLevel === 'free' ? '免費會員' : '付費會員'} 警報數量限制 (${currentCount}/${currentLimit})`
    };
  }
  
  return {
    canCreateAlert: true,
    quotaMessage: `目前警報數量: ${currentCount}/${currentLimit === Infinity ? '無限制' : currentLimit}`
  };
}
```

### 8. 表單驗證

#### validateAlertData(alertData)
**功能**: 驗證警報數據

```javascript
validateAlertData(alertData) {
  const { alertType, targetPrice, symbol } = alertData;
  
  // 必填欄位檢查
  if (!alertType || !symbol) {
    return { isValid: false, message: '請選擇警報類型和交易對' };
  }
  
  // 價格驗證
  if (['price_above', 'price_below'].includes(alertType)) {
    if (!targetPrice || targetPrice <= 0) {
      return { isValid: false, message: '請輸入有效的目標價格' };
    }
    
    if (alertType === 'price_above' && targetPrice <= this.currentPrice) {
      return { isValid: false, message: '上穿警報的目標價格必須高於當前價格' };
    }
    
    if (alertType === 'price_below' && targetPrice >= this.currentPrice) {
      return { isValid: false, message: '下穿警報的目標價格必須低於當前價格' };
    }
  }
  
  return { isValid: true, message: '驗證通過' };
}
```

### 9. 錯誤處理與用戶回饋

#### showError(message)
**功能**: 顯示錯誤訊息

```javascript
showError(message) {
  const errorDiv = document.getElementById('alert-error-message');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // 3秒後自動隱藏
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 3000);
  }
}
```

#### showSuccess(message)
**功能**: 顯示成功訊息

```javascript
showSuccess(message) {
  const successDiv = document.getElementById('alert-success-message');
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    // 2秒後自動隱藏
    setTimeout(() => {
      successDiv.style.display = 'none';
    }, 2000);
  }
}
```

## 🎯 事件處理

### 表單提交事件
```javascript
handleSubmit(event) {
  event.preventDefault();
  this.saveAlert();
}
```

### 警報類型變化事件
```javascript
handleAlertTypeChange(event) {
  const alertType = event.target.value;
  const targetPriceGroup = document.getElementById('target-price-group');
  
  if (['price_above', 'price_below'].includes(alertType)) {
    targetPriceGroup.style.display = 'block';
  } else {
    targetPriceGroup.style.display = 'none';
  }
}
```

### 認證狀態更新事件
```javascript
async handleAuthStateUpdate(event) {
  if (!this.isVisible) return;
  
  const { isAuthenticated, user } = event.detail;
  
  if (isAuthenticated && user) {
    console.log('🔐 認證狀態已更新，重新載入模態框');
    this.checkAuthStatus();
    await this.loadExistingAlerts();
    this.render();
  } else {
    console.log('🔒 用戶已登出，重新渲染登入界面');
    this.isAuthenticated = false;
    this.user = null;
    this.render();
  }
}
```

## 🔧 實用方法

### collectFormData()
**功能**: 收集表單數據

```javascript
collectFormData() {
  const form = document.getElementById('price-alert-form');
  const formData = new FormData(form);
  
  return {
    symbol: this.currentSymbol,
    alertType: formData.get('alertType'),
    targetPrice: parseFloat(formData.get('targetPrice')),
    notificationMethods: {
      lineMessaging: {
        enabled: this.isLineConnected
      }
    }
  };
}
```

### formatPrice(price)
**功能**: 格式化價格顯示

```javascript
formatPrice(price) {
  if (typeof price !== 'number') return '0';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 8
  }).format(price);
}
```

## 🎨 CSS 類別

### 模態框樣式
```css
.price-alert-content {
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.alert-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.alert-type-selector {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.target-price-input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}
```

### 響應式設計
```css
@media (max-width: 768px) {
  .price-alert-content {
    width: 95%;
    margin: 1rem;
  }
  
  .alert-form {
    gap: 0.75rem;
  }
}
```

## 🧪 測試範例

### 單元測試
```javascript
describe('PriceAlertModal', () => {
  let modal;
  
  beforeEach(() => {
    document.body.innerHTML = '<div id="price-alert-modal"></div>';
    modal = new PriceAlertModal();
  });
  
  test('should initialize with correct default values', () => {
    expect(modal.isVisible).toBe(false);
    expect(modal.currentSymbol).toBeNull();
    expect(modal.existingAlerts).toEqual([]);
  });
  
  test('should validate alert data correctly', () => {
    const validData = {
      alertType: 'price_above',
      targetPrice: 50000,
      symbol: 'BTCUSDT'
    };
    
    modal.currentPrice = 45000;
    const result = modal.validateAlertData(validData);
    
    expect(result.isValid).toBe(true);
  });
  
  test('should reject invalid price data', () => {
    const invalidData = {
      alertType: 'price_above',
      targetPrice: 40000, // 低於當前價格
      symbol: 'BTCUSDT'
    };
    
    modal.currentPrice = 45000;
    const result = modal.validateAlertData(invalidData);
    
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('必須高於當前價格');
  });
});
```

### 整合測試
```javascript
describe('PriceAlertModal Integration', () => {
  test('should create alert successfully', async () => {
    // Mock API response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    );
    
    const modal = new PriceAlertModal();
    modal.currentSymbol = 'BTCUSDT';
    modal.currentPrice = 45000;
    
    // Mock form data
    jest.spyOn(modal, 'collectFormData').mockReturnValue({
      symbol: 'BTCUSDT',
      alertType: 'price_above',
      targetPrice: 50000
    });
    
    await modal.saveAlert();
    
    expect(global.fetch).toHaveBeenCalledWith('/api/notifications/alerts', {
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'Authorization': expect.stringContaining('Bearer')
      }),
      body: expect.any(String)
    });
  });
});
```

## 📊 效能優化

### 防抖處理
```javascript
// 價格輸入防抖
const debouncedPriceValidation = debounce((price) => {
  this.validateTargetPrice(price);
}, 300);
```

### 快取機制
```javascript
// 快取已載入的警報數據
const alertCache = new Map();

async loadExistingAlerts() {
  const cacheKey = `alerts:${this.currentSymbol}`;
  
  if (alertCache.has(cacheKey)) {
    this.existingAlerts = alertCache.get(cacheKey);
    return;
  }
  
  // 從 API 載入數據
  const alerts = await this.fetchAlertsFromAPI();
  alertCache.set(cacheKey, alerts);
  this.existingAlerts = alerts;
}
```

---

*本文件涵蓋了 PriceAlertModal 組件的完整實作細節，包括所有方法、事件處理、驗證邏輯和最佳實務。*