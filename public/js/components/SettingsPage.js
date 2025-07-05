/**
 * NexusTrade 使用者設定頁面組件
 * 
 * 提供個人化設定功能
 */

class SettingsPage {
  constructor() {
    this.settings = {
      theme: 'dark',
      language: 'zh-TW',
      currency: 'USD',
      refreshInterval: 10,
      notifications: {
        browser: true,
        email: false,
        priceAlerts: true,
        newsUpdates: false
      },
      display: {
        showAdvancedFeatures: false,
        compactMode: false,
        showPercentChange: true,
        showAbsoluteChange: true
      },
      trading: {
        defaultOrderType: 'market',
        confirmOrders: true,
        showBalances: true
      }
    };
    
    // 綁定方法
    this.loadSettings = this.loadSettings.bind(this);
    this.saveSettings = this.saveSettings.bind(this);
    this.resetSettings = this.resetSettings.bind(this);
  }

  /**
   * 初始化設定頁面
   */
  async init() {
    console.log('⚙️ 初始化使用者設定頁面...');
    
    try {
      // 載入儲存的設定
      await this.loadSettings();
      
      // 渲染設定介面
      this.renderSettings();
      
      // 設置事件監聽
      this.setupEventListeners();
      
      console.log('✅ 使用者設定頁面初始化完成');
    } catch (error) {
      console.error('❌ 使用者設定頁面初始化失敗:', error);
      this.showError('初始化失敗: ' + error.message);
    }
  }

  /**
   * 載入使用者設定
   */
  async loadSettings() {
    console.log('📊 載入使用者設定...');
    
    try {
      // 從 localStorage 載入本地設定
      const savedSettings = localStorage.getItem('nexustrade_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        this.settings = { ...this.settings, ...parsedSettings };
        console.log('✅ 已載入本地設定');
      }
      
      // TODO: 從伺服器載入使用者設定 (當有認證系統時)
      // const response = await fetch('/api/users/settings', {
      //   headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      // });
      
    } catch (error) {
      console.error('❌ 載入設定失敗:', error);
      // 使用預設設定
    }
  }

  /**
   * 儲存使用者設定
   */
  async saveSettings() {
    console.log('💾 儲存使用者設定...');
    
    try {
      // 儲存到 localStorage
      localStorage.setItem('nexustrade_settings', JSON.stringify(this.settings));
      console.log('✅ 設定已儲存到本地');
      
      // TODO: 儲存到伺服器 (當有認證系統時)
      // const response = await fetch('/api/users/settings', {
      //   method: 'PUT',
      //   headers: {
      //     'Authorization': `Bearer ${this.getAuthToken()}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(this.settings)
      // });
      
      this.showSuccess('設定已儲存');
      
      // 應用設定到系統
      this.applySettings();
      
    } catch (error) {
      console.error('❌ 儲存設定失敗:', error);
      this.showError('儲存失敗: ' + error.message);
    }
  }

  /**
   * 重置設定為預設值
   */
  async resetSettings() {
    console.log('🔄 重置設定為預設值...');
    
    if (!confirm('確定要重置所有設定為預設值嗎？此操作無法復原。')) {
      return;
    }
    
    try {
      // 重置為預設設定
      this.settings = {
        theme: 'dark',
        language: 'zh-TW',
        currency: 'USD',
        refreshInterval: 10,
        notifications: {
          browser: true,
          email: false,
          priceAlerts: true,
          newsUpdates: false
        },
        display: {
          showAdvancedFeatures: false,
          compactMode: false,
          showPercentChange: true,
          showAbsoluteChange: true
        },
        trading: {
          defaultOrderType: 'market',
          confirmOrders: true,
          showBalances: true
        }
      };
      
      // 儲存重置後的設定
      await this.saveSettings();
      
      // 重新渲染介面
      this.renderSettings();
      
      this.showSuccess('設定已重置為預設值');
      
    } catch (error) {
      console.error('❌ 重置設定失敗:', error);
      this.showError('重置失敗: ' + error.message);
    }
  }

