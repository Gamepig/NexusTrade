/**
 * NexusTrade DOM 操作工具模組
 * 
 * 提供常用的 DOM 操作工具函數：
 * - 元素選擇和操作
 * - 事件處理
 * - 動畫效果
 * - 表單處理
 */

/**
 * DOM 查詢和操作工具
 */
class DOMUtils {
  /**
   * 查詢單一元素
   */
  static $(selector, context = document) {
    return context.querySelector(selector);
  }

  /**
   * 查詢多個元素
   */
  static $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }

  /**
   * 根據 ID 查詢元素
   */
  static id(id) {
    return document.getElementById(id);
  }

  /**
   * 建立元素
   */
  static create(tag, options = {}) {
    const element = document.createElement(tag);
    
    // 設定屬性
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    
    // 設定類別
    if (options.className) {
      element.className = options.className;
    }
    
    // 設定內容
    if (options.textContent) {
      element.textContent = options.textContent;
    }
    
    if (options.innerHTML) {
      element.innerHTML = options.innerHTML;
    }
    
    // 設定樣式
    if (options.style) {
      Object.assign(element.style, options.style);
    }
    
    // 添加事件監聽器
    if (options.events) {
      Object.entries(options.events).forEach(([event, handler]) => {
        element.addEventListener(event, handler);
      });
    }
    
    return element;
  }

  /**
   * 檢查元素是否存在
   */
  static exists(selector) {
    return !!this.$(selector);
  }

  /**
   * 檢查元素是否可見
   */
  static isVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  /**
   * 切換元素顯示/隱藏
   */
  static toggle(element, show = null) {
    if (!element) return;
    
    if (show === null) {
      show = !this.isVisible(element);
    }
    
    element.style.display = show ? '' : 'none';
  }

  /**
   * 顯示元素
   */
  static show(element) {
    this.toggle(element, true);
  }

  /**
   * 隱藏元素
   */
  static hide(element) {
    this.toggle(element, false);
  }

  /**
   * 添加類別
   */
  static addClass(element, className) {
    if (element && className) {
      element.classList.add(...className.split(' '));
    }
  }

  /**
   * 移除類別
   */
  static removeClass(element, className) {
    if (element && className) {
      element.classList.remove(...className.split(' '));
    }
  }

  /**
   * 切換類別
   */
  static toggleClass(element, className, force = null) {
    if (!element || !className) return;
    
    if (force !== null) {
      element.classList.toggle(className, force);
    } else {
      element.classList.toggle(className);
    }
  }

  /**
   * 檢查是否有類別
   */
  static hasClass(element, className) {
    return element && element.classList.contains(className);
  }

  /**
   * 設定或取得屬性
   */
  static attr(element, name, value = undefined) {
    if (!element) return null;
    
    if (value === undefined) {
      return element.getAttribute(name);
    } else {
      element.setAttribute(name, value);
    }
  }

  /**
   * 移除屬性
   */
  static removeAttr(element, name) {
    if (element) {
      element.removeAttribute(name);
    }
  }

  /**
   * 設定或取得數據屬性
   */
  static data(element, key, value = undefined) {
    if (!element) return null;
    
    if (value === undefined) {
      return element.dataset[key];
    } else {
      element.dataset[key] = value;
    }
  }

  /**
   * 清空元素內容
   */
  static empty(element) {
    if (element) {
      element.innerHTML = '';
    }
  }

  /**
   * 移除元素
   */
  static remove(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  /**
   * 在元素後插入新元素
   */
  static after(element, newElement) {
    if (element && newElement && element.parentNode) {
      element.parentNode.insertBefore(newElement, element.nextSibling);
    }
  }

  /**
   * 在元素前插入新元素
   */
  static before(element, newElement) {
    if (element && newElement && element.parentNode) {
      element.parentNode.insertBefore(newElement, element);
    }
  }

  /**
   * 添加子元素
   */
  static append(parent, child) {
    if (parent && child) {
      parent.appendChild(child);
    }
  }

  /**
   * 前置子元素
   */
  static prepend(parent, child) {
    if (parent && child) {
      parent.insertBefore(child, parent.firstChild);
    }
  }
}

/**
 * 事件處理工具
 */
class EventUtils {
  /**
   * 添加事件監聽器
   */
  static on(element, event, handler, options = {}) {
    if (element && event && handler) {
      element.addEventListener(event, handler, options);
    }
  }

  /**
   * 移除事件監聽器
   */
  static off(element, event, handler) {
    if (element && event && handler) {
      element.removeEventListener(event, handler);
    }
  }

  /**
   * 添加一次性事件監聽器
   */
  static once(element, event, handler) {
    this.on(element, event, handler, { once: true });
  }

  /**
   * 事件委託
   */
  static delegate(parent, selector, event, handler) {
    this.on(parent, event, (e) => {
      const target = e.target.closest(selector);
      if (target) {
        handler.call(target, e);
      }
    });
  }

