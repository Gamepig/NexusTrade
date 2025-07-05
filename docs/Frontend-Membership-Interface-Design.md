# NexusTrade 前端會員限制與升級界面設計

## 📋 設計概述

### 設計目標

**核心價值**：
- 透明展示會員權益差異
- 流暢的升級引導體驗
- 非侵入式的功能限制提示
- 提升付費轉換率

**設計原則**：
- **漸進式展示**：先讓用戶體驗基本功能，再引導升級
- **價值導向**：突出付費會員的具體價值
- **用戶友善**：避免過於頻繁的升級提示
- **視覺層次**：清晰區分免費和付費功能

## 🎯 會員制度架構

### 會員等級定義

```javascript
const membershipTiers = {
  free: {
    name: '免費會員',
    priceAlerts: {
      maxCount: 1,
      types: ['price_above', 'price_below', 'percent_change']
    },
    features: [
      '基本價格警報 (1個)',
      '市場數據瀏覽',
      '新聞資訊',
      '基礎 AI 分析'
    ],
    limitations: [
      '技術指標警報',
      '無限警報數量',
      '進階 AI 分析',
      '自訂警報組合'
    ]
  },
  premium: {
    name: '付費會員',
    price: 'NT$299/月',
    priceAlerts: {
      maxCount: 50,
      types: ['all'] // 包含所有技術指標類型
    },
    features: [
      '無限價格警報',
      '技術指標警報 (RSI、MACD、移動平均線等)',
      '進階 AI 分析',
      '自訂警報組合',
      '優先客服支援'
    ]
  },
  enterprise: {
    name: '企業會員',
    price: '聯繫客服',
    priceAlerts: {
      maxCount: -1, // 無限制
      types: ['all', 'custom']
    },
    features: [
      '所有付費會員功能',
      '自訂技術指標',
      '批量警報管理',
      'API 存取權限',
      '專屬客戶經理'
    ]
  }
};
```

## 🎨 核心界面組件設計

### 1. 會員狀態顯示組件

**位置**：頁面右上角用戶頭像旁
**檔案**：`public/js/components/MembershipBadge.js`

```javascript
class MembershipBadge {
  constructor() {
    this.container = null;
    this.currentTier = 'free';
    this.init();
  }

  init() {
    this.render();
    this.attachEvents();
  }

  render() {
    const badgeHtml = `
      <div class="membership-badge" data-tier="${this.currentTier}">
        <div class="badge-content">
          <span class="tier-icon">${this.getTierIcon()}</span>
          <span class="tier-name">${this.getTierName()}</span>
          ${this.currentTier === 'free' ? '<span class="upgrade-hint">升級</span>' : ''}
        </div>
        ${this.currentTier === 'free' ? this.renderUpgradeTooltip() : ''}
      </div>
    `;
    
    // 插入到用戶菜單區域
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
      userMenu.insertAdjacentHTML('beforeend', badgeHtml);
      this.container = userMenu.querySelector('.membership-badge');
    }
  }

  renderUpgradeTooltip() {
    return `
      <div class="upgrade-tooltip hidden">
        <h4>解鎖更多功能</h4>
        <ul>
          <li>✨ 無限價格警報</li>
          <li>📊 技術指標警報</li>
          <li>🤖 進階 AI 分析</li>
        </ul>
        <button class="btn-upgrade-primary">立即升級 NT$299/月</button>
      </div>
    `;
  }

  getTierIcon() {
    const icons = {
      free: '🆓',
      premium: '⭐',
      enterprise: '👑'
    };
    return icons[this.currentTier] || '🆓';
  }

  getTierName() {
    const names = {
      free: '免費會員',
      premium: '付費會員',
      enterprise: '企業會員'
    };
    return names[this.currentTier] || '免費會員';
  }
}
```

### 2. 功能限制提示組件

**觸發時機**：當用戶嘗試使用付費功能時
**檔案**：`public/js/components/FeatureLimitModal.js`

