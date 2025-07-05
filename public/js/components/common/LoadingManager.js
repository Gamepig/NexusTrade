/**
 * NexusTrade 統一載入狀態管理系統
 * 
 * 提供一致的載入體驗，包括：
 * - 骨架屏載入
 * - 進度指示器
 * - 載入動畫
 * - 智慧載入策略
 */

class LoadingManager {
  constructor() {
    this.activeLoaders = new Map();
    this.loadingQueue = [];
    this.defaultOptions = {
      type: 'spinner', // spinner, skeleton, progress, dots
      size: 'medium', // small, medium, large
      overlay: false,
      message: '載入中...',
      timeout: 30000, // 30 秒超時
      showProgress: false,
      theme: 'dark'
    };
    
    this.templates = this.initializeTemplates();
    this.addStyles();
  }

  /**
   * 初始化載入模板
   */
  initializeTemplates() {
    return {
      spinner: {
        small: '⏳',
        medium: '🔄',
        large: '⏱️'
      },
      skeleton: {
        text: '<div class="skeleton-text"></div>',
        card: '<div class="skeleton-card"><div class="skeleton-header"></div><div class="skeleton-body"></div></div>',
        list: '<div class="skeleton-list"><div class="skeleton-item"></div><div class="skeleton-item"></div><div class="skeleton-item"></div></div>'
      },
      progress: {
        bar: '<div class="progress-bar"><div class="progress-fill"></div></div>',
        circle: '<div class="progress-circle"><svg><circle class="progress-track"></circle><circle class="progress-indicator"></circle></svg></div>'
      },
      dots: {
        bouncing: '<div class="dots-loading"><span></span><span></span><span></span></div>',
        pulsing: '<div class="dots-pulsing"><span></span><span></span><span></span></div>'
      }
    };
  }

  /**
   * 顯示載入狀態
   * @param {string} id - 載入器唯一識別符
   * @param {Object} options - 載入選項
   * @returns {Object} 載入控制器
   */
  show(id, options = {}) {
    const config = { ...this.defaultOptions, ...options };
    
    // 如果載入器已存在，更新它
    if (this.activeLoaders.has(id)) {
      return this.update(id, config);
    }

    const loader = this.createLoader(id, config);
    this.activeLoaders.set(id, loader);
    
    // 設定超時
    if (config.timeout) {
      loader.timeoutId = setTimeout(() => {
        this.hide(id);
        this.showError(id, '載入超時，請重試');
      }, config.timeout);
    }

    console.log(`🔄 顯示載入器: ${id}`, config);
    return loader;
  }

  /**
   * 隱藏載入狀態
   * @param {string} id - 載入器識別符
   */
  hide(id) {
    const loader = this.activeLoaders.get(id);
    if (!loader) return;

    // 清除超時
    if (loader.timeoutId) {
      clearTimeout(loader.timeoutId);
    }

    // 移除 DOM 元素
    if (loader.element && loader.element.parentNode) {
      loader.element.classList.add('loading-hide');
      setTimeout(() => {
        if (loader.element.parentNode) {
          loader.element.parentNode.removeChild(loader.element);
        }
      }, 300);
    }

    this.activeLoaders.delete(id);
    console.log(`✅ 隱藏載入器: ${id}`);
  }

  /**
   * 更新載入狀態
   * @param {string} id - 載入器識別符
   * @param {Object} updates - 更新選項
   */
  update(id, updates) {
    const loader = this.activeLoaders.get(id);
    if (!loader) return;

    // 更新進度
    if (updates.progress !== undefined) {
      this.updateProgress(loader, updates.progress);
    }

    // 更新訊息
    if (updates.message) {
      this.updateMessage(loader, updates.message);
    }

    return loader;
  }

