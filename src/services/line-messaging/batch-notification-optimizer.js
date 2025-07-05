/**
 * LINE 批量通知優化服務
 * 
 * 針對大規模用戶通知進行效能優化：
 * 1. 智慧批次分組和優先級管理
 * 2. 動態頻率限制和重試機制
 * 3. 訊息去重和內容優化
 * 4. 用戶分群和個人化通知
 * 5. 效能監控和統計分析
 */

const EventEmitter = require('events');
const LineCoreMessenger = require('./core/messenger');
const logger = require('../../utils/logger');

class BatchNotificationOptimizer extends EventEmitter {
  constructor() {
    super();
    
    // 核心配置
    this.config = {
      // 批次大小設定
      maxBatchSize: 500,           // LINE API 限制
      optimalBatchSize: 300,       // 最佳效能批次大小
      minBatchSize: 50,            // 最小批次大小
      
      // 頻率限制 (每分鐘)
      messagesPerMinute: 1000,     // LINE API 限制
      messagesPerSecond: 50,       // 自定義安全限制
      
      // 重試機制
      maxRetries: 3,
      retryDelayMs: 1000,
      exponentialBackoff: true,
      
      // 優先級設定
      priorities: {
        critical: { weight: 1, maxDelay: 0 },      // 即時發送
        high: { weight: 2, maxDelay: 5000 },       // 5秒內發送
        medium: { weight: 3, maxDelay: 30000 },    // 30秒內發送
        low: { weight: 4, maxDelay: 300000 }       // 5分鐘內發送
      },
      
      // 用戶分群
      userSegments: {
        vip: { priority: 'critical', batchSize: 100 },
        active: { priority: 'high', batchSize: 200 },
        regular: { priority: 'medium', batchSize: 300 },
        inactive: { priority: 'low', batchSize: 500 }
      }
    };
    
    // 運行時狀態
    this.state = {
      isProcessing: false,
      queueLength: 0,
      processedToday: 0,
      errorCount: 0,
      rateLimitHits: 0,
      lastProcessTime: null
    };
    
    // 通知佇列
    this.notificationQueue = new Map(); // 按優先級分組
    this.processingQueue = [];
    this.retryQueue = [];
    
    // 效能監控
    this.metrics = {
      totalSent: 0,
      totalErrors: 0,
      averageLatency: 0,
      throughputPerMinute: 0,
      lastMinuteCount: 0,
      lastMinuteTimestamp: Date.now()
    };
    
    // 用戶管理
    this.userProfiles = new Map();
    this.messageDeduplication = new Map();
    
    // 初始化核心服務
    this.messenger = new LineCoreMessenger();
    
    // 啟動背景處理
    this.startBackgroundProcessing();
  }

