/**
 * NexusTrade 狀態管理系統
 * 
 * 提供類似 Redux 的狀態管理功能：
 * - 集中式狀態儲存
 * - 狀態變更通知
 * - 中介軟體支援
 * - 持久化儲存
 */

/**
 * 狀態儲存器
 */
class Store {
  constructor(initialState = {}, options = {}) {
    this.state = { ...initialState };
    this.listeners = new Set();
    this.middlewares = [];
    this.options = {
      persist: options.persist || false,
      persistKey: options.persistKey || 'nexustrade_state',
      ...options
    };
    
    // 載入持久化狀態
    if (this.options.persist) {
      this.loadPersistedState();
    }
    
    console.log('🏪 狀態管理系統已初始化', this.state);
  }

  /**
   * 取得當前狀態
   */
  getState() {
    return { ...this.state };
  }

  /**
   * 設定狀態
   */
  setState(newState, notify = true) {
    const prevState = { ...this.state };
    
    if (typeof newState === 'function') {
      this.state = { ...this.state, ...newState(this.state) };
    } else {
      this.state = { ...this.state, ...newState };
    }
    
    // 持久化儲存
    if (this.options.persist) {
      this.persistState();
    }
    
    // 通知監聽器
    if (notify) {
      this.notifyListeners(prevState, this.state);
    }
    
    return this.state;
  }

  /**
   * 更新巢狀狀態
   */
  updateState(path, value) {
    const pathArray = path.split('.');
    const newState = { ...this.state };
    
    let current = newState;
    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current[pathArray[i]]) {
        current[pathArray[i]] = {};
      }
      current[pathArray[i]] = { ...current[pathArray[i]] };
      current = current[pathArray[i]];
    }
    
    current[pathArray[pathArray.length - 1]] = value;
    
    this.setState(newState);
  }

  /**
   * 取得巢狀狀態
   */
  getStateValue(path, defaultValue = null) {
    const pathArray = path.split('.');
    let current = this.state;
    
    for (const key of pathArray) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  }

  /**
   * 訂閱狀態變更
   */
  subscribe(listener) {
    this.listeners.add(listener);
    
    // 返回取消訂閱函數
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 通知所有監聽器
   */
  notifyListeners(prevState, newState) {
    this.listeners.forEach(listener => {
      try {
        listener(newState, prevState);
      } catch (error) {
        console.error('❌ 狀態監聽器執行錯誤:', error);
      }
    });
  }

  /**
   * 添加中介軟體
   */
  use(middleware) {
    this.middlewares.push(middleware);
  }

  /**
   * 執行動作
   */
  dispatch(action) {
    console.log('📢 執行動作:', action.type, action.payload);
    
    let result = action;
    
    // 執行中介軟體
    for (const middleware of this.middlewares) {
      try {
        result = middleware(this, result);
        if (!result) break;
      } catch (error) {
        console.error('❌ 中介軟體執行錯誤:', error);
      }
    }
    
    return result;
  }

  /**
   * 清空狀態
   */
  clear() {
    this.state = {};
    this.persistState();
    this.notifyListeners({}, this.state);
  }

  /**
   * 重設狀態
   */
  reset(initialState = {}) {
    this.state = { ...initialState };
    this.persistState();
    this.notifyListeners({}, this.state);
  }

  /**
   * 載入持久化狀態
   */
  loadPersistedState() {
    try {
      const saved = localStorage.getItem(this.options.persistKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = { ...this.state, ...parsed };
        console.log('📄 載入持久化狀態');
      }
    } catch (error) {
      console.error('❌ 載入持久化狀態失敗:', error);
    }
  }

  /**
   * 儲存狀態到本地儲存
   */
  persistState() {
    try {
      localStorage.setItem(
        this.options.persistKey,
        JSON.stringify(this.state)
      );
    } catch (error) {
      console.error('❌ 持久化狀態失敗:', error);
    }
  }
}

/**
 * 動作建立者
 */
class ActionCreators {
  // ==================== 認證動作 ====================
  
  static login(userData, token) {
    return {
      type: 'AUTH_LOGIN',
      payload: { userData, token }
    };
  }
  
  static logout() {
    return {
      type: 'AUTH_LOGOUT',
      payload: {}
    };
  }
  