  /**
   * 創建載入器
   * @param {string} id - 載入器識別符
   * @param {Object} config - 載入配置
   * @returns {Object} 載入器物件
   */
  createLoader(id, config) {
    const loader = {
      id,
      config,
      startTime: Date.now(),
      element: null,
      timeoutId: null
    };

    // 根據類型創建載入元素
    switch (config.type) {
      case 'skeleton':
        loader.element = this.createSkeletonLoader(config);
        break;
      case 'progress':
        loader.element = this.createProgressLoader(config);
        break;
      case 'dots':
        loader.element = this.createDotsLoader(config);
        break;
      default:
        loader.element = this.createSpinnerLoader(config);
    }

    // 插入到指定容器或 body
    const container = config.container ? 
      (typeof config.container === 'string' ? 
        document.querySelector(config.container) : 
        config.container) : 
      document.body;

    if (container) {
      container.appendChild(loader.element);
      
      // 添加顯示動畫
      setTimeout(() => {
        loader.element.classList.add('loading-show');
      }, 10);
    }

    return loader;
  }

  /**
   * 創建旋轉載入器
   */
  createSpinnerLoader(config) {
    const element = document.createElement('div');
    element.className = `loading-spinner ${config.size} ${config.theme}`;
    
    if (config.overlay) {
      element.classList.add('loading-overlay');
    }

    element.innerHTML = `
      <div class="spinner-container">
        <div class="spinner-icon">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
        ${config.message ? `<div class="spinner-message">${config.message}</div>` : ''}
      </div>
    `;

    return element;
  }

  /**
   * 創建骨架屏載入器
   */
  createSkeletonLoader(config) {
    const element = document.createElement('div');
    element.className = `loading-skeleton ${config.size} ${config.theme}`;
    
    const skeletonType = config.skeletonType || 'card';
    element.innerHTML = this.templates.skeleton[skeletonType] || this.templates.skeleton.card;

    return element;
  }

  /**
   * 創建進度載入器
   */
  createProgressLoader(config) {
    const element = document.createElement('div');
    element.className = `loading-progress ${config.size} ${config.theme}`;
    
    if (config.overlay) {
      element.classList.add('loading-overlay');
    }

    const progressType = config.progressType || 'bar';
    element.innerHTML = `
      <div class="progress-container">
        ${this.templates.progress[progressType]}
        ${config.message ? `<div class="progress-message">${config.message}</div>` : ''}
        ${config.showProgress ? '<div class="progress-text">0%</div>' : ''}
      </div>
    `;

    return element;
  }

  /**
   * 創建點點載入器
   */
  createDotsLoader(config) {
    const element = document.createElement('div');
    element.className = `loading-dots ${config.size} ${config.theme}`;
    
    if (config.overlay) {
      element.classList.add('loading-overlay');
    }

    const dotsType = config.dotsType || 'bouncing';
    element.innerHTML = `
      <div class="dots-container">
        ${this.templates.dots[dotsType]}
        ${config.message ? `<div class="dots-message">${config.message}</div>` : ''}
      </div>
    `;

    return element;
  }

  /**
   * 更新進度
   */
  updateProgress(loader, progress) {
    const progressFill = loader.element.querySelector('.progress-fill');
    const progressIndicator = loader.element.querySelector('.progress-indicator');
    const progressText = loader.element.querySelector('.progress-text');

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    if (progressIndicator) {
      const circumference = 2 * Math.PI * 45; // 假設半徑為 45
      const offset = circumference - (progress / 100) * circumference;
      progressIndicator.style.strokeDashoffset = offset;
    }

    if (progressText) {
      progressText.textContent = `${Math.round(progress)}%`;
    }
  }

  /**
   * 更新訊息
   */
  updateMessage(loader, message) {
    const messageElement = loader.element.querySelector('.spinner-message, .progress-message, .dots-message');
    if (messageElement) {
      messageElement.textContent = message;
    }
  }

