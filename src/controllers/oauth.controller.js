/**
 * NexusTrade OAuth 認證控制器 (統一 REST API 實作)
 * 
 * 支援 Google OAuth 2.0 和 LINE Login
 * 使用現代化的 REST API 方式，不依賴 passport
 */

const { generateToken, generateRefreshToken } = require('../utils/jwt');
const { MockUser } = require('./auth.controller.mock');
const { ApiErrorFactory } = require('../utils/ApiError');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * 生成安全的隨機 state 參數
 */
function generateSecureState() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Google OAuth 2.0 登入初始化
 */
const googleLogin = (req, res, next) => {
  try {
    logger.info('開始 Google OAuth 登入', { ip: req.ip });
    
    // 生成 state 參數防止 CSRF 攻擊
    const state = generateSecureState();
    req.session.oauthState = state;
    req.session.oauthProvider = 'google';
    
    // 構建 Google OAuth URL
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set('redirect_uri', process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback');
    googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email');
    googleAuthUrl.searchParams.set('state', state);
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');
    
    logger.info('重定向到 Google OAuth', { 
      url: googleAuthUrl.toString(),
      state,
      ip: req.ip 
    });
    
    res.redirect(googleAuthUrl.toString());
  } catch (error) {
    logger.error('Google OAuth 初始化錯誤', { error: error.message, ip: req.ip });
    res.redirect('/?error=google_init_error');
  }
};

/**
 * Google OAuth 2.0 回調處理
 */
const googleCallback = async (req, res, next) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    logger.info('Google OAuth 回調', { 
      code: code ? code.substring(0, 10) + '...' : null,
      state,
      error,
      ip: req.ip 
    });

    // 檢查是否有錯誤
    if (error) {
      logger.error('Google OAuth 回調錯誤', { error, error_description, ip: req.ip });
      return res.redirect(`/?error=google_auth_error&details=${error}`);
    }

    // 檢查是否有授權碼
    if (!code) {
      logger.warn('Google OAuth 回調無授權碼', { ip: req.ip });
      return res.redirect('/?error=missing_auth_code');
    }

    // 驗證 state 參數
    if (state !== req.session.oauthState || req.session.oauthProvider !== 'google') {
      logger.error('Google OAuth state 驗證失敗', { 
        received: state, 
        expected: req.session.oauthState,
        provider: req.session.oauthProvider,
        ip: req.ip 
      });
      return res.redirect('/?error=invalid_state');
    }

    // 使用授權碼交換 access token
    const tokenResponse = await exchangeGoogleAuthCode(code);
    
    if (!tokenResponse.access_token) {
      logger.error('Google Token 交換失敗', { response: tokenResponse, ip: req.ip });
      return res.redirect('/?error=token_exchange_failed');
    }

    // 使用 access token 獲取使用者資料
    const userProfile = await getGoogleUserProfile(tokenResponse.access_token);
    if (!userProfile) {
      logger.error('Google 使用者資料獲取失敗', { ip: req.ip });
      return res.redirect('/?error=profile_fetch_failed');
    }

    // 查找或建立使用者
    const user = await findOrCreateGoogleUser(userProfile, req.ip);
    
    // 生成 JWT Token
    const token = generateToken(user, '7d');
    const refreshToken = generateRefreshToken(user, '30d');

    logger.logUserAction(user._id, 'oauth_success', {
      provider: 'google',
      email: user.email,
      ip: req.ip
    });

    // 清理 session
    delete req.session.oauthState;
    delete req.session.oauthProvider;

    // 重定向到前端，並在 URL 中帶上 token 和使用者資料
    const redirectURL = new URL('/', req.get('origin') || 'http://localhost:3000');
    redirectURL.searchParams.set('token', token);
    redirectURL.searchParams.set('refreshToken', refreshToken);
    redirectURL.searchParams.set('oauth', 'success');
    redirectURL.searchParams.set('provider', 'google');
    
    // 添加使用者資料
    if (user.profile?.displayName) {
      redirectURL.searchParams.set('userName', user.profile.displayName);
    }
    if (user.email) {
      redirectURL.searchParams.set('userEmail', user.email);
    }
    if (user.profile?.avatar) {
      redirectURL.searchParams.set('userAvatar', user.profile.avatar);
    }

    res.redirect(redirectURL.toString());

  } catch (error) {
    logger.error('Google OAuth 回調處理錯誤', { error: error.message, stack: error.stack, ip: req.ip });
    res.redirect('/?error=oauth_processing_error');
  }
};