```javascript
class FeatureLimitModal {
  constructor() {
    this.isVisible = false;
    this.init();
  }

  // 顯示技術指標限制提示
  showTechnicalIndicatorLimit() {
    const modalContent = {
      title: '技術指標警報 - 付費會員專屬',
      icon: '📊',
      description: '技術指標警報能幫助您捕捉更精準的交易機會',
      features: [
        'RSI 超買超賣警報',
        'MACD 金叉死叉提醒',
        '移動平均線突破警報',
        '布林通道邊界觸及提醒',
        '威廉指標轉折警報'
      ],
      currentPlan: 'free',
      upgradeOptions: [
        {
          plan: 'premium',
          price: 'NT$299/月',
          highlight: true,
          features: ['解鎖所有技術指標', '無限警報數量', '進階 AI 分析']
        }
      ]
    };
    
    this.show(modalContent);
  }

  // 顯示警報數量限制提示
  showAlertLimitReached() {
    const modalContent = {
      title: '您已達到免費會員的警報數量限制',
      icon: '🔔',
      description: '免費會員最多可建立 1 個價格警報，升級即可享受無限警報',
      currentAlerts: 1,
      maxAlerts: 1,
      upgradeOptions: [
        {
          plan: 'premium',
          price: 'NT$299/月',
          highlight: true,
          features: ['最多 50 個警報', '技術指標警報', '進階功能']
        }
      ]
    };
    
    this.show(modalContent);
  }

  show(content) {
    const modalHtml = `
      <div class="feature-limit-modal-overlay">
        <div class="feature-limit-modal">
          <button class="modal-close">&times;</button>
          
          <div class="modal-header">
            <div class="feature-icon">${content.icon}</div>
            <h2>${content.title}</h2>
            <p class="description">${content.description}</p>
          </div>

          ${content.features ? this.renderFeatureList(content.features) : ''}
          ${content.currentAlerts !== undefined ? this.renderAlertUsage(content) : ''}
          
          <div class="upgrade-options">
            <h3>選擇您的方案</h3>
            <div class="plans-container">
              ${this.renderCurrentPlan()}
              ${content.upgradeOptions.map(option => this.renderUpgradePlan(option)).join('')}
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-upgrade-primary" onclick="window.membershipManager.startUpgrade('premium')">
              立即升級 NT$299/月
            </button>
            <button class="btn-secondary" onclick="this.closest('.feature-limit-modal-overlay').remove()">
              稍後再說
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.attachModalEvents();
    this.isVisible = true;
  }

  renderFeatureList(features) {
    return `
      <div class="premium-features">
        <h4>付費會員可享受：</h4>
        <ul>
          ${features.map(feature => `<li><span class="check">✅</span> ${feature}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  renderAlertUsage(content) {
    const percentage = (content.currentAlerts / content.maxAlerts) * 100;
    return `
      <div class="alert-usage">
        <h4>警報使用狀況</h4>
        <div class="usage-bar">
          <div class="usage-fill" style="width: ${percentage}%"></div>
        </div>
        <p class="usage-text">${content.currentAlerts} / ${content.maxAlerts} 個警報已使用</p>
      </div>
    `;
  }

  renderCurrentPlan() {
    return `
      <div class="plan-card current-plan">
        <div class="plan-header">
          <h4>🆓 免費會員</h4>
          <p class="price">目前方案</p>
        </div>
        <ul class="plan-features">
          <li>✅ 1 個基本價格警報</li>
          <li>✅ 市場數據瀏覽</li>
          <li>✅ 新聞資訊</li>
          <li>❌ 技術指標警報</li>
          <li>❌ 無限警報數量</li>
        </ul>
      </div>
    `;
  }

  renderUpgradePlan(option) {
    return `
      <div class="plan-card upgrade-plan ${option.highlight ? 'recommended' : ''}">
        <div class="plan-header">
          <h4>⭐ ${option.plan === 'premium' ? '付費會員' : '企業會員'}</h4>
          <p class="price">${option.price}</p>
          ${option.highlight ? '<span class="recommended-badge">推薦</span>' : ''}
        </div>
        <ul class="plan-features">
          ${option.features.map(feature => `<li>✅ ${feature}</li>`).join('')}
        </ul>
      </div>
    `;
  }
}
```

### 3. 價格警報設定界面整合

**修改檔案**：`public/js/components/PriceAlertModal.js`
**新增會員制度檢查**：

```javascript
// 在 PriceAlertModal 類別中新增方法