  /**
   * 顯示錯誤狀態
   */
  showError(id, message) {
    this.hide(id);
    
    const errorElement = document.createElement('div');
    errorElement.className = 'loading-error';
    errorElement.innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${message}</div>
        <button class="error-retry" onclick="window.loadingManager.retry('${id}')">重試</button>
      </div>
    `;

    document.body.appendChild(errorElement);
    
    setTimeout(() => {
      errorElement.classList.add('loading-show');
    }, 10);

    // 自動移除錯誤訊息
    setTimeout(() => {
      if (errorElement.parentNode) {
        errorElement.parentNode.removeChild(errorElement);
      }
    }, 5000);
  }

  /**
   * 重試載入
   */
  retry(id) {
    const errorElements = document.querySelectorAll('.loading-error');
    errorElements.forEach(el => el.remove());
    
    // 觸發重試事件
    window.dispatchEvent(new CustomEvent('loadingRetry', { detail: { id } }));
  }

  /**
   * 批量顯示載入
   */
  showBatch(loaders) {
    const controllers = [];
    loaders.forEach(({ id, options }) => {
      controllers.push(this.show(id, options));
    });
    return controllers;
  }

  /**
   * 批量隱藏載入
   */
  hideBatch(ids) {
    ids.forEach(id => this.hide(id));
  }

  /**
   * 隱藏所有載入器
   */
  hideAll() {
    Array.from(this.activeLoaders.keys()).forEach(id => this.hide(id));
  }

  /**
   * 獲取載入狀態
   */
  getStatus(id) {
    const loader = this.activeLoaders.get(id);
    if (!loader) return null;

    return {
      id: loader.id,
      active: true,
      duration: Date.now() - loader.startTime,
      config: loader.config
    };
  }

  /**
   * 獲取所有載入狀態
   */
  getAllStatus() {
    return Array.from(this.activeLoaders.values()).map(loader => ({
      id: loader.id,
      active: true,
      duration: Date.now() - loader.startTime,
      config: loader.config
    }));
  }

  /**
   * 添加樣式
   */
  addStyles() {
    const existingStyles = document.getElementById('loading-manager-styles');
    if (existingStyles) return;

    const styles = document.createElement('style');
    styles.id = 'loading-manager-styles';
    styles.textContent = `
      /* 載入管理器基礎樣式 */
      .loading-spinner,
      .loading-skeleton,
      .loading-progress,
      .loading-dots {
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .loading-show {
        opacity: 1;
      }

      .loading-hide {
        opacity: 0;
      }

      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* 旋轉載入器樣式 */
      .loading-spinner .spinner-container {
        text-align: center;
        padding: 20px;
        background: var(--bg-secondary, #1a1d29);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }

      .spinner-icon {
        position: relative;
        width: 40px;
        height: 40px;
        margin: 0 auto 12px;
      }

      .spinner-ring {
        position: absolute;
        width: 100%;
        height: 100%;
        border: 3px solid transparent;
        border-top: 3px solid var(--accent-color, #3182ce);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .spinner-ring:nth-child(2) {
        width: 70%;
        height: 70%;
        top: 15%;
        left: 15%;
        animation-delay: -0.3s;
        border-top-color: var(--success-color, #38a169);
      }

      .spinner-ring:nth-child(3) {
        width: 40%;
        height: 40%;
        top: 30%;
        left: 30%;
        animation-delay: -0.6s;
        border-top-color: var(--warning-color, #ffc107);
      }

      .spinner-message {
        color: var(--text-primary, #ffffff);
        font-size: 14px;
        margin-top: 8px;
      }

      /* 骨架屏樣式 */
      .loading-skeleton {
        padding: 16px;
      }

      .skeleton-text,
      .skeleton-header,
      .skeleton-body,
      .skeleton-item {
        background: linear-gradient(90deg, 
          var(--bg-tertiary, #2d3748) 25%, 
          var(--bg-quaternary, #4a5568) 50%, 
          var(--bg-tertiary, #2d3748) 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s infinite;
        border-radius: 4px;
      }

      .skeleton-text {
        height: 16px;
        margin-bottom: 8px;
      }

      .skeleton-text:last-child {
        width: 60%;
      }

      .skeleton-card {
        border: 1px solid var(--border-color, #2d3748);
        border-radius: 8px;
        padding: 16px;
      }

      .skeleton-header {
        height: 20px;
        margin-bottom: 12px;
      }

      .skeleton-body {
        height: 14px;
        margin-bottom: 8px;
      }

      .skeleton-item {
        height: 48px;
        margin-bottom: 12px;
        border-radius: 8px;
      }

      /* 進度載入器樣式 */
      .loading-progress .progress-container {
        text-align: center;
        padding: 20px;
        background: var(--bg-secondary, #1a1d29);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        min-width: 200px;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background: var(--bg-tertiary, #2d3748);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 12px;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, 
          var(--accent-color, #3182ce) 0%, 
          var(--success-color, #38a169) 100%);
        width: 0%;
        transition: width 0.3s ease;
        border-radius: 4px;
      }

      .progress-circle {
        width: 60px;
        height: 60px;
        margin: 0 auto 12px;
      }

      .progress-circle svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }

      .progress-track,
      .progress-indicator {
        fill: none;
        stroke-width: 4;
        r: 26;
        cx: 30;
        cy: 30;
      }

      .progress-track {
        stroke: var(--bg-tertiary, #2d3748);
      }

      .progress-indicator {
        stroke: var(--accent-color, #3182ce);
        stroke-dasharray: 163;
        stroke-dashoffset: 163;
        transition: stroke-dashoffset 0.3s ease;
      }

      .progress-message {
        color: var(--text-primary, #ffffff);
        font-size: 14px;
        margin-bottom: 8px;
      }

      .progress-text {
        color: var(--text-secondary, #a0aec0);
        font-size: 12px;
        font-weight: 600;
      }

      /* 點點載入器樣式 */
      .loading-dots .dots-container {
        text-align: center;
        padding: 20px;
      }

      .dots-loading {
        display: flex;
        gap: 4px;
        justify-content: center;
        margin-bottom: 12px;
      }

      .dots-loading span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--accent-color, #3182ce);
        animation: dots-bounce 1.4s infinite ease-in-out both;
      }

      .dots-loading span:nth-child(1) { animation-delay: -0.32s; }
      .dots-loading span:nth-child(2) { animation-delay: -0.16s; }
      .dots-loading span:nth-child(3) { animation-delay: 0s; }

      .dots-pulsing {
        display: flex;
        gap: 6px;
        justify-content: center;
        margin-bottom: 12px;
      }

      .dots-pulsing span {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--accent-color, #3182ce);
        animation: dots-pulse 1.5s infinite ease-in-out;
      }

      .dots-pulsing span:nth-child(1) { animation-delay: 0s; }
      .dots-pulsing span:nth-child(2) { animation-delay: 0.5s; }
      .dots-pulsing span:nth-child(3) { animation-delay: 1s; }

      .dots-message {
        color: var(--text-primary, #ffffff);
        font-size: 14px;
      }

      /* 錯誤狀態樣式 */
      .loading-error {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000000;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .error-container {
        background: var(--bg-secondary, #1a1d29);
        border: 1px solid var(--error-color, #e53e3e);
        border-radius: 12px;
        padding: 24px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        min-width: 300px;
      }

      .error-icon {
        font-size: 32px;
        margin-bottom: 12px;
      }

      .error-message {
        color: var(--text-primary, #ffffff);
        margin-bottom: 16px;
        font-size: 14px;
      }

      .error-retry {
        background: var(--error-color, #e53e3e);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s ease;
      }

      .error-retry:hover {
        background: var(--error-color-dark, #c53030);
      }

      /* 尺寸變化 */
      .loading-spinner.small .spinner-icon,
      .loading-progress.small .progress-circle {
        width: 24px;
        height: 24px;
      }

      .loading-spinner.large .spinner-icon,
      .loading-progress.large .progress-circle {
        width: 64px;
        height: 64px;
      }

      /* 動畫定義 */
      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      @keyframes skeleton-loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @keyframes dots-bounce {
        0%, 80%, 100% { 
          transform: scale(0);
        } 40% { 
          transform: scale(1);
        }
      }

      @keyframes dots-pulse {
        0%, 100% {
          opacity: 0.4;
          transform: scale(1);
        }
        50% {
          opacity: 1;
          transform: scale(1.2);
        }
      }

      /* 響應式設計 */
      @media (max-width: 768px) {
        .loading-overlay .spinner-container,
        .loading-overlay .progress-container,
        .error-container {
          margin: 20px;
          width: calc(100% - 40px);
          max-width: none;
        }
      }
    `;

    document.head.appendChild(styles);
  }
}

// 創建全域實例
window.LoadingManager = LoadingManager;
window.loadingManager = new LoadingManager();