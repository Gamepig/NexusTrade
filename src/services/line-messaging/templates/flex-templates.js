/**
 * LINE Messaging Flex Message 模板
 * 
 * 提供各種豐富的 Flex Message 模板
 * 支援互動式按鈕和視覺化內容
 * 
 * @author NexusTrade 開發團隊
 * @version 1.0.0
 */

class FlexMessageTemplates {
  constructor() {
    // 品牌色彩
    this.colors = {
      primary: '#1DB446',
      secondary: '#00C853',
      accent: '#FF6B35',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      info: '#2196F3',
      text: '#333333',
      textSecondary: '#666666',
      textMuted: '#999999',
      background: '#FAFAFA',
      white: '#FFFFFF'
    };
    
    // 基礎網站 URL
    this.baseUrl = process.env.WEBSITE_URL || 'https://nexustrade.com';
  }

  /**
   * 價格警報 Flex Message
   * @param {Object} data - 警報數據
   * @returns {Object} Flex Message 物件
   */
  priceAlert(data = {}) {
    const {
      symbol = 'BTCUSDT',
      currentPrice = '0',
      targetPrice = '0',
      alertType = 'above',
      changePercent = 0,
      timestamp = new Date().toLocaleString('zh-TW')
    } = data;

    const direction = alertType === 'above' ? '突破' : '跌破';
    const emoji = alertType === 'above' ? '📈' : '📉';
    const color = alertType === 'above' ? this.colors.success : this.colors.error;

    return {
      type: 'bubble',
      altText: `${symbol} 價格警報 - ${direction} $${targetPrice}`,
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `${emoji} 價格警報`,
            weight: 'bold',
            color: this.colors.white,
            size: 'md'
          }
        ],
        backgroundColor: color,
        paddingAll: 'lg'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: symbol,
            weight: 'bold',
            size: 'xl',
            color: this.colors.text
          },
          {
            type: 'text',
            text: `已${direction} $${targetPrice}`,
            size: 'md',
            color: this.colors.textSecondary,
            margin: 'sm'
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
                    text: '當前價格',
                    color: this.colors.textMuted,
                    size: 'sm',
                    flex: 2
                  },
                  {
                    type: 'text',
                    text: `$${currentPrice}`,
                    wrap: true,
                    color: this.colors.text,
                    size: 'sm',
                    flex: 3,
                    weight: 'bold'
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
                    text: '變動幅度',
                    color: this.colors.textMuted,
                    size: 'sm',
                    flex: 2
                  },
                  {
                    type: 'text',
                    text: `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
                    wrap: true,
                    color: changePercent > 0 ? this.colors.success : this.colors.error,
                    size: 'sm',
                    flex: 3,
                    weight: 'bold'
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
                    text: '觸發時間',
                    color: this.colors.textMuted,
                    size: 'sm',
                    flex: 2
                  },
                  {
                    type: 'text',
                    text: timestamp,
                    wrap: true,
                    color: this.colors.textSecondary,
                    size: 'sm',
                    flex: 3
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
            color: this.colors.primary,
            action: {
              type: 'uri',
              label: '查看詳細分析',
              uri: `${this.baseUrl}/market/${symbol}`
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '設定新警報',
              data: JSON.stringify({ action: 'create_alert', symbol })
            }
          }
        ]
      }
    };
  }

  /**
   * 市場摘要 Flex Message
   * @param {Object} data - 市場數據
   * @returns {Object} Flex Message 物件
   */
  marketSummary(data = {}) {
    const {
      trending = [],
      totalMarketCap = '0',
      btcDominance = '0',
      fearGreedIndex = 50,
      timestamp = new Date().toLocaleString('zh-TW')
    } = data;

    const fearGreedColor = fearGreedIndex >= 75 ? this.colors.error : 
                          fearGreedIndex >= 55 ? this.colors.warning :
                          fearGreedIndex >= 45 ? this.colors.info : this.colors.success;

    return {
      type: 'bubble',
      altText: '加密貨幣市場摘要',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📊 市場摘要',
            weight: 'bold',
            color: this.colors.white,
            size: 'md'
          }
        ],
        backgroundColor: this.colors.primary,
        paddingAll: 'lg'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          // 市場指標
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '市場指標',
                weight: 'bold',
                size: 'md',
                color: this.colors.text
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'sm',
                contents: [
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'text',
                        text: '總市值',
                        size: 'sm',
                        color: this.colors.textMuted,
                        flex: 2
                      },
                      {
                        type: 'text',
                        text: `$${totalMarketCap}`,
                        size: 'sm',
                        color: this.colors.text,
                        flex: 3,
                        weight: 'bold'
                      }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'text',
                        text: 'BTC 市佔率',
                        size: 'sm',
                        color: this.colors.textMuted,
                        flex: 2
                      },
                      {
                        type: 'text',
                        text: `${btcDominance}%`,
                        size: 'sm',
                        color: this.colors.text,
                        flex: 3,
                        weight: 'bold'
                      }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'text',
                        text: '恐慌指數',
                        size: 'sm',
                        color: this.colors.textMuted,
                        flex: 2
                      },
                      {
                        type: 'text',
                        text: `${fearGreedIndex}`,
                        size: 'sm',
                        color: fearGreedColor,
                        flex: 3,
                        weight: 'bold'
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          // 熱門加密貨幣
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            contents: [
              {
                type: 'text',
                text: '熱門加密貨幣',
                weight: 'bold',
                size: 'md',
                color: this.colors.text
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'sm',
                contents: trending.slice(0, 5).map(coin => ({
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: coin.symbol,
                      color: this.colors.text,
                      size: 'sm',
                      flex: 2,
                      weight: 'bold'
                    },
                    {
                      type: 'text',
                      text: `$${coin.price}`,
                      wrap: true,
                      color: this.colors.textSecondary,
                      size: 'sm',
                      flex: 2
                    },
                    {
                      type: 'text',
                      text: `${coin.change > 0 ? '+' : ''}${coin.change.toFixed(2)}%`,
                      wrap: true,
                      color: coin.change > 0 ? this.colors.success : this.colors.error,
                      size: 'sm',
                      flex: 2,
                      weight: 'bold'
                    }
                  ]
                }))
              }
            ]
          },
          {
            type: 'text',
            text: timestamp,
            size: 'xs',
            color: this.colors.textMuted,
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
              uri: `${this.baseUrl}/market`
            }
          }
        ]
      }
    };
  }

  /**
   * AI 分析報告 Flex Message
   * @param {Object} data - AI 分析數據
   * @returns {Object} Flex Message 物件
   */
  aiAnalysisReport(data = {}) {
    const {
      symbol = 'BTCUSDT',
      sentiment = 'neutral',
      recommendation = 'HOLD',
      confidence = 75,
      price = '0',
      targets = {},
      keyPoints = [],
      timestamp = new Date().toLocaleString('zh-TW')
    } = data;

    const sentimentColor = {
      bullish: this.colors.success,
      bearish: this.colors.error,
      neutral: this.colors.warning
    }[sentiment] || this.colors.info;

    const sentimentText = {
      bullish: '看漲',
      bearish: '看跌',
      neutral: '中性'
    }[sentiment] || '未知';

    return {
      type: 'bubble',
      altText: `${symbol} AI 分析報告`,
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🤖 AI 分析報告',
            weight: 'bold',
            color: this.colors.white,
            size: 'md'
          }
        ],
        backgroundColor: this.colors.info,
        paddingAll: 'lg'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: symbol,
            weight: 'bold',
            size: 'xl',
            color: this.colors.text
          },
          {
            type: 'text',
            text: `當前價格：$${price}`,
            size: 'md',
            color: this.colors.textSecondary,
            margin: 'sm'
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          // 分析結果
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  {
                    type: 'text',
                    text: '市場情緒',
                    size: 'sm',
                    color: this.colors.textMuted,
                    flex: 2
                  },
                  {
                    type: 'text',
                    text: sentimentText,
                    size: 'sm',
                    color: sentimentColor,
                    flex: 3,
                    weight: 'bold'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  {
                    type: 'text',
                    text: '建議操作',
                    size: 'sm',
                    color: this.colors.textMuted,
                    flex: 2
                  },
                  {
                    type: 'text',
                    text: recommendation,
                    size: 'sm',
                    color: this.colors.text,
                    flex: 3,
                    weight: 'bold'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  {
                    type: 'text',
                    text: '信心指數',
                    size: 'sm',
                    color: this.colors.textMuted,
                    flex: 2
                  },
                  {
                    type: 'text',
                    text: `${confidence}%`,
                    size: 'sm',
                    color: this.colors.primary,
                    flex: 3,
                    weight: 'bold'
                  }
                ]
              }
            ]
          },
          // 價格目標（如果有的話）
          ...(targets.support || targets.resistance ? [
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
                  text: '價格目標',
                  weight: 'bold',
                  size: 'sm',
                  color: this.colors.text
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  margin: 'sm',
                  spacing: 'xs',
                  contents: [
                    ...(targets.resistance ? [{
                      type: 'box',
                      layout: 'baseline',
                      contents: [
                        {
                          type: 'text',
                          text: '阻力位',
                          size: 'xs',
                          color: this.colors.textMuted,
                          flex: 2
                        },
                        {
                          type: 'text',
                          text: `$${targets.resistance}`,
                          size: 'xs',
                          color: this.colors.error,
                          flex: 3
                        }
                      ]
                    }] : []),
                    ...(targets.support ? [{
                      type: 'box',
                      layout: 'baseline',
                      contents: [
                        {
                          type: 'text',
                          text: '支撐位',
                          size: 'xs',
                          color: this.colors.textMuted,
                          flex: 2
                        },
                        {
                          type: 'text',
                          text: `$${targets.support}`,
                          size: 'xs',
                          color: this.colors.success,
                          flex: 3
                        }
                      ]
                    }] : [])
                  ]
                }
              ]
            }
          ] : []),
          // 關鍵要點
          ...(keyPoints.length > 0 ? [
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
                  text: '關鍵要點',
                  weight: 'bold',
                  size: 'sm',
                  color: this.colors.text
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  margin: 'sm',
                  spacing: 'xs',
                  contents: keyPoints.slice(0, 3).map((point, index) => ({
                    type: 'text',
                    text: `${index + 1}. ${point}`,
                    size: 'xs',
                    color: this.colors.textSecondary,
                    wrap: true
                  }))
                }
              ]
            }
          ] : []),
          {
            type: 'text',
            text: timestamp,
            size: 'xs',
            color: this.colors.textMuted,
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
              label: '查看完整分析',
              uri: `${this.baseUrl}/analysis/${symbol}`
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '設定價格警報',
              data: JSON.stringify({ action: 'create_alert', symbol })
            }
          }
        ]
      }
    };
  }

  /**
   * 歡迎 Flex Message
   * @param {Object} data - 使用者數據
   * @returns {Object} Flex Message 物件
   */
  welcome(data = {}) {
    const { username = '朋友', platform = 'NexusTrade' } = data;

    return {
      type: 'bubble',
      altText: `歡迎加入 ${platform}`,
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `🎉 歡迎加入 ${platform}`,
            weight: 'bold',
            color: this.colors.white,
            size: 'lg',
            align: 'center'
          }
        ],
        backgroundColor: this.colors.primary,
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
            color: this.colors.text,
            align: 'center'
          },
          {
            type: 'text',
            text: '感謝您加入我們的加密貨幣交易追蹤平台',
            wrap: true,
            color: this.colors.textSecondary,
            size: 'md',
            margin: 'lg',
            align: 'center'
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
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '📊',
                    size: 'lg',
                    flex: 1
                  },
                  {
                    type: 'text',
                    text: '追蹤加密貨幣價格變動',
                    size: 'sm',
                    color: this.colors.textSecondary,
                    flex: 4
                  }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '🔔',
                    size: 'lg',
                    flex: 1
                  },
                  {
                    type: 'text',
                    text: '設定個人化價格警報',
                    size: 'sm',
                    color: this.colors.textSecondary,
                    flex: 4
                  }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '🤖',
                    size: 'lg',
                    flex: 1
                  },
                  {
                    type: 'text',
                    text: '獲得 AI 智能分析建議',
                    size: 'sm',
                    color: this.colors.textSecondary,
                    flex: 4
                  }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '📈',
                    size: 'lg',
                    flex: 1
                  },
                  {
                    type: 'text',
                    text: '即時市場趨勢更新',
                    size: 'sm',
                    color: this.colors.textSecondary,
                    flex: 4
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
              label: '開始使用',
              uri: `${this.baseUrl}/dashboard`
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '查看功能說明',
              data: JSON.stringify({ action: 'show_help' })
            }
          }
        ]
      }
    };
  }

  /**
   * 取得所有可用模板
   * @returns {Object} 模板列表
   */
  getAvailableTemplates() {
    return {
      priceAlert: { description: '價格警報通知卡片' },
      marketSummary: { description: '市場摘要卡片' },
      aiAnalysisReport: { description: 'AI 分析報告卡片' },
      welcome: { description: '歡迎新使用者卡片' }
    };
  }
}

// 建立單例並匯出所有模板方法
const flexTemplates = new FlexMessageTemplates();

module.exports = {
  priceAlert: flexTemplates.priceAlert.bind(flexTemplates),
  marketSummary: flexTemplates.marketSummary.bind(flexTemplates),
  aiAnalysisReport: flexTemplates.aiAnalysisReport.bind(flexTemplates),
  welcome: flexTemplates.welcome.bind(flexTemplates),
  getAvailableTemplates: flexTemplates.getAvailableTemplates.bind(flexTemplates)
};