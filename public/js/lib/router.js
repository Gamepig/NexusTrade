/**
 * NexusTrade 前端路由系統
 * 
 * 提供單頁應用程式 (SPA) 路由功能：
 * - Hash 路由支援
 * - 路由參數解析
 * - 路由守衛
 * - 歷史記錄管理
 */

class Router {
  constructor() {
    this.routes = new Map();
    this.guards = [];
    this.currentRoute = null;
    this.defaultRoute = '/';
    this.notFoundRoute = null;
    
    // 綁定事件
    this.bindEvents();
    
    console.log('🧭 路由系統已初始化');
  }

  /**
   * 綁定路由事件
   */
  bindEvents() {
    // 監聽 hash 變化
    window.addEventListener('hashchange', () => {
      this.handleRouteChange();
    });

    // 監聽頁面載入
    window.addEventListener('load', () => {
      this.handleRouteChange();
    });

    // 監聽瀏覽器前進/後退
    window.addEventListener('popstate', () => {
      this.handleRouteChange();
    });
  }

  /**
   * 註冊路由
   */
  route(path, handler, options = {}) {
    const route = {
      path: this.normalizePath(path),
      handler,
      name: options.name,
      meta: options.meta || {},
      children: options.children || []
    };

    this.routes.set(route.path, route);
    
    console.log(`📍 註冊路由: ${route.path}`);
    return this;
  }

  /**
   * 註冊路由群組
   */
  group(prefix, routes) {
    routes.forEach(route => {
      const fullPath = this.joinPaths(prefix, route.path);
      this.route(fullPath, route.handler, route.options);
    });
    
    return this;
  }

  /**
   * 設定預設路由
   */
  setDefault(path) {
    this.defaultRoute = this.normalizePath(path);
    return this;
  }

  /**
   * 設定 404 路由
   */
  setNotFound(handler) {
    this.notFoundRoute = handler;
    return this;
  }

  /**
   * 添加路由守衛
   */
  addGuard(guard) {
    this.guards.push(guard);
    return this;
  }

  /**
   * 導航到指定路由
   */
  navigate(path, replace = false) {
    const normalizedPath = this.normalizePath(path);
    
    if (replace) {
      window.location.replace(`#${normalizedPath}`);
    } else {
      window.location.hash = normalizedPath;
    }
  }

  /**
   * 替換當前路由
   */
  replace(path) {
    this.navigate(path, true);
  }

  /**
   * 返回上一頁
   */
  back() {
    window.history.back();
  }

  /**
   * 前進下一頁
   */
  forward() {
    window.history.forward();
  }

  /**
   * 重新載入當前路由
   */
  reload() {
    this.handleRouteChange();
  }

  /**
   * 取得當前路由路徑
   */
  getCurrentPath() {
    return this.getHashPath() || this.defaultRoute;
  }

  /**
   * 取得 Hash 路徑
   */
  getHashPath() {
    const hash = window.location.hash;
    return hash ? hash.substring(1) : '';
  }

  /**
   * 標準化路徑
   */
  normalizePath(path) {
    if (!path || path === '/') return '/';
    
    // 移除開頭的 # 
    if (path.startsWith('#')) {
      path = path.substring(1);
    }
    
    // 確保以 / 開頭
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // 移除結尾的 /
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
    return path;
  }

  /**
   * 連接路徑
   */
  joinPaths(prefix, path) {
    const normalizedPrefix = this.normalizePath(prefix);
    const normalizedPath = this.normalizePath(path);
    
    if (normalizedPath === '/') return normalizedPrefix;
    return normalizedPrefix + normalizedPath;
  }

  /**
   * 解析路由參數
   */
  parseParams(routePath, actualPath) {
    const routeParts = routePath.split('/');
    const actualParts = actualPath.split('/');
    const params = {};
    const query = {};
    
    // 解析路徑參數
    routeParts.forEach((part, index) => {
      if (part.startsWith(':')) {
        const paramName = part.substring(1);
        params[paramName] = actualParts[index];
      }
    });
    
    // 解析查詢參數
    const queryString = window.location.search;
    if (queryString) {
      const urlParams = new URLSearchParams(queryString);
      for (const [key, value] of urlParams) {
        query[key] = value;
      }
    }
    
    return { params, query };
  }

  /**
   * 匹配路由
   */
  matchRoute(path) {
    // 精確匹配
    if (this.routes.has(path)) {
      return {
        route: this.routes.get(path),
        params: {},
        query: this.parseParams(path, path).query
      };
    }
    
    // 參數匹配
    for (const [routePath, route] of this.routes) {
      if (this.isRouteMatch(routePath, path)) {
        const { params, query } = this.parseParams(routePath, path);
        return { route, params, query };
      }
    }
    
    return null;
  }

  /**
   * 檢查路由是否匹配
   */
  isRouteMatch(routePath, actualPath) {
    const routeParts = routePath.split('/');
    const actualParts = actualPath.split('/');
    
    if (routeParts.length !== actualParts.length) {
      return false;
    }
    
    return routeParts.every((part, index) => {
      return part.startsWith(':') || part === actualParts[index];
    });
  }