  /**
   * 觸發自訂事件
   */
  static trigger(element, eventType, detail = {}) {
    if (element) {
      const event = new CustomEvent(eventType, {
        detail,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(event);
    }
  }

  /**
   * 阻止事件預設行為和冒泡
   */
  static prevent(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * 節流函數
   */
  static throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * 防抖函數
   */
  static debounce(func, wait, immediate = false) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      
      const later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      
      if (callNow) func.apply(context, args);
    };
  }
}

/**
 * 動畫工具
 */
class AnimationUtils {
  /**
   * 淡入效果
   */
  static fadeIn(element, duration = 300) {
    if (!element) return Promise.resolve();
    
    return new Promise((resolve) => {
      element.style.opacity = '0';
      element.style.display = '';
      
      const start = performance.now();
      
      function animate(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        
        element.style.opacity = progress;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      }
      
      requestAnimationFrame(animate);
    });
  }

  /**
   * 淡出效果
   */
  static fadeOut(element, duration = 300) {
    if (!element) return Promise.resolve();
    
    return new Promise((resolve) => {
      const start = performance.now();
      const startOpacity = parseFloat(window.getComputedStyle(element).opacity);
      
      function animate(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        
        element.style.opacity = startOpacity * (1 - progress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          element.style.display = 'none';
          resolve();
        }
      }
      
      requestAnimationFrame(animate);
    });
  }

  /**
   * 滑動顯示
   */
  static slideDown(element, duration = 300) {
    if (!element) return Promise.resolve();
    
    return new Promise((resolve) => {
      element.style.height = '0';
      element.style.overflow = 'hidden';
      element.style.display = '';
      
      const targetHeight = element.scrollHeight;
      const start = performance.now();
      
      function animate(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        
        element.style.height = `${targetHeight * progress}px`;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          element.style.height = '';
          element.style.overflow = '';
          resolve();
        }
      }
      
      requestAnimationFrame(animate);
    });
  }

  /**
   * 滑動隱藏
   */
  static slideUp(element, duration = 300) {
    if (!element) return Promise.resolve();
    
    return new Promise((resolve) => {
      const startHeight = element.offsetHeight;
      const start = performance.now();
      
      element.style.overflow = 'hidden';
      
      function animate(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        
        element.style.height = `${startHeight * (1 - progress)}px`;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          element.style.display = 'none';
          element.style.height = '';
          element.style.overflow = '';
          resolve();
        }
      }
      
      requestAnimationFrame(animate);
    });
  }
}

/**
 * 表單工具
 */
class FormUtils {
  /**
   * 取得表單數據
   */
  static getFormData(form) {
    if (!form) return {};
    
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      if (data[key]) {
        // 處理多重值（如 checkbox）
        if (Array.isArray(data[key])) {
          data[key].push(value);
        } else {
          data[key] = [data[key], value];
        }
      } else {
        data[key] = value;
      }
    }
    
    return data;
  }

  /**
   * 設定表單數據
   */
  static setFormData(form, data) {
    if (!form || !data) return;
    
    Object.entries(data).forEach(([key, value]) => {
      const field = form.querySelector(`[name="${key}"]`);
      if (field) {
        if (field.type === 'checkbox' || field.type === 'radio') {
          field.checked = !!value;
        } else {
          field.value = value;
        }
      }
    });
  }

  /**
   * 清空表單
   */
  static clearForm(form) {
    if (form) {
      form.reset();
    }
  }

  /**
   * 驗證表單
   */
  static validateForm(form) {
    if (!form) return { valid: false, errors: [] };
    
    const errors = [];
    const fields = form.querySelectorAll('[required]');
    
    fields.forEach(field => {
      if (!field.value.trim()) {
        errors.push({
          field: field.name || field.id,
          message: '此欄位為必填'
        });
      }
    });
    
    // Email 驗證
    const emailFields = form.querySelectorAll('[type="email"]');
    emailFields.forEach(field => {
      if (field.value && !this.isValidEmail(field.value)) {
        errors.push({
          field: field.name || field.id,
          message: '電子郵件格式無效'
        });
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 檢查 Email 格式
   */
  static isValidEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  }

  /**
   * 顯示表單錯誤
   */
  static showFormErrors(form, errors) {
    // 清除之前的錯誤
    this.clearFormErrors(form);
    
    errors.forEach(error => {
      const field = form.querySelector(`[name="${error.field}"]`);
      if (field) {
        const errorElement = DOMUtils.create('div', {
          className: 'form-error',
          textContent: error.message
        });
        
        DOMUtils.addClass(field, 'error');
        DOMUtils.after(field, errorElement);
      }
    });
  }

  /**
   * 清除表單錯誤
   */
  static clearFormErrors(form) {
    // 移除錯誤類別
    const errorFields = form.querySelectorAll('.error');
    errorFields.forEach(field => {
      DOMUtils.removeClass(field, 'error');
    });
    
    // 移除錯誤訊息
    const errorMessages = form.querySelectorAll('.form-error');
    errorMessages.forEach(error => {
      DOMUtils.remove(error);
    });
  }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DOMUtils, EventUtils, AnimationUtils, FormUtils };
} else {
  window.DOMUtils = DOMUtils;
  window.EventUtils = EventUtils;
  window.AnimationUtils = AnimationUtils;
  window.FormUtils = FormUtils;
  
  // 提供簡化的全域別名
  window.$ = DOMUtils.$;
  window.$$ = DOMUtils.$$;
}