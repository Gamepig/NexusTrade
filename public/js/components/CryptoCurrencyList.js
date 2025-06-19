/**
 * 可重複使用的加密貨幣列表組件
 * 
 * 功能：
 * - 支援首頁固定數量和市場頁面滾動載入模式
 * - 真實 Binance API 數據獲取
 * - 15秒自動更新
 * - 即時變化百分比和點數
 * - 24小時累積交易量
 */

class CryptoCurrencyList {
  constructor(options = {}) {
    // 配置選項
    this.container = options.container; // DOM 容器
    this.mode = options.mode || 'fixed'; // 'fixed' 或 'infinite'
    this.maxCoins = options.maxCoins || 10; // 最大顯示數量
    this.coinsPerPage = options.coinsPerPage || 50; // 每頁數量
    this.updateInterval = options.updateInterval || 10000; // 10秒更新
    this.onCoinClick = options.onCoinClick || null; // 點擊回調
    
    // 狀態管理
    this.currentPage = 1;
    this.totalPages = 1;
    this.isLoading = false;
    this.isUpdating = false;
    this.updateTimer = null;
    this.allCoins = [];
    this.displayedCoins = [];
    this.lastUpdateTime = null;
    
    // DOM 元素
    this.gridElement = null;
    this.loadMoreButton = null;
    this.loadingElement = null;
    
    this.init();
  }

  /**
   * 初始化組件
   */
  init() {
    console.log(`🏗️ 初始化 CryptoCurrencyList 組件 (${this.mode} 模式)...`);
    
    if (!this.container) {
      console.error('❌ 未提供容器元素');
      return;
    }
    
    this.createHTML();
    this.bindEvents();
    this.loadInitialData();
    this.startAutoUpdate();
  }

  /**
   * 創建 HTML 結構 (簡化版 - 不包含表頭和載入狀態)
   */
  createHTML() {
    this.container.innerHTML = `
      <div class="crypto-list-wrapper">
        <div class="crypto-list-grid" id="crypto-grid">
          <!-- 動態載入加密貨幣 -->
        </div>
        
        ${this.mode === 'infinite' ? `
          <div class="crypto-list-load-more" id="crypto-load-more" style="display: none;">
            <button class="btn btn-primary" id="crypto-load-more-btn">載入更多貨幣</button>
          </div>
        ` : ''}
        
        <div class="crypto-list-status">
          <span id="crypto-status">準備載入...</span>
          <span id="crypto-last-update"></span>
        </div>
      </div>
    `;
    
    this.gridElement = this.container.querySelector('#crypto-grid');
    this.loadingElement = null; // 使用外部載入狀態
    this.loadMoreButton = this.container.querySelector('#crypto-load-more-btn');
    this.statusElement = this.container.querySelector('#crypto-status');
    this.lastUpdateElement = this.container.querySelector('#crypto-last-update');
  }

  /**
   * 綁定事件
   */
  bindEvents() {
    if (this.loadMoreButton && this.mode === 'infinite') {
      this.loadMoreButton.addEventListener('click', () => {
        this.loadMoreCoins();
      });
    }
    
    // 滾動載入 (僅限無限模式)
    if (this.mode === 'infinite') {
      window.addEventListener('scroll', () => {
        if (this.shouldLoadMore()) {
          this.loadMoreCoins();
        }
      });
    }
  }

  /**
   * 是否應該載入更多
   */
  shouldLoadMore() {
    if (this.isLoading || this.currentPage >= this.totalPages) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    return scrollTop + clientHeight >= scrollHeight - 1000;
  }