  /**
   * 渲染設定介面
   */
  renderSettings() {
    console.log('🎨 渲染設定介面...');
    
    const container = document.getElementById('settings-container');
    if (!container) {
      console.error('❌ 找不到設定容器');
      return;
    }

    const html = `
      <div class="settings-layout">
        <!-- 設定側邊欄 -->
        <div class="settings-sidebar">
          <nav class="settings-nav">
            <button class="settings-nav-item active" data-section="general">
              <span class="icon">⚙️</span>
              <span class="text">一般設定</span>
            </button>
            <button class="settings-nav-item" data-section="display">
              <span class="icon">🎨</span>
              <span class="text">顯示設定</span>
            </button>
            <button class="settings-nav-item" data-section="notifications">
              <span class="icon">🔔</span>
              <span class="text">通知設定</span>
            </button>
            <button class="settings-nav-item" data-section="trading">
              <span class="icon">📊</span>
              <span class="text">交易設定</span>
            </button>
            <button class="settings-nav-item" data-section="account">
              <span class="icon">👤</span>
              <span class="text">帳戶設定</span>
            </button>
          </nav>
        </div>
        
        <!-- 設定內容區域 -->
        <div class="settings-content">
          <div class="settings-section active" id="general-section">
            ${this.renderGeneralSettings()}
          </div>
          
          <div class="settings-section" id="display-section">
            ${this.renderDisplaySettings()}
          </div>
          
          <div class="settings-section" id="notifications-section">
            ${this.renderNotificationSettings()}
          </div>
          
          <div class="settings-section" id="trading-section">
            ${this.renderTradingSettings()}
          </div>
          
          <div class="settings-section" id="account-section">
            ${this.renderAccountSettings()}
          </div>
        </div>
      </div>
      
      <!-- 設定操作按鈕 -->
      <div class="settings-actions">
        <button id="save-settings-btn" class="btn btn-primary">
          <span class="icon">💾</span>
          儲存設定
        </button>
        <button id="reset-settings-btn" class="btn btn-outline">
          <span class="icon">🔄</span>
          重置為預設
        </button>
        <button id="export-settings-btn" class="btn btn-outline">
          <span class="icon">📤</span>
          匯出設定
        </button>
        <button id="import-settings-btn" class="btn btn-outline">
          <span class="icon">📥</span>
          匯入設定
        </button>
      </div>
    `;

    container.innerHTML = html;
    
    // 重新綁定事件
    this.bindSettingsEvents();
  }

