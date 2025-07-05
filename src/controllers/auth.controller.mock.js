/**
 * NexusTrade 認證控制器 (Mock 版本)
 * 
 * 用於開發和測試，不依賴 MongoDB
 */

const bcrypt = require('bcryptjs');
const { ApiErrorFactory, BusinessErrorFactory, ValidationErrorFactory } = require('../utils/ApiError');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const logger = require('../utils/logger');

// 記憶體中的使用者存儲 (開發用)
const mockUsers = new Map();

// 模擬使用者模型
class MockUser {
  constructor(data) {
    this._id = data._id || this.generateId();
    this.email = data.email.toLowerCase();
    this.password = data.password;
    this.username = data.username;
    this.profile = data.profile || {};
    this.emailVerified = data.emailVerified || false;
    this.status = data.status || 'active';
    this.settings = data.settings || {};
    this.createdAt = data.createdAt || new Date();
    this.lastLoginAt = data.lastLoginAt || null;
    this.lastLoginIP = data.lastLoginIP || null;
    this.passwordChangedAt = data.passwordChangedAt || null;
    
    // OAuth 欄位
    this.googleId = data.googleId || null;
    this.lineId = data.lineId || null;
    this.lineUserId = data.lineUserId || null; // 添加 lineUserId 欄位
    
    // 會員制度欄位
    this.membershipLevel = data.membershipLevel || 'free';
    this.membershipExpiry = data.membershipExpiry || null;
    this.alertQuota = {
      used: data.alertQuota?.used || 0,
      limit: this.getMembershipLimit(data.membershipLevel || 'free')
    };
    this.premiumFeatures = {
      technicalIndicators: (data.membershipLevel || 'free') !== 'free',
      unlimitedAlerts: (data.membershipLevel || 'free') !== 'free',
      prioritySupport: (data.membershipLevel || 'free') === 'enterprise'
    };
  }

  getMembershipLimit(level) {
    switch (level) {
      case 'free': return 1;
      case 'premium': return 50;
      case 'enterprise': return -1; // 無限制
      default: return 1;
    }
  }

