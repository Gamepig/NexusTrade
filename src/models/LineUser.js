/**
 * LINE 使用者資料模型
 * 
 * 功能：
 * 1. LINE 使用者資料管理
 * 2. 與 NexusTrade 使用者帳號綁定
 * 3. 通知偏好和設定管理
 * 4. 使用者狀態追蹤
 */

const logger = require('../utils/logger');

/**
 * LINE 使用者資料類別
 */
class LineUser {
  constructor(data = {}) {
    this.lineUserId = data.lineUserId || null;
    this.nexusTradeUserId = data.nexusTradeUserId || null;
    this.displayName = data.displayName || null;
    this.pictureUrl = data.pictureUrl || null;
    this.statusMessage = data.statusMessage || null;
    this.language = data.language || 'zh-TW';
    
    // 綁定狀態
    this.isBound = data.isBound || false;
    this.bindTime = data.bindTime || null;
    this.lastActivity = data.lastActivity || null;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    
    // 通知設定
    this.notificationSettings = {
      priceAlerts: data.notificationSettings?.priceAlerts !== undefined ? data.notificationSettings.priceAlerts : true,
      marketUpdates: data.notificationSettings?.marketUpdates !== undefined ? data.notificationSettings.marketUpdates : true,
      aiAnalysis: data.notificationSettings?.aiAnalysis !== undefined ? data.notificationSettings.aiAnalysis : false,
      systemNotifications: data.notificationSettings?.systemNotifications !== undefined ? data.notificationSettings.systemNotifications : true,
      dailySummary: data.notificationSettings?.dailySummary !== undefined ? data.notificationSettings.dailySummary : false,
      weeklyReport: data.notificationSettings?.weeklyReport !== undefined ? data.notificationSettings.weeklyReport : false
    };
    
    // 使用者偏好
    this.preferences = {
      timezone: data.preferences?.timezone || 'Asia/Taipei',
      currency: data.preferences?.currency || 'USD',
      priceFormat: data.preferences?.priceFormat || 'decimal', // decimal, scientific
      notifications: {
        quiet_hours: {
          enabled: data.preferences?.notifications?.quiet_hours?.enabled || false,
          start: data.preferences?.notifications?.quiet_hours?.start || '22:00',
          end: data.preferences?.notifications?.quiet_hours?.end || '08:00'
        }
      }
    };
    
    // 統計資訊
    this.stats = {
      totalMessages: data.stats?.totalMessages || 0,
      totalNotifications: data.stats?.totalNotifications || 0,
      lastMessageTime: data.stats?.lastMessageTime || null,
      lastNotificationTime: data.stats?.lastNotificationTime || null,
      favoriteCommands: data.stats?.favoriteCommands || [],
      priceAlertsTriggered: data.stats?.priceAlertsTriggered || 0
    };
    
    // 時間戳記
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * 綁定 NexusTrade 使用者帳號
   * @param {string} nexusTradeUserId - NexusTrade 使用者 ID
   * @param {Object} userInfo - 額外的使用者資訊
   */
  bindToNexusTradeUser(nexusTradeUserId, userInfo = {}) {
    this.nexusTradeUserId = nexusTradeUserId;
    this.isBound = true;
    this.bindTime = new Date();
    this.updatedAt = new Date();
    
    // 更新使用者資訊（如果提供）
    if (userInfo.email) {
      this.email = userInfo.email;
    }
    
    logger.info('LINE 使用者綁定成功', {
      lineUserId: this.lineUserId.substring(0, 8) + '...',
      nexusTradeUserId,
      bindTime: this.bindTime
    });
  }

  /**
   * 解除綁定
   */
  unbind() {
    const previousNexusTradeUserId = this.nexusTradeUserId;
    
    this.nexusTradeUserId = null;
    this.isBound = false;
    this.bindTime = null;
    this.updatedAt = new Date();
    
    logger.info('LINE 使用者解除綁定', {
      lineUserId: this.lineUserId.substring(0, 8) + '...',
      previousNexusTradeUserId
    });
  }

  /**
   * 更新使用者資訊
   * @param {Object} profileData - LINE 使用者資料
   */
  updateProfile(profileData) {
    if (profileData.displayName) {
      this.displayName = profileData.displayName;
    }
    
    if (profileData.pictureUrl) {
      this.pictureUrl = profileData.pictureUrl;
    }
    
    if (profileData.statusMessage) {
      this.statusMessage = profileData.statusMessage;
    }
    
    if (profileData.language) {
      this.language = profileData.language;
    }
    
    this.updatedAt = new Date();
    
    logger.debug('LINE 使用者資料已更新', {
      lineUserId: this.lineUserId.substring(0, 8) + '...',
      displayName: this.displayName
    });
  }

  /**
   * 更新通知設定
   * @param {Object} settings - 通知設定
   */
  updateNotificationSettings(settings) {
    Object.assign(this.notificationSettings, settings);
    this.updatedAt = new Date();
    
    logger.info('LINE 使用者通知設定已更新', {
      lineUserId: this.lineUserId.substring(0, 8) + '...',
      settings
    });
  }

  /**
   * 更新使用者偏好
   * @param {Object} preferences - 使用者偏好
   */
  updatePreferences(preferences) {
    // 深度合併偏好設定
    this.preferences = this.deepMerge(this.preferences, preferences);
    this.updatedAt = new Date();
    
    logger.info('LINE 使用者偏好已更新', {
      lineUserId: this.lineUserId.substring(0, 8) + '...',
      preferences
    });
  }

  /**
   * 記錄使用者活動
   * @param {string} activityType - 活動類型
   * @param {Object} metadata - 額外的中繼資料
   */
  recordActivity(activityType, metadata = {}) {
    this.lastActivity = new Date();
    this.stats.lastMessageTime = new Date();
    this.stats.totalMessages += 1;
    
    // 記錄常用指令
    if (activityType === 'command' && metadata.command) {
      const existingCommand = this.stats.favoriteCommands.find(cmd => cmd.command === metadata.command);
      if (existingCommand) {
        existingCommand.count += 1;
      } else {
        this.stats.favoriteCommands.push({
          command: metadata.command,
          count: 1
        });
      }
      
      // 保持最多 10 個常用指令
      this.stats.favoriteCommands.sort((a, b) => b.count - a.count);
      this.stats.favoriteCommands = this.stats.favoriteCommands.slice(0, 10);
    }
    
    this.updatedAt = new Date();
  }

  /**
   * 記錄通知發送
   * @param {string} notificationType - 通知類型
   */
  recordNotification(notificationType) {
    this.stats.totalNotifications += 1;
    this.stats.lastNotificationTime = new Date();
    
    if (notificationType === 'price_alert') {
      this.stats.priceAlertsTriggered += 1;
    }
    
    this.updatedAt = new Date();
  }

  /**
   * 檢查是否在安靜時間
   * @returns {boolean} 是否在安靜時間
   */
  isInQuietHours() {
    if (!this.preferences.notifications.quiet_hours.enabled) {
      return false;
    }
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const startTime = this.preferences.notifications.quiet_hours.start;
    const endTime = this.preferences.notifications.quiet_hours.end;
    
    // 處理跨夜的情況
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * 檢查是否應該接收特定類型的通知
   * @param {string} notificationType - 通知類型
   * @returns {boolean} 是否應該接收通知
   */
  shouldReceiveNotification(notificationType) {
    // 檢查使用者是否活躍
    if (!this.isActive) {
      return false;
    }
    
    // 檢查通知類型是否啟用
    if (!this.notificationSettings[notificationType]) {
      return false;
    }
    
    // 檢查是否在安靜時間（系統通知除外）
    if (notificationType !== 'systemNotifications' && this.isInQuietHours()) {
      return false;
    }
    
    return true;
  }

  /**
   * 取得使用者摘要資訊
   * @returns {Object} 使用者摘要
   */
  getSummary() {
    return {
      lineUserId: this.lineUserId.substring(0, 8) + '...',
      displayName: this.displayName,
      isBound: this.isBound,
      isActive: this.isActive,
      bindTime: this.bindTime,
      lastActivity: this.lastActivity,
      totalMessages: this.stats.totalMessages,
      totalNotifications: this.stats.totalNotifications,
      notificationSettings: this.notificationSettings
    };
  }

  /**
   * 轉換為可儲存的物件
   * @returns {Object} 可儲存的物件
   */
  toObject() {
    return {
      lineUserId: this.lineUserId,
      nexusTradeUserId: this.nexusTradeUserId,
      displayName: this.displayName,
      pictureUrl: this.pictureUrl,
      statusMessage: this.statusMessage,
      language: this.language,
      isBound: this.isBound,
      bindTime: this.bindTime,
      lastActivity: this.lastActivity,
      isActive: this.isActive,
      notificationSettings: this.notificationSettings,
      preferences: this.preferences,
      stats: this.stats,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * 深度合併物件
   * @param {Object} target - 目標物件
   * @param {Object} source - 來源物件
   * @returns {Object} 合併後的物件
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * 驗證使用者資料
   * @returns {Object} 驗證結果
   */
  validate() {
    const errors = [];
    
    if (!this.lineUserId) {
      errors.push('LINE 使用者 ID 為必填');
    }
    
    if (this.isBound && !this.nexusTradeUserId) {
      errors.push('綁定狀態下必須有 NexusTrade 使用者 ID');
    }
    
    if (this.language && !['zh-TW', 'zh-CN', 'en', 'ja'].includes(this.language)) {
      errors.push('不支援的語言設定');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * LINE 使用者管理服務（Mock 實作）
 */
class LineUserService {
  constructor() {
    // 使用 Map 作為簡單的記憶體儲存
    this.users = new Map();
    this.usersByNexusTradeId = new Map();
  }

  /**
   * 根據 LINE 使用者 ID 查找使用者
   * @param {string} lineUserId - LINE 使用者 ID
   * @returns {LineUser|null} 使用者物件
   */
  async findByLineUserId(lineUserId) {
    // 先檢查記憶體存儲
    if (this.users.has(lineUserId)) {
      return this.users.get(lineUserId);
    }
    
    // 如果記憶體中沒有，嘗試從 MongoDB 查詢
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) { // 確保 MongoDB 已連接
        const lineUserDoc = await mongoose.connection.db.collection('lineusers').findOne({ 
          lineUserId: lineUserId 
        });
        
        if (lineUserDoc) {
          // 將 MongoDB 文件轉換為 LineUser 實例並快取
          const lineUser = new LineUser({
            lineUserId: lineUserDoc.lineUserId,
            nexusTradeUserId: lineUserDoc.nexusTradeUserId ? lineUserDoc.nexusTradeUserId.toString() : null,
            displayName: lineUserDoc.profile?.displayName || lineUserDoc.displayName,
            pictureUrl: lineUserDoc.profile?.pictureUrl || lineUserDoc.pictureUrl,
            statusMessage: lineUserDoc.statusMessage,
            language: lineUserDoc.language,
            isBound: lineUserDoc.isBound,
            bindTime: lineUserDoc.bindTime,
            lastActivity: lineUserDoc.lastActivity,
            isActive: lineUserDoc.isActive,
            notificationSettings: lineUserDoc.notificationSettings,
            preferences: lineUserDoc.preferences,
            stats: lineUserDoc.stats,
            createdAt: lineUserDoc.createdAt,
            updatedAt: lineUserDoc.updatedAt
          });
          
          // 快取到記憶體存儲
          this.users.set(lineUserId, lineUser);
          if (lineUser.nexusTradeUserId) {
            this.usersByNexusTradeId.set(lineUser.nexusTradeUserId, lineUserId);
          }
          
          return lineUser;
        }
      }
    } catch (error) {
      console.warn('從 MongoDB 查詢 LINE 使用者失敗:', error.message);
    }
    
    return null;
  }

  /**
   * 根據 NexusTrade 使用者 ID 查找使用者
   * @param {string} nexusTradeUserId - NexusTrade 使用者 ID
   * @returns {LineUser|null} 使用者物件
   */
  async findByNexusTradeUserId(nexusTradeUserId) {
    // 先檢查記憶體存儲
    const lineUserId = this.usersByNexusTradeId.get(nexusTradeUserId);
    if (lineUserId && this.users.has(lineUserId)) {
      return this.users.get(lineUserId);
    }
    
    // 如果記憶體中沒有，嘗試從 MongoDB 查詢
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) { // 確保 MongoDB 已連接
        const lineUserDoc = await mongoose.connection.db.collection('lineusers').findOne({ 
          nexusTradeUserId: new mongoose.Types.ObjectId(nexusTradeUserId)
        });
        
        if (lineUserDoc) {
          // 將 MongoDB 文件轉換為 LineUser 實例並快取
          const lineUser = new LineUser({
            lineUserId: lineUserDoc.lineUserId,
            nexusTradeUserId: lineUserDoc.nexusTradeUserId ? lineUserDoc.nexusTradeUserId.toString() : null,
            displayName: lineUserDoc.profile?.displayName || lineUserDoc.displayName,
            pictureUrl: lineUserDoc.profile?.pictureUrl || lineUserDoc.pictureUrl,
            statusMessage: lineUserDoc.statusMessage,
            language: lineUserDoc.language,
            isBound: lineUserDoc.isBound,
            bindTime: lineUserDoc.bindTime,
            lastActivity: lineUserDoc.lastActivity,
            isActive: lineUserDoc.isActive,
            notificationSettings: lineUserDoc.notificationSettings,
            preferences: lineUserDoc.preferences,
            stats: lineUserDoc.stats,
            createdAt: lineUserDoc.createdAt,
            updatedAt: lineUserDoc.updatedAt
          });
          
          // 快取到記憶體存儲
          this.users.set(lineUserDoc.lineUserId, lineUser);
          this.usersByNexusTradeId.set(nexusTradeUserId, lineUserDoc.lineUserId);
          
          return lineUser;
        }
      }
    } catch (error) {
      console.warn('從 MongoDB 查詢 LINE 使用者失敗:', error.message);
    }
    
    return null;
  }

  /**
   * 建立新的 LINE 使用者
   * @param {Object} userData - 使用者資料
   * @returns {LineUser} 新建立的使用者物件
   */
  async create(userData) {
    const user = new LineUser(userData);
    const validation = user.validate();
    
    if (!validation.isValid) {
      throw new Error(`使用者資料驗證失敗: ${validation.errors.join(', ')}`);
    }
    
    this.users.set(user.lineUserId, user);
    
    // 同步到 MongoDB
    await this.syncToMongoDB(user);
    
    logger.info('建立新的 LINE 使用者', {
      lineUserId: user.lineUserId.substring(0, 8) + '...',
      displayName: user.displayName
    });
    
    return user;
  }

  /**
   * 更新使用者資料
   * @param {string} lineUserId - LINE 使用者 ID
   * @param {Object} updateData - 更新資料
   * @returns {LineUser|null} 更新後的使用者物件
   */
  async update(lineUserId, updateData) {
    const user = this.users.get(lineUserId);
    if (!user) {
      return null;
    }
    
    // 更新資料
    Object.assign(user, updateData);
    user.updatedAt = new Date();
    
    this.users.set(lineUserId, user);
    
    logger.info('LINE 使用者資料已更新', {
      lineUserId: lineUserId.substring(0, 8) + '...'
    });
    
    return user;
  }

  /**
   * 綁定 LINE 使用者到 NexusTrade 帳號
   * @param {string} lineUserId - LINE 使用者 ID
   * @param {string} nexusTradeUserId - NexusTrade 使用者 ID
   * @param {Object} userInfo - 額外的使用者資訊
   * @returns {LineUser|null} 綁定後的使用者物件
   */
  async bind(lineUserId, nexusTradeUserId, userInfo = {}) {
    let user = this.users.get(lineUserId);
    
    // 如果使用者不存在，建立新使用者
    if (!user) {
      user = await this.create({
        lineUserId,
        ...userInfo
      });
    }
    
    // 檢查 NexusTrade 使用者是否已經綁定其他 LINE 帳號
    const existingBinding = this.usersByNexusTradeId.get(nexusTradeUserId);
    if (existingBinding && existingBinding !== lineUserId) {
      throw new Error('此 NexusTrade 帳號已綁定其他 LINE 帳號');
    }
    
    // 執行綁定
    user.bindToNexusTradeUser(nexusTradeUserId, userInfo);
    
    // 更新索引
    this.usersByNexusTradeId.set(nexusTradeUserId, lineUserId);
    this.users.set(lineUserId, user);
    
    // 同步到 MongoDB
    await this.syncToMongoDB(user);
    
    return user;
  }

  /**
   * 解除綁定
   * @param {string} lineUserId - LINE 使用者 ID
   * @returns {LineUser|null} 解除綁定後的使用者物件
   */
  async unbind(lineUserId) {
    const user = this.users.get(lineUserId);
    if (!user) {
      return null;
    }
    
    // 移除 NexusTrade 使用者 ID 索引
    if (user.nexusTradeUserId) {
      this.usersByNexusTradeId.delete(user.nexusTradeUserId);
    }
    
    // 執行解除綁定
    user.unbind();
    this.users.set(lineUserId, user);
    
    return user;
  }

  /**
   * 刪除使用者
   * @param {string} lineUserId - LINE 使用者 ID
   * @returns {boolean} 是否成功刪除
   */
  async delete(lineUserId) {
    const user = this.users.get(lineUserId);
    if (!user) {
      return false;
    }
    
    // 移除索引
    if (user.nexusTradeUserId) {
      this.usersByNexusTradeId.delete(user.nexusTradeUserId);
    }
    
    // 刪除使用者
    this.users.delete(lineUserId);
    
    logger.info('LINE 使用者已刪除', {
      lineUserId: lineUserId.substring(0, 8) + '...'
    });
    
    return true;
  }

  /**
   * 取得所有使用者列表
   * @param {Object} filters - 篩選條件
   * @returns {Array} 使用者列表
   */
  async list(filters = {}) {
    let users = Array.from(this.users.values());
    
    // 應用篩選條件
    if (filters.isBound !== undefined) {
      users = users.filter(user => user.isBound === filters.isBound);
    }
    
    if (filters.isActive !== undefined) {
      users = users.filter(user => user.isActive === filters.isActive);
    }
    
    if (filters.language) {
      users = users.filter(user => user.language === filters.language);
    }
    
    return users;
  }

  /**
   * 取得統計資訊
   * @returns {Object} 統計資訊
   */
  async getStats() {
    const users = Array.from(this.users.values());
    
    return {
      totalUsers: users.length,
      boundUsers: users.filter(user => user.isBound).length,
      activeUsers: users.filter(user => user.isActive).length,
      totalMessages: users.reduce((sum, user) => sum + user.stats.totalMessages, 0),
      totalNotifications: users.reduce((sum, user) => sum + user.stats.totalNotifications, 0),
      languageDistribution: this.getLanguageDistribution(users)
    };
  }

  /**
   * 同步 LineUser 到 MongoDB
   * @param {LineUser} user - 要同步的使用者物件
   */
  async syncToMongoDB(user) {
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) { // 確保 MongoDB 已連接
        const userDoc = user.toObject();
        
        // 確保 nexusTradeUserId 是正確的格式
        if (userDoc.nexusTradeUserId && typeof userDoc.nexusTradeUserId === 'string') {
          // 如果是 ObjectId 字符串格式，轉換為 ObjectId
          if (userDoc.nexusTradeUserId.match(/^[0-9a-fA-F]{24}$/)) {
            userDoc.nexusTradeUserId = new mongoose.Types.ObjectId(userDoc.nexusTradeUserId);
          }
        }
        
        // 使用 upsert 來插入或更新
        await mongoose.connection.db.collection('lineusers').replaceOne(
          { lineUserId: user.lineUserId }, 
          userDoc, 
          { upsert: true }
        );
        
        console.log('✅ LINE 使用者已同步到 MongoDB:', user.lineUserId.substring(0, 8) + '...');
      }
    } catch (error) {
      console.warn('⚠️ 同步 LINE 使用者到 MongoDB 失敗:', error.message);
      // 不拋出錯誤，允許記憶體存儲繼續工作
    }
  }

  /**
   * 取得語言分佈統計
   * @param {Array} users - 使用者陣列
   * @returns {Object} 語言分佈
   */
  getLanguageDistribution(users) {
    const distribution = {};
    users.forEach(user => {
      const lang = user.language || 'unknown';
      distribution[lang] = (distribution[lang] || 0) + 1;
    });
    return distribution;
  }
}

// 導出類別和單例服務
module.exports = {
  LineUser,
  LineUserService,
  lineUserService: new LineUserService()
};