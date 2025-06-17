#!/usr/bin/env node

// NexusTrade API 文件生成腳本
// 自動生成 API 文件和依賴資訊

const fs = require('fs');
const path = require('path');

// 生成 API 資訊
const generateApiInfo = () => {
  const apiInfo = {
    name: "NexusTrade API",
    version: "1.0.0",
    description: "加密貨幣交易分析平台 API",
    baseUrl: "http://localhost:3000",
    lastUpdated: new Date().toISOString(),
    endpoints: {
      health: {
        path: "/health",
        method: "GET",
        description: "系統健康檢查",
        response: {
          status: "string",
          timestamp: "string",
          service: "string",
          version: "string",
          environment: "string",
          uptime: "number"
        }
      },
      notifications: {
        status: {
          path: "/api/notifications/status",
          method: "GET",
          description: "取得通知系統狀態",
          response: {
            lineMessaging: "object",
            email: "object",
            telegram: "object",
            webhook: "object"
          }
        },
        testNotification: {
          path: "/api/notifications/test",
          method: "POST",
          description: "發送測試通知",
          body: {
            method: "string",
            recipient: "string",
            message: "string"
          }
        },
        createAlert: {
          path: "/api/notifications/alerts",
          method: "POST",
          description: "建立價格警報",
          body: {
            symbol: "string",
            alertType: "string",
            targetPrice: "number",
            priority: "string"
          }
        },
        getAlerts: {
          path: "/api/notifications/alerts",
          method: "GET",
          description: "取得使用者警報列表",
          query: {
            status: "string",
            symbol: "string",
            page: "number",
            limit: "number"
          }
        }
      },
      auth: {
        login: {
          path: "/api/auth/login",
          method: "POST",
          description: "使用者登入",
          body: {
            email: "string",
            password: "string"
          }
        },
        register: {
          path: "/api/auth/register",
          method: "POST",
          description: "使用者註冊",
          body: {
            email: "string",
            password: "string",
            username: "string"
          }
        },
        logout: {
          path: "/api/auth/logout",
          method: "POST",
          description: "使用者登出"
        }
      },
      oauth: {
        googleAuth: {
          path: "/api/oauth/google",
          method: "GET",
          description: "Google OAuth 認證"
        },
        lineAuth: {
          path: "/api/oauth/line",
          method: "GET",
          description: "LINE OAuth 認證"
        }
      }
    },
    websocket: {
      endpoint: "ws://localhost:3000/ws",
      description: "即時市場數據推送",
      events: {
        connection: "建立連接",
        disconnect: "斷開連接", 
        subscribe: "訂閱市場數據",
        unsubscribe: "取消訂閱",
        priceUpdate: "價格更新推送"
      }
    }
  };

  return apiInfo;
};

// 生成依賴資訊
const generateDependencyInfo = () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const dependencyInfo = {
    name: "NexusTrade",
    version: packageJson.version,
    description: packageJson.description,
    lastUpdated: new Date().toISOString(),
    dependencies: {
      production: {},
      development: {}
    },
    summary: {
      totalDependencies: 0,
      productionDependencies: 0,
      developmentDependencies: 0
    }
  };

  // 處理生產依賴
  if (packageJson.dependencies) {
    Object.entries(packageJson.dependencies).forEach(([name, version]) => {
      dependencyInfo.dependencies.production[name] = {
        version,
        type: "production"
      };
    });
    dependencyInfo.summary.productionDependencies = Object.keys(packageJson.dependencies).length;
  }

  // 處理開發依賴
  if (packageJson.devDependencies) {
    Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
      dependencyInfo.dependencies.development[name] = {
        version,
        type: "development"
      };
    });
    dependencyInfo.summary.developmentDependencies = Object.keys(packageJson.devDependencies).length;
  }

  dependencyInfo.summary.totalDependencies = 
    dependencyInfo.summary.productionDependencies + 
    dependencyInfo.summary.developmentDependencies;

  return dependencyInfo;
};

// 主函數
const main = () => {
  console.log('🔧 生成 NexusTrade API 文件...');

  try {
    // 生成 API 資訊
    const apiInfo = generateApiInfo();
    fs.writeFileSync('api_info.json', JSON.stringify(apiInfo, null, 2));
    console.log('✅ api_info.json 生成完成');

    // 生成依賴資訊
    const dependencyInfo = generateDependencyInfo();
    fs.writeFileSync('dependency_info.json', JSON.stringify(dependencyInfo, null, 2));
    console.log('✅ dependency_info.json 生成完成');

    // 生成文件摘要
    console.log('\n📊 文件摘要:');
    console.log(`- API 端點數量: ${Object.keys(apiInfo.endpoints).length}`);
    console.log(`- 總依賴數量: ${dependencyInfo.summary.totalDependencies}`);
    console.log(`- 生產依賴: ${dependencyInfo.summary.productionDependencies}`);
    console.log(`- 開發依賴: ${dependencyInfo.summary.developmentDependencies}`);

  } catch (error) {
    console.error('❌ 文件生成失敗:', error.message);
    process.exit(1);
  }
};

// 執行腳本
if (require.main === module) {
  main();
}

module.exports = { generateApiInfo, generateDependencyInfo };