  /**
   * 渲染一般設定
   */
  renderGeneralSettings() {
    return `
      <div class="settings-group">
        <h3 class="settings-group-title">介面設定</h3>
        
        <div class="settings-item">
          <label class="settings-label">
            <span class="label-text">主題</span>
            <span class="label-description">選擇您偏好的介面主題</span>
          </label>
          <select class="settings-select" data-setting="theme">
            <option value="dark" ${this.settings.theme === 'dark' ? 'selected' : ''}>深色主題</option>
            <option value="light" ${this.settings.theme === 'light' ? 'selected' : ''}>淺色主題</option>
            <option value="auto" ${this.settings.theme === 'auto' ? 'selected' : ''}>跟隨系統</option>
          </select>
        </div>
        
        <div class="settings-item">
          <label class="settings-label">
            <span class="label-text">語言</span>
            <span class="label-description">選擇介面語言</span>
          </label>
          <select class="settings-select" data-setting="language">
            <option value="zh-TW" ${this.settings.language === 'zh-TW' ? 'selected' : ''}>繁體中文</option>
            <option value="zh-CN" ${this.settings.language === 'zh-CN' ? 'selected' : ''}>简体中文</option>
            <option value="en" ${this.settings.language === 'en' ? 'selected' : ''}>English</option>
            <option value="ja" ${this.settings.language === 'ja' ? 'selected' : ''}>日本語</option>
          </select>
        </div>
        
        <div class="settings-item">
          <label class="settings-label">
            <span class="label-text">基準貨幣</span>
            <span class="label-description">價格顯示的基準貨幣</span>
          </label>
          <select class="settings-select" data-setting="currency">
            <option value="USD" ${this.settings.currency === 'USD' ? 'selected' : ''}>美元 (USD)</option>
            <option value="TWD" ${this.settings.currency === 'TWD' ? 'selected' : ''}>新台幣 (TWD)</option>
            <option value="CNY" ${this.settings.currency === 'CNY' ? 'selected' : ''}>人民幣 (CNY)</option>
            <option value="JPY" ${this.settings.currency === 'JPY' ? 'selected' : ''}>日圓 (JPY)</option>
          </select>
        </div>
        
        <div class="settings-item">
          <label class="settings-label">
            <span class="label-text">資料更新頻率</span>
            <span class="label-description">市場數據自動更新間隔（秒）</span>
          </label>
          <select class="settings-select" data-setting="refreshInterval">
            <option value="5" ${this.settings.refreshInterval === 5 ? 'selected' : ''}>5 秒</option>
            <option value="10" ${this.settings.refreshInterval === 10 ? 'selected' : ''}>10 秒</option>
            <option value="30" ${this.settings.refreshInterval === 30 ? 'selected' : ''}>30 秒</option>
            <option value="60" ${this.settings.refreshInterval === 60 ? 'selected' : ''}>1 分鐘</option>
          </select>
        </div>
      </div>
    `;
  }