/**
 * LINE Login 初始化
 */
const lineLogin = (req, res, next) => {
  try {
    logger.info('開始 LINE Login', { ip: req.ip });
    
    // 生成 state 和 nonce 參數
    const state = generateSecureState();
    const nonce = generateSecureState();
    
    req.session.oauthState = state;
    req.session.oauthNonce = nonce;
    req.session.oauthProvider = 'line';
    
    // 構建 LINE Login URL
    const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
    lineAuthUrl.searchParams.set('response_type', 'code');
    lineAuthUrl.searchParams.set('client_id', process.env.LINE_CHANNEL_ID);
    lineAuthUrl.searchParams.set('redirect_uri', process.env.LINE_CALLBACK_URL || 'http://localhost:3000/api/auth/line/callback');
    lineAuthUrl.searchParams.set('scope', 'profile openid email');
    lineAuthUrl.searchParams.set('state', state);
    lineAuthUrl.searchParams.set('nonce', nonce);
    
    logger.info('重定向到 LINE Login', { 
      url: lineAuthUrl.toString(),
      state,
      ip: req.ip 
    });
    
    res.redirect(lineAuthUrl.toString());
  } catch (error) {
    logger.error('LINE Login 初始化錯誤', { error: error.message, ip: req.ip });
    res.redirect('/?error=line_init_error');
  }
};

/**
 * LINE Login 回調處理
 */
const lineCallback = async (req, res, next) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    logger.info('LINE Login 回調', { 
      code: code ? code.substring(0, 10) + '...' : null,
      state,
      error,
      ip: req.ip 
    });

    // 檢查是否有錯誤
    if (error) {
      logger.error('LINE Login 回調錯誤', { error, error_description, ip: req.ip });
      return res.redirect(`/?error=line_auth_error&details=${error}`);
    }

    // 檢查是否有授權碼
    if (!code) {
      logger.warn('LINE Login 回調無授權碼', { ip: req.ip });
      return res.redirect('/?error=missing_auth_code');
    }

    // 驗證 state 參數
    if (state !== req.session.oauthState || req.session.oauthProvider !== 'line') {
      logger.error('LINE Login state 驗證失敗', { 
        received: state, 
        expected: req.session.oauthState,
        provider: req.session.oauthProvider,
        ip: req.ip 
      });
      return res.redirect('/?error=invalid_state');
    }

    // 使用授權碼交換 access token
    const tokenResponse = await exchangeLineAuthCode(code);
    
    if (!tokenResponse.access_token) {
      logger.error('LINE Token 交換失敗', { response: tokenResponse, ip: req.ip });
      return res.redirect('/?error=token_exchange_failed');
    }

    // 使用 access token 獲取使用者資料
    const userProfile = await getLineUserProfile(tokenResponse.access_token);
    if (!userProfile) {
      logger.error('LINE 使用者資料獲取失敗', { ip: req.ip });
      return res.redirect('/?error=profile_fetch_failed');
    }

    // 查找或建立使用者
    const user = await findOrCreateLineUser(userProfile, req.ip);
    
    // 生成 JWT Token
    const token = generateToken(user, '7d');
    const refreshToken = generateRefreshToken(user, '30d');

    logger.logUserAction(user._id, 'oauth_success', {
      provider: 'line',
      email: user.email,
      ip: req.ip
    });

    // 清理 session
    delete req.session.oauthState;
    delete req.session.oauthNonce;
    delete req.session.oauthProvider;

    // 重定向到前端，並在 URL 中帶上 token 和使用者資料
    const redirectURL = new URL('/', req.get('origin') || 'http://localhost:3000');
    redirectURL.searchParams.set('token', token);
    redirectURL.searchParams.set('refreshToken', refreshToken);
    redirectURL.searchParams.set('oauth', 'success');
    redirectURL.searchParams.set('provider', 'line');
    
    // 添加使用者資料
    if (user.profile?.displayName) {
      redirectURL.searchParams.set('userName', user.profile.displayName);
    }
    if (user.email) {
      redirectURL.searchParams.set('userEmail', user.email);
    }
    if (user.profile?.avatar) {
      redirectURL.searchParams.set('userAvatar', user.profile.avatar);
    }
    // 重要：添加 LINE User ID 用於前端 LINE 連接狀態判斷
    if (user.lineId) {
      redirectURL.searchParams.set('lineUserId', user.lineId);
    }

    res.redirect(redirectURL.toString());

  } catch (error) {
    logger.error('LINE Login 回調處理錯誤', { error: error.message, stack: error.stack, ip: req.ip });
    res.redirect('/?error=oauth_processing_error');
  }
};

