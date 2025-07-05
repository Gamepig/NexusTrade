/**
 * LINE Messaging 文字訊息模板
 * 
 * 提供各種常用的文字訊息模板
 * 支援參數化生成訊息內容
 * 
 * @author NexusTrade 開發團隊
 * @version 1.0.0
 */

class TextMessageTemplates {
  constructor() {
    // 模板快取
    this.templateCache = new Map();
    
    // 常用表情符號
    this.emojis = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      loading: '⏳',
      money: '💰',
      chart: '📊',
      bell: '🔔',
      fire: '🔥',
      rocket: '🚀',
      crystal: '💎',
      eyes: '👀',
      hand: '👋',
      heart: '❤️',
      thumbsUp: '👍'
    };
  }

  /**
   * 歡迎訊息
   * @param {Object} data - 使用者數據
   * @returns {string} 歡迎訊息
   */
  welcome(data = {}) {
    const { username = '朋友', platform = 'NexusTrade' } = data;
    
    return `${this.emojis.hand} 歡迎加入 ${platform}！

哈囉 ${username}，感謝您使用我們的服務。

您現在可以：
${this.emojis.chart} 追蹤加密貨幣價格
${this.emojis.bell} 設定價格警報
${this.emojis.fire} 接收市場熱點
${this.emojis.crystal} 獲得 AI 分析建議

輸入「幫助」了解更多功能！`;
  }

  /**
   * 幫助訊息
   * @param {Object} data - 功能列表
   * @returns {string} 幫助訊息
   */
  help(data = {}) {
    const commands = data.commands || [
      '價格 [幣種] - 查詢價格',
      '警報 - 設定價格警報',
      '市場 - 市場概況',
      '分析 [幣種] - AI 分析',
      '設定 - 個人設定'
    ];

    return `${this.emojis.info} NexusTrade 功能說明

可用指令：
${commands.map(cmd => `• ${cmd}`).join('\n')}

範例：
• 價格 BTC
• 分析 ETH
• 市場

需要協助請輸入「客服」聯繫我們 ${this.emojis.heart}`;
  }

  /**
   * 價格警報通知
   * @param {Object} data - 警報數據
   * @returns {string} 價格警報訊息
   */
  priceAlert(data = {}) {
    const {
      symbol = 'BTC',
      currentPrice = '0',
      targetPrice = '0',
      alertType = 'above',
      changePercent = 0,
      timestamp = new Date().toLocaleString('zh-TW')
    } = data;

    const direction = alertType === 'above' ? '突破' : '跌破';
    const emoji = alertType === 'above' ? this.emojis.rocket : '📉';
    const changeEmoji = changePercent > 0 ? '📈' : '📉';

    return `${emoji} ${symbol} 價格警報！

${symbol} 已${direction} $${targetPrice}

當前價格：$${currentPrice}
變動幅度：${changeEmoji} ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%

時間：${timestamp}

點擊查看詳細分析 ${this.emojis.eyes}`;
  }

  /**
   * 市場更新通知
   * @param {Object} data - 市場數據
   * @returns {string} 市場更新訊息
   */
  marketUpdate(data = {}) {
    const {
      trending = [],
      summary = '市場保持穩定',
      timestamp = new Date().toLocaleString('zh-TW')
    } = data;

    let message = `${this.emojis.chart} 市場更新\n\n`;

    if (trending.length > 0) {
      message += '熱門加密貨幣：\n';
      trending.slice(0, 5).forEach(coin => {
        const changeEmoji = coin.change > 0 ? '📈' : '📉';
        message += `${changeEmoji} ${coin.symbol}: $${coin.price} (${coin.change > 0 ? '+' : ''}${coin.change.toFixed(2)}%)\n`;
      });
      message += '\n';
    }

    message += `市場摘要：${summary}\n\n`;
    message += `更新時間：${timestamp}`;

    return message;
  }

  /**
   * AI 分析結果
   * @param {Object} data - 分析數據
   * @returns {string} AI 分析訊息
   */
  aiAnalysis(data = {}) {
    const {
      symbol = 'BTC',
      sentiment = '中性',
      recommendation = '持有',
      confidence = 75,
      keyPoints = [],
      timestamp = new Date().toLocaleString('zh-TW')
    } = data;

    const sentimentEmoji = {
      '看漲': '🟢',
      '看跌': '🔴',
      '中性': '🟡',
      'bullish': '🟢',
      'bearish': '🔴',
      'neutral': '🟡'
    }[sentiment] || '🟡';

    let message = `${this.emojis.crystal} ${symbol} AI 分析報告\n\n`;
    message += `市場情緒：${sentimentEmoji} ${sentiment}\n`;
    message += `建議操作：${recommendation}\n`;
    message += `信心指數：${confidence}%\n\n`;

    if (keyPoints.length > 0) {
      message += '關鍵要點：\n';
      keyPoints.slice(0, 3).forEach((point, index) => {
        message += `${index + 1}. ${point}\n`;
      });
      message += '\n';
    }

    message += `分析時間：${timestamp}`;

    return message;
  }

  /**
   * 錯誤訊息
   * @param {Object} data - 錯誤資訊
   * @returns {string} 錯誤訊息
   */
  error(data = {}) {
    const {
      type = 'general',
      message = '發生未知錯誤',
      suggestion = '請稍後再試或聯繫客服'
    } = data;

    const errorEmojis = {
      network: '🌐',
      validation: this.emojis.warning,
      permission: '🔒',
      limit: this.emojis.loading,
      general: this.emojis.error
    };

    const emoji = errorEmojis[type] || this.emojis.error;

    return `${emoji} 操作失敗

錯誤訊息：${message}

建議：${suggestion}

如需協助請輸入「客服」`;
  }

  /**
   * 成功訊息
   * @param {Object} data - 成功資訊
   * @returns {string} 成功訊息
   */
  success(data = {}) {
    const {
      action = '操作',
      details = '',
      nextSteps = ''
    } = data;

    let message = `${this.emojis.success} ${action}成功！\n`;

    if (details) {
      message += `\n${details}\n`;
    }

    if (nextSteps) {
      message += `\n下一步：${nextSteps}`;
    }

    return message;
  }

  /**
   * 系統通知
   * @param {Object} data - 通知數據
   * @returns {string} 系統通知訊息
   */
  systemNotification(data = {}) {
    const {
      title = '系統通知',
      message = '',
      level = 'info',
      timestamp = new Date().toLocaleString('zh-TW')
    } = data;

    const levelEmojis = {
      info: this.emojis.info,
      warning: this.emojis.warning,
      error: this.emojis.error,
      success: this.emojis.success
    };

    const emoji = levelEmojis[level] || this.emojis.info;

    return `${emoji} ${title}

${message}

時間：${timestamp}`;
  }

  /**
   * 價格查詢結果
   * @param {Object} data - 價格數據
   * @returns {string} 價格查詢訊息
   */
  priceQuery(data = {}) {
    const {
      symbol = 'BTC',
      price = '0',
      change24h = 0,
      volume = '0',
      marketCap = '0',
      timestamp = new Date().toLocaleString('zh-TW')
    } = data;

    const changeEmoji = change24h > 0 ? '📈' : '📉';
    const changeColor = change24h > 0 ? this.emojis.thumbsUp : '📉';

    return `${this.emojis.money} ${symbol} 價格資訊

當前價格：$${price}
24小時變動：${changeEmoji} ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%

成交量：$${volume}
市值：$${marketCap}

更新時間：${timestamp}

輸入「分析 ${symbol}」獲得 AI 分析 ${this.emojis.crystal}`;
  }

  /**
   * 訂閱確認
   * @param {Object} data - 訂閱資訊
   * @returns {string} 訂閱確認訊息
   */
  subscriptionConfirm(data = {}) {
    const {
      type = '價格警報',
      symbol = '',
      condition = '',
      status = 'active'
    } = data;

    const statusEmoji = status === 'active' ? this.emojis.success : this.emojis.warning;

    return `${statusEmoji} ${type}訂閱設定

幣種：${symbol}
條件：${condition}
狀態：${status === 'active' ? '啟用' : '停用'}

您將在觸發條件時收到通知 ${this.emojis.bell}

管理訂閱請輸入「設定」`;
  }

  /**
   * 取得所有可用模板
   * @returns {Object} 模板列表
   */
  getAvailableTemplates() {
    return {
      welcome: { description: '歡迎新使用者訊息' },
      help: { description: '功能說明和指令列表' },
      priceAlert: { description: '價格警報通知' },
      marketUpdate: { description: '市場更新摘要' },
      aiAnalysis: { description: 'AI 分析結果報告' },
      error: { description: '錯誤訊息通知' },
      success: { description: '操作成功確認' },
      systemNotification: { description: '系統通知訊息' },
      priceQuery: { description: '價格查詢結果' },
      subscriptionConfirm: { description: '訂閱設定確認' }
    };
  }

  /**
   * 清除模板快取
   */
  clearCache() {
    this.templateCache.clear();
    console.log('[文字模板] 快取已清除');
  }
}

// 建立單例並匯出所有模板方法
const textTemplates = new TextMessageTemplates();

module.exports = {
  welcome: textTemplates.welcome.bind(textTemplates),
  help: textTemplates.help.bind(textTemplates),
  priceAlert: textTemplates.priceAlert.bind(textTemplates),
  marketUpdate: textTemplates.marketUpdate.bind(textTemplates),
  aiAnalysis: textTemplates.aiAnalysis.bind(textTemplates),
  error: textTemplates.error.bind(textTemplates),
  success: textTemplates.success.bind(textTemplates),
  systemNotification: textTemplates.systemNotification.bind(textTemplates),
  priceQuery: textTemplates.priceQuery.bind(textTemplates),
  subscriptionConfirm: textTemplates.subscriptionConfirm.bind(textTemplates),
  getAvailableTemplates: textTemplates.getAvailableTemplates.bind(textTemplates),
  clearCache: textTemplates.clearCache.bind(textTemplates)
};