  /**
   * 渲染顯示設定
   */
  renderDisplaySettings() {
    return `
      <div class="settings-group">
        <h3 class="settings-group-title">顯示偏好</h3>
        
        <div class="settings-item">
          <label class="settings-label">
            <span class="label-text">顯示進階功能</span>
            <span class="label-description">顯示進階圖表和技術指標</span>
          </label>
          <div class="settings-toggle">
            <input type="checkbox" class="toggle-input" data-setting="display.showAdvancedFeatures" 
                   ${this.settings.display.showAdvancedFeatures ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </div>
        </div>
        
        <div class="settings-item">
          <label class="settings-label">
            <span class="label-text">緊湊模式</span>
            <span class="label-description">使用更緊密的版面配置</span>
          </label>
          <div class="settings-toggle">
            <input type="checkbox" class="toggle-input" data-setting="display.compactMode" 
                   ${this.settings.display.compactMode ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </div>
        </div>
        
        <div class="settings-item">
          <label class="settings-label">
            <span class="label-text">顯示百分比變化</span>
            <span class="label-description">在價格旁顯示百分比變化</span>
          </label>
          <div class="settings-toggle">
            <input type="checkbox" class="toggle-input" data-setting="display.showPercentChange" 
                   ${this.settings.display.showPercentChange ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </div>
        </div>
        
        <div class="settings-item">
          <label class="settings-label">
            <span class="label-text">顯示絕對變化</span>
            <span class="label-description">在價格旁顯示絕對價格變化</span>
          </label>
          <div class="settings-toggle">
            <input type="checkbox" class="toggle-input" data-setting="display.showAbsoluteChange" 
                   ${this.settings.display.showAbsoluteChange ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染通知設定
   */
  renderNotificationSettings() {
    return `
      <div class="settings-group">
        <h3 class="settings-group-title">通知偏好</h3>
        
        <div class="settings-item">
          <label class="settings-label">
            <span class="label-text">瀏覽器通知</span>
            <span class="label-description">允許網站發送瀏覽器通知</span>
          </label>
          <div class="settings-toggle">
            <input type="checkbox" class="toggle-input" data-setting="notifications.browser" 
                   ${this.settings.notifications.browser ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </div>
        </div>
        
        <div class="settings-item">
          <label class="settings-label">
            <span class="label-text">電子郵件通知</span>
            <span class="label-description">接收重要更新的電子郵件通知</span>
          </label>
          <div class="settings-toggle">
            <input type="checkbox" class="toggle-input" data-setting="notifications.email" 
                   ${this.settings.notifications.email ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </div>
        </div>
        
        <div class="settings-item">
          <label class="settings-label">
            <span class="label-text">價格警報</span>
            <span class="label-description">當設定的價格條件觸發時通知</span>
          </label>
          <div class="settings-toggle">
            <input type="checkbox" class="toggle-input" data-setting="notifications.priceAlerts" 
                   ${this.settings.notifications.priceAlerts ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </div>
        </div>
        
        <div class="settings-item">
          <label class="settings-label">
            <span class="label-text">新聞更新</span>
            <span class="label-description">重要市場新聞的即時通知</span>
          </label>
          <div class="settings-toggle">
            <input type="checkbox" class="toggle-input" data-setting="notifications.newsUpdates" 
                   ${this.settings.notifications.newsUpdates ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染交易設定
   */
  renderTradingSettings() {
    return `
      <div class="settings-group">
        <h3 class="settings-group-title">交易偏好</h3>
        
        <div class="settings-item">
          <label class="settings-label">
            <span class="label-text">預設訂單類型</span>
            <span class="label-description">新建訂單時的預設類型</span>
          </label>
          <select class="settings-select" data-setting="trading.defaultOrderType">
            <option value="market" ${this.settings.trading.defaultOrderType === 'market' ? 'selected' : ''}>市價訂單</option>
            <option value="limit" ${this.settings.trading.defaultOrderType === 'limit' ? 'selected' : ''}>限價訂單</option>
            <option value="stop" ${this.settings.trading.defaultOrderType === 'stop' ? 'selected' : ''}>停損訂單</option>
          </select>
        </div>
        
        <div class="settings-item">
          <label class="settings-label">
            <span class="label-text">訂單確認</span>
            <span class="label-description">執行交易前要求確認</span>
          </label>
          <div class="settings-toggle">
            <input type="checkbox" class="toggle-input" data-setting="trading.confirmOrders" 
                   ${this.settings.trading.confirmOrders ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </div>
        </div>
        
        <div class="settings-item">
          <label class="settings-label">
            <span class="label-text">顯示帳戶餘額</span>
            <span class="label-description">在交易介面顯示可用餘額</span>
          </label>
          <div class="settings-toggle">
            <input type="checkbox" class="toggle-input" data-setting="trading.showBalances" 
                   ${this.settings.trading.showBalances ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染帳戶設定
   */
  renderAccountSettings() {
    return `
      <div class="settings-group">
        <h3 class="settings-group-title">帳戶資訊</h3>
        
        <div class="account-info">
          <div class="account-item">
            <span class="account-label">帳戶狀態</span>
            <span class="account-value">
              <span class="status-badge status-demo">示範模式</span>
            </span>
          </div>
          
          <div class="account-item">
            <span class="account-label">註冊時間</span>
            <span class="account-value">2024-01-01</span>
          </div>
          
          <div class="account-item">
            <span class="account-label">最後登入</span>
            <span class="account-value">剛剛</span>
          </div>
        </div>
        
        <div class="settings-group">
          <h4 class="settings-group-subtitle">連結帳戶</h4>
          
          <div class="oauth-connections">
            <div class="oauth-item">
              <div class="oauth-info">
                <span class="oauth-provider">Google</span>
                <span class="oauth-status disconnected">未連結</span>
              </div>
              <button class="btn btn-sm btn-outline oauth-connect-btn" data-provider="google">
                連結 Google 帳戶
              </button>
            </div>
            
            <div class="oauth-item">
              <div class="oauth-info">
                <span class="oauth-provider">LINE</span>
                <span class="oauth-status disconnected">未連結</span>
              </div>
              <button class="btn btn-sm btn-outline oauth-connect-btn" data-provider="line">
                連結 LINE 帳戶
              </button>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4 class="settings-group-subtitle">帳戶操作</h4>
          
          <div class="account-actions">
            <button class="btn btn-outline" id="change-password-btn">
              <span class="icon">🔐</span>
              變更密碼
            </button>
            <button class="btn btn-outline" id="export-data-btn">
              <span class="icon">📊</span>
              匯出資料
            </button>
            <button class="btn btn-danger" id="delete-account-btn">
              <span class="icon">🗑️</span>
              刪除帳戶
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 設置事件監聽
   */
  setupEventListeners() {
    // 側邊欄導航
    document.querySelectorAll('.settings-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const section = e.currentTarget.dataset.section;
        this.showSection(section);
      });
    });
  }

  /**
   * 綁定設定相關事件
   */
  bindSettingsEvents() {
    // 儲存按鈕
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.collectSettings();
        this.saveSettings();
      });
    }

    // 重置按鈕
    const resetBtn = document.getElementById('reset-settings-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetSettings();
      });
    }

    // 設定控制項事件
    this.bindSettingControls();
  }

  /**
   * 綁定設定控制項事件
   */
  bindSettingControls() {
    // 下拉選單
    document.querySelectorAll('.settings-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const setting = e.target.dataset.setting;
        const value = e.target.value;
        this.updateSetting(setting, value);
      });
    });

    // 切換開關
    document.querySelectorAll('.toggle-input').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const setting = e.target.dataset.setting;
        const value = e.target.checked;
        this.updateSetting(setting, value);
      });
    });
  }

  /**
   * 顯示特定設定區塊
   */
  showSection(sectionName) {
    // 隱藏所有區塊
    document.querySelectorAll('.settings-section').forEach(section => {
      section.classList.remove('active');
    });
    
    // 移除所有導航項目的活躍狀態
    document.querySelectorAll('.settings-nav-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // 顯示目標區塊
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
      targetSection.classList.add('active');
    }
    
    // 設定對應導航項目為活躍
    const navItem = document.querySelector(`.settings-nav-item[data-section="${sectionName}"]`);
    if (navItem) {
      navItem.classList.add('active');
    }
  }

  /**
   * 更新單一設定
   */
  updateSetting(settingPath, value) {
    console.log(`⚙️ 更新設定: ${settingPath} = ${value}`);
    
    // 處理嵌套設定路徑 (例如: display.showAdvancedFeatures)
    const keys = settingPath.split('.');
    let current = this.settings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * 收集所有設定值
   */
  collectSettings() {
    // 收集所有下拉選單的值
    document.querySelectorAll('.settings-select').forEach(select => {
      const setting = select.dataset.setting;
      const value = select.value;
      this.updateSetting(setting, value);
    });

    // 收集所有切換開關的值
    document.querySelectorAll('.toggle-input').forEach(toggle => {
      const setting = toggle.dataset.setting;
      const value = toggle.checked;
      this.updateSetting(setting, value);
    });
  }

  /**
   * 應用設定到系統
   */
  applySettings() {
    console.log('🔧 應用設定到系統...');
    
    // 應用主題設定
    if (this.settings.theme) {
      document.documentElement.setAttribute('data-theme', this.settings.theme);
    }
    
    // 觸發全局設定變更事件
    window.dispatchEvent(new CustomEvent('settingsChanged', {
      detail: this.settings
    }));
  }

  /**
   * 工具方法
   */
  getAuthToken() {
    return localStorage.getItem('auth_token') || 'mock-token';
  }

  showSuccess(message) {
    console.log('✅', message);
    if (window.app && typeof window.app.showNotification === 'function') {
      window.app.showNotification(message, 'success');
    }
  }

  showError(message) {
    console.error('❌', message);
    if (window.app && typeof window.app.showNotification === 'function') {
      window.app.showNotification(message, 'error');
    }
  }

  /**
   * 清理資源
   */
  cleanup() {
    // 清理事件監聽器等資源
    console.log('🧹 清理設定頁面資源');
  }
}

// 建立全域實例
if (typeof window !== 'undefined') {
  window.SettingsPage = SettingsPage;
}