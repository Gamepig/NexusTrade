/**
 * LINE 使用者 ID 管理服務
 * 
 * 根據 LINE 官方文件實作的使用者 ID 取得與管理功能
 * https://developers.line.biz/en/docs/messaging-api/getting-user-ids/
 * 
 * 功能：
 * 1. 從 Webhook 事件擷取使用者 ID
 * 2. 驗證使用者 ID 有效性
 * 3. 取得使用者檔案資訊
 * 4. 管理使用者資料庫
 * 5. 支援群組和多人聊天的成員 ID 取得
 */

const axios = require('axios');
const logger = require('../utils/logger');

class LineUserManagerService {
  constructor() {
    this.accessToken = process.env.LINE_ACCESS_TOKEN;
    this.apiBaseUrl = 'https://api.line.me/v2/bot';
    
    if (!this.accessToken) {
      logger.error('LINE_ACCESS_TOKEN 未設定');
      throw new Error('LINE_ACCESS_TOKEN is required');
    }
  }

  /**
   * 從 Webhook 事件中提取使用者 ID
   * @param {Object} event - LINE Webhook 事件物件
   * @returns {Object} 使用者 ID 資訊
   */
  extractUserIdFromEvent(event) {
    try {
      const result = {
        userId: null,
        sourceType: null,
        groupId: null,
        roomId: null,
        eventType: event.type,
        timestamp: event.timestamp
      };

      if (!event.source) {
        return result;
      }

      // 基本使用者 ID (適用於所有事件類型)
      result.userId = event.source.userId;
      result.sourceType = event.source.type;

      // 群組聊天額外資訊
      if (event.source.type === 'group') {
        result.groupId = event.source.groupId;
      }

      // 多人聊天額外資訊
      if (event.source.type === 'room') {
        result.roomId = event.source.roomId;
      }

      logger.info('從 Webhook 事件提取使用者 ID', {
        userId: result.userId ? result.userId.substring(0, 8) + '...' : null,
        sourceType: result.sourceType,
        eventType: result.eventType
      });

      return result;

    } catch (error) {
      logger.error('提取使用者 ID 失敗:', error);
      throw new Error(`Failed to extract user ID: ${error.message}`);
    }
  }

  /**
   * 驗證使用者 ID 的有效性
   * @param {string} userId - LINE 使用者 ID
   * @returns {Promise<boolean>} 是否為有效的使用者 ID
   */
  async validateUserId(userId) {
    try {
      if (!userId || typeof userId !== 'string') {
        return false;
      }

      // 檢查使用者 ID 格式 (U + 32 位十六進制字元)
      const userIdPattern = /^U[0-9a-f]{32}$/;
      if (!userIdPattern.test(userId)) {
        logger.warn('使用者 ID 格式不正確:', { userId });
        return false;
      }

      // 透過取得使用者檔案來驗證 ID 有效性
      const profile = await this.getUserProfile(userId);
      return profile !== null;

    } catch (error) {
      logger.error('驗證使用者 ID 失敗:', {
        userId: userId.substring(0, 8) + '...',
        error: error.message
      });
      return false;
    }
  }

  /**
   * 取得使用者檔案資訊
   * @param {string} userId - LINE 使用者 ID
   * @returns {Promise<Object|null>} 使用者檔案或 null
   */
  async getUserProfile(userId) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/profile/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const profile = {
        userId,
        displayName: response.data.displayName,
        pictureUrl: response.data.pictureUrl,
        statusMessage: response.data.statusMessage,
        language: response.data.language,
        retrievedAt: new Date().toISOString()
      };

      logger.info('成功取得使用者檔案', {
        userId: userId.substring(0, 8) + '...',
        displayName: profile.displayName
      });

