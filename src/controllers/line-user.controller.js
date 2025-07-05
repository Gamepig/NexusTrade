/**
 * LINE 使用者管理控制器
 * 
 * 提供 LINE 使用者 ID 相關的 API 端點
 */

const LineUserManagerService = require('../services/line-user-manager.service');
const logger = require('../utils/logger');

class LineUserController {
  constructor() {
    // 延遲初始化，在需要時才創建
    this.userManager = null;
    this._initAttempted = false;
  }

  // 確保 userManager 已初始化
  _ensureUserManager() {
    if (!this.userManager && !this._initAttempted) {
      try {
        this.userManager = new LineUserManagerService();
        this._initAttempted = true;
        logger.info('LineUserManagerService 初始化成功');
      } catch (error) {
        logger.error('初始化 LineUserManagerService 失敗:', error);
        this._initAttempted = true;
        throw error;
      }
    }
    return this.userManager;
  }

  /**
   * 驗證使用者 ID
   * @route POST /api/line-user/validate
   */
  async validateUserId(req, res) {
    try {
      const userManager = this._ensureUserManager();
      if (!userManager) {
        return res.status(503).json({
          success: false,
          error: 'LINE User Manager service is not available'
        });
      }

      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter: userId'
        });
      }

      const isValid = await userManager.validateUserId(userId);
      
      res.json({
        success: true,
        data: {
          userId: userId.substring(0, 8) + '...',
          isValid,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('驗證使用者 ID API 失敗:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 取得使用者檔案
   * @route GET /api/line-user/profile/:userId
   */
  async getUserProfile(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter: userId'
        });
      }

      const profile = await this.userManager.getUserProfile(userId);
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'User not found or has blocked the bot'
        });
      }

      res.json({
        success: true,
        data: {
          profile: {
            ...profile,
            userId: profile.userId.substring(0, 8) + '...' // 隱藏完整 ID
          }
        }
      });

    } catch (error) {
      logger.error('取得使用者檔案 API 失敗:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 取得群組成員 ID
   * @route GET /api/line-user/group/:groupId/members
   */
  async getGroupMembers(req, res) {
    try {
      const { groupId } = req.params;

      if (!groupId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter: groupId'
        });
      }

      const memberIds = await this.userManager.getGroupMemberUserIds(groupId);
      
      res.json({
        success: true,
        data: {
          groupId: groupId.substring(0, 8) + '...',
          memberCount: memberIds.length,
          memberIds: memberIds.map(id => id.substring(0, 8) + '...'), // 隱藏完整 ID
          fullMemberIds: memberIds, // 完整 ID 供系統使用
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('取得群組成員 API 失敗:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 取得聊天室成員 ID
   * @route GET /api/line-user/room/:roomId/members
   */
  async getRoomMembers(req, res) {
    try {
      const { roomId } = req.params;

      if (!roomId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter: roomId'
        });
      }

      const memberIds = await this.userManager.getRoomMemberUserIds(roomId);
      
      res.json({
        success: true,
        data: {
          roomId: roomId.substring(0, 8) + '...',
          memberCount: memberIds.length,
          memberIds: memberIds.map(id => id.substring(0, 8) + '...'), // 隱藏完整 ID
          fullMemberIds: memberIds, // 完整 ID 供系統使用
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('取得聊天室成員 API 失敗:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 取得好友列表
   * @route GET /api/line-user/friends
   */
  async getFriends(req, res) {
    try {
      const { continuationToken } = req.query;
      
      const result = await this.userManager.getFriendUserIds(continuationToken);
      
      res.json({
        success: true,
        data: {
          friendCount: result.userIds.length,
          friends: result.userIds.map(id => id.substring(0, 8) + '...'), // 隱藏完整 ID
          fullUserIds: result.userIds, // 完整 ID 供系統使用
          nextToken: result.next,
          hasMore: result.hasMore,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('取得好友列表 API 失敗:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 批量取得使用者檔案
   * @route POST /api/line-user/profiles/batch
   */
  async getBatchProfiles(req, res) {
    try {
      const { userIds, options = {} } = req.body;

      if (!userIds || !Array.isArray(userIds)) {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid parameter: userIds (must be array)'
        });
      }

      if (userIds.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Too many user IDs (maximum 100 per request)'
        });
      }

      const result = await this.userManager.getBatchUserProfiles(userIds, options);
      
      res.json({
        success: true,
        data: {
          ...result,
          profiles: result.profiles.map(profile => ({
            ...profile,
            userId: profile.userId.substring(0, 8) + '...' // 隱藏完整 ID
          }))
        }
      });

    } catch (error) {
      logger.error('批量取得使用者檔案 API 失敗:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 從 Webhook 事件提取使用者資訊
   * @route POST /api/line-user/extract-from-event
   */
  async extractFromEvent(req, res) {
    try {
      const { event } = req.body;

      if (!event) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter: event'
        });
      }

      const userInfo = this.userManager.extractUserIdFromEvent(event);
      
      res.json({
        success: true,
        data: {
          ...userInfo,
          userId: userInfo.userId ? userInfo.userId.substring(0, 8) + '...' : null,
          fullUserId: userInfo.userId // 完整 ID 供系統使用
        }
      });

    } catch (error) {
      logger.error('從事件提取使用者 ID API 失敗:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 取得服務狀態
   * @route GET /api/line-user/status
   */
  getStatus(req, res) {
    try {
      const userManager = this._ensureUserManager();
      
      if (!userManager) {
        return res.status(503).json({
          success: false,
          error: 'LINE User Manager service is not available'
        });
      }

      const status = userManager.getStatus();
      
      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('取得服務狀態 API 失敗:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

const lineUserController = new LineUserController();
module.exports = lineUserController;