  static updateUser(userData) {
    return {
      type: 'AUTH_UPDATE_USER',
      payload: userData
    };
  }
  
  // ==================== UI 動作 ====================
  
  static setLoading(isLoading, message = '') {
    return {
      type: 'UI_SET_LOADING',
      payload: { isLoading, message }
    };
  }
  
  static showNotification(message, type = 'info', duration = 3000) {
    return {
      type: 'UI_SHOW_NOTIFICATION',
      payload: { message, type, duration }
    };
  }
  
  static hideNotification() {
    return {
      type: 'UI_HIDE_NOTIFICATION',
      payload: {}
    };
  }
  
  static setCurrentPage(page) {
    return {
      type: 'UI_SET_CURRENT_PAGE',
      payload: { page }
    };
  }
  
  // ==================== 市場數據動作 ====================
  
  static updateMarketData(data) {
    return {
      type: 'MARKET_UPDATE_DATA',
      payload: data
    };
  }
  
  static setWatchlist(watchlist) {
    return {
      type: 'MARKET_SET_WATCHLIST',
      payload: watchlist
    };
  }
  
  static addToWatchlist(symbol) {
    return {
      type: 'MARKET_ADD_TO_WATCHLIST',
      payload: { symbol }
    };
  }
  
  static removeFromWatchlist(symbol) {
    return {
      type: 'MARKET_REMOVE_FROM_WATCHLIST',
      payload: { symbol }
    };
  }
  
  // ==================== 通知動作 ====================
  
  static setNotificationRules(rules) {
    return {
      type: 'NOTIFICATION_SET_RULES',
      payload: rules
    };
  }
  
  static addNotificationRule(rule) {
    return {
      type: 'NOTIFICATION_ADD_RULE',
      payload: rule
    };
  }
  
  static updateNotificationRule(ruleId, updates) {
    return {
      type: 'NOTIFICATION_UPDATE_RULE',
      payload: { ruleId, updates }
    };
  }
  
  static deleteNotificationRule(ruleId) {
    return {
      type: 'NOTIFICATION_DELETE_RULE',
      payload: { ruleId }
    };
  }
}

/**
 * 狀態縮減器 (Reducers)
 */
class Reducers {
  /**
   * 認證狀態縮減器
   */
  static auth(state = {}, action) {
    switch (action.type) {
      case 'AUTH_LOGIN':
        return {
          ...state,
          isAuthenticated: true,
          user: action.payload.userData,
          token: action.payload.token
        };
        
      case 'AUTH_LOGOUT':
        return {
          ...state,
          isAuthenticated: false,
          user: null,
          token: null
        };
        
      case 'AUTH_UPDATE_USER':
        return {
          ...state,
          user: { ...state.user, ...action.payload }
        };
        
      default:
        return state;
    }
  }
  
  /**
   * UI 狀態縮減器
   */
  static ui(state = {}, action) {
    switch (action.type) {
      case 'UI_SET_LOADING':
        return {
          ...state,
          loading: {
            isLoading: action.payload.isLoading,
            message: action.payload.message
          }
        };
        
      case 'UI_SHOW_NOTIFICATION':
        return {
          ...state,
          notification: {
            visible: true,
            message: action.payload.message,
            type: action.payload.type,
            duration: action.payload.duration
          }
        };
        
      case 'UI_HIDE_NOTIFICATION':
        return {
          ...state,
          notification: {
            ...state.notification,
            visible: false
          }
        };
        
      case 'UI_SET_CURRENT_PAGE':
        return {
          ...state,
          currentPage: action.payload.page
        };
        
      default:
        return state;
    }
  }
  
  /**
   * 市場數據狀態縮減器
   */
  static market(state = {}, action) {
    switch (action.type) {
      case 'MARKET_UPDATE_DATA':
        return {
          ...state,
          data: { ...state.data, ...action.payload }
        };
        
      case 'MARKET_SET_WATCHLIST':
        return {
          ...state,
          watchlist: action.payload
        };
        
      case 'MARKET_ADD_TO_WATCHLIST':
        const currentWatchlist = state.watchlist || [];
        if (!currentWatchlist.includes(action.payload.symbol)) {
          return {
            ...state,
            watchlist: [...currentWatchlist, action.payload.symbol]
          };
        }
        return state;
        
      case 'MARKET_REMOVE_FROM_WATCHLIST':
        return {
          ...state,
          watchlist: (state.watchlist || []).filter(
            symbol => symbol !== action.payload.symbol
          )
        };
        
      default:
        return state;
    }
  }
  
