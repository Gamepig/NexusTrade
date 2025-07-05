/**
 * LINE 訊息模板服務
 * 
 * 功能：
 * 1. 統一管理所有 LINE 訊息模板
 * 2. 價格警報、市場更新、系統通知模板
 * 3. Rich Menu 和 Flex Message 設計
 * 4. 響應式和多語言支援
 */

const logger = require('../utils/logger');
const flexMessageValidator = require('./line-messaging/flex-message-validator');

class LineMessageTemplatesService {
  constructor() {
    this.templates = {
      text: {
        welcome: this.createWelcomeText,
        help: this.createHelpText,
        error: this.createErrorText,
        priceAlert: this.createPriceAlertText
      },
      flex: {
        priceAlert: this.createPriceAlertFlex,
        marketSummary: this.createMarketSummaryFlex,
        welcome: this.createWelcomeFlex,
        cryptoPrice: this.createCryptoPriceFlex,
        aiAnalysis: this.createAIAnalysisFlex
      },
      quickReply: {
        mainMenu: this.createMainMenuQuickReply,
        cryptoSelect: this.createCryptoSelectQuickReply
      }
    };
  }

  // ================== 文字訊息模板 ==================

  /**
   * 建立歡迎文字訊息
   */
  createWelcomeText(userData = {}) {
    const { username = '朋友' } = userData;
    
    return `🎉 歡迎加入 NexusTrade，${username}！

我是您的專屬加密貨幣助手，可以幫您：

📊 即時價格查詢
🚨 價格警報通知  
📈 市場趨勢分析
⚙️ 個人化設定

發送 "幫助" 查看完整功能清單
或造訪 https://nexustrade.com 開始使用！`;
  }

  /**
   * 建立幫助文字訊息
   */
  createHelpText() {
    return `🤖 NexusTrade 指令說明

📊 價格查詢：
• "價格" - 查看熱門加密貨幣
• "BTC"、"ETH" - 查看特定幣種價格
• "市場" - 市場整體概況

🚨 警報功能：
• "警報" - 價格警報設定說明
• "通知" - 管理通知設定

⚙️ 其他功能：
• "狀態" - 查看系統狀態
• "設定" - 個人偏好設定
• "幫助" - 顯示此說明

🌐 完整功能請造訪：
https://nexustrade.com

有任何問題都可以隨時問我！😊`;
  }

  /**
   * 建立錯誤文字訊息
   */
  createErrorText(errorInfo = {}) {
    const { type = 'general', details = '' } = errorInfo;
    
    const errorMessages = {
      general: '抱歉，處理您的請求時發生錯誤。',
      network: '網路連線發生問題，請稍後再試。',
      api: 'API 服務暫時無法使用，請稍後再試。',
      validation: '輸入的資料格式不正確，請檢查後重試。'
    };

    const baseMessage = errorMessages[type] || errorMessages.general;
    const detailsText = details ? `\n\n錯誤詳情：${details}` : '';
    
    return `❌ ${baseMessage}${detailsText}\n\n如需協助，請發送 "幫助" 或聯繫客服。`;
  }

  /**
   * 建立價格警報文字訊息
   */
  createPriceAlertText(alertData) {
    const { symbol, currentPrice, targetPrice, alertType, changePercent } = alertData;
    
    const emoji = alertType === 'above' ? '📈' : '📉';
    const direction = alertType === 'above' ? '突破上漲' : '跌破下跌';
    const changeText = changePercent > 0 ? `+${changePercent.toFixed(2)}%` : `${changePercent.toFixed(2)}%`;
    
    return `🚨 ${symbol} 價格警報

${emoji} ${direction}！

💰 當前價格：$${currentPrice}
🎯 目標價格：$${targetPrice}
📊 變化幅度：${changeText}

⏰ ${new Date().toLocaleString('zh-TW')}

查看詳細分析：
https://nexustrade.com/currency/${symbol.toLowerCase()}`;
  }

  // ================== Flex Message 模板 ==================

