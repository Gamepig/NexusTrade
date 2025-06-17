/**
 * JWT Token 工具函數
 * 
 * 提供 JWT Token 的生成和驗證功能
 */

const jwt = require('jsonwebtoken');

/**
 * 產生 JWT Token
 */
const generateToken = (user, expiresIn = '7d') => {
  const payload = {
    userId: user._id,
    email: user.email,
    // 可以添加其他需要的使用者資訊
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * 產生刷新 Token
 */
const generateRefreshToken = (user, expiresIn = '30d') => {
  const payload = {
    userId: user._id,
    type: 'refresh'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * 驗證刷新 Token
 */
const verifyRefreshToken = async (token, UserModel) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('不是有效的刷新 Token');
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      throw new Error('使用者不存在或帳戶已停用');
    }

    return user;
  } catch (error) {
    throw new Error('刷新 Token 無效或已過期');
  }
};

/**
 * 從 Token 中提取使用者資訊 (不驗證)
 */
const extractUserFromToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  extractUserFromToken
};