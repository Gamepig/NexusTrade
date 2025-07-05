/**
 * 智慧通知分發器
 * 
 * 整合批量通知優化、用戶分群、智慧調度等功能
 * 為 NexusTrade 提供高效能、大規模的通知分發服務
 */

const EventEmitter = require('events');
const batchNotificationOptimizer = require('./line-messaging/batch-notification-optimizer');
const lineMessageTemplatesService = require('./line-message-templates.service');
const logger = require('../utils/logger');

class SmartNotificationDispatcher extends EventEmitter {
  constructor() {
    super();
    
    // 通知類型定義
    this.notificationTypes = {
      priceAlert: {
        priority: 'high',
        template: 'priceAlert',
        batchable: false,        // 價格警報不適合批量發送
        userSpecific: true
      },
      marketUpdate: {
        priority: 'medium',
        template: 'marketSummary',
        batchable: true,
        userSpecific: false
      },
      systemAnnouncement: {
        priority: 'high',
        template: 'text',
        batchable: true,
        userSpecific: false
      },
      aiAnalysis: {
        priority: 'medium',
        template: 'aiAnalysis',
        batchable: true,
        userSpecific: false
      },
      welcome: {
        priority: 'low',
        template: 'welcome',
        batchable: false,
        userSpecific: true
      }
    };
    
    // 用戶分群規則
    this.userSegmentRules = {
      vip: {
        criteria: ['membershipType:enterprise', 'tradingVolume:>1000000'],
        priority: 'critical',
        immediate: true
      },
      active: {
        criteria: ['lastActivity:<7days', 'alertCount:>0'],
        priority: 'high',
        immediate: false
      },
      regular: {
        criteria: ['membershipType:premium', 'lastActivity:<30days'],
        priority: 'medium',
        immediate: false
      },
      inactive: {
        criteria: ['lastActivity:>30days'],
        priority: 'low',
        immediate: false
      }
    };
    
    // 統計數據
    this.stats = {
      totalDispatched: 0,
      byType: {},
      byPriority: {},
      bySegment: {},
      errors: 0,
      startTime: Date.now()
    };
    
    // 初始化
    this.setupEventListeners();
  }

  /**
   * 設置事件監聽器
   */
  setupEventListeners() {
    // 監聽批量優化器事件
    batchNotificationOptimizer.on('taskCompleted', (result) => {
      this.handleBatchTaskCompleted(result);
    });
    
    batchNotificationOptimizer.on('taskFailed', (result) => {
      this.handleBatchTaskFailed(result);
    });
  }

