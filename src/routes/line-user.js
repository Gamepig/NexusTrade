/**
 * LINE 使用者管理路由
 * 
 * 提供 LINE 使用者 ID 相關的 API 端點
 */

const express = require('express');
const router = express.Router();
const lineUserController = require('../controllers/line-user.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * @route GET /api/line-user/status
 * @desc 取得 LINE 使用者管理服務狀態
 * @access Public
 */
router.get('/status', lineUserController.getStatus);

/**
 * @route POST /api/line-user/validate
 * @desc 驗證 LINE 使用者 ID 的有效性
 * @access Private (需要認證)
 */
router.post('/validate', authenticateToken, lineUserController.validateUserId);

/**
 * @route GET /api/line-user/profile/:userId
 * @desc 取得 LINE 使用者檔案資訊
 * @access Private (需要認證)
 */
router.get('/profile/:userId', authenticateToken, lineUserController.getUserProfile);

/**
 * @route GET /api/line-user/group/:groupId/members
 * @desc 取得群組成員的 LINE 使用者 ID 列表
 * @access Private (需要認證)
 * @note 需要已驗證或付費的 LINE 官方帳號
 */
router.get('/group/:groupId/members', authenticateToken, lineUserController.getGroupMembers);

/**
 * @route GET /api/line-user/room/:roomId/members
 * @desc 取得聊天室成員的 LINE 使用者 ID 列表
 * @access Private (需要認證)
 * @note 需要已驗證或付費的 LINE 官方帳號
 */
router.get('/room/:roomId/members', authenticateToken, lineUserController.getRoomMembers);

/**
 * @route GET /api/line-user/friends
 * @desc 取得好友的 LINE 使用者 ID 列表
 * @access Private (需要認證)
 * @note 需要已驗證或付費的 LINE 官方帳號
 */
router.get('/friends', authenticateToken, lineUserController.getFriends);

/**
 * @route POST /api/line-user/profiles/batch
 * @desc 批量取得多個使用者的檔案資訊
 * @access Private (需要認證)
 */
router.post('/profiles/batch', authenticateToken, lineUserController.getBatchProfiles);

/**
 * @route POST /api/line-user/extract-from-event
 * @desc 從 LINE Webhook 事件中提取使用者資訊
 * @access Private (需要認證)
 */
router.post('/extract-from-event', authenticateToken, lineUserController.extractFromEvent);

/**
 * @route POST /api/line-user/test-extract
 * @desc 測試用端點 - 從模擬事件提取使用者 ID
 * @access Public (僅開發環境)
 */
router.post('/test-extract', (req, res) => {
  // 僅在開發環境中可用
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({
      success: false,
      error: 'This endpoint is only available in development mode'
    });
  }

  // 創建模擬的 LINE 事件
  const mockEvent = {
    type: 'message',
    timestamp: Date.now(),
    source: {
      type: 'user',
      userId: 'U' + Math.random().toString(36).substring(2, 34).padEnd(32, '0')
    },
    message: {
      type: 'text',
      text: '測試訊息'
    }
  };

  try {
    const lineUserManager = new (require('../services/line-user-manager.service'))();
    const userInfo = lineUserManager.extractUserIdFromEvent(mockEvent);
    
    res.json({
      success: true,
      data: {
        mockEvent,
        extractedUserInfo: {
          ...userInfo,
          userId: userInfo.userId ? userInfo.userId.substring(0, 8) + '...' : null,
          fullUserId: userInfo.userId
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;