  /**
   * 載入初始數據
   */
  async loadInitialData() {
    try {
      this.setLoading(true);
      await this.fetchAndDisplayCoins(1);
    } catch (error) {
      console.error('❌ 載入初始數據失敗:', error);
      this.showError('載入失敗，請重試');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * 載入更多貨幣
   */
  async loadMoreCoins() {
    if (this.isLoading || this.currentPage >= this.totalPages) return;
    
    try {
      this.isLoading = true;
      this.updateLoadMoreButton(true);
      
      await this.fetchAndDisplayCoins(this.currentPage + 1, true);
      this.currentPage++;
      
    } catch (error) {
      console.error('❌ 載入更多失敗:', error);
    } finally {
      this.isLoading = false;
      this.updateLoadMoreButton(false);
    }
  }

  /**
   * 獲取並顯示貨幣數據
   */
  async fetchAndDisplayCoins(page = 1, append = false) {
    console.log(`📡 獲取第 ${page} 頁貨幣數據...`);
    
    try {
      // 獲取熱門貨幣列表
      const response = await fetch('/api/market/trending?limit=200');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '獲取數據失敗');
      }
      
      const allCoins = result.data;
      console.log(`📊 獲取到 ${allCoins.length} 個貨幣數據`);
      
      // 計算分頁
      const startIndex = (page - 1) * this.coinsPerPage;
      const endIndex = Math.min(startIndex + this.coinsPerPage, this.maxCoins);
      const coinsToShow = allCoins.slice(startIndex, endIndex);
      
      // 獲取價格數據
      const priceData = await this.fetchPriceData(coinsToShow);
      
      if (append) {
        this.displayedCoins.push(...priceData);
        this.appendCoins(priceData);
      } else {
        this.displayedCoins = priceData;
        this.renderCoins(priceData);
      }
      
      // 更新分頁資訊
      this.totalPages = Math.ceil(Math.min(allCoins.length, this.maxCoins) / this.coinsPerPage);
      this.updateStatus(`已載入 ${this.displayedCoins.length} 個貨幣`);
      this.updateLastUpdateTime();
      
    } catch (error) {
      console.error('❌ 獲取貨幣數據失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取價格數據 (真實 Binance API)
   */
  async fetchPriceData(coins) {
    try {
      console.log('📈 獲取即時價格數據...');
      
      // 批量獲取價格數據
      const symbols = coins.map(coin => coin.symbol);
      const batchSize = 50; // Binance API 限制
      const priceData = [];
      
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const batchData = await this.fetchPriceBatch(batch);
        priceData.push(...batchData);
      }
      
      return priceData;
      
    } catch (error) {
      console.error('❌ 獲取價格數據失敗:', error);
      throw error;
    }
  }

  /**
   * 批量獲取價格數據
   */
  async fetchPriceBatch(symbols) {
    try {
      const symbolsParam = symbols.join(',');
      const response = await fetch(`/api/market/batch-prices?symbols=${symbolsParam}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '獲取價格失敗');
      }
      
      return result.data.map((item, index) => ({
        symbol: item.symbol,
        name: this.getCoinName(item.symbol),
        price: parseFloat(item.price),
        change24h: parseFloat(item.priceChangePercent),
        changeAmount: parseFloat(item.priceChange),
        volume24h: parseFloat(item.volume),
        lastUpdate: new Date().toISOString()
      }));
      
    } catch (error) {
      console.error('❌ 批量獲取價格失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取貨幣名稱
   */
  getCoinName(symbol) {
    const coinNames = {
      'BTCUSDT': 'Bitcoin',
      'ETHUSDT': 'Ethereum',
      'BNBUSDT': 'BNB',
      'ADAUSDT': 'Cardano',
      'SOLUSDT': 'Solana',
      'XRPUSDT': 'XRP',
      'DOGEUSDT': 'Dogecoin',
      'AVAXUSDT': 'Avalanche',
      'DOTUSDT': 'Polkadot',
      'MATICUSDT': 'Polygon'
    };
    
    return coinNames[symbol] || symbol.replace('USDT', '');
  }

  /**
   * 獲取貨幣圖標 HTML (使用新的本地圖標系統)
   */
  getCoinIcon(symbol, name) {
    // 優先使用全局的本地圖標系統
    if (typeof window.getCryptoIcon === 'function') {
      return window.getCryptoIcon(symbol, 32);
    }
    
    // 後備方案：文字圖標
    const baseSymbol = symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '').toLowerCase();
    const colors = {
      'btc': '#f7931a', 'eth': '#627eea', 'bnb': '#f0b90b', 'ada': '#0033ad',
      'sol': '#9945ff', 'xrp': '#00aae4', 'doge': '#c2a633', 'dot': '#e6007a',
      'avax': '#e84142', 'matic': '#8247e5', 'link': '#375bd2', 'ltc': '#bfbbbb',
      'usdc': '#2775ca', 'usdt': '#26a17b', 'fdusd': '#f0b90b', 'sui': '#4da2ff'
    };
    
    const color = colors[baseSymbol] || '#666666';
    
    return `<div class="crypto-icon-text" style="
      width: 32px; 
      height: 32px; 
      background: ${color}; 
      color: white; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      border-radius: 50%; 
      font-weight: bold; 
      font-size: 12px;
      border: 2px solid rgba(255,255,255,0.2);
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">${baseSymbol.substring(0, 3).toUpperCase()}</div>`;
  }

  /**
   * 渲染貨幣列表
   */
  renderCoins(coins) {
    if (!coins || coins.length === 0) {
      this.gridElement.innerHTML = `
        <div class="no-data">
          <div class="no-data-icon">📊</div>
          <h3>暫無數據</h3>
          <p>目前沒有可顯示的貨幣數據</p>
        </div>
      `;
      return;
    }
    
    this.gridElement.innerHTML = coins.map(coin => this.createCoinCard(coin)).join('');
    this.bindCoinClickEvents();
  }

  /**
   * 追加貨幣列表
   */
  appendCoins(coins) {
    if (!coins || coins.length === 0) return;
    
    const coinsHTML = coins.map(coin => this.createCoinCard(coin)).join('');
    this.gridElement.insertAdjacentHTML('beforeend', coinsHTML);
    this.bindCoinClickEvents();
  }

  /**
   * 創建貨幣卡片 (移除編號)
   */
  createCoinCard(coin) {
    const isPositive = coin.change24h >= 0;
    const changeClass = isPositive ? 'positive' : 'negative';
    const changeIcon = isPositive ? '↗' : '↘';
    
    return `
      <div class="coin-card" data-symbol="${coin.symbol}">
        <div class="coin-info">
          <div class="coin-icon">
            <img src="${this.getCoinIcon(coin.symbol, coin.name)}" 
                 alt="${coin.name}" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div class="coin-icon-fallback" style="display: none;">
              ${coin.symbol.substring(0, 3)}
            </div>
          </div>
          <div class="coin-details">
            <div class="coin-name">${coin.name}</div>
            <div class="coin-symbol">${coin.symbol}</div>
          </div>
        </div>
        
        <div class="coin-price">
          $${this.formatPrice(coin.price)}
        </div>
        
        <div class="coin-change ${changeClass}">
          <div class="change-percent">${changeIcon} ${coin.change24h.toFixed(2)}%</div>
          <div class="change-amount">$${this.formatPrice(Math.abs(coin.changeAmount))}</div>
        </div>
        
        <div class="coin-volume">
          $${this.formatVolume(coin.volume24h)}
        </div>
      </div>
    `;
  }

  /**
   * 綁定貨幣點擊事件
   */
  bindCoinClickEvents() {
    const coinCards = this.gridElement.querySelectorAll('.coin-card');
    coinCards.forEach(card => {
      card.addEventListener('click', () => {
        const symbol = card.dataset.symbol;
        if (this.onCoinClick) {
          this.onCoinClick(symbol);
        } else {
          // 預設行為：導航到技術分析頁面
          console.log(`點擊貨幣: ${symbol}`);
          // window.location.hash = `#/analysis/${symbol}`;
        }
      });
    });
  }

  /**
   * 更新價格數據
   */
  async updatePrices() {
    if (this.isUpdating || this.displayedCoins.length === 0) return;
    
    try {
      this.isUpdating = true;
      console.log('🔄 更新價格數據...');
      
      const symbols = this.displayedCoins.map(coin => coin.symbol);
      const updatedData = await this.fetchPriceBatch(symbols);
      
      // 更新顯示的數據
      updatedData.forEach((newData, index) => {
        if (this.displayedCoins[index]) {
          this.displayedCoins[index] = { ...this.displayedCoins[index], ...newData };
        }
      });
      
      // 重新渲染
      this.renderCoins(this.displayedCoins);
      this.updateLastUpdateTime();
      
      console.log('✅ 價格更新完成');
      
    } catch (error) {
      console.error('❌ 更新價格失敗:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 開始自動更新
   */
  startAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    this.updateTimer = setInterval(() => {
      this.updatePrices();
    }, this.updateInterval);
    
    console.log(`⏰ 已啟動自動更新 (${this.updateInterval / 1000}秒間隔)`);
  }

  /**
   * 停止自動更新
   */
  stopAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * 工具方法
   */
  formatPrice(price) {
    if (price >= 1) {
      return price.toFixed(2);
    } else if (price >= 0.01) {
      return price.toFixed(4);
    } else {
      return price.toFixed(8);
    }
  }

  formatVolume(volume) {
    if (volume >= 1e9) {
      return (volume / 1e9).toFixed(2) + 'B';
    } else if (volume >= 1e6) {
      return (volume / 1e6).toFixed(2) + 'M';
    } else if (volume >= 1e3) {
      return (volume / 1e3).toFixed(2) + 'K';
    } else {
      return volume.toFixed(2);
    }
  }

  setLoading(loading) {
    this.isLoading = loading;
    
    // 使用外部載入狀態元素 (market-loading)
    const externalLoading = document.getElementById('market-loading');
    if (externalLoading) {
      externalLoading.style.display = loading ? 'block' : 'none';
    }
    
    // 如果有內部載入元素也控制它
    if (this.loadingElement) {
      this.loadingElement.style.display = loading ? 'block' : 'none';
    }
  }

  updateLoadMoreButton(loading) {
    if (this.loadMoreButton) {
      this.loadMoreButton.disabled = loading;
      this.loadMoreButton.textContent = loading ? '載入中...' : '載入更多貨幣';
    }
  }

  updateStatus(message) {
    if (this.statusElement) {
      this.statusElement.textContent = message;
    }
  }

  updateLastUpdateTime() {
    this.lastUpdateTime = new Date();
    if (this.lastUpdateElement) {
      this.lastUpdateElement.textContent = `最後更新: ${this.lastUpdateTime.toLocaleTimeString()}`;
    }
  }

  showError(message) {
    this.gridElement.innerHTML = `
      <div class="error-message">
        <div class="error-icon">⚠️</div>
        <h3>載入失敗</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="this.closest('.crypto-list-wrapper').parentElement.component.loadInitialData()">重試</button>
      </div>
    `;
  }

  /**
   * 銷毀組件
   */
  destroy() {
    this.stopAutoUpdate();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// 導出類別
window.CryptoCurrencyList = CryptoCurrencyList;