  /**
   * 添加批量通知任務到佇列
   */
  async addBatchNotification(notification) {
    const {
      userIds = [],
      message,
      priority = 'medium',
      userSegment = 'regular',
      deduplicationKey = null,
      scheduledTime = null,
      metadata = {}
    } = notification;

    try {
      // 驗證輸入
      if (!userIds.length || !message) {
        throw new Error('userIds 和 message 為必填欄位');
      }

      // 訊息去重檢查
      if (deduplicationKey && this.messageDeduplication.has(deduplicationKey)) {
        logger.warn(`重複訊息被忽略: ${deduplicationKey}`);
        return { success: false, reason: 'duplicate_message' };
      }

      // 處理用戶分群
      const segmentedUsers = this.segmentUsers(userIds, userSegment);
      
      // 創建通知任務
      const task = {
        id: this.generateTaskId(),
        userIds: segmentedUsers.userIds,
        message: await this.optimizeMessage(message),
        priority,
        userSegment: segmentedUsers.segment,
        batchSize: this.calculateOptimalBatchSize(segmentedUsers.userIds.length, priority),
        scheduledTime: scheduledTime || Date.now(),
        retryCount: 0,
        metadata: {
          ...metadata,
          originalUserCount: userIds.length,
          segmentedUserCount: segmentedUsers.userIds.length,
          createdAt: new Date().toISOString()
        }
      };

      // 記錄去重鍵
      if (deduplicationKey) {
        this.messageDeduplication.set(deduplicationKey, {
          taskId: task.id,
          timestamp: Date.now()
        });
      }

      // 加入佇列
      this.addToQueue(task);
      
      logger.info(`批量通知任務已加入佇列: ${task.id}`, {
        userCount: task.userIds.length,
        priority: task.priority,
        batchSize: task.batchSize
      });

      return {
        success: true,
        taskId: task.id,
        queuePosition: this.getQueuePosition(task.id),
        estimatedDelay: this.estimateDelay(task.priority)
      };

    } catch (error) {
      logger.error('添加批量通知任務失敗:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 用戶分群處理
   */
  segmentUsers(userIds, requestedSegment = 'regular') {
    const segmentedUsers = {
      vip: [],
      active: [],
      regular: [],
      inactive: []
    };

    // 根據用戶檔案進行分群
    for (const userId of userIds) {
      const profile = this.getUserProfile(userId);
      const segment = profile.segment || requestedSegment;
      
      if (segmentedUsers[segment]) {
        segmentedUsers[segment].push(userId);
      } else {
        segmentedUsers.regular.push(userId);
      }
    }

    // 找出最大的分群作為主要分群
    let primarySegment = requestedSegment;
    let maxCount = 0;
    
    for (const [segment, users] of Object.entries(segmentedUsers)) {
      if (users.length > maxCount) {
        maxCount = users.length;
        primarySegment = segment;
      }
    }

    // 合併所有用戶，VIP 用戶優先
    const allUsers = [
      ...segmentedUsers.vip,
      ...segmentedUsers.active, 
      ...segmentedUsers.regular,
      ...segmentedUsers.inactive
    ];

    return {
      userIds: allUsers,
      segment: primarySegment,
      distribution: {
        vip: segmentedUsers.vip.length,
        active: segmentedUsers.active.length,
        regular: segmentedUsers.regular.length,
        inactive: segmentedUsers.inactive.length
      }
    };
  }

  /**
   * 訊息內容優化
   */
  async optimizeMessage(message) {
    // 如果是 Flex Message，進行優化
    if (typeof message === 'object' && message.type) {
      // 壓縮不必要的屬性
      const optimized = this.compressFlexMessage(message);
      
      // 驗證訊息格式
      const flexMessageValidator = require('./flex-message-validator');
      const validation = flexMessageValidator.validateFlexMessage(optimized);
      
      if (!validation.isValid) {
        return flexMessageValidator.autoFixFlexMessage(optimized);
      }
      
      return optimized;
    }

    // 文字訊息長度優化
    if (typeof message === 'string' && message.length > 2000) {
      return message.substring(0, 1997) + '...';
    }

    return message;
  }

  /**
   * 壓縮 Flex Message 以減少傳輸大小
   */
  compressFlexMessage(flexMessage) {
    const compressed = JSON.parse(JSON.stringify(flexMessage));
    
    // 移除不必要的屬性
    this.removeEmptyProperties(compressed);
    
    // 簡化顏色值 (如果可能)
    this.simplifyColors(compressed);
    
    return compressed;
  }

  /**
   * 移除空屬性
   */
  removeEmptyProperties(obj) {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined || value === '') {
        delete obj[key];
      } else if (typeof value === 'object') {
        this.removeEmptyProperties(value);
        
        // 如果物件變成空的，也移除
        if (Array.isArray(value) && value.length === 0) {
          delete obj[key];
        } else if (typeof value === 'object' && Object.keys(value).length === 0) {
          delete obj[key];
        }
      }
    }
  }

  /**
   * 簡化顏色值
   */
  simplifyColors(obj) {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && key.toLowerCase().includes('color')) {
        // 將完整的顏色值簡化 (例: #333333 -> #333)
        if (value.match(/^#([0-9A-Fa-f])\1([0-9A-Fa-f])\2([0-9A-Fa-f])\3$/)) {
          obj[key] = `#${value[1]}${value[3]}${value[5]}`;
        }
      } else if (typeof value === 'object') {
        this.simplifyColors(value);
      }
    }
  }

  /**
   * 計算最佳批次大小
   */
  calculateOptimalBatchSize(userCount, priority) {
    const priorityConfig = this.config.priorities[priority] || this.config.priorities.medium;
    const baseSize = this.config.userSegments.regular.batchSize;
    
    // 根據優先級調整批次大小
    let batchSize = Math.floor(baseSize / priorityConfig.weight);
    
    // 確保在合理範圍內
    batchSize = Math.max(this.config.minBatchSize, batchSize);
    batchSize = Math.min(this.config.maxBatchSize, batchSize);
    
    // 如果用戶數量小於批次大小，直接使用用戶數量
    return Math.min(batchSize, userCount);
  }

  /**
   * 加入佇列
   */
  addToQueue(task) {
    const priority = task.priority;
    
    if (!this.notificationQueue.has(priority)) {
      this.notificationQueue.set(priority, []);
    }
    
    const queue = this.notificationQueue.get(priority);
    
    // 按照預定時間排序插入
    const insertIndex = queue.findIndex(existingTask => 
      existingTask.scheduledTime > task.scheduledTime
    );
    
    if (insertIndex === -1) {
      queue.push(task);
    } else {
      queue.splice(insertIndex, 0, task);
    }
    
    this.state.queueLength++;
    this.emit('taskQueued', task);
  }

