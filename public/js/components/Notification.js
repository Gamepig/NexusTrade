/**
 * 通知組件
 * 
 * 提供統一的通知顯示功能
 */

class NotificationComponent {
  constructor() {
    this.container = null;
    this.currentNotification = null;
    this.autoHideTimer = null;
    this.init();
  }

  /**
   * 初始化通知系統
   */
  init() {
    this.createContainer();
    this.bindEvents();
    console.log('📢 通知組件已初始化');
  }

  /**
   * 建立通知容器
   */
  createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.className = 'notification-container';
    document.body.appendChild(this.container);
  }

  /**
   * 綁定事件監聽器
   */
  bindEvents() {
    // 監聽狀態變化
    if (window.store) {
      window.store.subscribe((newState, prevState) => {
        const notification = newState.ui?.notification;
        const prevNotification = prevState.ui?.notification;
        
        if (notification?.visible !== prevNotification?.visible) {
          if (notification?.visible) {
            this.showNotification(
              notification.message,
              notification.type,
              notification.duration
            );
          } else {
            this.hideNotification();
          }
        }
      });
    }
  }

  /**
   * 顯示通知
   */
  showNotification(message, type = 'info', duration = 3000) {
    // 清除現有通知
    this.clearCurrentNotification();

    // 建立通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // 設定圖示
    const icon = this.getIcon(type);
    
    // 建立內容
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${icon}</span>
        <span class="notification-message">${message}</span>
        <button class="notification-close" type="button">&times;</button>
      </div>
    `;

    // 綁定關閉事件
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.hideNotification();
    });

    // 添加到容器
    this.container.appendChild(notification);
    this.currentNotification = notification;

    // 動畫效果
    requestAnimationFrame(() => {
      notification.classList.add('notification-show');
    });

    // 自動隱藏
    if (duration > 0) {
      this.autoHideTimer = setTimeout(() => {
        this.hideNotification();
      }, duration);
    }

    console.log(`📢 顯示通知: ${message} (${type})`);
  }

  /**
   * 隱藏通知
   */
  hideNotification() {
    if (this.currentNotification) {
      this.currentNotification.classList.remove('notification-show');
      this.currentNotification.classList.add('notification-hide');
      
      setTimeout(() => {
        this.clearCurrentNotification();
      }, 300);
    }

    // 更新狀態
    if (window.store) {
      window.store.dispatch(window.ActionCreators.hideNotification());
    }
  }

  /**
   * 清除當前通知
   */
  clearCurrentNotification() {
    if (this.currentNotification) {
      this.currentNotification.remove();
      this.currentNotification = null;
    }
    
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }

  /**
   * 取得圖示
   */
  getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    return icons[type] || icons.info;
  }

  /**
   * 快捷方法
   */
  success(message, duration = 3000) {
    this.showNotification(message, 'success', duration);
  }

  error(message, duration = 5000) {
    this.showNotification(message, 'error', duration);
  }

  warning(message, duration = 4000) {
    this.showNotification(message, 'warning', duration);
  }

  info(message, duration = 3000) {
    this.showNotification(message, 'info', duration);
  }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationComponent;
} else {
  window.NotificationComponent = NotificationComponent;
}