  /**
   * 通知狀態縮減器
   */
  static notifications(state = {}, action) {
    switch (action.type) {
      case 'NOTIFICATION_SET_RULES':
        return {
          ...state,
          rules: action.payload
        };
        
      case 'NOTIFICATION_ADD_RULE':
        return {
          ...state,
          rules: [...(state.rules || []), action.payload]
        };
        
      case 'NOTIFICATION_UPDATE_RULE':
        return {
          ...state,
          rules: (state.rules || []).map(rule =>
            rule.id === action.payload.ruleId
              ? { ...rule, ...action.payload.updates }
              : rule
          )
        };
        
      case 'NOTIFICATION_DELETE_RULE':
        return {
          ...state,
          rules: (state.rules || []).filter(
            rule => rule.id !== action.payload.ruleId
          )
        };
        
      default:
        return state;
    }
  }
}

/**
 * 中介軟體
 */
class Middlewares {
  /**
   * 日誌中介軟體
   */
  static logger(store, action) {
    console.group(`📢 動作: ${action.type}`);
    console.log('舊狀態:', store.getState());
    console.log('動作:', action);
    
    // 執行狀態變更
    const newState = store.getState();
    
    console.log('新狀態:', newState);
    console.groupEnd();
    
    return action;
  }
  
  /**
   * API 中介軟體
   */
  static api(store, action) {
    if (action.type.endsWith('_REQUEST')) {
      store.setState({
        ui: Reducers.ui(store.getStateValue('ui'), 
          ActionCreators.setLoading(true, '處理中...'))
      }, false);
    }
    
    if (action.type.endsWith('_SUCCESS') || action.type.endsWith('_FAILURE')) {
      store.setState({
        ui: Reducers.ui(store.getStateValue('ui'), 
          ActionCreators.setLoading(false))
      }, false);
    }
    
    return action;
  }
}

/**
 * 狀態管理工廠
 */
class StoreFactory {
  /**
   * 建立 NexusTrade 預設狀態儲存器
   */
  static createNexusTradeStore() {
    const initialState = {
      auth: {
        isAuthenticated: false,
        user: null,
        token: null
      },
      ui: {
        loading: {
          isLoading: false,
          message: ''
        },
        notification: {
          visible: false,
          message: '',
          type: 'info',
          duration: 3000
        },
        currentPage: 'dashboard'
      },
      market: {
        data: {},
        watchlist: []
      },
      notifications: {
        rules: []
      }
    };
    
    const store = new Store(initialState, {
      persist: true,
      persistKey: 'nexustrade_state'
    });
    
    // 添加中介軟體
    store.use(Middlewares.logger);
    store.use(Middlewares.api);
    
    // 添加自訂動作處理
    const originalDispatch = store.dispatch.bind(store);
    store.dispatch = (action) => {
      const result = originalDispatch(action);
      
      // 根據動作類型更新狀態
      const state = store.getState();
      
      if (action.type.startsWith('AUTH_')) {
        store.setState({
          auth: Reducers.auth(state.auth, action)
        });
      }
      
      if (action.type.startsWith('UI_')) {
        store.setState({
          ui: Reducers.ui(state.ui, action)
        });
      }
      
      if (action.type.startsWith('MARKET_')) {
        store.setState({
          market: Reducers.market(state.market, action)
        });
      }
      
      if (action.type.startsWith('NOTIFICATION_')) {
        store.setState({
          notifications: Reducers.notifications(state.notifications, action)
        });
      }
      
      return result;
    };
    
    return store;
  }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Store,
    ActionCreators,
    Reducers,
    Middlewares,
    StoreFactory
  };
} else {
  window.Store = Store;
  window.ActionCreators = ActionCreators;
  window.Reducers = Reducers;
  window.Middlewares = Middlewares;
  window.StoreFactory = StoreFactory;
  
  // 建立全域狀態儲存器
  window.store = StoreFactory.createNexusTradeStore();
}