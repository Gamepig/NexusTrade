/**
 * AI 分析頁面組件
 * 
 * 提供完整的 AI 市場分析功能
 */

class AIInsightsPage {
  constructor() {
    this.currentAnalysis = null;
    this.isLoading = false;
    this.selectedSymbol = 'BTCUSDT';
    this.selectedTimeframe = '1d';
    this.selectedRiskLevel = 'medium';
    this.selectedInvestmentHorizon = 'medium';
    
    // API 配置
    this.api = window.api || {};
    
    // 綁定方法
    this.render = this.render.bind(this);
    this.loadAnalysis = this.loadAnalysis.bind(this);
    this.performTrendAnalysis = this.performTrendAnalysis.bind(this);
    this.performTechnicalAnalysis = this.performTechnicalAnalysis.bind(this);
    this.generateInvestmentAdvice = this.generateInvestmentAdvice.bind(this);
    this.assessRisk = this.assessRisk.bind(this);
    this.generateComprehensiveReport = this.generateComprehensiveReport.bind(this);
  }

  /**
   * 初始化組件
   */
  async init() {
    console.log('🤖 初始化 AI 分析頁面');
    await this.checkServiceStatus();
    this.setupEventListeners();
  }

  /**
   * 檢查 AI 服務狀態
   */
  async checkServiceStatus() {
    try {
      const response = await fetch('/api/ai/status');
      const data = await response.json();
      
      if (data.status === 'success') {
        this.serviceStatus = data.data;
        console.log('✅ AI 服務狀態:', this.serviceStatus.status);
      } else {
        this.serviceStatus = { status: 'error', message: data.message };
      }
    } catch (error) {
      console.error('❌ 檢查 AI 服務狀態失敗:', error);
      this.serviceStatus = { status: 'error', message: '無法連接 AI 服務' };
    }
  }

  /**
   * 設定事件監聽器
   */
  setupEventListeners() {
    // 交易對選擇
    document.addEventListener('change', (e) => {
      if (e.target.id === 'ai-symbol-select') {
        this.selectedSymbol = e.target.value;
      }
      
      if (e.target.id === 'ai-timeframe-select') {
        this.selectedTimeframe = e.target.value;
      }
      
      if (e.target.id === 'ai-risk-level-select') {
        this.selectedRiskLevel = e.target.value;
      }
      
      if (e.target.id === 'ai-investment-horizon-select') {
        this.selectedInvestmentHorizon = e.target.value;
      }
    });

    // 分析按鈕
    document.addEventListener('click', (e) => {
      if (e.target.id === 'trend-analysis-btn') {
        this.performTrendAnalysis();
      }
      
      if (e.target.id === 'technical-analysis-btn') {
        this.performTechnicalAnalysis();
      }
      
      if (e.target.id === 'investment-advice-btn') {
        this.generateInvestmentAdvice();
      }
      
      if (e.target.id === 'risk-assessment-btn') {
        this.assessRisk();
      }
      
      if (e.target.id === 'comprehensive-report-btn') {
        this.generateComprehensiveReport();
      }
      
      if (e.target.id === 'clear-cache-btn') {
        this.clearCache();
      }
    });
  }

  /**
   * 執行趨勢分析
   */
  async performTrendAnalysis() {
    if (!this.validateService()) return;

    try {
      this.setLoading(true, 'trend');
      
      const token = localStorage.getItem('nexustrade_token');
      if (!token) {
        this.showError('請先登入');
        return;
      }

      const response = await fetch('/api/ai/trend-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: this.selectedSymbol,
          timeframe: this.selectedTimeframe
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        this.displayAnalysisResult('trend', data.data.analysis);
        this.showSuccess('趨勢分析完成');
      } else {
        throw new Error(data.message || '分析失敗');
      }

    } catch (error) {
      console.error('❌ 趨勢分析失敗:', error);
      this.showError(`趨勢分析失敗: ${error.message}`);
    } finally {
      this.setLoading(false, 'trend');
    }
  }

  /**
   * 執行技術指標分析
   */
  async performTechnicalAnalysis() {
    if (!this.validateService()) return;

    try {
      this.setLoading(true, 'technical');
      
      const token = localStorage.getItem('nexustrade_token');
      if (!token) {
        this.showError('請先登入');
        return;
      }

      const response = await fetch('/api/ai/technical-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: this.selectedSymbol,
          timeframe: this.selectedTimeframe
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        this.displayAnalysisResult('technical', data.data.analysis);
        this.showSuccess('技術指標分析完成');
      } else {
        throw new Error(data.message || '分析失敗');
      }

    } catch (error) {
      console.error('❌ 技術指標分析失敗:', error);
      this.showError(`技術指標分析失敗: ${error.message}`);
    } finally {
      this.setLoading(false, 'technical');
    }
  }