  /**
   * 建立價格警報 Flex Message - 已修復 400 錯誤問題
   */
  createPriceAlertFlex(alertData) {
    const {
      symbol,
      currentPrice,
      targetPrice,
      changePercent = 0,
      alertType,
      timestamp = new Date()
    } = alertData;

    // 修復 alertType 判斷邏輯 - 支援 price_above/price_below 格式
    const isAbove = alertType === 'above' || alertType === 'price_above';
    const statusColor = isAbove ? '#00C851' : '#FF4444';
    const statusText = isAbove ? '突破上漲' : '跌破下跌';
    const arrow = isAbove ? '📈' : '📉';
    const changeText = changePercent > 0 ? `+${changePercent.toFixed(2)}%` : `${changePercent.toFixed(2)}%`;
    
    // 確保數值格式正確
    const safeCurrentPrice = Number(currentPrice) || 0;
    const safeTargetPrice = Number(targetPrice) || 0;

    return {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🚨 價格警報通知',
            weight: 'bold',
            color: '#FFFFFF',
            size: 'md',
            align: 'center'
          }
        ],
        backgroundColor: '#FF6B35',
        paddingAll: 'lg',
        paddingTop: 'lg',
        paddingBottom: 'lg'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: symbol,
            weight: 'bold',
            size: 'xxl',
            color: '#1F1F1F',
            align: 'center',
            margin: 'md'
          },
          {
            type: 'text',
            text: `${arrow} ${statusText}`,
            size: 'lg',
            color: statusColor,
            align: 'center',
            weight: 'bold',
            margin: 'md'
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'md',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '當前價格',
                    color: '#999999',
                    size: 'sm',
                    flex: 3
                  },
                  {
                    type: 'text',
                    text: `$${safeCurrentPrice.toFixed(8)}`,
                    wrap: true,
                    color: '#333333',
                    size: 'sm',
                    flex: 4,
                    weight: 'bold',
                    align: 'end'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '目標價格',
                    color: '#999999',
                    size: 'sm',
                    flex: 3
                  },
                  {
                    type: 'text',
                    text: `$${safeTargetPrice.toFixed(8)}`,
                    wrap: true,
                    color: '#333333',
                    size: 'sm',
                    flex: 4,
                    weight: 'bold',
                    align: 'end'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '變化幅度',
                    color: '#999999',
                    size: 'sm',
                    flex: 3
                  },
                  {
                    type: 'text',
                    text: changeText,
                    wrap: true,
                    color: statusColor,
                    size: 'sm',
                    flex: 4,
                    weight: 'bold',
                    align: 'end'
                  }
                ]
              }
            ]
          },
          {
            type: 'text',
            text: `⏰ ${timestamp.toLocaleString('zh-TW')}`,
            color: '#999999',
            size: 'xs',
            align: 'center',
            margin: 'lg'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '查看詳細分析',
              uri: `https://nexustrade.com/currency/${symbol.toLowerCase()}`
            },
            color: '#1DB446'
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '管理警報',
              data: `type=manage_alerts&symbol=${encodeURIComponent(symbol)}`
            }
          }
        ]
      }
    };
  }

  /**
   * 建立市場摘要 Flex Message
   */
  createMarketSummaryFlex(marketData) {
    const {
      trending = [],
      marketSentiment = {},
      totalVolume = 0,
      timestamp = new Date()
    } = marketData;

    // 取前 5 個熱門幣種
    const topCoins = trending.slice(0, 5);

    const coinItems = topCoins.map(coin => ({
      type: 'box',
      layout: 'baseline',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: coin.symbol,
          color: '#333333',
          size: 'sm',
          flex: 2,
          weight: 'bold'
        },
        {
          type: 'text',
          text: `$${coin.price}`,
          wrap: true,
          color: '#666666',
          size: 'sm',
          flex: 3,
          align: 'center'
        },
        {
          type: 'text',
          text: `${coin.change > 0 ? '+' : ''}${coin.change.toFixed(2)}%`,
          wrap: true,
          color: coin.change > 0 ? '#00C851' : '#FF4444',
          size: 'sm',
          flex: 2,
          weight: 'bold',
          align: 'end'
        }
      ]
    }));

    return {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📊 市場即時摘要',
            weight: 'bold',
            color: '#FFFFFF',
            size: 'md',
            align: 'center'
          }
        ],
        backgroundColor: '#1DB446',
        paddingAll: 'lg'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '熱門加密貨幣',
            weight: 'bold',
            size: 'lg',
            color: '#333333',
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'baseline',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '幣種',
                color: '#999999',
                size: 'xs',
                flex: 2,
                weight: 'bold'
              },
              {
                type: 'text',
                text: '價格',
                color: '#999999',
                size: 'xs',
                flex: 3,
                align: 'center',
                weight: 'bold'
              },
              {
                type: 'text',
                text: '24h變化',
                color: '#999999',
                size: 'xs',
                flex: 2,
                align: 'end',
                weight: 'bold'
              }
            ]
          },
          {
            type: 'separator',
            margin: 'sm'
          },
          ...coinItems,
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            contents: [
              {
                type: 'text',
                text: '市場情緒',
                weight: 'bold',
                color: '#333333',
                size: 'md'
              },
              {
                type: 'text',
                text: marketSentiment.summary || '市場保持穩定，交投活躍',
                wrap: true,
                color: '#666666',
                size: 'sm',
                margin: 'sm'
              }
            ]
          },
          {
            type: 'text',
            text: `⏰ ${timestamp.toLocaleString('zh-TW')}`,
            color: '#999999',
            size: 'xs',
            align: 'center',
            margin: 'lg'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '查看完整市場',
              uri: 'https://nexustrade.com/market'
            }
          }
        ]
      }
    };
  }

  /**
   * 建立歡迎 Flex Message
   */
  createWelcomeFlex(userData = {}) {
    const { username = '新朋友', profilePicture } = userData;

    return {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🎉 歡迎加入 NexusTrade',
            weight: 'bold',
            color: '#FFFFFF',
            size: 'lg',
            align: 'center'
          }
        ],
        backgroundColor: '#FF6B35',
        paddingAll: 'lg'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `哈囉 ${username}！`,
            weight: 'bold',
            size: 'xl',
            color: '#333333',
            align: 'center',
            margin: 'lg'
          },
          {
            type: 'text',
            text: '感謝您選擇 NexusTrade 作為您的加密貨幣追蹤平台',
            wrap: true,
            color: '#666666',
            size: 'md',
            align: 'center',
            margin: 'lg'
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'text',
            text: '🚀 您現在可以：',
            weight: 'bold',
            color: '#333333',
            margin: 'lg'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '📊 追蹤即時加密貨幣價格',
                color: '#666666',
                size: 'sm'
              },
              {
                type: 'text',
                text: '🚨 設定個人化價格警報',
                color: '#666666',
                size: 'sm'
              },
              {
                type: 'text',
                text: '📈 接收 AI 市場分析',
                color: '#666666',
                size: 'sm'
              },
              {
                type: 'text',
                text: '💼 管理投資組合',
                color: '#666666',
                size: 'sm'
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '開始使用',
              uri: 'https://nexustrade.com/dashboard'
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '功能說明',
              data: JSON.stringify({ type: 'help' })
            }
          }
        ]
      }
    };
  }

  /**
   * 建立加密貨幣價格 Flex Message
   */
  createCryptoPriceFlex(cryptoData = {}) {
    const {
      symbol = 'UNKNOWN',
      name = '未知貨幣',
      price = 0,
      priceChangePercent = 0,
      high24h = 0,
      low24h = 0,
      volume24h = 0
    } = cryptoData;

    // 確保數值格式正確
    const safePrice = Number(price) || 0;
    const safePriceChangePercent = Number(priceChangePercent) || 0;
    const safeHigh24h = Number(high24h) || 0;
    const safeLow24h = Number(low24h) || 0;
    const safeVolume24h = Number(volume24h) || 0;

    const isPositive = safePriceChangePercent > 0;
    const changeColor = isPositive ? '#00C851' : '#FF4444';
    const changeEmoji = isPositive ? '📈' : '📉';

    return {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: symbol,
                weight: 'bold',
                size: 'xl',
                color: '#333333',
                flex: 3
              },
              {
                type: 'text',
                text: `${changeEmoji} ${safePriceChangePercent > 0 ? '+' : ''}${safePriceChangePercent.toFixed(2)}%`,
                size: 'md',
                color: changeColor,
                align: 'end',
                weight: 'bold',
                flex: 2
              }
            ]
          },
          {
            type: 'text',
            text: name,
            color: '#999999',
            size: 'sm',
            margin: 'xs'
          },
          {
            type: 'text',
            text: `$${safePrice.toFixed(8)}`,
            weight: 'bold',
            size: 'xxl',
            color: '#333333',
            margin: 'lg'
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '24h 最高',
                    color: '#999999',
                    size: 'sm',
                    flex: 2
                  },
                  {
                    type: 'text',
                    text: `$${safeHigh24h.toFixed(8)}`,
                    wrap: true,
                    color: '#333333',
                    size: 'sm',
                    flex: 3,
                    align: 'end'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '24h 最低',
                    color: '#999999',
                    size: 'sm',
                    flex: 2
                  },
                  {
                    type: 'text',
                    text: `$${safeLow24h.toFixed(8)}`,
                    wrap: true,
                    color: '#333333',
                    size: 'sm',
                    flex: 3,
                    align: 'end'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '24h 成交量',
                    color: '#999999',
                    size: 'sm',
                    flex: 2
                  },
                  {
                    type: 'text',
                    text: this.formatVolume(safeVolume24h),
                    wrap: true,
                    color: '#333333',
                    size: 'sm',
                    flex: 3,
                    align: 'end'
                  }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '詳細圖表',
              uri: `https://nexustrade.com/currency/${symbol.toLowerCase()}`
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '設定警報',
              data: JSON.stringify({ type: 'set_alert', symbol })
            }
          }
        ]
      }
    };
  }

  /**
   * 建立 AI 分析 Flex Message - 已修復數值問題
   */
  createAIAnalysisFlex(analysisData = {}) {
    const {
      trend = 'neutral',
      confidence = 50,
      summary = '市場分析正在進行中...',
      technicalAnalysis = {},
      recommendation = '請謹慎評估風險'
    } = analysisData;

    // 確保數值格式正確
    const safeTrend = String(trend).toLowerCase();
    const safeConfidence = Number(confidence) || 50;
    const safeSummary = String(summary || '市場分析正在進行中...');
    const safeRecommendation = String(recommendation || '請謹慎評估風險');

    const trendColor = {
      bullish: '#00C851',
      bearish: '#FF4444',
      neutral: '#FFB300'
    }[safeTrend] || '#999999';

    const trendEmoji = {
      bullish: '📈',
      bearish: '📉',
      neutral: '➡️'
    }[safeTrend] || '❓';

    return {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🤖 AI 市場分析',
            weight: 'bold',
            color: '#FFFFFF',
            size: 'md',
            align: 'center'
          }
        ],
        backgroundColor: '#6C5CE7',
        paddingAll: 'lg'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '市場趨勢',
                color: '#999999',
                size: 'sm',
                flex: 2
              },
              {
                type: 'text',
                text: `${trendEmoji} ${safeTrend.toUpperCase()}`,
                color: trendColor,
                size: 'sm',
                weight: 'bold',
                flex: 3,
                align: 'end'
              }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            contents: [
              {
                type: 'text',
                text: '信心指數',
                color: '#999999',
                size: 'sm',
                flex: 2
              },
              {
                type: 'text',
                text: `${safeConfidence.toFixed(0)}%`,
                color: '#333333',
                size: 'sm',
                weight: 'bold',
                flex: 3,
                align: 'end'
              }
            ]
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'text',
            text: 'AI 分析摘要',
            weight: 'bold',
            color: '#333333',
            size: 'md',
            margin: 'lg'
          },
          {
            type: 'text',
            text: safeSummary.substring(0, 160),
            wrap: true,
            color: '#666666',
            size: 'sm',
            margin: 'sm'
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'text',
            text: '投資建議',
            weight: 'bold',
            color: '#333333',
            size: 'md',
            margin: 'lg'
          },
          {
            type: 'text',
            text: safeRecommendation.substring(0, 160),
            wrap: true,
            color: '#666666',
            size: 'sm',
            margin: 'sm'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '完整分析報告',
              uri: 'https://nexustrade.com/ai-insights'
            }
          }
        ]
      }
    };
  }

  // ================== Quick Reply 模板 ==================

  /**
   * 建立主選單 Quick Reply
   */
  createMainMenuQuickReply() {
    return [
      {
        type: 'action',
        action: {
          type: 'message',
          label: '💰 價格查詢',
          text: '價格'
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '📊 市場摘要',
          text: '市場'
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '🚨 警報設定',
          text: '警報'
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '⚙️ 設定',
          text: '設定'
        }
      }
    ];
  }

  /**
   * 建立加密貨幣選擇 Quick Reply
   */
  createCryptoSelectQuickReply() {
    const popularCryptos = [
      { symbol: 'BTC', name: 'Bitcoin' },
      { symbol: 'ETH', name: 'Ethereum' },
      { symbol: 'BNB', name: 'BNB' },
      { symbol: 'XRP', name: 'XRP' },
      { symbol: 'ADA', name: 'Cardano' },
      { symbol: 'SOL', name: 'Solana' }
    ];

    return popularCryptos.map(crypto => ({
      type: 'action',
      action: {
        type: 'message',
        label: `${crypto.symbol}`,
        text: crypto.symbol
      }
    }));
  }

  // ================== Rich Menu 模板 ==================

  /**
   * 建立主要 Rich Menu 設定
   */
  createMainRichMenu() {
    return {
      size: {
        width: 2500,
        height: 1686
      },
      selected: false,
      name: 'NexusTrade 主選單',
      chatBarText: 'NexusTrade 功能選單',
      areas: [
        {
          bounds: {
            x: 0,
            y: 0,
            width: 833,
            height: 843
          },
          action: {
            type: 'postback',
            data: JSON.stringify({ type: 'price_check' })
          }
        },
        {
          bounds: {
            x: 833,
            y: 0,
            width: 834,
            height: 843
          },
          action: {
            type: 'postback',
            data: JSON.stringify({ type: 'market_summary' })
          }
        },
        {
          bounds: {
            x: 1667,
            y: 0,
            width: 833,
            height: 843
          },
          action: {
            type: 'uri',
            uri: 'https://nexustrade.com/alerts'
          }
        },
        {
          bounds: {
            x: 0,
            y: 843,
            width: 833,
            height: 843
          },
          action: {
            type: 'uri',
            uri: 'https://nexustrade.com/ai-insights'
          }
        },
        {
          bounds: {
            x: 833,
            y: 843,
            width: 834,
            height: 843
          },
          action: {
            type: 'postback',
            data: JSON.stringify({ type: 'settings' })
          }
        },
        {
          bounds: {
            x: 1667,
            y: 843,
            width: 833,
            height: 843
          },
          action: {
            type: 'postback',
            data: JSON.stringify({ type: 'help' })
          }
        }
      ]
    };
  }

  // ================== 輔助方法 ==================

  /**
   * 格式化成交量
   */
  formatVolume(volume) {
    if (volume >= 1000000000) {
      return `${(volume / 1000000000).toFixed(2)}B`;
    } else if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)}K`;
    }
    return volume.toFixed(2);
  }

  /**
   * 取得模板 - 已增加驗證
   */
  getTemplate(category, templateName) {
    const template = this.templates[category]?.[templateName];
    
    // 如果是 Flex Message 模板，進行驗證
    if (category === 'flex' && template) {
      return (...args) => {
        const result = template.apply(this, args);
        
        // 驗證和修復 Flex Message
        const validation = flexMessageValidator.validateFlexMessage(result);
        if (!validation.isValid) {
          logger.warn(`Flex 模板 ${templateName} 格式有誤，自動修復:`, validation.errors);
          return flexMessageValidator.autoFixFlexMessage(result);
        }
        
        return result;
      };
    }
    
    return template;
  }

  /**
   * 檢查模板是否存在
   */
  hasTemplate(category, templateName) {
    return !!(this.templates[category]?.[templateName]);
  }
  
  /**
   * 驗證 Flex Message 模板
   */
  validateFlexTemplate(templateName, ...args) {
    const template = this.templates.flex?.[templateName];
    if (!template) {
      return { isValid: false, errors: [`模板 ${templateName} 不存在`] };
    }
    
    try {
      const result = template.apply(this, args);
      return flexMessageValidator.validateFlexMessage(result);
    } catch (error) {
      return { isValid: false, errors: [`模板執行錯誤: ${error.message}`] };
    }
  }

  /**
   * 列出所有可用模板
   */
  listTemplates() {
    const templates = {};
    for (const [category, categoryTemplates] of Object.entries(this.templates)) {
      templates[category] = Object.keys(categoryTemplates);
    }
    return templates;
  }
  
  /**
   * 測試所有 Flex 模板
   */
  testAllFlexTemplates() {
    const results = {};
    const testData = {
      // 價格警報測試數據
      priceAlert: {
        symbol: 'BTCUSDT',
        currentPrice: 50000.12345678,
        targetPrice: 45000.00000000,
        changePercent: -5.67,
        alertType: 'price_below',
        timestamp: new Date()
      },
      // 市場摘要測試數據
      marketSummary: {
        trending: [
          { symbol: 'BTC', price: '50000.123', change: 2.5 },
          { symbol: 'ETH', price: '3000.456', change: -1.2 }
        ],
        marketSentiment: { summary: '市場穩定' },
        timestamp: new Date()
      },
      // 歡迎測試數據
      welcome: {
        username: '測試使用者'
      }
    };
    
    for (const [templateName, template] of Object.entries(this.templates.flex)) {
      try {
        const testInput = testData[templateName] || {};
        const result = template.call(this, testInput);
        const validation = flexMessageValidator.validateFlexMessage(result);
        
        results[templateName] = {
          isValid: validation.isValid,
          errors: validation.errors,
          hasAutoFix: !validation.isValid
        };
        
        if (!validation.isValid) {
          const fixed = flexMessageValidator.autoFixFlexMessage(result);
          const revalidation = flexMessageValidator.validateFlexMessage(fixed);
          results[templateName].fixSuccessful = revalidation.isValid;
        }
      } catch (error) {
        results[templateName] = {
          isValid: false,
          errors: [`模板執行錯誤: ${error.message}`],
          hasAutoFix: false,
          fixSuccessful: false
        };
      }
    }
    
    return results;
  }
}

// 導出單例
const lineMessageTemplatesService = new LineMessageTemplatesService();

// 啟動時測試所有模板
if (process.env.NODE_ENV !== 'production') {
  setTimeout(() => {
    const testResults = lineMessageTemplatesService.testAllFlexTemplates();
    const failedTemplates = Object.entries(testResults)
      .filter(([, result]) => !result.isValid || !result.fixSuccessful)
      .map(([name]) => name);
    
    if (failedTemplates.length > 0) {
      console.warn('⚠️  以下 Flex 模板需要檢查:', failedTemplates);
    } else {
      console.log('✅ 所有 Flex 模板驗證通過');
    }
  }, 1000);
}

module.exports = lineMessageTemplatesService;