  generateId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async save() {
    // 模擬密碼雜湊
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
    
    // 保存到記憶體存儲
    mockUsers.set(this._id, this);
    
    // 同步到 MongoDB（如果連接可用）
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) { // 確保 MongoDB 已連接
        const userDoc = {
          _id: this._id,
          email: this.email,
          password: this.password,
          username: this.username,
          profile: this.profile,
          emailVerified: this.emailVerified,
          status: this.status,
          settings: this.settings,
          createdAt: this.createdAt,
          lastLoginAt: this.lastLoginAt,
          lastLoginIP: this.lastLoginIP,
          passwordChangedAt: this.passwordChangedAt,
          googleId: this.googleId,
          lineId: this.lineId,
          lineUserId: this.lineUserId, // 同步 lineUserId 到 MongoDB
          membershipLevel: this.membershipLevel,
          membershipExpiry: this.membershipExpiry,
          alertQuota: this.alertQuota,
          premiumFeatures: this.premiumFeatures
        };
        
        // 使用 upsert 來插入或更新
        await mongoose.connection.db.collection('users').replaceOne(
          { _id: this._id }, 
          userDoc, 
          { upsert: true }
        );
        
        console.log('✅ 使用者已同步到 MongoDB:', this._id);
      }
    } catch (error) {
      console.warn('⚠️ 同步使用者到 MongoDB 失敗:', error.message);
      // 不拋出錯誤，允許記憶體存儲繼續工作
    }
    
    return this;
  }

  static async findOne(query) {
    // 先檢查記憶體存儲
    for (const user of mockUsers.values()) {
      if (query.email && user.email === query.email.toLowerCase()) {
        return user;
      }
      if (query.username && user.username === query.username) {
        return user;
      }
      if (query._id && user._id === query._id) {
        return user;
      }
      if (query.googleId && user.googleId === query.googleId) {
        return user;
      }
      if (query.lineId && user.lineId === query.lineId) {
        return user;
      }
    }
    
    // 如果記憶體中沒有，嘗試從 MongoDB 查詢
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) { // 確保 MongoDB 已連接
        const mongoQuery = {};
        
        if (query.email) {
          mongoQuery.email = query.email.toLowerCase();
        }
        if (query.username) {
          mongoQuery.username = query.username;
        }
        if (query._id) {
          // 檢查 ID 格式：如果是 24 字元的十六進制字符串，使用 ObjectId；否則直接使用字符串
          if (query._id && typeof query._id === 'string' && query._id.match(/^[0-9a-fA-F]{24}$/)) {
            mongoQuery._id = new mongoose.Types.ObjectId(query._id);
          } else {
            mongoQuery._id = query._id;
          }
        }
        if (query.googleId) {
          mongoQuery.googleId = query.googleId;
        }
        if (query.lineId) {
          mongoQuery.lineId = query.lineId;
        }
        
        const user = await mongoose.connection.db.collection('users').findOne(mongoQuery);
        
        if (user) {
          // 將 MongoDB 使用者轉換為 MockUser 實例並快取
          const mockUser = new MockUser({
            _id: user._id.toString(),
            email: user.email,
            password: user.password || '',
            username: user.username,
            profile: user.profile || {},
            emailVerified: user.emailVerified,
            status: user.status || 'active',
            settings: user.settings || {},
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            lastLoginIP: user.lastLoginIP,
            passwordChangedAt: user.passwordChangedAt,
            googleId: user.googleId,
            lineId: user.lineId,
            lineUserId: user.lineUserId  // 修復：添加 lineUserId 欄位
          });
          
          // 快取到記憶體存儲
          mockUsers.set(user._id.toString(), mockUser);
          return mockUser;
        }
      }
    } catch (error) {
      console.warn('從 MongoDB 查詢使用者失敗:', error.message);
    }
    
    return null;
  }

  static async findById(id) {
    // 先檢查記憶體存儲
    if (mockUsers.has(id)) {
      return mockUsers.get(id);
    }
    
    // 如果記憶體中沒有，嘗試從 MongoDB 查詢
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) { // 確保 MongoDB 已連接
        let mongoQuery;
        
        // 檢查 ID 格式：如果是 24 字元的十六進制字符串，使用 ObjectId；否則直接使用字符串
        if (id && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
          // 標準 MongoDB ObjectId 格式
          mongoQuery = { _id: new mongoose.Types.ObjectId(id) };
        } else {
          // 自定義 ID 格式（如 MockUser 生成的 ID）
          mongoQuery = { _id: id };
        }
        
        const user = await mongoose.connection.db.collection('users').findOne(mongoQuery);
        
        if (user) {
          // 將 MongoDB 使用者轉換為 MockUser 實例並快取
          const mockUser = new MockUser({
            _id: user._id.toString(),
            email: user.email,
            password: user.password || '',
            username: user.username,
            profile: user.profile || {},
            emailVerified: user.emailVerified,
            status: user.status || 'active',
            settings: user.settings || {},
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            lastLoginIP: user.lastLoginIP,
            passwordChangedAt: user.passwordChangedAt,
            googleId: user.googleId,
            lineId: user.lineId,
            lineUserId: user.lineUserId  // 修復：添加 lineUserId 欄位
          });
          
          // 快取到記憶體存儲
          mockUsers.set(id, mockUser);
          return mockUser;
        }
      }
    } catch (error) {
      console.warn('從 MongoDB 查詢使用者失敗:', error.message);
    }
    
    return null;
  }

  select(fields) {
    // 模擬 select 方法，返回自己
    return this;
  }
}

/**
 * 使用者註冊
 */