  /**
   * 生成投資建議
   */
  async generateInvestmentAdvice() {
    if (!this.validateService()) return;

    try {
      this.setLoading(true, 'advice');
      
      const token = localStorage.getItem('nexustrade_token');
      if (!token) {
        this.showError('請先登入');
        return;
      }

      const response = await fetch('/api/ai/investment-advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: this.selectedSymbol,
          riskLevel: this.selectedRiskLevel,
          investmentHorizon: this.selectedInvestmentHorizon
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        this.displayAnalysisResult('advice', data.data.advice);
        this.showSuccess('投資建議生成完成');
      } else {
        throw new Error(data.message || '生成失敗');
      }

    } catch (error) {
      console.error('❌ 投資建議生成失敗:', error);
      this.showError(`投資建議生成失敗: ${error.message}`);
    } finally {
      this.setLoading(false, 'advice');
    }
  }

  /**
   * 執行風險評估
   */
  async assessRisk() {
    if (!this.validateService()) return;

    try {
      this.setLoading(true, 'risk');
      
      const token = localStorage.getItem('nexustrade_token');
      if (!token) {
        this.showError('請先登入');
        return;
      }

      const response = await fetch('/api/ai/risk-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: this.selectedSymbol
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        this.displayAnalysisResult('risk', data.data.assessment);
        this.showSuccess('風險評估完成');
      } else {
        throw new Error(data.message || '評估失敗');
      }

    } catch (error) {
      console.error('❌ 風險評估失敗:', error);
      this.showError(`風險評估失敗: ${error.message}`);
    } finally {
      this.setLoading(false, 'risk');
    }
  }

  /**
   * 生成綜合分析報告
   */
  async generateComprehensiveReport() {
    if (!this.validateService()) return;

    try {
      this.setLoading(true, 'comprehensive');
      
      const token = localStorage.getItem('nexustrade_token');
      if (!token) {
        this.showError('請先登入');
        return;
      }

      const response = await fetch('/api/ai/comprehensive-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: this.selectedSymbol,
          timeframe: this.selectedTimeframe,
          riskLevel: this.selectedRiskLevel,
          investmentHorizon: this.selectedInvestmentHorizon,
          includeRisk: true
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        this.displayComprehensiveReport(data.data.report);
        this.showSuccess('綜合分析報告生成完成');
      } else {
        throw new Error(data.message || '生成失敗');
      }

    } catch (error) {
      console.error('❌ 綜合分析報告生成失敗:', error);
      this.showError(`綜合分析報告生成失敗: ${error.message}`);
    } finally {
      this.setLoading(false, 'comprehensive');
    }
  }

  /**
   * 清理快取
   */
  async clearCache() {
    try {
      const token = localStorage.getItem('nexustrade_token');
      if (!token) {
        this.showError('請先登入');
        return;
      }

      const response = await fetch('/api/ai/cache', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.status === 'success') {
        this.showSuccess('分析快取已清理');
      } else {
        throw new Error(data.message || '清理失敗');
      }

    } catch (error) {
      console.error('❌ 清理快取失敗:', error);
      this.showError(`清理快取失敗: ${error.message}`);
    }
  }

  /**
   * 驗證服務狀態
   */
  validateService() {
    if (!this.serviceStatus || this.serviceStatus.status !== 'ready') {
      this.showError('AI 分析服務未就緒，請檢查 OpenRouter API 配置');
      return false;
    }
    return true;
  }