  /**
   * 啟動背景處理
   */
  startBackgroundProcessing() {
    // 主要處理循環
    setInterval(async () => {
      if (!this.state.isProcessing) {
        await this.processQueue();
      }
    }, 1000); // 每秒檢查一次

    // 清理過期快取
    setInterval(() => {
      this.cleanupExpiredData();
    }, 60000); // 每分鐘清理一次

    // 效能統計
    setInterval(() => {
      this.updateMetrics();
    }, 60000); // 每分鐘更新統計
  }

  /**
   * 處理佇列
   */
  async processQueue() {
    if (this.state.queueLength === 0) return;
    
    this.state.isProcessing = true;
    
    try {
      // 按優先級順序處理
      const priorities = ['critical', 'high', 'medium', 'low'];
      
      for (const priority of priorities) {
        const queue = this.notificationQueue.get(priority);
        if (!queue || queue.length === 0) continue;
        
        // 檢查是否可以發送（頻率限制）
        if (!this.canSendNow()) {
          logger.warn('觸發頻率限制，暫停處理');
          this.state.rateLimitHits++;
          break;
        }
        
        // 取出下一個任務
        const task = queue.shift();
        this.state.queueLength--;
        
        // 檢查是否到了預定時間
        if (task.scheduledTime > Date.now()) {
          // 重新放回佇列
          queue.unshift(task);
          this.state.queueLength++;
          continue;
        }
        
        // 處理任務
        await this.processTask(task);
        
        // 限制處理速度
        await this.sleep(this.calculateDelay());
      }
      
    } catch (error) {
      logger.error('處理佇列時發生錯誤:', error);
      this.state.errorCount++;
    } finally {
      this.state.isProcessing = false;
      this.state.lastProcessTime = Date.now();
    }
  }