      return profile;

    } catch (error) {
      if (error.response?.status === 404) {
        logger.warn('使用者不存在或已封鎖機器人:', {
          userId: userId.substring(0, 8) + '...'
        });
        return null;
      }

      logger.error('取得使用者檔案失敗:', {
        userId: userId.substring(0, 8) + '...',
        status: error.response?.status,
        error: error.message
      });
      
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  /**
   * 取得群組成員的使用者 ID 列表
   * 注意：僅適用於已驗證或付費帳號
   * @param {string} groupId - 群組 ID
   * @returns {Promise<Array>} 成員使用者 ID 列表
   */
  async getGroupMemberUserIds(groupId) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/group/${groupId}/members/ids`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      const memberIds = response.data.memberIds || [];
      
      logger.info('成功取得群組成員 ID', {
        groupId: groupId.substring(0, 8) + '...',
        memberCount: memberIds.length
      });

      return memberIds;

    } catch (error) {
      if (error.response?.status === 403) {
        logger.warn('無權限取得群組成員 ID (需要已驗證或付費帳號):', {
          groupId: groupId.substring(0, 8) + '...'
        });
        return [];
      }

      logger.error('取得群組成員 ID 失敗:', {
        groupId: groupId.substring(0, 8) + '...',
        status: error.response?.status,
        error: error.message
      });
      
      throw new Error(`Failed to get group member user IDs: ${error.message}`);
    }
  }

  /**
   * 取得多人聊天成員的使用者 ID 列表
   * 注意：僅適用於已驗證或付費帳號
   * @param {string} roomId - 聊天室 ID
   * @returns {Promise<Array>} 成員使用者 ID 列表
   */
  async getRoomMemberUserIds(roomId) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/room/${roomId}/members/ids`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      const memberIds = response.data.memberIds || [];
      
      logger.info('成功取得聊天室成員 ID', {
        roomId: roomId.substring(0, 8) + '...',
        memberCount: memberIds.length
      });

      return memberIds;

    } catch (error) {
      if (error.response?.status === 403) {
        logger.warn('無權限取得聊天室成員 ID (需要已驗證或付費帳號):', {
          roomId: roomId.substring(0, 8) + '...'
        });
        return [];
      }

      logger.error('取得聊天室成員 ID 失敗:', {
        roomId: roomId.substring(0, 8) + '...',
        status: error.response?.status,
        error: error.message
      });
      
      throw new Error(`Failed to get room member user IDs: ${error.message}`);
    }
  }

  /**
   * 取得好友列表 (使用者 ID)
   * 注意：僅適用於已驗證或付費帳號
   * @param {string} continuationToken - 分頁 token (可選)
   * @returns {Promise<Object>} 好友列表和分頁資訊
   */
  async getFriendUserIds(continuationToken = null) {
    try {
      const params = {};
      if (continuationToken) {
        params.start = continuationToken;
      }

      const response = await axios.get(`${this.apiBaseUrl}/followers/ids`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params,
        timeout: 15000
      });

      const result = {
        userIds: response.data.userIds || [],
        next: response.data.next || null,
        hasMore: !!response.data.next
      };

      logger.info('成功取得好友 ID 列表', {
        friendCount: result.userIds.length,
        hasMore: result.hasMore
      });

      return result;

    } catch (error) {
      if (error.response?.status === 403) {
        logger.warn('無權限取得好友列表 (需要已驗證或付費帳號)');
        return { userIds: [], next: null, hasMore: false };
      }

      logger.error('取得好友 ID 列表失敗:', {
        status: error.response?.status,
        error: error.message
      });
      
      throw new Error(`Failed to get friend user IDs: ${error.message}`);
    }
  }

  /**
   * 批量取得多個使用者的檔案資訊
   * @param {Array} userIds - 使用者 ID 陣列
   * @param {Object} options - 選項
   * @returns {Promise<Array>} 使用者檔案陣列
   */
  async getBatchUserProfiles(userIds, options = {}) {
    const {
      maxConcurrent = 5, // 最大並發請求數
      delay = 100 // 請求間延遲 (ms)
    } = options;

    try {
      const results = [];
      const errors = [];

      // 分批處理以避免 API 限制
      for (let i = 0; i < userIds.length; i += maxConcurrent) {
        const batch = userIds.slice(i, i + maxConcurrent);
        
        const batchPromises = batch.map(async (userId) => {
          try {
            const profile = await this.getUserProfile(userId);
            return { userId, profile, success: true };
          } catch (error) {
            return { userId, error: error.message, success: false };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(result => {
          if (result.success) {
            results.push(result.profile);
          } else {
            errors.push(result);
          }
        });

        // 延遲以避免 API 限制
        if (i + maxConcurrent < userIds.length) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      logger.info('批量取得使用者檔案完成', {
        totalRequested: userIds.length,
        successful: results.length,
        failed: errors.length
      });

      return {
        profiles: results,
        errors: errors,
        stats: {
          total: userIds.length,
          successful: results.length,
          failed: errors.length
        }
      };

    } catch (error) {
      logger.error('批量取得使用者檔案失敗:', error);
      throw new Error(`Batch get user profiles failed: ${error.message}`);
    }
  }

  /**
   * 檢查服務狀態
   * @returns {Object} 服務狀態資訊
   */
  getStatus() {
    return {
      service: 'LINE User Manager',
      version: '1.0.0',
      configured: !!this.accessToken,
      apiBaseUrl: this.apiBaseUrl,
      features: {
        extractUserId: true,
        validateUserId: true,
        getUserProfile: true,
        getGroupMembers: true,
        getRoomMembers: true,
        getFriends: true,
        batchOperations: true
      },
      limitations: {
        groupMembers: '需要已驗證或付費帳號',
        roomMembers: '需要已驗證或付費帳號',
        friends: '需要已驗證或付費帳號'
      }
    };
  }
}

module.exports = LineUserManagerService;