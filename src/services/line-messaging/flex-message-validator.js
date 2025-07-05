/**
 * LINE Flex Message 驗證器
 * 
 * 用於驗證 Flex Message 格式，防止 400 錯誤
 * 根據 LINE Messaging API 規範進行嚴格驗證
 */

class FlexMessageValidator {
  constructor() {
    // LINE API 限制常數
    this.limits = {
      // 文字長度限制
      maxTextLength: 160,
      maxHeaderTextLength: 60,
      maxButtonLabelLength: 20,
      maxAltTextLength: 400,
      
      // 顏色格式 (hex)
      colorPattern: /^#[0-9A-Fa-f]{6}$/,
      
      // URL 格式
      urlPattern: /^https?:\/\/.+/,
      
      // 支援的字型大小
      validSizes: ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', '3xl', '4xl', '5xl'],
      
      // 支援的權重
      validWeights: ['regular', 'bold'],
      
      // 支援的對齊方式
      validAligns: ['start', 'end', 'center'],
      
      // 支援的按鈕樣式
      validButtonStyles: ['link', 'primary', 'secondary'],
      
      // 最大嵌套深度
      maxNestingDepth: 5
    };
  }

  /**
   * 驗證完整的 Flex Message
   */
  validateFlexMessage(flexMessage) {
    const errors = [];
    
    try {
      // 檢查基本結構
      if (!flexMessage || typeof flexMessage !== 'object') {
        errors.push('Flex Message 必須是物件');
        return { isValid: false, errors };
      }

      // 檢查必要欄位
      if (!flexMessage.type) {
        errors.push('缺少 type 欄位');
      } else if (flexMessage.type !== 'bubble' && flexMessage.type !== 'carousel') {
        errors.push(`不支援的 type: ${flexMessage.type}`);
      }

      // 檢查 altText
      if (flexMessage.altText) {
        if (typeof flexMessage.altText !== 'string') {
          errors.push('altText 必須是字串');
        } else if (flexMessage.altText.length > this.limits.maxAltTextLength) {
          errors.push(`altText 長度超過限制 (${this.limits.maxAltTextLength} 字元)`);
        }
      }

      // 驗證 bubble 內容
      if (flexMessage.type === 'bubble') {
        this.validateBubbleContainer(flexMessage, errors);
      }

      // 檢查數值格式
      this.validateNumericValues(flexMessage, errors);

    } catch (error) {
      errors.push(`驗證過程發生錯誤: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * 驗證 Bubble 容器
   */
  validateBubbleContainer(bubble, errors, depth = 0) {
    if (depth > this.limits.maxNestingDepth) {
      errors.push('嵌套層級過深');
      return;
    }

    // 檢查各個區塊
    if (bubble.header) {
      this.validateBox(bubble.header, errors, depth + 1, 'header');
    }
    
    if (bubble.body) {
      this.validateBox(bubble.body, errors, depth + 1, 'body');
    }
    
    if (bubble.footer) {
      this.validateBox(bubble.footer, errors, depth + 1, 'footer');
    }

    // 檢查 size 欄位
    if (bubble.size && !['nano', 'micro', 'kilo', 'mega', 'giga'].includes(bubble.size)) {
      errors.push(`不支援的 bubble size: ${bubble.size}`);
    }
  }

  /**
   * 驗證 Box 元素
   */
  validateBox(box, errors, depth, section) {
    if (!box || typeof box !== 'object') {
      errors.push(`${section} 必須是物件`);
      return;
    }

    if (box.type !== 'box') {
      errors.push(`${section} type 必須是 'box'`);
      return;
    }

    // 檢查 layout
    if (!['vertical', 'horizontal', 'baseline'].includes(box.layout)) {
      errors.push(`${section} layout 必須是 vertical, horizontal 或 baseline`);
    }

    // 檢查顏色格式
    if (box.backgroundColor && !this.limits.colorPattern.test(box.backgroundColor)) {
      errors.push(`${section} backgroundColor 格式不正確: ${box.backgroundColor}`);
    }

    // 檢查內容
    if (box.contents && Array.isArray(box.contents)) {
      for (let i = 0; i < box.contents.length; i++) {
        this.validateComponent(box.contents[i], errors, depth + 1, `${section}.contents[${i}]`);
      }
    }
  }

  /**
   * 驗證組件
   */
  validateComponent(component, errors, depth, path) {
    if (!component || typeof component !== 'object') {
      errors.push(`${path} 必須是物件`);
      return;
    }

    switch (component.type) {
      case 'text':
        this.validateTextComponent(component, errors, path);
        break;
      case 'button':
        this.validateButtonComponent(component, errors, path);
        break;
      case 'box':
        this.validateBox(component, errors, depth, path);
        break;
      case 'separator':
        // separator 沒有特殊驗證需求
        break;
      default:
        errors.push(`${path} 不支援的組件類型: ${component.type}`);
    }

    // 檢查通用屬性
    this.validateCommonProperties(component, errors, path);
  }

  /**
   * 驗證文字組件
   */
  validateTextComponent(text, errors, path) {
    // 檢查文字內容
    if (!text.text) {
      errors.push(`${path} 缺少 text 內容`);
    } else if (typeof text.text !== 'string') {
      errors.push(`${path} text 必須是字串`);
    } else if (text.text.length > this.limits.maxTextLength) {
      errors.push(`${path} text 長度超過限制 (${this.limits.maxTextLength} 字元)`);
    }

    // 檢查大小
    if (text.size && !this.limits.validSizes.includes(text.size)) {
      errors.push(`${path} 不支援的 size: ${text.size}`);
    }

    // 檢查權重
    if (text.weight && !this.limits.validWeights.includes(text.weight)) {
      errors.push(`${path} 不支援的 weight: ${text.weight}`);
    }

    // 檢查對齊
    if (text.align && !this.limits.validAligns.includes(text.align)) {
      errors.push(`${path} 不支援的 align: ${text.align}`);
    }

    // 檢查顏色
    if (text.color && !this.limits.colorPattern.test(text.color)) {
      errors.push(`${path} color 格式不正確: ${text.color}`);
    }

    // 檢查 flex
    if (text.flex !== undefined) {
      if (typeof text.flex !== 'number' || text.flex < 0) {
        errors.push(`${path} flex 必須是非負數字`);
      }
    }
  }

  /**
   * 驗證按鈕組件
   */
  validateButtonComponent(button, errors, path) {
    // 檢查樣式
    if (button.style && !this.limits.validButtonStyles.includes(button.style)) {
      errors.push(`${path} 不支援的 style: ${button.style}`);
    }

    // 檢查高度
    if (button.height && !['sm', 'md'].includes(button.height)) {
      errors.push(`${path} 不支援的 height: ${button.height}`);
    }

    // 檢查動作
    if (!button.action) {
      errors.push(`${path} 缺少 action`);
    } else {
      this.validateAction(button.action, errors, `${path}.action`);
    }
  }

  /**
   * 驗證動作
   */
  validateAction(action, errors, path) {
    if (!action.type) {
      errors.push(`${path} 缺少 type`);
      return;
    }

    switch (action.type) {
      case 'uri':
        if (!action.uri) {
          errors.push(`${path} 缺少 uri`);
        } else if (!this.limits.urlPattern.test(action.uri)) {
          errors.push(`${path} uri 格式不正確: ${action.uri}`);
        }
        break;
      
      case 'postback':
        if (!action.data) {
          errors.push(`${path} 缺少 data`);
        } else if (typeof action.data !== 'string') {
          errors.push(`${path} data 必須是字串`);
        }
        break;
      
      case 'message':
        if (!action.text) {
          errors.push(`${path} 缺少 text`);
        }
        break;
      
      default:
        errors.push(`${path} 不支援的 action type: ${action.type}`);
    }

    // 檢查 label
    if (action.label) {
      if (typeof action.label !== 'string') {
        errors.push(`${path} label 必須是字串`);
      } else if (action.label.length > this.limits.maxButtonLabelLength) {
        errors.push(`${path} label 長度超過限制 (${this.limits.maxButtonLabelLength} 字元)`);
      }
    }
  }

  /**
   * 驗證通用屬性
   */
  validateCommonProperties(component, errors, path) {
    // 檢查 margin
    if (component.margin && !['none', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'].includes(component.margin)) {
      errors.push(`${path} 不支援的 margin: ${component.margin}`);
    }

    // 檢查 spacing
    if (component.spacing && !['none', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'].includes(component.spacing)) {
      errors.push(`${path} 不支援的 spacing: ${component.spacing}`);
    }

    // 檢查 paddingAll
    if (component.paddingAll && !['none', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'].includes(component.paddingAll)) {
      errors.push(`${path} 不支援的 paddingAll: ${component.paddingAll}`);
    }
  }

  /**
   * 驗證數值格式
   */
  validateNumericValues(obj, errors, path = '') {
    if (typeof obj !== 'object' || obj === null) return;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        this.validateNumericValues(value, errors, currentPath);
      } else if (typeof value === 'string') {
        // 檢查是否包含數值，但格式錯誤
        if (value.includes('$') && value.includes('NaN')) {
          errors.push(`${currentPath} 包含無效的數值格式: ${value}`);
        }
        if (value.includes('undefined') || value.includes('null')) {
          errors.push(`${currentPath} 包含未定義的值: ${value}`);
        }
      }
    }
  }

  /**
   * 自動修復常見錯誤
   */
  autoFixFlexMessage(flexMessage) {
    const fixed = JSON.parse(JSON.stringify(flexMessage)); // 深拷貝
    
    // 修復數值格式問題
    this.fixNumericValues(fixed);
    
    // 修復顏色格式
    this.fixColorValues(fixed);
    
    // 修復文字長度
    this.fixTextLength(fixed);
    
    return fixed;
  }

  /**
   * 修復數值格式
   */
  fixNumericValues(obj) {
    if (typeof obj !== 'object' || obj === null) return;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        this.fixNumericValues(value);
      } else if (typeof value === 'string') {
        // 修復包含 NaN 或 undefined 的字串
        if (value.includes('NaN') || value.includes('undefined') || value.includes('null')) {
          obj[key] = value.replace(/\$?NaN|undefined|null/g, '0.00');
        }
        
        // 修復不正確的數值格式
        const priceMatch = value.match(/\$(\d+(?:\.\d+)?)/);
        if (priceMatch) {
          const num = parseFloat(priceMatch[1]);
          if (!isNaN(num)) {
            obj[key] = value.replace(/\$\d+(?:\.\d+)?/, `$${num.toFixed(8)}`);
          }
        }
      }
    }
  }

  /**
   * 修復顏色格式
   */
  fixColorValues(obj) {
    if (typeof obj !== 'object' || obj === null) return;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        this.fixColorValues(value);
      } else if (typeof value === 'string' && key.toLowerCase().includes('color')) {
        // 確保顏色格式正確
        if (value && !this.limits.colorPattern.test(value)) {
          // 嘗試修復常見格式錯誤
          if (value.startsWith('#') && value.length === 4) {
            // 將 #RGB 擴展為 #RRGGBB
            obj[key] = `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
          } else if (!value.startsWith('#')) {
            // 處理常見的顏色名稱
            const colorMap = {
              'red': '#FF0000',
              'green': '#008000',
              'blue': '#0000FF',
              'black': '#000000',
              'white': '#FFFFFF',
              'gray': '#808080',
              'grey': '#808080'
            };
            
            if (colorMap[value.toLowerCase()]) {
              obj[key] = colorMap[value.toLowerCase()];
            } else if (/^[0-9A-Fa-f]{6}$/.test(value)) {
              // 添加 # 前綴
              obj[key] = `#${value}`;
            } else {
              // 預設顏色
              obj[key] = '#333333';
            }
          }
        }
      }
    }
  }

  /**
   * 修復文字長度
   */
  fixTextLength(obj) {
    if (typeof obj !== 'object' || obj === null) return;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        this.fixTextLength(value);
      } else if (key === 'text' && typeof value === 'string') {
        if (value.length > this.limits.maxTextLength) {
          obj[key] = value.substring(0, this.limits.maxTextLength - 3) + '...';
        }
      } else if (key === 'altText' && typeof value === 'string') {
        if (value.length > this.limits.maxAltTextLength) {
          obj[key] = value.substring(0, this.limits.maxAltTextLength - 3) + '...';
        }
      }
    }
  }
}

module.exports = new FlexMessageValidator();