checkMembershipLimits() {
  const currentUser = this.getCurrentUser();
  if (!currentUser || currentUser.membershipTier === 'free') {
    return this.checkFreeMemberLimits();
  }
  return { allowed: true };
}

async checkFreeMemberLimits() {
  try {
    // 檢查當前警報數量
    const response = await fetch('/api/price-alerts/stats', {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });
    
    const stats = await response.json();
    
    if (stats.activeAlerts >= 1) {
      return {
        allowed: false,
        reason: 'limit_reached',
        current: stats.activeAlerts,
        max: 1
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('檢查會員限制失敗:', error);
    return { allowed: true }; // 錯誤時允許，避免阻礙用戶
  }
}

// 修改原有的警報建立方法
async createAlert(alertData) {
  // 技術指標類型檢查
  if (this.isTechnicalIndicatorAlert(alertData.alertType)) {
    const limitModal = new FeatureLimitModal();
    limitModal.showTechnicalIndicatorLimit();
    return;
  }
  
  // 數量限制檢查
  const limitCheck = await this.checkMembershipLimits();
  if (!limitCheck.allowed) {
    if (limitCheck.reason === 'limit_reached') {
      const limitModal = new FeatureLimitModal();
      limitModal.showAlertLimitReached();
      return;
    }
  }
  
  // 繼續原有的警報建立邏輯
  // ...
}

isTechnicalIndicatorAlert(alertType) {
  const technicalTypes = [
    'rsi_above', 'rsi_below', 'rsi_overbought', 'rsi_oversold',
    'macd_bullish_crossover', 'macd_bearish_crossover',
    'ma_cross_above', 'ma_cross_below', 'ma_golden_cross', 'ma_death_cross',
    'bb_upper_touch', 'bb_lower_touch', 'bb_squeeze', 'bb_expansion',
    'williams_overbought', 'williams_oversold'
  ];
  return technicalTypes.includes(alertType);
}
```

### 4. 升級流程管理器

**檔案**：`public/js/components/MembershipManager.js`

```javascript
class MembershipManager {
  constructor() {
    this.currentTier = 'free';
    this.upgradeModal = null;
    this.init();
  }

  init() {
    this.loadMembershipStatus();
    this.attachGlobalEvents();
  }

  async loadMembershipStatus() {
    try {
      const response = await fetch('/api/user/membership', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.currentTier = data.tier || 'free';
        this.updateUIForTier();
      }
    } catch (error) {
      console.warn('無法載入會員狀態:', error);
      this.currentTier = 'free';
    }
  }

  updateUIForTier() {
    // 更新會員徽章
    const badge = document.querySelector('.membership-badge');
    if (badge) {
      badge.dataset.tier = this.currentTier;
    }

    // 顯示/隱藏付費功能
    this.togglePremiumFeatures();
  }

  togglePremiumFeatures() {
    const premiumElements = document.querySelectorAll('[data-premium="true"]');
    const isPremium = this.currentTier !== 'free';
    
    premiumElements.forEach(element => {
      if (isPremium) {
        element.classList.remove('premium-disabled');
      } else {
        element.classList.add('premium-disabled');
        element.addEventListener('click', this.handlePremiumFeatureClick.bind(this));
      }
    });
  }

  handlePremiumFeatureClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const featureType = event.target.dataset.featureType || 'general';
    this.showUpgradePrompt(featureType);
  }

  showUpgradePrompt(featureType) {
    const limitModal = new FeatureLimitModal();
    
    switch (featureType) {
      case 'technical_indicator':
        limitModal.showTechnicalIndicatorLimit();
        break;
      case 'alert_limit':
        limitModal.showAlertLimitReached();
        break;
      default:
        limitModal.showGeneralUpgrade();
    }
  }

  startUpgrade(targetTier) {
    // 關閉任何開啟的模態框
    const modals = document.querySelectorAll('.feature-limit-modal-overlay');
    modals.forEach(modal => modal.remove());

    // 顯示升級流程
    this.showUpgradeFlow(targetTier);
  }

  showUpgradeFlow(targetTier) {
    const upgradeFlowHtml = `
      <div class="upgrade-flow-overlay">
        <div class="upgrade-flow">
          <div class="flow-header">
            <h2>升級到付費會員</h2>
            <button class="flow-close">&times;</button>
          </div>
          
          <div class="flow-content">
            <div class="plan-summary">
              <h3>⭐ 付費會員 - NT$299/月</h3>
              <ul class="benefits">
                <li>✅ 無限價格警報 (目前限制: 1個)</li>
                <li>✅ 技術指標警報 (RSI、MACD、移動平均線等)</li>
                <li>✅ 進階 AI 分析報告</li>
                <li>✅ 自訂警報組合</li>
                <li>✅ 優先客服支援</li>
              </ul>
            </div>

            <div class="payment-section">
              <h4>選擇付款方式</h4>
              <div class="payment-options">
                <label class="payment-option">
                  <input type="radio" name="payment" value="credit_card" checked>
                  <span class="option-content">
                    <strong>信用卡付款</strong>
                    <small>支援 Visa、MasterCard、JCB</small>
                  </span>
                </label>
                <label class="payment-option">
                  <input type="radio" name="payment" value="bank_transfer">
                  <span class="option-content">
                    <strong>銀行轉帳</strong>
                    <small>需要1-2個工作日確認</small>
                  </span>
                </label>
              </div>
            </div>

            <div class="trial-offer">
              <div class="trial-badge">🎉 限時優惠</div>
              <p><strong>首月免費試用</strong> - 隨時可取消</p>
              <small>試用期結束後將自動續費 NT$299/月</small>
            </div>
          </div>

          <div class="flow-actions">
            <button class="btn-upgrade-confirm" onclick="window.membershipManager.processUpgrade()">
              開始免費試用
            </button>
            <button class="btn-cancel" onclick="this.closest('.upgrade-flow-overlay').remove()">
              取消
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', upgradeFlowHtml);
  }

  async processUpgrade() {
    // 這裡實作實際的升級邏輯
    // 可能包含：
    // 1. 收集付款資訊
    // 2. 調用付款 API
    // 3. 更新會員狀態
    // 4. 重新載入頁面或更新 UI
    
    try {
      // 暫時模擬升級成功
      this.showUpgradeSuccess();
    } catch (error) {
      this.showUpgradeError(error.message);
    }
  }

  showUpgradeSuccess() {
    const successHtml = `
      <div class="upgrade-success-overlay">
        <div class="upgrade-success">
          <div class="success-icon">🎉</div>
          <h2>升級成功！</h2>
          <p>恭喜您成為付費會員，現在可以享受所有進階功能。</p>
          <button class="btn-primary" onclick="window.location.reload()">
            開始使用
          </button>
        </div>
      </div>
    `;
    
    // 移除升級流程
    document.querySelector('.upgrade-flow-overlay')?.remove();
    
    // 顯示成功訊息
    document.body.insertAdjacentHTML('beforeend', successHtml);
  }

  getAuthToken() {
    return localStorage.getItem('nexustrade_token');
  }
}

// 全域實例
window.membershipManager = new MembershipManager();
```

## 🎨 CSS 樣式設計

**檔案**：`public/css/membership.css`

```css
/* 會員徽章樣式 */
.membership-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
}

.badge-content {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.membership-badge[data-tier="free"] .badge-content {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: #1976d2;
  border: 1px solid #90caf9;
}

.membership-badge[data-tier="premium"] .badge-content {
  background: linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%);
  color: #e65100;
  border: 1px solid #ffab40;
}

.upgrade-hint {
  background: #ff5722;
  color: white;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
  margin-left: 4px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 升級提示工具 */
.upgrade-tooltip {
  position: absolute;
  top: 100%;
  right: 0;
  width: 280px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  padding: 16px;
  z-index: 1000;
  margin-top: 8px;
}

.upgrade-tooltip::before {
  content: '';
  position: absolute;
  top: -8px;
  right: 16px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid white;
}

.upgrade-tooltip h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 14px;
}

.upgrade-tooltip ul {
  margin: 8px 0;
  padding: 0;
  list-style: none;
}

.upgrade-tooltip li {
  padding: 4px 0;
  font-size: 12px;
  color: #666;
}

.btn-upgrade-primary {
  width: 100%;
  background: linear-gradient(135deg, #ff5722 0%, #ff7043 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-upgrade-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255,87,34,0.3);
}

/* 功能限制模態框 */
.feature-limit-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease;
}

.feature-limit-modal {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  animation: slideUp 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  transition: color 0.2s ease;
}

.modal-close:hover {
  color: #333;
}

.modal-header {
  text-align: center;
  padding: 24px 24px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.modal-header h2 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.description {
  color: #666;
  font-size: 16px;
  line-height: 1.5;
  margin: 0;
}

/* 功能列表 */
.premium-features {
  padding: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.premium-features h4 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
}

.premium-features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.premium-features li {
  display: flex;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
  color: #555;
}

.check {
  margin-right: 12px;
  font-size: 16px;
}

/* 警報使用狀況 */
.alert-usage {
  padding: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.alert-usage h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.usage-bar {
  width: 100%;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.usage-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50 0%, #ff9800 70%, #f44336 100%);
  transition: width 0.3s ease;
}

.usage-text {
  font-size: 12px;
  color: #666;
  margin: 0;
}

/* 方案比較 */
.upgrade-options {
  padding: 24px;
}

.upgrade-options h3 {
  margin: 0 0 16px 0;
  color: #333;
  text-align: center;
}

.plans-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.plan-card {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background: white;
  transition: all 0.2s ease;
}

.plan-card.current-plan {
  border-color: #2196f3;
  background: #f3f9ff;
}

.plan-card.upgrade-plan {
  border-color: #ff5722;
  background: #fff3f0;
  position: relative;
}

.plan-card.recommended {
  border-color: #ff5722;
  box-shadow: 0 4px 12px rgba(255,87,34,0.2);
}

.recommended-badge {
  position: absolute;
  top: -1px;
  right: -1px;
  background: #ff5722;
  color: white;
  padding: 4px 8px;
  border-radius: 0 6px 0 6px;
  font-size: 10px;
  font-weight: 600;
}

.plan-header h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #333;
}

.price {
  font-size: 14px;
  font-weight: 600;
  color: #ff5722;
  margin: 0 0 12px 0;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.plan-features li {
  padding: 4px 0;
  font-size: 12px;
  color: #555;
}

/* 模態框操作按鈕 */
.modal-actions {
  padding: 24px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #e0e0e0;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #eeeeee;
  color: #333;
}

/* 付費功能禁用狀態 */
.premium-disabled {
  position: relative;
  opacity: 0.6;
  cursor: not-allowed !important;
}

.premium-disabled::after {
  content: '🔒';
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  font-size: 16px;
  pointer-events: none;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .feature-limit-modal {
    width: 95%;
    max-height: 90vh;
  }
  
  .plans-container {
    grid-template-columns: 1fr;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .upgrade-tooltip {
    width: 240px;
    right: -60px;
  }
}
```

## 🔧 整合實作指南

### 1. HTML 結構整合

**修改檔案**：`public/index.html`

```html
<!-- 在 </head> 前新增會員制度樣式 -->
<link rel="stylesheet" href="/css/membership.css">

<!-- 在用戶選單區域新增會員徽章容器 -->
<div class="user-menu">
  <!-- 現有的用戶頭像和選單 -->
  <!-- 會員徽章將動態插入這裡 -->
</div>

<!-- 在 </body> 前新增會員制度腳本 -->
<script src="/js/components/MembershipBadge.js"></script>
<script src="/js/components/FeatureLimitModal.js"></script>
<script src="/js/components/MembershipManager.js"></script>
```

### 2. API 端點需求

**新增後端端點**：

```javascript
// src/routes/membership.js
router.get('/api/user/membership', auth, async (req, res) => {
  // 返回用戶會員狀態
  res.json({
    tier: req.user.membershipTier || 'free',
    expiresAt: req.user.membershipExpiresAt,
    features: getMembershipFeatures(req.user.membershipTier)
  });
});

router.post('/api/membership/upgrade', auth, async (req, res) => {
  // 處理會員升級請求
  const { targetTier, paymentMethod } = req.body;
  // 實作升級邏輯
});
```

### 3. 現有組件修改

**PriceAlertModal.js 整合**：
- 在警報建立前檢查會員限制
- 顯示適當的限制提示
- 引導用戶升級流程

**主應用程式整合**：
```javascript
// 在 nexus-app-fixed.js 中
document.addEventListener('DOMContentLoaded', () => {
  // 初始化會員管理器
  if (window.MembershipManager) {
    window.membershipManager = new MembershipManager();
  }
  
  // 初始化會員徽章
  if (window.MembershipBadge) {
    new MembershipBadge();
  }
});
```

## 📊 用戶體驗流程

### 流程 1：新用戶首次使用

1. **註冊/登入** → 自動設為免費會員
2. **探索功能** → 可正常使用基本功能
3. **建立第一個警報** → 順利完成，顯示"1/1 已使用"
4. **嘗試建立第二個警報** → 觸發限制提示
5. **查看升級選項** → 顯示付費會員價值
6. **決定升級/繼續免費** → 尊重用戶選擇

### 流程 2：免費用戶嘗試技術指標

1. **瀏覽單一貨幣頁面** → 看到技術指標區塊
2. **點擊技術指標警報按鈕** → 立即顯示限制提示
3. **了解付費功能價值** → 詳細的功能說明
4. **比較方案差異** → 清楚的對比表格
5. **選擇升級或關閉** → 不強制，友善提示

### 流程 3：付費會員體驗

1. **所有功能無限制** → 順暢的使用體驗
2. **會員徽章顯示** → 身份確認和榮譽感
3. **專屬功能標示** → 明確的價值體現
4. **續費提醒** → 到期前適時提醒

## 📈 轉換率優化策略

### 心理學原理應用

1. **稀缺性**：強調免費會員限制
2. **社會證明**：顯示付費會員數量
3. **損失厭惡**：突出錯過機會的成本
4. **價值錨定**：先展示最高價值功能

### A/B 測試建議

**版本 A**：積極推廣型
- 更頻繁的升級提示
- 強調限制和缺失功能

**版本 B**：價值導向型
- 專注展示付費功能價值
- 減少限制提示頻率

## 🎯 成功指標 (KPI)

1. **付費轉換率**：免費→付費會員轉換比例
2. **功能嘗試率**：用戶點擊付費功能的比例
3. **升級流程完成率**：進入升級流程後的完成率
4. **用戶留存率**：付費後的月留存率
5. **平均收益**：每用戶平均收益 (ARPU)

## 🔄 後續迭代計劃

### Phase 1：基礎實作 (2週)
- 核心組件開發
- 基本限制邏輯
- 升級流程框架

### Phase 2：體驗優化 (1週)
- UI/UX 細節調整
- 動畫和互動效果
- 響應式設計完善

### Phase 3：數據驅動優化 (持續)
- A/B 測試實施
- 轉換率分析
- 用戶反饋收集
- 持續優化改進

---

*設計完成時間: 2025-07-01*  
*文件版本: 1.0*  
*預估實作時間: 3-4 週*  
*預期轉換率提升: 25-40%*