  /**
   * 設定載入狀態
   */
  setLoading(loading, type = 'all') {
    this.isLoading = loading;
    
    const buttons = {
      trend: 'trend-analysis-btn',
      technical: 'technical-analysis-btn', 
      advice: 'investment-advice-btn',
      risk: 'risk-assessment-btn',
      comprehensive: 'comprehensive-report-btn'
    };

    if (type === 'all') {
      Object.values(buttons).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.disabled = loading;
          btn.textContent = loading ? '分析中...' : btn.dataset.originalText || btn.textContent;
        }
      });
    } else if (buttons[type]) {
      const btn = document.getElementById(buttons[type]);
      if (btn) {
        if (!btn.dataset.originalText) {
          btn.dataset.originalText = btn.textContent;
        }
        btn.disabled = loading;
        btn.textContent = loading ? '分析中...' : btn.dataset.originalText;
      }
    }
  }

  /**
   * 顯示分析結果
   */
  displayAnalysisResult(type, analysis) {
    const resultContainer = document.getElementById(`${type}-result`);
    if (!resultContainer) return;

    resultContainer.innerHTML = `
      <div class="analysis-result">
        <div class="analysis-content">
          ${this.formatAnalysisText(analysis)}
        </div>
        <div class="analysis-meta">
          <span class="timestamp">生成時間: ${new Date().toLocaleString('zh-TW')}</span>
        </div>
      </div>
    `;
  }

  /**
   * 顯示綜合分析報告
   */
  displayComprehensiveReport(report) {
    const resultContainer = document.getElementById('comprehensive-result');
    if (!resultContainer) return;

    resultContainer.innerHTML = `
      <div class="comprehensive-report">
        <div class="report-header">
          <h3>📊 ${report.symbol} 綜合分析報告</h3>
          <div class="report-meta">
            <span>時間框架: ${report.timeframe}</span>
            <span>生成時間: ${new Date(report.generatedAt).toLocaleString('zh-TW')}</span>
          </div>
        </div>
        
        <div class="report-sections">
          <div class="report-section">
            <h4>📈 趨勢分析</h4>
            <div class="section-content">
              ${this.formatAnalysisText(report.trendAnalysis.analysis)}
            </div>
          </div>
          
          <div class="report-section">
            <h4>📊 技術指標分析</h4>
            <div class="section-content">
              ${this.formatAnalysisText(report.technicalAnalysis.analysis)}
            </div>
          </div>
          
          <div class="report-section">
            <h4>💡 投資建議</h4>
            <div class="section-content">
              ${this.formatAnalysisText(report.investmentAdvice.advice)}
            </div>
          </div>
          
          ${report.riskAssessment ? `
            <div class="report-section">
              <h4>⚠️ 風險評估</h4>
              <div class="section-content">
                ${this.formatAnalysisText(report.riskAssessment.assessment)}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * 格式化分析文字
   */
  formatAnalysisText(text) {
    if (!text) return '';
    
    // 將換行符轉換為 <br> 並處理特殊格式
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // 處理標題 (數字開頭或包含冒號)
        if (/^\d+\./.test(line) || line.includes('：') || line.includes(':')) {
          return `<p class="analysis-point"><strong>${line}</strong></p>`;
        }
        return `<p>${line}</p>`;
      })
      .join('');
  }

  /**
   * 渲染頁面
   */
  render() {
    const container = document.getElementById('ai-insights-content');
    if (!container) return;

    container.innerHTML = `
      <div class="ai-insights-container">
        <!-- 服務狀態 -->
        <div class="service-status">
          ${this.renderServiceStatus()}
        </div>

        <!-- 控制面板 -->
        <div class="ai-controls">
          <div class="controls-row">
            <div class="control-group">
              <label for="ai-symbol-select">交易對</label>
              <select id="ai-symbol-select">
                <option value="BTCUSDT" ${this.selectedSymbol === 'BTCUSDT' ? 'selected' : ''}>BTC/USDT</option>
                <option value="ETHUSDT" ${this.selectedSymbol === 'ETHUSDT' ? 'selected' : ''}>ETH/USDT</option>
                <option value="BNBUSDT" ${this.selectedSymbol === 'BNBUSDT' ? 'selected' : ''}>BNB/USDT</option>
                <option value="ADAUSDT" ${this.selectedSymbol === 'ADAUSDT' ? 'selected' : ''}>ADA/USDT</option>
                <option value="SOLUSDT" ${this.selectedSymbol === 'SOLUSDT' ? 'selected' : ''}>SOL/USDT</option>
                <option value="XRPUSDT" ${this.selectedSymbol === 'XRPUSDT' ? 'selected' : ''}>XRP/USDT</option>
              </select>
            </div>
            
            <div class="control-group">
              <label for="ai-timeframe-select">時間框架</label>
              <select id="ai-timeframe-select">
                <option value="1h" ${this.selectedTimeframe === '1h' ? 'selected' : ''}>1小時</option>
                <option value="4h" ${this.selectedTimeframe === '4h' ? 'selected' : ''}>4小時</option>
                <option value="1d" ${this.selectedTimeframe === '1d' ? 'selected' : ''}>1天</option>
                <option value="1w" ${this.selectedTimeframe === '1w' ? 'selected' : ''}>1週</option>
              </select>
            </div>
            
            <div class="control-group">
              <label for="ai-risk-level-select">風險等級</label>
              <select id="ai-risk-level-select">
                <option value="low" ${this.selectedRiskLevel === 'low' ? 'selected' : ''}>保守型</option>
                <option value="medium" ${this.selectedRiskLevel === 'medium' ? 'selected' : ''}>平衡型</option>
                <option value="high" ${this.selectedRiskLevel === 'high' ? 'selected' : ''}>積極型</option>
              </select>
            </div>
            
            <div class="control-group">
              <label for="ai-investment-horizon-select">投資期限</label>
              <select id="ai-investment-horizon-select">
                <option value="short" ${this.selectedInvestmentHorizon === 'short' ? 'selected' : ''}>短期</option>
                <option value="medium" ${this.selectedInvestmentHorizon === 'medium' ? 'selected' : ''}>中期</option>
                <option value="long" ${this.selectedInvestmentHorizon === 'long' ? 'selected' : ''}>長期</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 分析按鈕 -->
        <div class="analysis-buttons">
          <button id="trend-analysis-btn" class="btn btn-primary">📈 趨勢分析</button>
          <button id="technical-analysis-btn" class="btn btn-primary">📊 技術指標</button>
          <button id="investment-advice-btn" class="btn btn-primary">💡 投資建議</button>
          <button id="risk-assessment-btn" class="btn btn-warning">⚠️ 風險評估</button>
          <button id="comprehensive-report-btn" class="btn btn-success">📋 綜合報告</button>
          <button id="clear-cache-btn" class="btn btn-secondary">🗑️ 清理快取</button>
        </div>

        <!-- 分析結果 -->
        <div class="analysis-results">
          <div class="result-section">
            <h3>📈 趨勢分析</h3>
            <div id="trend-result" class="result-content">
              <div class="empty-state">點擊「趨勢分析」按鈕開始分析</div>
            </div>
          </div>
          
          <div class="result-section">
            <h3>📊 技術指標分析</h3>
            <div id="technical-result" class="result-content">
              <div class="empty-state">點擊「技術指標」按鈕開始分析</div>
            </div>
          </div>
          
          <div class="result-section">
            <h3>💡 投資建議</h3>
            <div id="advice-result" class="result-content">
              <div class="empty-state">點擊「投資建議」按鈕開始分析</div>
            </div>
          </div>
          
          <div class="result-section">
            <h3>⚠️ 風險評估</h3>
            <div id="risk-result" class="result-content">
              <div class="empty-state">點擊「風險評估」按鈕開始分析</div>
            </div>
          </div>
          
          <div class="result-section comprehensive-section">
            <h3>📋 綜合分析報告</h3>
            <div id="comprehensive-result" class="result-content">
              <div class="empty-state">點擊「綜合報告」按鈕生成完整分析</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染服務狀態
   */
  renderServiceStatus() {
    if (!this.serviceStatus) {
      return `
        <div class="status-indicator status-loading">
          <span class="status-dot"></span>
          <span>檢查服務狀態中...</span>
        </div>
      `;
    }

    const statusClass = this.serviceStatus.status === 'ready' ? 'status-ready' : 'status-error';
    const statusIcon = this.serviceStatus.status === 'ready' ? '🟢' : '🔴';
    const statusText = this.serviceStatus.status === 'ready' ? 
      'AI 分析服務已就緒' : 
      (this.serviceStatus.message || 'AI 分析服務未就緒');

    return `
      <div class="status-indicator ${statusClass}">
        <span class="status-dot">${statusIcon}</span>
        <span>${statusText}</span>
        ${this.serviceStatus.stats ? `
          <div class="status-details">
            模型: ${this.serviceStatus.stats.model} | 
            快取: ${this.serviceStatus.stats.cacheSize} 項目
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 顯示成功訊息
   */
  showSuccess(message) {
    if (window.store) {
      window.store.dispatch({
        type: 'ui/showNotification',
        payload: { message, type: 'success', duration: 4000 }
      });
    } else {
      console.log('✅', message);
    }
  }

  /**
   * 顯示錯誤訊息
   */
  showError(message) {
    if (window.store) {
      window.store.dispatch({
        type: 'ui/showNotification',
        payload: { message, type: 'error', duration: 5000 }
      });
    } else {
      console.error('❌', message);
    }
  }
}

// 創建全局實例
window.AIInsightsPage = AIInsightsPage;