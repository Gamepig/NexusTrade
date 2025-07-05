/**
 * AI 首頁大趨勢分析組件
 * 
 * 在使用者進入首頁時自動執行：
 * 1. 先查詢資料庫當日分析結果
 * 2. 如果沒有才啟動新的分析程序
 * 3. 顯示日/週/月大趨勢分析
 */

class AIHomepageTrend {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.apiBaseUrl = '/api/ai';
    this.isLoading = false;
    this.currentAnalysis = null;
    
    if (!this.container) {
      console.error('❌ AI首頁趨勢容器未找到:', containerId);
      return;
    }
    
    this.init();
  }

  /**
   * 初始化組件
   */
  init() {
    this.createLoadingState();
    this.loadHomepageAnalysis();
  }

  /**
   * 建立載入狀態 UI
   */
  createLoadingState() {
    this.container.innerHTML = `
      <div class="ai-analysis-section">
        <div class="ai-header">
          <h3>🔮 AI 市場趨勢分析</h3>
          <div class="ai-cost-notice">
            <small>💡 因AI成本考量，目前只開放日線分析</small>
          </div>
        </div>
        
        <div class="ai-loading">
          <div class="spinner"></div>
          <div class="loading-progress">
            <p id="loading-message">正在分析市場趨勢...</p>
            <div class="loading-steps">
              <div class="step" id="step-1">📊 收集市場數據</div>
              <div class="step" id="step-2">📰 分析新聞情緒</div>
              <div class="step" id="step-3">🤖 AI 深度分析</div>
              <div class="step" id="step-4">💾 儲存分析結果</div>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" id="progress-fill"></div>
            </div>
            <small class="progress-tip">首次分析需要 60-90 秒，請耐心等候</small>
          </div>
        </div>
        
        <!-- 裝飾性時間選項 -->
        <div class="timeframe-selector">
          <button class="timeframe-btn active" data-timeframe="daily">日線</button>
          <button class="timeframe-btn" data-timeframe="weekly" disabled>週線</button>
          <button class="timeframe-btn" data-timeframe="monthly" disabled>月線</button>
        </div>
      </div>
    `;
  }

  /**
   * 啟動載入進度動畫
   */
  startLoadingAnimation() {
    let progress = 0;
    let step = 0;
    const steps = ['step-1', 'step-2', 'step-3', 'step-4'];
    const messages = [
      '📊 正在收集市場數據...',
      '📰 正在分析新聞情緒...',
      '🤖 AI 正在深度分析...',
      '💾 正在儲存分析結果...'
    ];

    this.loadingInterval = setInterval(() => {
      if (!this.isLoading) {
        clearInterval(this.loadingInterval);
        return;
      }

      // 更新進度條
      progress += Math.random() * 2 + 0.5; // 隨機增加 0.5-2.5%
      if (progress > 95) progress = 95; // 不要到 100%，等實際完成
      
      const progressFill = document.getElementById('progress-fill');
      if (progressFill) {
        progressFill.style.width = `${progress}%`;
      }

      // 更新步驟狀態
      const currentStepIndex = Math.floor(progress / 25);
      if (currentStepIndex !== step && currentStepIndex < steps.length) {
        // 標記當前步驟為活躍
        const currentStepEl = document.getElementById(steps[currentStepIndex]);
        if (currentStepEl) {
          currentStepEl.classList.add('active');
        }

        // 標記前一個步驟為完成
        if (step > 0) {
          const prevStepEl = document.getElementById(steps[step - 1]);
          if (prevStepEl) {
            prevStepEl.classList.add('completed');
            prevStepEl.classList.remove('active');
          }
        }

        // 更新載入訊息
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage && messages[currentStepIndex]) {
          loadingMessage.textContent = messages[currentStepIndex];
        }

        step = currentStepIndex;
      }
    }, 1000); // 每秒更新
  }

  /**
   * 載入首頁分析
   */
  async loadHomepageAnalysis() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    console.log('🔍 開始載入首頁 AI 大趨勢分析...');

    // 啟動載入進度動畫
    this.startLoadingAnimation();

    // 設定載入超時機制，避免無限轉圈（延長至 90 秒以配合後端處理時間）
    const timeout = setTimeout(() => {
      if (this.isLoading) {
        this.renderError('AI 分析載入超時，請重試');
        this.isLoading = false;
        console.warn('⚠️ 首頁 AI 分析載入超時');
      }
    }, 90000); // 90 秒超時（修復第一次分析超時問題）

    try {
      const response = await fetch(`${this.apiBaseUrl}/homepage-analysis`);
      const data = await response.json();
      
      clearTimeout(timeout); // 清除超時計時器

      if (response.ok && data.status === 'success') {
        this.currentAnalysis = data.data;
        this.renderAnalysis();
        console.log('✅ 首頁 AI 分析載入成功', this.currentAnalysis.isFromCache ? '(快取)' : '(新分析)');
      } else {
        // 提供更詳細的錯誤資訊
        let errorMsg = 'AI 市場分析暫時無法提供';
        if (data.error) {
          if (data.error.includes('OpenRouter')) {
            errorMsg = 'AI 分析服務暫時不可用';
          } else if (data.error.includes('LM Studio')) {
            errorMsg = 'AI 分析服務配置中';
          } else if (data.error.includes('分析結果儲存失敗')) {
            errorMsg = 'AI 分析數據處理中';
          } else if (data.error.includes('response is not defined')) {
            errorMsg = 'AI 分析服務載入中';
          } else {
            errorMsg = 'AI 分析功能暫時不可用';
          }
        }
        
        this.renderError(errorMsg);
        console.error('❌ 首頁 AI 分析失敗:', data);
      }
    } catch (error) {
      clearTimeout(timeout);
      
      let errorMsg = '網路連接錯誤';
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMsg = 'API 服務連接失敗';
      } else if (error.name === 'SyntaxError') {
        errorMsg = 'API 回應格式錯誤';
      }
      
      this.renderError(errorMsg);
      console.error('❌ 首頁 AI 分析錯誤:', error);
    } finally {
      this.isLoading = false;
      // 清理載入動畫
      if (this.loadingInterval) {
        clearInterval(this.loadingInterval);
        this.loadingInterval = null;
      }
      
      // 完成進度條動畫
      const progressFill = document.getElementById('progress-fill');
      if (progressFill) {
        progressFill.style.width = '100%';
      }
    }
  }

  /**
   * 渲染分析結果
   */
  renderAnalysis() {
    if (!this.currentAnalysis || !this.currentAnalysis.analysis) {
      this.renderError('分析數據格式錯誤');
      return;
    }

    const analysis = this.currentAnalysis.analysis;
    const isFromCache = this.currentAnalysis.isFromCache;
    const dataDate = this.currentAnalysis.analysisDate;

    this.container.innerHTML = `
      <div class="ai-analysis-section">
        <div class="ai-header">
          <h3>🔮 AI 市場趨勢分析</h3>
          <div class="ai-meta">
            <span class="analysis-date">📅 ${dataDate}</span>
            <span class="cache-status ${isFromCache ? 'cached' : 'fresh'}">
              ${isFromCache ? '🗃️ 快取' : '🔄 最新'}
            </span>
          </div>
          <div class="ai-cost-notice">
            <small>💡 因AI成本考量，目前只開放日線分析</small>
          </div>
        </div>

        <!-- 主要趨勢指標 -->
        <div class="trend-overview">
          <div class="trend-indicator ${analysis.trend.direction}">
            <div class="trend-icon">${this.getTrendIcon(analysis.trend.direction)}</div>
            <div class="trend-content">
              <div class="trend-direction">${this.getTrendText(analysis.trend.direction)}</div>
              <div class="trend-confidence">信心度: ${this.getConfidenceDisplay(analysis.trend.confidence, analysis.trend.direction)}</div>
            </div>
          </div>
          <div class="trend-summary">
            <p>${analysis.trend.summary}</p>
          </div>
        </div>

        <!-- 時間框架分析 -->
        ${this.renderTimeframeAnalysis(analysis.timeframeAnalysis)}

        <!-- 技術指標總覽 -->
        <div class="technical-overview">
          <h4>📊 技術指標</h4>
          <div class="indicators-grid">
            ${this.renderTechnicalIndicators(analysis.technicalAnalysis)}
          </div>
        </div>

        <!-- 市場情緒 -->
        <div class="sentiment-overview">
          <h4>😱 市場情緒</h4>
          <div class="sentiment-meter">
            <div class="sentiment-score">
              <span class="score-value">${analysis.marketSentiment.score}</span>
              <span class="score-label">${this.getSentimentText(analysis.marketSentiment.label)}</span>
            </div>
            <div class="sentiment-summary">
              <p>${analysis.marketSentiment.summary}</p>
            </div>
          </div>
        </div>

        <!-- 裝飾性時間選項 -->
        <div class="timeframe-selector">
          <button class="timeframe-btn active" data-timeframe="daily">日線</button>
          <button class="timeframe-btn" data-timeframe="weekly" disabled title="因AI成本考量暫不開放">週線</button>
          <button class="timeframe-btn" data-timeframe="monthly" disabled title="因AI成本考量暫不開放">月線</button>
        </div>

      </div>
    `;

    // 綁定事件
    this.bindEvents();
  }

  /**
   * 渲染時間框架分析
   */
  renderTimeframeAnalysis(timeframeAnalysis) {
    if (!timeframeAnalysis) {
      return '<div class="no-timeframe">時間框架分析不可用</div>';
    }

    return `
      <div class="timeframe-analysis">
        <h4>⏰ 時間框架分析</h4>
        <div class="timeframe-grid">
          <div class="timeframe-item">
            <div class="timeframe-label">日線</div>
            <div class="timeframe-trend ${this.getTrendClass(timeframeAnalysis.daily?.trend)}">
              ${timeframeAnalysis.daily?.trend || '待分析'}
            </div>
            <div class="timeframe-summary">${timeframeAnalysis.daily?.summary || ''}</div>
          </div>
          <div class="timeframe-item disabled">
            <div class="timeframe-label">週線</div>
            <div class="timeframe-trend">暫不開放</div>
            <div class="timeframe-summary">成本考量</div>
          </div>
          <div class="timeframe-item disabled">
            <div class="timeframe-label">月線</div>
            <div class="timeframe-trend">暫不開放</div>
            <div class="timeframe-summary">成本考量</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染技術指標
   */
  renderTechnicalIndicators(technicalAnalysis) {
    if (!technicalAnalysis) {
      return '<div class="no-indicators">技術指標不可用</div>';
    }

    return `
      <div class="indicator-item">
        <span class="indicator-name">RSI</span>
        <span class="indicator-value">${technicalAnalysis.rsi?.value !== undefined ? technicalAnalysis.rsi.value : 'N/A'}</span>
        <span class="indicator-signal ${this.getSignalClass(technicalAnalysis.rsi?.signal)}">
          ${technicalAnalysis.rsi?.signal || '待分析'}
        </span>
      </div>
      <div class="indicator-item">
        <span class="indicator-name">MACD</span>
        <span class="indicator-value">${technicalAnalysis.macd?.value !== undefined ? technicalAnalysis.macd.value : 'N/A'}</span>
        <span class="indicator-signal ${this.getSignalClass(technicalAnalysis.macd?.signal)}">
          ${technicalAnalysis.macd?.signal || '待分析'}
        </span>
      </div>
      <div class="indicator-item">
        <span class="indicator-name">MA</span>
        <span class="indicator-value">${technicalAnalysis.movingAverage?.position || 'N/A'}</span>
        <span class="indicator-signal ${this.getSignalClass(technicalAnalysis.movingAverage?.signal)}">
          ${technicalAnalysis.movingAverage?.signal || '待分析'}
        </span>
      </div>
      <div class="indicator-item">
        <span class="indicator-name">成交量</span>
        <span class="indicator-value">${technicalAnalysis.volume?.trend || 'N/A'}</span>
        <span class="indicator-signal ${this.getSignalClass(technicalAnalysis.volume?.signal)}">
          ${technicalAnalysis.volume?.signal || '待分析'}
        </span>
      </div>
    `;
  }

  /**
   * 渲染錯誤狀態
   */
  renderError(message) {
    this.container.innerHTML = `
      <div class="ai-analysis-section">
        <div class="ai-header">
          <h3>🔮 AI 市場趨勢分析</h3>
          <div class="ai-cost-notice">
            <small>💡 因AI成本考量，目前只開放日線分析</small>
          </div>
        </div>
        
        <div class="ai-maintenance">
          <div class="maintenance-content">
            <div class="maintenance-icon">⚡</div>
            <div class="maintenance-text">
              <h4>AI 市場分析</h4>
              <p>${message}</p>
              <button class="maintenance-retry-btn" onclick="window.aiHomepageTrend?.loadHomepageAnalysis()">
                🔄 重新整理
              </button>
            </div>
          </div>
        </div>

        <!-- 裝飾性時間選項 -->
        <div class="timeframe-selector">
          <button class="timeframe-btn active" data-timeframe="daily">日線</button>
          <button class="timeframe-btn" data-timeframe="weekly" disabled>週線</button>
          <button class="timeframe-btn" data-timeframe="monthly" disabled>月線</button>
        </div>
      </div>
    `;
  }


  /**
   * 綁定事件
   */
  bindEvents() {
    // 時間框架按鈕 (裝飾性)
    const timeframeBtns = this.container.querySelectorAll('.timeframe-btn');
    timeframeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (btn.disabled) {
          // 顯示提示
          this.showTooltip(btn, '因AI成本考量，目前只開放日線分析');
          return;
        }
        
        // 更新選中狀態
        timeframeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  /**
   * 顯示工具提示
   */
  showTooltip(element, message) {
    const tooltip = document.createElement('div');
    tooltip.className = 'ai-tooltip';
    tooltip.textContent = message;
    document.body.appendChild(tooltip);

    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top - 35}px`;

    setTimeout(() => {
      tooltip.remove();
    }, 2000);
  }

  // 工具方法
  getTrendIcon(direction) {
    const icons = {
      'bullish': '🐂',
      'bearish': '🐻', 
      'neutral': '⚖️'
    };
    return icons[direction] || '❓';
  }

  getTrendText(direction) {
    const texts = {
      'bullish': '看漲',
      'bearish': '看跌',
      'neutral': '中性'
    };
    return texts[direction] || direction;
  }

  getTrendClass(trend) {
    if (!trend) return '';
    const lower = trend.toLowerCase();
    if (lower.includes('看漲') || lower.includes('上漲')) return 'bullish';
    if (lower.includes('看跌') || lower.includes('下跌')) return 'bearish';
    return 'neutral';
  }

  getSentimentText(label) {
    const sentiments = {
      'extreme_fear': '極度恐慌',
      'fear': '恐慌',
      'neutral': '中性',
      'greed': '貪婪',
      'extreme_greed': '極度貪婪'
    };
    return sentiments[label] || label;
  }

  /**
   * 獲取信心度顯示（包含箭頭）
   */
  getConfidenceDisplay(confidence, direction) {
    let arrow = '';
    if (direction === 'bullish') {
      arrow = '↗️'; // 上漲箭頭
    } else if (direction === 'bearish') {
      arrow = '↘️'; // 下跌箭頭
    } else {
      arrow = '→'; // 中性箭頭
    }
    return `${confidence}% ${arrow}`;
  }

  getSignalClass(signal) {
    if (!signal) return 'neutral';
    const signalStr = signal.toString().toLowerCase();
    
    // 看漲/買入信號
    if (signalStr.includes('買入') || signalStr.includes('看漲') || 
        signalStr.includes('buy') || signalStr.includes('bullish') ||
        signalStr.includes('上漲') || signalStr.includes('強勢') ||
        signalStr.includes('上升') || signalStr.includes('positive')) {
      return 'bullish';
    }
    
    // 看跌/賣出信號  
    if (signalStr.includes('賣出') || signalStr.includes('看跌') || 
        signalStr.includes('sell') || signalStr.includes('bearish') ||
        signalStr.includes('下跌') || signalStr.includes('弱勢') ||
        signalStr.includes('下降') || signalStr.includes('negative')) {
      return 'bearish';
    }
    
    // 持有信號 (橘色)
    if (signalStr.includes('持有') || signalStr.includes('hold') ||
        signalStr.includes('等待') || signalStr.includes('觀望') || 
        signalStr.includes('待觀察')) {
      return 'hold';
    }
    
    // 中性信號 (黃色)
    if (signalStr.includes('中性') || signalStr.includes('neutral') ||
        signalStr === '中性' || signalStr.includes('平穩') || 
        signalStr.includes('震盪')) {
      return 'neutral';
    }
    
    // 預設為中性
    return 'neutral';
  }
}

// 全域變數供按鈕調用
window.AIHomepageTrend = AIHomepageTrend;