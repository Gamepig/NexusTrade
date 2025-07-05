/**
 * AI 單一貨幣分析組件
 * 
 * 功能：
 * 1. 進入貨幣頁面時自動查詢資料庫當日分析結果
 * 2. 如果沒有才啟動新的分析程序  
 * 3. 顯示該貨幣的日線技術分析
 * 4. 包含趨勢方向、5大技術指標、市場情緒
 */

class AICurrencyAnalysis {
  constructor(containerId, symbol) {
    this.container = document.getElementById(containerId);
    this.symbol = symbol; // 例如: "BTCUSDT"
    this.apiBaseUrl = '/api/ai';
    this.isLoading = false;
    this.currentAnalysis = null;
    this.refreshTimer = null;
    
    if (!this.container) {
      console.error('❌ AI貨幣分析容器未找到:', containerId);
      return;
    }
    
    if (!this.symbol) {
      console.error('❌ 貨幣符號未提供');
      return;
    }
    
    console.log(`🤖 初始化 ${this.symbol} AI 分析組件`);
    this.init();
  }
  
  /**
   * 初始化組件
   */
  async init() {
    this.renderLoadingState();
    await this.loadCurrencyAnalysis();
    this.setupEventListeners();
    
    // 設定每6小時檢查一次是否需要更新分析
    this.refreshTimer = setInterval(() => {
      this.checkForUpdate();
    }, 6 * 60 * 60 * 1000); // 6小時
  }
  
  /**
   * 載入貨幣分析（按需分析）
   */
  async loadCurrencyAnalysis() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    console.log(`📊 載入 ${this.symbol} AI 分析...`);
    
    // 設定60秒超時機制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 60000); // 60秒超時
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/currency-analysis/${this.symbol}`, {
        signal: controller.signal
      });
      
      // 清除超時定時器
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success' && data.data && data.data.analysis) {
        this.currentAnalysis = {
          analysis: data.data.analysis,
          analysisDate: data.data.analysisDate,
          dataSources: data.data.dataSources,
          qualityMetrics: data.data.qualityMetrics,
          isFromCache: data.data.isFromCache
        };
        this.renderAnalysis();
        console.log(`✅ ${this.symbol} AI 分析載入成功 ${data.data.isFromCache ? '(快取)' : '(新分析)'}`);
      } else {
        throw new Error(data.message || 'AI 分析數據格式錯誤');
      }
      
    } catch (error) {
      // 清除超時定時器（防止錯誤情況下未清除）
      clearTimeout(timeoutId);
      
      console.error(`❌ ${this.symbol} AI 分析載入失敗:`, error);
      
      // 處理超時錯誤
      if (error.name === 'AbortError') {
        this.renderTimeoutError();
      } else {
        this.renderError(error.message);
      }
    } finally {
      this.isLoading = false;
    }
  }
  
  
  /**
   * 檢查是否需要更新分析
   */
  async checkForUpdate() {
    if (!this.currentAnalysis) return;
    
    const analysisDate = this.currentAnalysis.analysisDate;
    const today = new Date().toISOString().split('T')[0];
    
    // 如果分析不是今天的，自動更新
    if (analysisDate !== today) {
      console.log(`🔄 ${this.symbol} 分析過期，自動更新...`);
      await this.loadCurrencyAnalysis();
    }
  }
  
  /**
   * 渲染載入狀態
   */
  renderLoadingState() {
    this.container.innerHTML = `
      <div class="ai-currency-analysis loading">
        <div class="analysis-header">
          <div class="header-left">
            <h3>🤖 ${this.symbol} AI 技術分析</h3>
            <div class="analysis-subtitle">
              <span>OpenRouter 驅動</span>
              <span class="separator">•</span>
              <span>日線分析</span>
            </div>
          </div>
          <div class="header-right">
            <div class="analysis-status loading">
              <div class="status-dot"></div>
              <span>分析中...</span>
            </div>
          </div>
        </div>
        