const register = async (req, res) => {
  const { email, password, username, firstName, lastName } = req.body;

  try {
    // 驗證必填欄位
    if (!email || !password) {
      throw ValidationErrorFactory.missingRequiredFields(['email', 'password']);
    }

    // 檢查信箱是否已被使用
    const existingUser = await MockUser.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw BusinessErrorFactory.userAlreadyExists(email);
    }

    // 檢查使用者名稱是否已被使用
    if (username) {
      const existingUsername = await MockUser.findOne({ username });
      if (existingUsername) {
        throw BusinessErrorFactory.usernameAlreadyExists(username);
      }
    }

    // 建立新使用者
    const user = new MockUser({
      email: email.toLowerCase(),
      password,
      username: username || email.split('@')[0],
      profile: {
        firstName: firstName || '',
        lastName: lastName || '',
        displayName: firstName && lastName ? `${firstName} ${lastName}` : username || email.split('@')[0]
      },
      settings: {
        notifications: {
          email: true,
          line: false
        },
        preferences: {
          language: 'zh-TW',
          timezone: 'Asia/Taipei',
          currency: 'USD'
        }
      }
    });

    await user.save();

    // 產生 JWT Token
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // 記錄註冊事件
    logger.logUserAction(user._id, 'register', {
      email: user.email,
      method: 'email_password',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // 回傳使用者資料 (不包含敏感資訊)
    const userResponse = {
      id: user._id,
      email: user.email,
      username: user.username,
      profile: user.profile,
      emailVerified: user.emailVerified,
      status: user.status,
      createdAt: user.createdAt
    };

    res.status(201).json({
      status: 'success',
      message: '使用者註冊成功 (Mock)',
      data: {
        user: userResponse,
        token,
        refreshToken,
        expiresIn: '7d'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('使用者註冊失敗', {
      email,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * 使用者登入
 */
const login = async (req, res) => {
  const { email, password, remember = false } = req.body;

  try {
    // 驗證必填欄位
    if (!email || !password) {
      throw ValidationErrorFactory.missingRequiredFields(['email', 'password']);
    }

    // 查找使用者
    const user = await MockUser.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw BusinessErrorFactory.invalidCredentials();
    }

    // 檢查帳戶狀態
    if (user.status !== 'active') {
      throw BusinessErrorFactory.accountDisabled();
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // 記錄失敗的登入嘗試
      logger.logUserAction(user._id, 'login_failed', {
        email: user.email,
        reason: 'invalid_password',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      throw BusinessErrorFactory.invalidCredentials();
    }

    // 更新最後登入時間
    user.lastLoginAt = new Date();
    user.lastLoginIP = req.ip;
    await user.save();

    // 產生 JWT Token
    const tokenExpiry = remember ? '30d' : '7d';
    const token = generateToken(user, tokenExpiry);
    const refreshToken = generateRefreshToken(user, '30d');

    // 記錄成功登入
    logger.logUserAction(user._id, 'login_success', {
      email: user.email,
      method: 'email_password',
      remember,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // 回傳使用者資料
    const userResponse = {
      id: user._id,
      email: user.email,
      username: user.username,
      profile: user.profile,
      emailVerified: user.emailVerified,
      status: user.status,
      lastLoginAt: user.lastLoginAt
    };

    res.status(200).json({
      status: 'success',
      message: '登入成功 (Mock)',
      data: {
        user: userResponse,
        token,
        refreshToken,
        expiresIn: tokenExpiry
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('使用者登入失敗', {
      email,
      error: error.message,
      ip: req.ip
    });
    throw error;
  }
};

/**
 * 使用者登出
 */
const logout = async (req, res) => {
  try {
    const userId = req.userId;
    const token = req.token;

    // 記錄登出事件
    if (userId) {
      logger.logUserAction(userId, 'logout', {
        method: 'manual',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    res.status(200).json({
      status: 'success',
      message: '登出成功 (Mock)',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('使用者登出失敗', {
      userId: req.userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * 刷新 Token (Mock 版本)
 */
const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    if (!refreshToken) {
      throw ValidationErrorFactory.missingRequiredFields(['refreshToken']);
    }

    // 簡化版的 Token 驗證
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      
      if (decoded.type !== 'refresh') {
        throw new Error('不是有效的刷新 Token');
      }

      const user = await MockUser.findById(decoded.userId);
      if (!user || user.status !== 'active') {
        throw new Error('使用者不存在或帳戶已停用');
      }

      // 產生新的 Token
      const newToken = generateToken(user);
      const newRefreshToken = generateRefreshToken(user);

      // 記錄 Token 刷新
      logger.logUserAction(user._id, 'token_refresh', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(200).json({
        status: 'success',
        message: 'Token 刷新成功 (Mock)',
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
          expiresIn: '7d'
        },
        timestamp: new Date().toISOString()
      });

    } catch (jwtError) {
      throw ApiErrorFactory.unauthorized('刷新 Token 無效或已過期', 'REFRESH_TOKEN_INVALID');
    }

  } catch (error) {
    logger.error('Token 刷新失敗', {
      error: error.message,
      ip: req.ip
    });
    throw error;
  }
};

/**
 * 驗證 Token
 */
const verify = async (req, res) => {
  try {
    // Token 已在中介軟體中驗證，req.user 應該存在
    const user = req.user || await MockUser.findById(req.userId);

    if (!user) {
      throw ApiErrorFactory.unauthorized('無效的 Token', 'INVALID_TOKEN');
    }

    const userResponse = {
      id: user._id,
      email: user.email,
      username: user.username,
      profile: user.profile,
      emailVerified: user.emailVerified,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      // 添加 OAuth 相關欄位
      googleId: user.googleId,
      lineId: user.lineId,
      lineUserId: user.lineUserId,
      provider: user.profile?.provider || (user.googleId ? 'google' : user.lineId ? 'line' : null)
    };

    res.status(200).json({
      status: 'success',
      message: 'Token 驗證成功 (Mock)',
      data: {
        user: userResponse,
        tokenValid: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Token 驗證失敗', {
      error: error.message,
      ip: req.ip
    });
    throw error;
  }
};

/**
 * 取得當前使用者資訊
 */
const getMe = async (req, res) => {
  try {
    const user = req.user || await MockUser.findById(req.userId);

    if (!user) {
      throw ApiErrorFactory.unauthorized('需要認證', 'AUTHENTICATION_REQUIRED');
    }

    const userResponse = {
      id: user._id,
      email: user.email,
      username: user.username,
      profile: user.profile,
      emailVerified: user.emailVerified,
      status: user.status,
      settings: user.settings,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      membershipLevel: user.membershipLevel,
      membershipExpiry: user.membershipExpiry,
      alertQuota: user.alertQuota,
      premiumFeatures: user.premiumFeatures,
      // 添加 OAuth 相關欄位
      googleId: user.googleId,
      lineId: user.lineId,
      lineUserId: user.lineUserId,
      provider: user.profile?.provider || (user.googleId ? 'google' : user.lineId ? 'line' : null),
      accountStats: {
        notificationRulesCount: 0,
        watchlistCount: 0
      }
    };

    res.status(200).json({
      status: 'success',
      message: '取得使用者資訊成功 (Mock)',
      data: {
        user: userResponse
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('取得使用者資訊失敗', {
      userId: req.userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * 更改密碼
 */
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // 驗證必填欄位
    if (!currentPassword || !newPassword) {
      throw ValidationErrorFactory.missingRequiredFields(['currentPassword', 'newPassword']);
    }

    const user = await MockUser.findById(req.userId);
    if (!user) {
      throw BusinessErrorFactory.userNotFound(req.userId);
    }

    // 驗證當前密碼
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw BusinessErrorFactory.invalidCredentials('當前密碼不正確');
    }

    // 檢查新密碼是否與當前密碼相同
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw ValidationErrorFactory.invalidInput('新密碼不能與當前密碼相同');
    }

    // 更新密碼
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // 記錄密碼變更
    logger.logUserAction(user._id, 'password_change', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      status: 'success',
      message: '密碼更改成功 (Mock)',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('更改密碼失敗', {
      userId: req.userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * 忘記密碼 (發送重設郵件)
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      throw ValidationErrorFactory.missingRequiredFields(['email']);
    }

    const user = await MockUser.findOne({ email: email.toLowerCase() });
    
    if (user && user.status === 'active') {
      logger.logUserAction(user._id, 'password_reset_request', {
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    res.status(200).json({
      status: 'success',
      message: '如果該信箱存在，將會收到密碼重設郵件 (Mock)',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('忘記密碼處理失敗', {
      email,
      error: error.message
    });
    throw error;
  }
};

/**
 * 重設密碼
 */
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      throw ValidationErrorFactory.missingRequiredFields(['token', 'newPassword']);
    }

    res.status(501).json({
      status: 'error',
      message: '密碼重設功能尚未完全實現 (Mock)',
      code: 'NOT_IMPLEMENTED',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('重設密碼失敗', {
      error: error.message
    });
    throw error;
  }
};

// 輔助函數：取得所有 Mock 使用者 (開發用)
const getAllUsers = () => {
  return Array.from(mockUsers.values()).map(user => ({
    id: user._id,
    email: user.email,
    username: user.username,
    profile: user.profile,
    status: user.status,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  }));
};

module.exports = {
  register,
  login,
  logout,
  refresh,
  verify,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  getAllUsers, // 僅用於開發
  MockUser     // 僅用於開發
};