  /**
   * 處理路由變化
   */
  async handleRouteChange() {
    const path = this.getCurrentPath();
    const match = this.matchRoute(path);
    
    console.log(`🧭 路由變化: ${path}`);
    
    // 建立路由上下文
    const context = {
      path,
      params: match ? match.params : {},
      query: match ? match.query : {},
      meta: match ? match.route.meta : {},
      router: this
    };
    
    try {
      // 執行路由守衛
      for (const guard of this.guards) {
        const result = await guard(context);
        if (result === false) {
          console.log('🛡️ 路由被守衛阻止');
          return;
        }
        
        if (typeof result === 'string') {
          console.log(`🛡️ 路由重定向到: ${result}`);
          this.navigate(result, true);
          return;
        }
      }
      
      // 執行路由處理器
      if (match) {
        this.currentRoute = context;
        await match.route.handler(context);
        
        // 觸發路由變化事件
        this.triggerEvent('route:changed', context);
      } else {
        // 處理 404
        this.handle404(context);
      }
      
    } catch (error) {
      console.error('❌ 路由處理錯誤:', error);
      this.handleError(error, context);
    }
  }

  /**
   * 處理 404 錯誤
   */
  handle404(context) {
    console.warn(`⚠️ 404 - 路由未找到: ${context.path}`);
    
    if (this.notFoundRoute) {
      this.notFoundRoute(context);
    } else {
      // 預設 404 處理
      this.navigate(this.defaultRoute, true);
    }
    
    this.triggerEvent('route:notfound', context);
  }

  /**
   * 處理路由錯誤
   */
  handleError(error, context) {
    console.error('❌ 路由錯誤:', error);
    
    this.triggerEvent('route:error', {
      error,
      context
    });
    
    // 回到預設路由
    this.navigate(this.defaultRoute, true);
  }

  /**
   * 觸發自訂事件
   */
  triggerEvent(eventType, detail) {
    window.dispatchEvent(new CustomEvent(eventType, {
      detail,
      bubbles: true
    }));
  }

  /**
   * 取得所有路由
   */
  getRoutes() {
    return Array.from(this.routes.values());
  }

  /**
   * 檢查是否為當前路由
   */
  isCurrentRoute(path) {
    return this.getCurrentPath() === this.normalizePath(path);
  }

  /**
   * 生成路由連結
   */
  link(path, params = {}) {
    let link = this.normalizePath(path);
    
    // 替換路徑參數
    Object.entries(params).forEach(([key, value]) => {
      link = link.replace(`:${key}`, value);
    });
    
    return `#${link}`;
  }
}

/**
 * 路由建構器
 */
class RouteBuilder {
  constructor() {
    this.router = new Router();
  }

  /**
   * 建立基本路由
   */
  static create() {
    return new RouteBuilder();
  }

  /**
   * 添加首頁路由
   */
  home(handler) {
    this.router.route('/', handler, { name: 'home' });
    return this;
  }

  /**
   * 添加儀表板路由
   */
  dashboard(handler) {
    this.router.route('/dashboard', handler, { name: 'dashboard' });
    return this;
  }

  /**
   * 添加市場路由
   */
  market(handler) {
    this.router.route('/market', handler, { name: 'market' });
    return this;
  }

  /**
   * 添加新聞路由
   */
  news(handler) {
    this.router.route('/news', handler, { name: 'news' });
    return this;
  }

  /**
   * 添加關注清單路由
   */
  watchlist(handler) {
    this.router.route('/watchlist', handler, { name: 'watchlist' });
    return this;
  }

  /**
   * 添加通知路由
   */
  notifications(handler) {
    this.router.route('/notifications', handler, { name: 'notifications' });
    return this;
  }

  /**
   * 添加 AI 分析路由
   */
  ai(handler) {
    this.router.route('/ai-insights', handler, { name: 'ai-insights' });
    return this;
  }

  /**
   * 添加設定路由
   */
  settings(handler) {
    this.router.route('/settings', handler, { name: 'settings' });
    return this;
  }

  /**
   * 添加登入路由
   */
  login(handler) {
    this.router.route('/login', handler, { name: 'login' });
    return this;
  }

  /**
   * 添加認證守衛
   */
  requireAuth() {
    this.router.addGuard(async (context) => {
      // 檢查認證狀態
      const isAuthenticated = window.store && window.store.getState().auth.isAuthenticated;
      
      if (!isAuthenticated && context.path !== '/login') {
        return '/login';
      }
      
      return true;
    });
    
    return this;
  }

  /**
   * 設定預設路由
   */
  defaultTo(path) {
    this.router.setDefault(path);
    return this;
  }

  /**
   * 設定 404 處理
   */
  notFound(handler) {
    this.router.setNotFound(handler);
    return this;
  }

  /**
   * 完成建構並返回路由器
   */
  build() {
    return this.router;
  }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Router, RouteBuilder };
} else {
  window.Router = Router;
  window.RouteBuilder = RouteBuilder;
}