/**
 * 使用授權碼交換 Google access token
 */
async function exchangeGoogleAuthCode(code) {
  const fetch = require('node-fetch').default || require('node-fetch');
  
  const tokenEndpoint = 'https://oauth2.googleapis.com/token';
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET
  });

  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const tokenData = await response.json();
    
    if (!response.ok) {
      logger.error('Google Token 交換錯誤', { 
        status: response.status, 
        error: tokenData 
      });
      return { error: tokenData };
    }

    return tokenData;
  } catch (error) {
    logger.error('Google Token 交換請求失敗', { error: error.message });
    return { error: error.message };
  }
}

/**
 * 使用 access token 獲取 Google 使用者資料
 */
async function getGoogleUserProfile(accessToken) {
  const fetch = require('node-fetch').default || require('node-fetch');
  
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.error('Google 使用者資料獲取錯誤', { 
        status: response.status, 
        error: errorData 
      });
      return null;
    }

    const profile = await response.json();
    return profile;
  } catch (error) {
    logger.error('Google 使用者資料請求失敗', { error: error.message });
    return null;
  }
}

/**
 * 使用授權碼交換 LINE access token
 */
async function exchangeLineAuthCode(code) {
  const fetch = require('node-fetch').default || require('node-fetch');
  
  const tokenEndpoint = 'https://api.line.me/oauth2/v2.1/token';
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: process.env.LINE_CALLBACK_URL || 'http://localhost:3000/api/auth/line/callback',
    client_id: process.env.LINE_CHANNEL_ID,
    client_secret: process.env.LINE_CHANNEL_SECRET
  });

  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const tokenData = await response.json();
    
    if (!response.ok) {
      logger.error('LINE Token 交換錯誤', { 
        status: response.status, 
        error: tokenData 
      });
      return { error: tokenData };
    }

    return tokenData;
  } catch (error) {
    logger.error('LINE Token 交換請求失敗', { error: error.message });
    return { error: error.message };
  }
}

/**
 * 使用 access token 獲取 LINE 使用者資料
 */
async function getLineUserProfile(accessToken) {
  const fetch = require('node-fetch').default || require('node-fetch');
  
  try {
    const response = await fetch('https://api.line.me/v2/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.error('LINE 使用者資料獲取錯誤', { 
        status: response.status, 
        error: errorData 
      });
      return null;
    }

    const profile = await response.json();
    return profile;
  } catch (error) {
    logger.error('LINE 使用者資料請求失敗', { error: error.message });
    return null;
  }
}

/**
 * 查找或建立 Google 使用者
 */