  /**
   * 處理單個任務
   */
  async processTask(task) {
    const startTime = Date.now();
    
    try {
      logger.info(`開始處理批量通知任務: ${task.id}`, {
        userCount: task.userIds.length,
        priority: task.priority,
        batchSize: task.batchSize
      });

      // 分批發送
      const batches = this.createBatches(task.userIds, task.batchSize);
      const results = [];
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        try {
          const result = await this.messenger.sendBatchMessage(
            batch,
            task.message,
            {
              batchDelay: this.calculateBatchDelay(task.priority),
              retryOnError: false // 我們自己處理重試
            }
          );
          
          results.push({
            batchIndex: i,
            success: result.success,
            userCount: batch.length,
            result: result
          });
          
          // 更新統計
          this.metrics.totalSent += batch.length;
          
        } catch (error) {
          logger.error(`批次 ${i} 發送失敗:`, error);
          results.push({
            batchIndex: i,
            success: false,
            userCount: batch.length,
            error: error.message
          });
          
          this.metrics.totalErrors += batch.length;
        }
      }
      
      // 檢查是否需要重試
      const failedBatches = results.filter(r => !r.success);
      if (failedBatches.length > 0 && task.retryCount < this.config.maxRetries) {
        await this.scheduleRetry(task, failedBatches);
      }
      
      // 計算延遲並更新統計
      const latency = Date.now() - startTime;
      this.updateLatencyMetrics(latency);
      
      // 發出完成事件
      this.emit('taskCompleted', {
        taskId: task.id,
        success: failedBatches.length === 0,
        totalBatches: batches.length,
        successfulBatches: results.filter(r => r.success).length,
        failedBatches: failedBatches.length,
        latency: latency
      });
      
      logger.info(`批量通知任務完成: ${task.id}`, {
        totalBatches: batches.length,
        successful: results.filter(r => r.success).length,
        failed: failedBatches.length,
        latency: `${latency}ms`
      });
      
    } catch (error) {
      logger.error(`處理任務 ${task.id} 時發生錯誤:`, error);
      
      // 重試機制
      if (task.retryCount < this.config.maxRetries) {
        await this.scheduleRetry(task);
      } else {
        this.emit('taskFailed', {
          taskId: task.id,
          error: error.message,
          retryCount: task.retryCount
        });
      }
    }
  }

  /**
   * 安排重試
   */
  async scheduleRetry(task, failedBatches = null) {
    task.retryCount++;
    
    const retryDelay = this.config.exponentialBackoff
      ? this.config.retryDelayMs * Math.pow(2, task.retryCount - 1)
      : this.config.retryDelayMs;
    
    task.scheduledTime = Date.now() + retryDelay;
    
    // 如果只有部分批次失敗，只重試失敗的部分
    if (failedBatches) {
      const failedUserIds = [];
      for (const failedBatch of failedBatches) {
        const startIndex = failedBatch.batchIndex * task.batchSize;
        const endIndex = Math.min(startIndex + task.batchSize, task.userIds.length);
        failedUserIds.push(...task.userIds.slice(startIndex, endIndex));
      }
      task.userIds = failedUserIds;
    }
    
    this.addToQueue(task);
    
    logger.info(`任務 ${task.id} 已安排重試`, {
      retryCount: task.retryCount,
      delay: `${retryDelay}ms`,
      userCount: task.userIds.length
    });
  }

  /**
   * 創建批次
   */
  createBatches(userIds, batchSize) {
    const batches = [];
    for (let i = 0; i < userIds.length; i += batchSize) {
      batches.push(userIds.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 檢查是否可以發送
   */
  canSendNow() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // 更新分鐘計數
    if (now - this.metrics.lastMinuteTimestamp > 60000) {
      this.metrics.lastMinuteCount = 0;
      this.metrics.lastMinuteTimestamp = now;
    }
    
    return this.metrics.lastMinuteCount < this.config.messagesPerMinute;
  }

  /**
   * 計算延遲
   */
  calculateDelay() {
    const messagesPerSecond = this.config.messagesPerSecond;
    return Math.max(1000 / messagesPerSecond, 50); // 最少50ms延遲
  }

  /**
   * 計算批次間延遲
   */
  calculateBatchDelay(priority) {
    const delays = {
      critical: 50,
      high: 100,
      medium: 200,
      low: 500
    };
    return delays[priority] || delays.medium;
  }

  /**
   * 獲取用戶檔案
   */
  getUserProfile(userId) {
    if (!this.userProfiles.has(userId)) {
      // 預設檔案
      this.userProfiles.set(userId, {
        segment: 'regular',
        lastActivity: Date.now(),
        notificationPreferences: {},
        metrics: {
          totalSent: 0,
          totalDelivered: 0,
          totalFailed: 0
        }
      });
    }
    return this.userProfiles.get(userId);
  }

  /**
   * 更新延遲統計
   */
  updateLatencyMetrics(latency) {
    // 簡單的移動平均
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * 0.9) + (latency * 0.1);
  }

  /**
   * 更新效能統計
   */
  updateMetrics() {
    const now = Date.now();
    this.metrics.throughputPerMinute = this.metrics.lastMinuteCount;
    
    // 重置分鐘計數
    this.metrics.lastMinuteCount = 0;
    this.metrics.lastMinuteTimestamp = now;
  }

  /**
   * 清理過期數據
   */
  cleanupExpiredData() {
    const now = Date.now();
    const expiryTime = 3600000; // 1小時
    
    // 清理去重快取
    for (const [key, data] of this.messageDeduplication.entries()) {
      if (now - data.timestamp > expiryTime) {
        this.messageDeduplication.delete(key);
      }
    }
    
    // 清理用戶檔案（保留活躍用戶）
    for (const [userId, profile] of this.userProfiles.entries()) {
      if (now - profile.lastActivity > expiryTime * 24) { // 24小時
        this.userProfiles.delete(userId);
      }
    }
  }

  /**
   * 獲取佇列位置
   */
  getQueuePosition(taskId) {
    let position = 1;
    
    for (const priority of ['critical', 'high', 'medium', 'low']) {
      const queue = this.notificationQueue.get(priority);
      if (!queue) continue;
      
      for (const task of queue) {
        if (task.id === taskId) {
          return position;
        }
        position++;
      }
    }
    
    return -1; // 未找到
  }

  /**
   * 估算延遲時間
   */
  estimateDelay(priority) {
    const queuePosition = this.getQueuePosition();
    const avgProcessTime = this.metrics.averageLatency || 5000;
    const priorityMultiplier = {
      critical: 0.1,
      high: 0.5,
      medium: 1.0,
      low: 2.0
    }[priority] || 1.0;
    
    return queuePosition * avgProcessTime * priorityMultiplier;
  }

  /**
   * 生成任務 ID
   */
  generateTaskId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 睡眠函數
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 獲取系統狀態
   */
  getStatus() {
    return {
      state: this.state,
      metrics: this.metrics,
      config: this.config,
      queueSizes: {
        critical: this.notificationQueue.get('critical')?.length || 0,
        high: this.notificationQueue.get('high')?.length || 0,
        medium: this.notificationQueue.get('medium')?.length || 0,
        low: this.notificationQueue.get('low')?.length || 0
      },
      userProfiles: this.userProfiles.size,
      deduplicationCache: this.messageDeduplication.size
    };
  }

  /**
   * 暫停處理
   */
  pause() {
    this.state.isProcessing = false;
    logger.info('批量通知處理已暫停');
  }

  /**
   * 恢復處理
   */
  resume() {
    logger.info('批量通知處理已恢復');
  }

  /**
   * 清空佇列
   */
  clearQueue() {
    this.notificationQueue.clear();
    this.state.queueLength = 0;
    logger.info('通知佇列已清空');
  }
}

// 創建並導出單例
const batchNotificationOptimizer = new BatchNotificationOptimizer();

module.exports = batchNotificationOptimizer;