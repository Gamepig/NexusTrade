/**
 * NexusTrade API 請求封裝模組
 * 
 * 提供統一的 API 請求介面，包含：
 * - HTTP 請求封裝
 * - 錯誤處理
 * - Token 管理
 * - 響應處理
 */

class ApiClient {
  constructor() {
    this.baseURL = window.location.origin;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    this.token = this.getStoredToken();
  }

  /**
   * 取得儲存的認證 Token
   */
  getStoredToken() {
    return localStorage.getItem('nexustrade_token');
  }

  /**
   * 設定認證 Token
   */
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('nexustrade_token', token);
    } else {
      localStorage.removeItem('nexustrade_token');
    }
  }

  /**
   * 取得請求標頭
   */
  getHeaders(customHeaders = {}) {
    const headers = { ...this.defaultHeaders, ...customHeaders };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  /**
   * 處理 API 響應
   */
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const error = new ApiError(
        data.message || `HTTP ${response.status}`,
        response.status,
        data.code,
        data
      );
      throw error;
    }

    return data;
  }

  /**
   * 通用請求方法
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(options.headers),
      ...options
    };

    try {
      console.log(`📡 API 請求: ${options.method || 'GET'} ${endpoint}`);
      
      const response = await fetch(url, config);
      const data = await this.handleResponse(response);
      
      console.log(`✅ API 響應: ${endpoint}`, data);
      return data;
      
    } catch (error) {
      console.error(`❌ API 錯誤: ${endpoint}`, error);
      
      // Token 過期處理
      if (error.status === 401 && this.token) {
        this.setToken(null);
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
      
      throw error;
    }
  }

  /**
   * GET 請求
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, {
      method: 'GET'
    });
  }

  /**
   * POST 請求
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT 請求
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE 請求
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  /**
   * 檔案上傳
   */
  async upload(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        // 不設定 Content-Type，讓瀏覽器自動設定 multipart boundary
        'Authorization': this.token ? `Bearer ${this.token}` : undefined
      }
    });
  }
}

/**
 * API 錯誤類別
 */
class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /**
   * 檢查是否為特定類型的錯誤
   */
  is(code) {
    return this.code === code;
  }

  /**
   * 檢查是否為網路錯誤
   */
  isNetworkError() {
    return this.status === 0 || !this.status;
  }

  /**
   * 檢查是否為認證錯誤
   */
  isAuthError() {
    return this.status === 401 || this.status === 403;
  }

  /**
   * 檢查是否為驗證錯誤
   */
  isValidationError() {
    return this.status === 422 || this.code === 'VALIDATION_ERROR';
  }
}

/**
 * 特定 API 端點封裝
 */
class NexusTradeAPI {
  constructor() {
    this.client = new ApiClient();
  }

  // ==================== 系統 API ====================

  /**
   * 健康檢查
   */
  async getHealth() {
    return this.client.get('/health');
  }

  /**
   * 系統狀態
   */
  async getSystemStatus() {
    return this.client.get('/health/status');
  }

  /**
   * API 測試
   */
  async testApi() {
    return this.client.get('/api/test');
  }

  // ==================== 認證 API ====================

  /**
   * 使用者登入
   */
  async login(email, password) {
    const response = await this.client.post('/auth/login', {
      email,
      password
    });
    
    if (response.token) {
      this.client.setToken(response.token);
    }
    
    return response;
  }

  /**
   * 使用者註冊
   */
  async register(userData) {
    return this.client.post('/auth/register', userData);
  }

  /**
   * 使用者登出
   */
  async logout() {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.client.setToken(null);
    }
  }

  /**
   * Token 刷新
   */
  async refreshToken() {
    const response = await this.client.post('/auth/refresh');
    
    if (response.token) {
      this.client.setToken(response.token);
    }
    
    return response;
  }

  /**
   * 取得當前使用者資訊
   */
  async getMe() {
    return this.client.get('/auth/me');
  }

  // ==================== 使用者 API ====================

  /**
   * 取得使用者資料
   */
  async getUserProfile() {
    return this.client.get('/api/users/profile');
  }

  /**
   * 更新使用者資料
   */
  async updateUserProfile(userData) {
    return this.client.put('/api/users/profile', userData);
  }

  /**
   * 取得關注清單
   */
  async getWatchlist() {
    return this.client.get('/api/users/watchlist');
  }

  /**
   * 新增關注項目
   */
  async addToWatchlist(symbol, priority = 3) {
    return this.client.post('/api/users/watchlist', {
      symbol,
      priority
    });
  }

  /**
   * 移除關注項目
   */
  async removeFromWatchlist(symbol) {
    return this.client.delete(`/api/users/watchlist/${symbol}`);
  }

  // ==================== 市場數據 API ====================

  /**
   * 取得交易對列表
   */
  async getSymbols() {
    return this.client.get('/api/market/symbols');
  }

  /**
   * 取得特定交易對價格
   */
  async getTicker(symbol) {
    return this.client.get(`/api/market/ticker/${symbol}`);
  }

  /**
   * 取得 K 線數據
   */
  async getKlines(symbol, interval = '1h', limit = 100) {
    return this.client.get(`/api/market/klines/${symbol}`, {
      interval,
      limit
    });
  }

  // ==================== 通知 API ====================

  /**
   * 取得通知規則
   */
  async getNotificationRules() {
    return this.client.get('/api/notifications/rules');
  }

  /**
   * 建立通知規則
   */
  async createNotificationRule(ruleData) {
    return this.client.post('/api/notifications/rules', ruleData);
  }

  /**
   * 更新通知規則
   */
  async updateNotificationRule(ruleId, ruleData) {
    return this.client.put(`/api/notifications/rules/${ruleId}`, ruleData);
  }

  /**
   * 刪除通知規則
   */
  async deleteNotificationRule(ruleId) {
    return this.client.delete(`/api/notifications/rules/${ruleId}`);
  }

  // ==================== AI 分析 API ====================

  /**
   * 請求 AI 市場分析
   */
  async getAIAnalysis(symbols) {
    return this.client.post('/api/ai/analyze', {
      symbols
    });
  }

  /**
   * 取得 AI 洞察
   */
  async getAIInsights() {
    return this.client.get('/api/ai/insights');
  }
}

// 建立全域 API 實例
const api = new NexusTradeAPI();

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ApiClient, ApiError, NexusTradeAPI };
} else {
  window.ApiClient = ApiClient;
  window.ApiError = ApiError;
  window.NexusTradeAPI = NexusTradeAPI;
  window.api = api;
}