async function findOrCreateGoogleUser(profile, ip) {
  try {
    // 查找是否已有此 Google 帳戶
    const user = await MockUser.findOne({ googleId: profile.id });
    
    if (user) {
      // 更新使用者資訊
      user.profile.avatar = profile.picture || user.profile.avatar;
      user.profile.displayName = profile.name || user.profile.displayName;
      user.lastLoginAt = new Date();
      user.lastLoginIP = ip;
      await user.save();
      
      logger.logUserAction(user._id, 'oauth_login', {
        provider: 'google',
        ip: ip
      });
      
      return user;
    }

    // 檢查是否已有相同 email 的帳戶
    const existingUser = await MockUser.findOne({ email: profile.email });
    if (existingUser) {
      // 連結 Google 帳戶到現有使用者
      existingUser.googleId = profile.id;
      existingUser.profile.avatar = profile.picture || existingUser.profile.avatar;
      existingUser.lastLoginAt = new Date();
      existingUser.lastLoginIP = ip;
      await existingUser.save();
      
      logger.logUserAction(existingUser._id, 'oauth_link', {
        provider: 'google',
        ip: ip
      });
      
      return existingUser;
    }

    // 建立新使用者
    const newUser = new MockUser({
      email: profile.email || `google_${profile.id}@example.com`,
      googleId: profile.id,
      username: profile.name?.replace(/\s+/g, '').toLowerCase() || `google_user_${profile.id}`,
      profile: {
        firstName: profile.given_name || '',
        lastName: profile.family_name || '',
        displayName: profile.name || '',
        avatar: profile.picture || ''
      },
      emailVerified: profile.verified_email || true,
      lastLoginAt: new Date(),
      lastLoginIP: ip,
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

    await newUser.save();

    logger.logUserAction(newUser._id, 'oauth_register', {
      provider: 'google',
      email: newUser.email,
      ip: ip
    });

    return newUser;
  } catch (error) {
    logger.error('查找或建立 Google 使用者失敗', { 
      profile, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * 查找或建立 LINE 使用者
 */
async function findOrCreateLineUser(profile, ip) {
  try {
    // 引入 LineUser 服務
    const { lineUserService } = require('../models/LineUser');
    
    // 查找是否已有此 LINE 帳戶
    const user = await MockUser.findOne({ lineId: profile.userId });
    
    if (user) {
      // 更新使用者資訊
      user.profile.avatar = profile.pictureUrl || user.profile.avatar;
      user.profile.displayName = profile.displayName || user.profile.displayName;
      user.lastLoginAt = new Date();
      user.lastLoginIP = ip;
      
      // 確保 lineUserId 欄位存在（向後相容性修復）
      if (!user.lineUserId && user.lineId) {
        user.lineUserId = user.lineId;
      }
      
      await user.save();
      
      // 確保 LineUser 服務中的綁定記錄存在且正確
      try {
        const lineUser = await lineUserService.findByLineUserId(profile.userId);
        if (!lineUser || !lineUser.isBound || lineUser.nexusTradeUserId !== user._id) {
          // 重新建立或修復綁定記錄
          await lineUserService.bind(profile.userId, user._id, {
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl
          });
          
          logger.info('修復 LINE 使用者綁定記錄', {
            lineUserId: profile.userId.substring(0, 8) + '...',
            nexusTradeUserId: user._id
          });
        }
      } catch (bindError) {
        logger.error('修復 LINE 綁定記錄失敗', {
          lineUserId: profile.userId.substring(0, 8) + '...',
          nexusTradeUserId: user._id,
          error: bindError.message
        });
      }
      
      logger.logUserAction(user._id, 'oauth_login', {
        provider: 'line',
        ip: ip
      });
      
      return user;
    }

    // 建立新使用者
    const newUser = new MockUser({
      email: `line_${profile.userId}@example.com`, // LINE 不一定提供 email
      lineId: profile.userId,
      lineUserId: profile.userId, // 添加 lineUserId 欄位確保前端相容性
      username: profile.displayName?.replace(/\s+/g, '').toLowerCase() || `line_user_${profile.userId}`,
      profile: {
        firstName: '',
        lastName: '',
        displayName: profile.displayName || '',
        avatar: profile.pictureUrl || ''
      },
      emailVerified: false, // LINE 不提供 email 驗證狀態
      lastLoginAt: new Date(),
      lastLoginIP: ip,
      settings: {
        notifications: {
          email: false,
          line: true
        },
        preferences: {
          language: 'zh-TW',
          timezone: 'Asia/Taipei',
          currency: 'USD'
        }
      }
    });

    await newUser.save();

    // 在 LineUser 服務中建立綁定記錄
    try {
      await lineUserService.bind(profile.userId, newUser._id, {
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl
      });
      
      logger.info('建立 LINE 使用者綁定記錄', {
        lineUserId: profile.userId.substring(0, 8) + '...',
        nexusTradeUserId: newUser._id
      });
    } catch (bindError) {
      logger.error('建立 LINE 綁定記錄失敗', {
        lineUserId: profile.userId.substring(0, 8) + '...',
        nexusTradeUserId: newUser._id,
        error: bindError.message
      });
      // 不拋出錯誤，允許 OAuth 流程繼續，但記錄問題
    }

    logger.logUserAction(newUser._id, 'oauth_register', {
      provider: 'line',
      email: newUser.email,
      ip: ip
    });

    return newUser;
  } catch (error) {
    logger.error('查找或建立 LINE 使用者失敗', { 
      profile, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * 取得使用者的 OAuth 連結狀態
 */
const getOAuthStatus = async (req, res) => {
  try {
    const user = await MockUser.findById(req.userId);
    if (!user) {
      throw ApiErrorFactory.notFound('使用者不存在', 'USER_NOT_FOUND');
    }

    const oauthStatus = {
      google: {
        linked: !!user.googleId,
        id: user.googleId || null
      },
      line: {
        linked: !!user.lineId,
        id: user.lineId || null
      }
    };

    res.status(200).json({
      status: 'success',
      message: '取得 OAuth 狀態成功',
      data: {
        oauth: oauthStatus
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('取得 OAuth 狀態失敗', {
      userId: req.userId,
      error: error.message
    });
    throw error;
  }
};

module.exports = {
  googleLogin,
  googleCallback,
  lineLogin,
  lineCallback,
  getOAuthStatus
};