        <div class="analysis-content">
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>正在分析 ${this.symbol} 技術指標與市場情緒...</p>
            <small>首次分析約需 30-60 秒</small>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * 渲染分析結果
   */
  renderAnalysis() {
    if (!this.currentAnalysis) {
      this.renderError('分析數據不可用');
      return;
    }
    
    const analysis = this.currentAnalysis.analysis;
    
    // 資料驗證：確保 trend 和 direction 存在
    if (!analysis || !analysis.trend || !analysis.trend.direction) {
      console.error('❌ AI 分析資料格式錯誤:', analysis);
      this.renderError('AI 分析資料格式不完整');
      return;
    }
    
    const trendClass = analysis.trend.direction.toLowerCase();
    const trendIcon = this.getTrendIcon(analysis.trend.direction);
    const confidenceColor = this.getConfidenceColor(analysis.trend.confidence || 50);
    
    this.container.innerHTML = `
      <div class="ai-currency-analysis">
        <div class="analysis-header">
          <div class="header-left">
            <h3>🤖 ${this.symbol} AI 技術分析</h3>
            <div class="analysis-subtitle">
              <span>分析日期: ${this.currentAnalysis.analysisDate}</span>
              <span class="separator">•</span>
              <span>因AI成本考量，目前只開放日線分析</span>
            </div>
          </div>
          <div class="header-right">
            <div class="analysis-status ${trendClass}">
              <div class="status-dot ${trendClass}"></div>
              <span>${analysis.trend.direction === 'bullish' ? '看漲' : analysis.trend.direction === 'bearish' ? '看跌' : '中性'}</span>
            </div>
          </div>
        </div>
        
        <div class="analysis-content">
          <!-- 趨勢總結 -->
          <div class="trend-summary">
            <div class="trend-card ${trendClass}">
              <div class="trend-icon">${trendIcon}</div>
              <div class="trend-details">
                <h4>市場趨勢</h4>
                <div class="trend-direction">${analysis.trend.direction === 'bullish' ? '看漲' : analysis.trend.direction === 'bearish' ? '看跌' : '中性'}</div>
                <div class="confidence-bar">
                  <div class="confidence-fill" style="width: ${analysis.trend.confidence}%; background-color: ${confidenceColor}"></div>
                </div>
                <div class="confidence-text">信心度: ${analysis.trend.confidence}%</div>
              </div>
            </div>
            <div class="trend-summary-text">
              <p>${analysis.trend.summary}</p>
            </div>
          </div>
          
          <!-- 技術分析指標 -->
          <div class="technical-analysis">
            <h4>📊 技術指標分析</h4>
            <div class="indicators-grid">
              ${this.renderTechnicalIndicators(analysis.technicalAnalysis)}
            </div>
          </div>
          
          <!-- 市場情緒 -->
          <div class="market-sentiment">
            <h4>💭 市場情緒</h4>
            <div class="sentiment-content">
              <div class="sentiment-score">
                <div class="score-circle ${this.getSentimentClass(analysis.marketSentiment.score)}">
                  <span class="score-value">${analysis.marketSentiment.score}</span>
                  <span class="score-label">情緒指數</span>
                </div>
                <div class="sentiment-description">
                  <div class="sentiment-title">${this.getSentimentTitle(analysis.marketSentiment.score)}</div>
                  <p>${analysis.marketSentiment.summary}</p>
                </div>
              </div>
              
              ${analysis.marketSentiment.newsSignals && analysis.marketSentiment.newsSignals.length > 0 ? `
                <div class="news-signals">
                  <h5>📰 新聞信號</h5>
                  <div class="signals-list">
                    ${analysis.marketSentiment.newsSignals.map(signal => `
                      <div class="signal-item ${signal.sentiment}">
                        <span class="signal-impact">${signal.impact}</span>
                        <span class="signal-text">${signal.summary}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
          
          <!-- 時間軸選項（裝飾性） -->
          <div class="timeframe-selector">
            <div class="timeframe-label">分析時間框架:</div>
            <div class="timeframe-buttons">
              <button class="timeframe-btn active">日線</button>
              <button class="timeframe-btn disabled" disabled>週線</button>
              <button class="timeframe-btn disabled" disabled>月線</button>
            </div>
            <div class="timeframe-note">
              <small>因AI成本考量，目前只開放日線分析</small>
            </div>
          </div>
        </div>
      </div>
    `;
    
  }
  
  /**
   * 渲染技術指標
   */
  renderTechnicalIndicators(indicators) {
    if (!indicators) return '<p>技術指標數據不可用</p>';
    
    console.log('🔍 前端收到的技術指標數據:', indicators);
    
    // 檢查資料完整性 (不模擬數據，記錄缺失狀況)
    if (!indicators.williamsR && Object.keys(indicators).length === 5) {
      console.log('⚠️ 檢測到缺少 Williams %R 指標，可能是 Schema 限制或 AI 分析問題');
    }
    
    // 確保顯示順序和完整性
    const orderedIndicators = [
      'rsi',
      'macd', 
      'movingAverage',
      'bollingerBands',
      'volume',
      'williamsR'
    ];
    
    let renderedCount = 0;
    const indicatorCards = orderedIndicators.map(key => {
      const indicator = indicators[key];
      
      // 如果指標不存在，創建一個佔位符
      if (!indicator) {
        console.warn(`⚠️ 技術指標 ${key} 不存在於數據中，顯示佔位符`);
        return `
          <div class="indicator-card missing">
            <div class="indicator-header">
              <span class="indicator-name">${this.getIndicatorName(key)}</span>
              <span class="indicator-signal neutral">
                ⚪ 數據升級中
              </span>
            </div>
            <div class="indicator-details">
              <div class="indicator-value">
                當前值: <strong>升級中</strong>
              </div>
              <div class="indicator-description">
                此指標正在資料升級，下次分析時將包含完整數據
              </div>
            </div>
          </div>
        `;
      }
      
      renderedCount++;
      const signalClass = this.getSignalClass(indicator.signal);
      const signalIcon = this.getSignalIcon(indicator.signal);
      
      console.log(`📊 渲染指標 ${key}:`, {
        value: indicator.value,
        signal: indicator.signal,
        signalClass: signalClass
      });
      
      return `
        <div class="indicator-card">
          <div class="indicator-header">
            <span class="indicator-name">${this.getIndicatorName(key)}</span>
            <span class="indicator-signal ${signalClass}">
              ${signalIcon} ${this.getSignalText(indicator.signal)}
            </span>
          </div>
          <div class="indicator-details">
            <div class="indicator-value">
              當前值: <strong>${this.formatIndicatorValue(indicator, key)}</strong>
            </div>
            <div class="indicator-description">
              ${this.formatIndicatorInterpretation(indicator.interpretation)}
            </div>
          </div>
        </div>
      `;
    });
    
    console.log(`✅ 成功渲染 ${renderedCount} 個完整技術指標，${orderedIndicators.length - renderedCount} 個升級中`);
    
    return indicatorCards.join('');
  }
  
  /**
   * 渲染錯誤狀態
   */
  renderError(message) {
    this.container.innerHTML = `
      <div class="ai-currency-analysis error">
        <div class="analysis-header">
          <div class="header-left">
            <h3>🤖 ${this.symbol} AI 技術分析</h3>
            <div class="analysis-subtitle">
              <span>OpenRouter 驅動</span>
              <span class="separator">•</span>
              <span>分析暫時不可用</span>
            </div>
          </div>
          <div class="header-right">
            <div class="analysis-status error">
              <div class="status-dot error"></div>
              <span>分析失敗</span>
            </div>
          </div>
        </div>
        
        <div class="analysis-content">
          <div class="error-container">
            <div class="error-icon">⚠️</div>
            <h4>AI 分析暫時不可用</h4>
            <p class="error-message">${message}</p>
            <div class="error-actions">
              <button class="retry-btn" onclick="this.closest('.ai-currency-analysis').retryAnalysis()">
                🔄 重試
              </button>
              <small>如問題持續，請稍後再試或聯繫技術支援</small>
            </div>
          </div>
          
          <!-- 顯示基本技術指標作為降級方案 -->
          <div class="fallback-indicators">
            <h4>📊 基礎技術指標</h4>
            <p>AI 分析不可用時，您仍可查看基礎的技術指標數據</p>
            <div class="basic-indicators">
              <div class="basic-indicator">
                <span class="indicator-label">趨勢</span>
                <span class="indicator-value">請查看圖表分析</span>
              </div>
              <div class="basic-indicator">
                <span class="indicator-label">建議</span>
                <span class="indicator-value">根據圖表自行判斷</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // 綁定事件
    this.bindErrorActions();
  }
  
  /**
   * 渲染超時錯誤
   */
  renderTimeoutError() {
    this.container.innerHTML = `
      <div class="ai-currency-analysis error timeout">
        <div class="analysis-header">
          <div class="header-left">
            <h3>🤖 ${this.symbol} AI 技術分析</h3>
            <div class="analysis-subtitle">
              <span>OpenRouter 驅動</span>
              <span class="separator">•</span>
              <span>分析超時</span>
            </div>
          </div>
          <div class="header-right">
            <div class="analysis-status error">
              <div class="status-dot error"></div>
              <span>請求超時</span>
            </div>
          </div>
        </div>
        
        <div class="analysis-content">
          <div class="error-container">
            <div class="error-icon">⏰</div>
            <h4>AI 分析請求超時</h4>
            <p class="error-message">分析請求超過 60 秒，可能是網路問題或 AI 服務繁忙。</p>
            <div class="error-actions">
              <button class="retry-btn primary">
                🔄 重試分析
              </button>
              <button class="fallback-btn">
                📊 查看基本指標
              </button>
            </div>
            <small>如問題持續，請稍後再試或聯絡技術支援</small>
          </div>
        </div>
      </div>
    `;
    
    // 綁定事件
    this.bindErrorActions();
  }
  
  /**
   * 渲染可重試的錯誤
   */
  renderRetryableError(message) {
    this.container.innerHTML = `
      <div class="ai-currency-analysis error retryable">
        <div class="analysis-header">
          <div class="header-left">
            <h3>🤖 ${this.symbol} AI 技術分析</h3>
            <div class="analysis-subtitle">
              <span>OpenRouter 驅動</span>
              <span class="separator">•</span>
              <span>分析失敗</span>
            </div>
          </div>
          <div class="header-right">
            <div class="analysis-status error">
              <div class="status-dot error"></div>
              <span>嘗試 ${this.retryCount}/${this.maxRetries}</span>
            </div>
          </div>
        </div>
        
        <div class="analysis-content">
          <div class="error-container">
            <div class="error-icon">⚠️</div>
            <h4>AI 分析暫時不可用</h4>
            <p class="error-message">${message}</p>
            <div class="retry-info">
              <p>剩餘重試次數：<strong>${this.maxRetries - this.retryCount}</strong></p>
            </div>
            <div class="error-actions">
              <button class="retry-btn primary" onclick="this.retryAnalysis()">
                🔄 立即重試
              </button>
              <button class="fallback-btn" onclick="this.showFallbackInfo()">
                📊 查看基本指標
              </button>
            </div>
            <small>正在嘗試使用不同的 AI 模型進行分析...</small>
          </div>
        </div>
      </div>
    `;
    
    // 綁定事件
    this.bindErrorActions();
  }
  
  /**
   * 綁定錯誤狀態的事件
   */
  bindErrorActions() {
    const retryBtn = this.container.querySelector('.retry-btn');
    const fallbackBtn = this.container.querySelector('.fallback-btn');
    
    if (retryBtn) {
      retryBtn.onclick = () => this.retryAnalysis();
    }
    
    if (fallbackBtn) {
      fallbackBtn.onclick = () => this.showFallbackInfo();
    }
  }
  
  /**
   * 重試分析
   */
  retryAnalysis() {
    console.log(`🔄 重試 ${this.symbol} AI 分析...`);
    this.renderLoadingState();
    this.loadCurrencyAnalysis();
  }
  
  /**
   * 顯示降級資訊
   */
  showFallbackInfo() {
    console.log(`📊 顯示 ${this.symbol} 基本指標資訊`);
    // 這裡可以加入查看基本指標的邏輯
    // 或者跳轉到 TradingView 小工具區域
    alert('基本指標功能正在開發中，請參考 TradingView 圖表進行分析。');
  }
  
  /**
   * 設定事件監聽器
   */
  setupEventListeners() {
    // 組件銷毀時清理定時器
    window.addEventListener('beforeunload', () => {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
      }
    });
  }
  
  /**
   * 工具方法
   */
  getTrendIcon(direction) {
    switch (direction) {
      case 'bullish': return '📈';
      case 'bearish': return '📉';
      default: return '➡️';
    }
  }
  
  getConfidenceColor(confidence) {
    if (confidence >= 80) return '#00d4aa';
    if (confidence >= 60) return '#ffa502';
    return '#ff4757';
  }
  
  getSentimentClass(score) {
    if (score >= 70) return 'positive';
    if (score >= 30) return 'neutral';
    return 'negative';
  }
  
  getSentimentTitle(score) {
    if (score >= 80) return '極度樂觀';
    if (score >= 60) return '樂觀';
    if (score >= 40) return '中性';
    if (score >= 20) return '悲觀';
    return '極度悲觀';
  }
  
  getSignalIcon(signal) {
    if (!signal) return '⚪';
    switch (signal.toLowerCase()) {
      case 'buy': return '🟢';
      case 'sell': return '🔴';
      case 'hold': return '🟡';
      default: return '⚪';
    }
  }
  
  getSignalText(signal) {
    if (!signal) return '暫無信號';
    
    // 保持原始信號文字，不進行轉換
    console.log(`📝 信號文字顯示: "${signal}"`);
    return signal;
  }
  
  getSignalClass(signal) {
    if (!signal) return 'neutral';
    const lower = signal.toLowerCase();
    
    console.log(`🎨 信號分類 "${signal}" -> 小寫: "${lower}"`);
    
    // 看漲信號 (綠色)
    if (lower.includes('買入') || lower.includes('看漲') || lower.includes('buy') || lower.includes('bullish')) {
      console.log(`   ✅ 歸類為看漲 (綠色)`);
      return 'bullish';
    }
    
    // 看跌信號 (紅色)
    if (lower.includes('賣出') || lower.includes('看跌') || lower.includes('sell') || lower.includes('bearish')) {
      console.log(`   ✅ 歸類為看跌 (紅色)`);
      return 'bearish';
    }
    
    // 持有信號 (藍色)
    if (lower.includes('持有') || lower.includes('hold')) {
      console.log(`   ✅ 歸類為持有 (藍色)`);
      return 'hold';
    }
    
    // 中性/等待信號 (黃色)
    if (lower.includes('中性') || lower.includes('neutral') || lower.includes('等待') || 
        lower.includes('觀望') || lower.includes('wait') || lower.includes('等待突破')) {
      console.log(`   ✅ 歸類為中性 (黃色)`);
      return 'neutral';
    }
    
    // 預設為中性
    console.log(`   ⚠️ 未匹配任何規則，預設為中性 (黃色)`);
    return 'neutral';
  }
  
  getIndicatorName(key) {
    const names = {
      'rsi': 'RSI 相對強弱指數',
      'macd': 'MACD 指數平滑異同移動平均線', 
      'movingAverage': '移動平均線',
      'bollingerBands': '布林通道',
      'volume': '成交量分析',
      'stochastic': 'KD 隨機指標',
      'williamsR': 'Williams %R 威廉指標'
    };
    return names[key] || key.toUpperCase();
  }
  
  /**
   * 格式化指標數值顯示 - 依據不同指標顯示最適合的資訊
   */
  formatIndicatorValue(indicator, indicatorKey = null) {
    // 處理指標物件不存在的情況
    if (!indicator) {
      return '數據計算中';
    }

    // 依據不同技術指標顯示最適合的資訊
    switch (indicatorKey) {
      case 'rsi':
      case 'williamsR':
        // 對於 RSI 和 Williams %R，我們需要顯示其 value 屬性
        const numericValue = indicator.value;
        if (typeof numericValue !== 'number') {
          return '數據計算中';
        }
        const fixedValue = numericValue.toFixed(1);
        if (indicatorKey === 'rsi') {
          if (numericValue > 70) return `${fixedValue} (超買區域)`;
          if (numericValue < 30) return `${fixedValue} (超賣區域)`;
          return `${fixedValue} (中性)`;
        } else { // williamsR
          if (numericValue > -20) return `${fixedValue} (超買)`;
          if (numericValue < -80) return `${fixedValue} (超賣)`;
          return `${fixedValue} (中性)`;
        }

      case 'macd':
        // MACD: 顯示其 value 屬性
        const macdValue = indicator.value;
        if (typeof macdValue !== 'number') {
          return '數據計算中';
        }
        const fixedMacd = macdValue.toFixed(2);
        return macdValue > 0 ? `${fixedMacd} (多頭動能)` : `${fixedMacd} (空頭動能)`;

      case 'movingAverage':
        // 移動平均線: 顯示 MA7, MA20 等詳細數值
        const { ma7, ma20, position } = indicator;
        const maParts = [];
        if (ma7 && ma7 > 0) maParts.push(`MA7: ${ma7.toFixed(2)}`);
        if (ma20 && ma20 > 0) maParts.push(`MA20: ${ma20.toFixed(2)}`);
        if (maParts.length > 0) return maParts.join('<br>');
        if (position) return position; // 降級顯示
        return '待確認';

      case 'bollingerBands':
        // 布林帶: 顯示上、中、下軌
        const { upper, middle, lower, position: bbPosition } = indicator;
        const bbParts = [];
        if (upper && upper > 0) bbParts.push(`上軌: ${upper.toFixed(2)}`);
        if (middle && middle > 0) bbParts.push(`中軌: ${middle.toFixed(2)}`);
        if (lower && lower > 0) bbParts.push(`下軌: ${lower.toFixed(2)}`);
        if (bbParts.length > 0) return bbParts.join('<br>');
        if (bbPosition) return `位於${bbPosition}`; // 降級顯示
        return '待確認';

      case 'volume':
        // 成交量: 顯示趨勢描述
        const { trend, interpretation } = indicator;
        if (trend) return trend;
        if (interpretation) return interpretation;
        return '成交量正常';

      default:
        // 預設情況: 如果物件中有 value，嘗試顯示它
        if (indicator.value !== null && indicator.value !== undefined) {
          if (typeof indicator.value === 'number') return indicator.value.toFixed(2);
          return indicator.value;
        }
        return '數據計算中';
    }
  }
  
  /**
   * 格式化指標解讀顯示
   */
  formatIndicatorInterpretation(interpretation) {
    // 處理各種可能的無效值
    if (!interpretation || 
        interpretation === null ||
        interpretation === 'null' || 
        interpretation === 'undefined' || 
        interpretation === 'N/A' ||
        (typeof interpretation === 'string' && interpretation.trim() === '')) {
      return '此指標解讀正在計算中，請參考信號欄位';
    }
    
    return interpretation;
  }
  
  /**
   * 銷毀組件
   */
  destroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }
    
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    console.log(`🗑️ ${this.symbol} AI 分析組件已銷毀`);
  }
}

// 導出到全局作用域
window.AICurrencyAnalysis = AICurrencyAnalysis;