  /**
   * 發送價格警報通知
   */
  async sendPriceAlert(alertData, userId) {
    try {
      const { 
        symbol, 
        currentPrice, 
        targetPrice, 
        alertType, 
        changePercent = 0,
        urgency = 'normal'
      } = alertData;

      // 生成價格警報訊息
      const template = lineMessageTemplatesService.getTemplate('flex', 'priceAlert');
      const message = template({
        symbol,
        currentPrice,
        targetPrice,
        alertType,
        changePercent,
        timestamp: new Date()
      });

      // 確定優先級
      const priority = this.determinePriceAlertPriority(alertData, urgency);
      
      // 獲取用戶分群
      const userSegment = await this.getUserSegment(userId);

      // 單用戶即時發送（價格警報通常需要即時）
      const result = await batchNotificationOptimizer.addBatchNotification({
        userIds: [userId],
        message: message,
        priority: priority,
        userSegment: userSegment,
        deduplicationKey: `price_alert_${symbol}_${userId}_${Date.now()}`,
        metadata: {
          type: 'priceAlert',
          symbol: symbol,
          alertType: alertType,
          urgency: urgency
        }
      });

      // 更新統計
      this.updateStats('priceAlert', priority, userSegment);

      logger.info(`價格警報通知已分發: ${symbol}`, {
        userId: userId.substring(0, 8) + '...',
        priority: priority,
        taskId: result.taskId
      });

      return result;

    } catch (error) {
      logger.error('發送價格警報通知失敗:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * 發送市場更新通知
   */
  async sendMarketUpdate(marketData, targetUsers = 'all') {
    try {
      // 生成市場更新訊息
      const template = lineMessageTemplatesService.getTemplate('flex', 'marketSummary');
      const message = template(marketData);

      // 獲取目標用戶列表
      const userIds = await this.getTargetUsers(targetUsers, 'marketUpdate');
      
      if (userIds.length === 0) {
        logger.warn('沒有找到市場更新的目標用戶');
        return { success: false, reason: 'no_target_users' };
      }

      // 批量發送
      const result = await batchNotificationOptimizer.addBatchNotification({
        userIds: userIds,
        message: message,
        priority: 'medium',
        userSegment: 'mixed',
        deduplicationKey: `market_update_${Date.now()}`,
        metadata: {
          type: 'marketUpdate',
          targetUsers: targetUsers,
          dataTimestamp: marketData.timestamp
        }
      });

      // 更新統計
      this.updateStats('marketUpdate', 'medium', 'mixed');

      logger.info(`市場更新通知已分發給 ${userIds.length} 個用戶`, {
        taskId: result.taskId,
        targetUsers: targetUsers
      });

      return result;

    } catch (error) {
      logger.error('發送市場更新通知失敗:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * 發送 AI 分析通知
   */
  async sendAIAnalysis(analysisData, targetUsers = 'active') {
    try {
      // 生成 AI 分析訊息
      const template = lineMessageTemplatesService.getTemplate('flex', 'aiAnalysis');
      const message = template(analysisData);

      // 獲取目標用戶列表
      const userIds = await this.getTargetUsers(targetUsers, 'aiAnalysis');
      
      if (userIds.length === 0) {
        logger.warn('沒有找到 AI 分析的目標用戶');
        return { success: false, reason: 'no_target_users' };
      }

      // 批量發送
      const result = await batchNotificationOptimizer.addBatchNotification({
        userIds: userIds,
        message: message,
        priority: 'medium',
        userSegment: targetUsers,
        deduplicationKey: `ai_analysis_${analysisData.trend}_${Date.now()}`,
        scheduledTime: this.calculateOptimalSendTime(targetUsers),
        metadata: {
          type: 'aiAnalysis',
          targetUsers: targetUsers,
          trend: analysisData.trend,
          confidence: analysisData.confidence
        }
      });

      // 更新統計
      this.updateStats('aiAnalysis', 'medium', targetUsers);

      logger.info(`AI 分析通知已分發給 ${userIds.length} 個用戶`, {
        taskId: result.taskId,
        trend: analysisData.trend,
        confidence: analysisData.confidence
      });

      return result;

    } catch (error) {
      logger.error('發送 AI 分析通知失敗:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * 發送系統公告
   */
  async sendSystemAnnouncement(announcement, targetUsers = 'all', priority = 'high') {
    try {
      const userIds = await this.getTargetUsers(targetUsers, 'systemAnnouncement');
      
      if (userIds.length === 0) {
        logger.warn('沒有找到系統公告的目標用戶');
        return { success: false, reason: 'no_target_users' };
      }

      // 如果是緊急公告，立即發送
      const isUrgent = priority === 'critical';
      
      const result = await batchNotificationOptimizer.addBatchNotification({
        userIds: userIds,
        message: announcement,
        priority: priority,
        userSegment: 'mixed',
        deduplicationKey: `system_announcement_${Date.now()}`,
        scheduledTime: isUrgent ? Date.now() : this.calculateOptimalSendTime(targetUsers),
        metadata: {
          type: 'systemAnnouncement',
          targetUsers: targetUsers,
          urgent: isUrgent
        }
      });

      // 更新統計
      this.updateStats('systemAnnouncement', priority, 'mixed');

      logger.info(`系統公告已分發給 ${userIds.length} 個用戶`, {
        taskId: result.taskId,
        priority: priority,
        urgent: isUrgent
      });

      return result;

    } catch (error) {
      logger.error('發送系統公告失敗:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * 發送歡迎訊息
   */
  async sendWelcomeMessage(userData, userId) {
    try {
      // 生成歡迎訊息
      const template = lineMessageTemplatesService.getTemplate('flex', 'welcome');
      const message = template(userData);

      // 歡迎訊息通常是即時且個人化的
      const result = await batchNotificationOptimizer.addBatchNotification({
        userIds: [userId],
        message: message,
        priority: 'high', // 新用戶體驗很重要
        userSegment: 'new',
        deduplicationKey: `welcome_${userId}`,
        metadata: {
          type: 'welcome',
          username: userData.username
        }
      });

      // 更新統計
      this.updateStats('welcome', 'high', 'new');

      logger.info(`歡迎訊息已發送給新用戶`, {
        userId: userId.substring(0, 8) + '...',
        username: userData.username,
        taskId: result.taskId
      });

      return result;

    } catch (error) {
      logger.error('發送歡迎訊息失敗:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * 確定價格警報優先級
   */
  determinePriceAlertPriority(alertData, urgency) {
    const { changePercent = 0 } = alertData;
    
    // 緊急情況
    if (urgency === 'critical' || Math.abs(changePercent) > 20) {
      return 'critical';
    }
    
    // 高變化率
    if (Math.abs(changePercent) > 10) {
      return 'high';
    }
    
    // 一般情況
    return 'high'; // 價格警報通常都是高優先級
  }

  /**
   * 獲取用戶分群
   */
  async getUserSegment(userId) {
    try {
      // 這裡應該從用戶資料庫查詢用戶資訊
      // 暫時使用模擬邏輯
      
      // 查詢用戶資料（這裡需要整合實際的用戶服務）
      const userProfile = await this.fetchUserProfile(userId);
      
      if (!userProfile) {
        return 'regular';
      }
      
      // 根據規則判斷分群
      for (const [segment, rules] of Object.entries(this.userSegmentRules)) {
        if (this.matchesSegmentCriteria(userProfile, rules.criteria)) {
          return segment;
        }
      }
      
      return 'regular';
      
    } catch (error) {
      logger.error('獲取用戶分群失敗:', error);
      return 'regular';
    }
  }

  /**
   * 獲取目標用戶列表
   */
  async getTargetUsers(targetUsers, notificationType) {
    try {
      // 如果是具體的用戶 ID 列表
      if (Array.isArray(targetUsers)) {
        return targetUsers;
      }
      
      // 根據分群獲取用戶
      switch (targetUsers) {
        case 'all':
          return await this.getAllActiveUsers();
        case 'vip':
          return await this.getUsersBySegment('vip');
        case 'active':
          return await this.getUsersBySegment('active');
        case 'regular':
          return await this.getUsersBySegment('regular');
        case 'premium':
          return await this.getPremiumUsers();
        case 'alert_users':
          return await this.getUsersWithAlerts();
        default:
          logger.warn(`未知的目標用戶類型: ${targetUsers}`);
          return [];
      }
      
    } catch (error) {
      logger.error('獲取目標用戶列表失敗:', error);
      return [];
    }
  }

  /**
   * 計算最佳發送時間
   */
  calculateOptimalSendTime(targetUsers) {
    const now = Date.now();
    const hour = new Date().getHours();
    
    // 避開深夜時段 (22:00 - 08:00)
    if (hour >= 22 || hour < 8) {
      const tomorrow8AM = new Date();
      tomorrow8AM.setHours(8, 0, 0, 0);
      if (hour >= 22) {
        tomorrow8AM.setDate(tomorrow8AM.getDate() + 1);
      }
      return tomorrow8AM.getTime();
    }
    
    // VIP 用戶立即發送
    if (targetUsers === 'vip') {
      return now;
    }
    
    // 其他用戶可以稍微延遲以平滑負載
    return now + Math.random() * 300000; // 0-5分鐘隨機延遲
  }

  /**
   * 處理批量任務完成事件
   */
  handleBatchTaskCompleted(result) {
    this.emit('notificationCompleted', result);
    
    logger.debug('批量通知任務完成:', {
      taskId: result.taskId,
      successful: result.successfulBatches,
      failed: result.failedBatches,
      latency: `${result.latency}ms`
    });
  }

  /**
   * 處理批量任務失敗事件
   */
  handleBatchTaskFailed(result) {
    this.stats.errors++;
    this.emit('notificationFailed', result);
    
    logger.error('批量通知任務失敗:', result);
  }

  /**
   * 更新統計數據
   */
  updateStats(type, priority, segment) {
    this.stats.totalDispatched++;
    
    if (!this.stats.byType[type]) {
      this.stats.byType[type] = 0;
    }
    this.stats.byType[type]++;
    
    if (!this.stats.byPriority[priority]) {
      this.stats.byPriority[priority] = 0;
    }
    this.stats.byPriority[priority]++;
    
    if (!this.stats.bySegment[segment]) {
      this.stats.bySegment[segment] = 0;
    }
    this.stats.bySegment[segment]++;
  }

  /**
   * 模擬方法 - 實際實現時需要整合真實的用戶服務
   */
  
  async fetchUserProfile(userId) {
    // TODO: 整合實際的用戶資料庫查詢
    return {
      id: userId,
      membershipType: 'regular',
      lastActivity: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      alertCount: Math.floor(Math.random() * 5),
      tradingVolume: Math.random() * 10000
    };
  }

  async getAllActiveUsers() {
    // TODO: 查詢所有活躍用戶
    return ['user1', 'user2', 'user3']; // 模擬數據
  }

  async getUsersBySegment(segment) {
    // TODO: 根據分群查詢用戶
    return [`${segment}_user1`, `${segment}_user2`]; // 模擬數據
  }

  async getPremiumUsers() {
    // TODO: 查詢付費用戶
    return ['premium_user1', 'premium_user2']; // 模擬數據
  }

  async getUsersWithAlerts() {
    // TODO: 查詢有設定警報的用戶
    return ['alert_user1', 'alert_user2']; // 模擬數據
  }

  matchesSegmentCriteria(userProfile, criteria) {
    // TODO: 實現分群規則匹配邏輯
    return Math.random() > 0.5; // 模擬邏輯
  }

  /**
   * 獲取系統狀態
   */
  getStatus() {
    const optimizerStatus = batchNotificationOptimizer.getStatus();
    
    return {
      dispatcher: {
        stats: this.stats,
        uptime: Date.now() - this.stats.startTime,
        notificationTypes: Object.keys(this.notificationTypes)
      },
      optimizer: optimizerStatus
    };
  }

  /**
   * 獲取統計報告
   */
  getStatisticsReport() {
    const now = Date.now();
    const uptime = now - this.stats.startTime;
    const uptimeHours = uptime / (1000 * 60 * 60);
    
    return {
      summary: {
        totalDispatched: this.stats.totalDispatched,
        errors: this.stats.errors,
        successRate: this.stats.totalDispatched > 0 
          ? ((this.stats.totalDispatched - this.stats.errors) / this.stats.totalDispatched * 100).toFixed(2) + '%'
          : '0%',
        avgPerHour: uptimeHours > 0 ? (this.stats.totalDispatched / uptimeHours).toFixed(2) : '0'
      },
      breakdown: {
        byType: this.stats.byType,
        byPriority: this.stats.byPriority,
        bySegment: this.stats.bySegment
      },
      uptime: {
        milliseconds: uptime,
        readable: this.formatUptime(uptime)
      }
    };
  }

  /**
   * 格式化運行時間
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}天 ${hours % 24}小時 ${minutes % 60}分鐘`;
    } else if (hours > 0) {
      return `${hours}小時 ${minutes % 60}分鐘`;
    } else if (minutes > 0) {
      return `${minutes}分鐘 ${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
}

// 創建並導出單例
const smartNotificationDispatcher = new SmartNotificationDispatcher();

module.exports = smartNotificationDispatcher;