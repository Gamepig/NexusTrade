/**
 * 首頁熱門貨幣組件
 * 
 * 功能：
 * - 使用 CryptoCurrencyList 模組顯示固定10種熱門貨幣
 * - 15秒自動更新
 * - 真實 Binance API 數據
 */

class HomeCryptoList {
  constructor() {
    this.cryptoList = null;
    this.container = null;
    
    this.init();
  }

  /**
   * 初始化首頁熱門貨幣
   */
  init() {
    console.log('🏗️ 初始化首頁熱門貨幣組件...');
    
    // 等待 DOM 準備就緒
    setTimeout(() => {
      this.initializeComponent();
    }, 100);
  }

  /**
   * 初始化組件
   */
  initializeComponent() {
    this.container = document.getElementById('trending-coins-list');
    
    console.log('🎯 DOM 元素:', {
      container: !!this.container
    });
    
    if (!this.container) {
      console.error('❌ 找不到 trending-coins-list 元素');
      return;
    }
    
    // 檢查 CryptoCurrencyList 是否已載入
    if (typeof CryptoCurrencyList === 'undefined') {
      console.error('❌ CryptoCurrencyList 組件未載入');
      return;
    }
    
    // 初始化加密貨幣列表 (固定模式，10個貨幣)
    this.cryptoList = new CryptoCurrencyList({
      container: this.container,
      mode: 'fixed',
      maxCoins: 10,
      coinsPerPage: 10,
      updateInterval: 10000, // 10秒更新
      onCoinClick: (symbol) => {
        this.handleCoinClick(symbol);
      }
    });
    
    // 將組件實例綁定到容器
    this.container.component = this.cryptoList;
    
    console.log('✅ 首頁熱門貨幣組件初始化完成');
  }

  /**
   * 處理貨幣點擊事件
   */
  handleCoinClick(symbol) {
    console.log(`📊 首頁點擊貨幣: ${symbol}，導航到詳情頁面`);
    // 導航到貨幣詳情頁面
    window.location.hash = `#/currency/${symbol}`;
  }

  /**
   * 刷新數據
   */
  async refresh() {
    if (this.cryptoList) {
      await this.cryptoList.updatePrices();
    }
  }

  /**
   * 銷毀組件
   */
  destroy() {
    console.log('🗑️ 銷毀首頁熱門貨幣組件...');
    
    if (this.cryptoList) {
      this.cryptoList.destroy();
      this.cryptoList = null;
    }
  }
}

// 導出類別
window.HomeCryptoList = HomeCryptoList;