# NexusTrade GCP 部署完整指南

## 🎯 部署方案選擇

### 方案 A：Cloud Run + MongoDB Atlas（推薦）
**適合：快速部署、自動擴縮容、按需付費**

- **應用層**：Cloud Run（無伺服器）
- **資料庫**：MongoDB Atlas（完全託管）
- **快取**：Memorystore for Redis
- **CDN**：Cloud CDN + Cloud Load Balancing

**預估成本**：$50-150/月（依使用量）

### 方案 B：GKE + 完整容器化
**適合：高度客製化、完整控制**

- **容器編排**：Google Kubernetes Engine
- **資料庫**：Cloud SQL 或 MongoDB 容器
- **快取**：Redis 容器或 Memorystore
- **負載平衡**：GKE Ingress

**預估成本**：$100-300/月

### 方案 C：Compute Engine + Docker Compose
**適合：現有架構遷移、成本控制**

- **虛擬機**：Compute Engine (n1-standard-2)
- **容器**：直接使用現有 Docker Compose
- **資料庫**：VM 內 MongoDB 容器
- **負載平衡**：HTTP Load Balancer

**預估成本**：$80-200/月

## 🔑 GCP 帳號和權限要求

### 📋 必要的 GCP 帳號資訊

#### 1. **Google Cloud 帳號**
- **Gmail 帳號** 或 **G Suite 帳號**
- 具有創建專案權限的帳號
- **計費帳戶**已啟用（部署需要使用付費服務）

#### 2. **GCP 專案設定**
```bash
# 創建專案需要的資訊
PROJECT_ID="nexustrade-prod"          # 專案 ID（全球唯一）
PROJECT_NAME="NexusTrade Production"  # 專案顯示名稱
BILLING_ACCOUNT="YOUR_BILLING_ACCOUNT" # 計費帳戶 ID
```

#### 3. **本地工具安裝**
```bash
# 檢查是否已安裝
gcloud --version  # Google Cloud SDK
docker --version  # Docker
```

### 🚀 快速設定步驟

#### 步驟 1：認證登入
```bash
# 登入 Google Cloud
gcloud auth login

# 設定應用程式預設憑證
gcloud auth application-default login
```

#### 步驟 2：專案設定
```bash
# 創建新專案（如果還沒有）
gcloud projects create nexustrade-prod --name="NexusTrade Production"

# 設定預設專案
gcloud config set project nexustrade-prod

# 啟用計費（需要計費帳戶 ID）
gcloud beta billing projects link nexustrade-prod --billing-account=YOUR_BILLING_ACCOUNT
```

#### 步驟 3：取得計費帳戶 ID
```bash
# 列出可用的計費帳戶
gcloud beta billing accounts list

# 輸出格式：
# ACCOUNT_ID                NAME                OPEN  MASTER_ACCOUNT_ID
# 0X0X0X-0X0X0X-0X0X0X     My Billing Account  True
```

### 📋 所需權限清單

#### **專案層級權限**
- **Project Owner** 或以下組合權限：
  - `resourcemanager.projects.create`
  - `billing.projects.link`
  - `serviceusage.services.enable`
  - `iam.serviceAccounts.create`
  - `iam.serviceAccountKeys.create`

#### **服務特定權限**
- **Cloud Run Admin** - 部署和管理 Cloud Run 服務
- **Secret Manager Admin** - 管理 Secret Manager
- **Cloud Build Editor** - 建置 Docker 映像
- **Storage Admin** - 管理 Container Registry
- **Service Account Admin** - 創建和管理服務帳戶

### 🔐 外部服務帳號資訊

除了 GCP 帳號，您還需要以下外部服務的 API 憑證：

#### **必要服務（部署時需要）**
```bash
# MongoDB Atlas
MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/nexustrade"

# OpenRouter AI（用於 AI 分析）
OPENROUTER_API_KEY="your-openrouter-api-key"

# Binance API（用於市場數據）
BINANCE_API_KEY="your-binance-api-key"
BINANCE_API_SECRET="your-binance-api-secret"

# JWT 密鑰（可自動生成）
JWT_SECRET="your-super-secure-jwt-secret"
```

#### **可選服務（功能完整性）**
```bash
# Google OAuth（用於 Google 登入）
GOOGLE_CLIENT_ID="your-google-client-id.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# LINE 服務（用於 LINE 登入和訊息）
LINE_CHANNEL_ID="your-line-channel-id"
LINE_CHANNEL_SECRET="your-line-channel-secret"
LINE_ACCESS_TOKEN="your-line-access-token"
```

### 🛠️ 自動化部署準備

#### 使用完整部署腳本
```bash
# 腳本會自動檢查權限和設定
./scripts/gcp-deploy-complete.sh nexustrade-prod asia-east1 production
```

#### 腳本會自動處理：
- ✅ 檢查 GCP 認證狀態
- ✅ 驗證專案存在和權限
- ✅ 啟用必要的 API
- ✅ 創建服務帳戶和 IAM 設定
- ✅ 互動式設定所有 Secrets

### 💡 取得帳號資訊的方法

#### **1. 檢查當前設定**
```bash
# 檢查已登入的帳號
gcloud auth list

# 檢查當前專案
gcloud config get-value project

# 檢查計費帳戶
gcloud beta billing accounts list
```

#### **2. 檢查必要權限**
```bash
# 檢查專案權限
gcloud projects get-iam-policy nexustrade-prod

# 檢查是否能創建服務帳戶
gcloud iam service-accounts list
```

#### **3. 快速驗證**
```bash
# 使用部署腳本進行自動檢查
./scripts/gcp-deploy-complete.sh --help

# 或使用 secrets 管理工具檢查
./scripts/gcp-secrets-manager.sh nexustrade-prod verify
```

### 🚨 常見問題解決

#### **權限不足**
```bash
# 如果遇到權限錯誤，請聯繫 GCP 專案管理員
# 或確保帳號具有足夠權限
```

#### **計費未啟用**
```bash
# 確保專案已連結到有效的計費帳戶
gcloud beta billing projects describe nexustrade-prod
```

#### **API 未啟用**
```bash
# 腳本會自動啟用，或手動啟用
gcloud services enable cloudbuild.googleapis.com run.googleapis.com
```

### 🎯 最小權限原則

如果您不是專案 Owner，請要求管理員授予以下**最小必要權限**：

```bash
# 必要角色清單
roles/run.admin              # Cloud Run 管理
roles/secretmanager.admin    # Secret Manager 管理  
roles/cloudbuild.builds.editor  # Cloud Build 編輯
roles/storage.admin          # Container Registry
roles/iam.serviceAccountAdmin   # 服務帳戶管理
roles/serviceusage.serviceUsageAdmin  # API 啟用
```

## 📋 部署前準備清單

### 1. GCP 專案設定
```bash
# 建立新專案
gcloud projects create nexustrade-prod --name="NexusTrade Production"

# 設定預設專案
gcloud config set project nexustrade-prod

# 啟用計費
gcloud beta billing projects link nexustrade-prod --billing-account=YOUR_BILLING_ACCOUNT
```

### 2. 必要 API 啟用
```bash
# 啟用所有必要的 API
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  compute.googleapis.com \
  container.googleapis.com
```

### 3. 權限設定
```bash
# 建立服務帳戶
gcloud iam service-accounts create nexustrade-sa \
  --display-name="NexusTrade Service Account"

# 授予必要權限
gcloud projects add-iam-policy-binding nexustrade-prod \
  --member="serviceAccount:nexustrade-sa@nexustrade-prod.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding nexustrade-prod \
  --member="serviceAccount:nexustrade-sa@nexustrade-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 🚀 Cloud Run 部署流程

### 🎯 部署方案選擇

#### 方案 1：完整自動化部署（推薦生產環境）
使用 `gcp-deploy-complete.sh` 進行全面的生產環境部署：

```bash
# 完整部署（包含監控、警報、安全設定）
./scripts/gcp-deploy-complete.sh nexustrade-prod asia-east1 production

# 或使用互動式設定
./scripts/gcp-deploy-complete.sh
```

**包含功能：**
- ✅ 自動專案驗證和 API 啟用
- ✅ 服務帳戶和 IAM 設定
- ✅ 互動式 Secrets 管理
- ✅ Docker 映像建置和推送
- ✅ Cloud Run 服務部署
- ✅ 監控和警報設定
- ✅ 部署驗證和測試
- ✅ 完整錯誤處理和回滾機制

#### 方案 2：快速部署（適合測試和開發）
使用 `gcp-quick-deploy.sh` 進行快速部署：

```bash
# 快速部署（使用預設配置）
./scripts/gcp-quick-deploy.sh nexustrade-dev asia-east1
```

**特點：**
- ⚡ 快速設定，5 分鐘內完成
- 🔧 使用預設 Secrets 配置
- 📊 基本資源配置
- ⚠️ 不適合生產環境

#### 方案 3：分步驟手動部署
適合需要精細控制的情況：

```bash
# 步驟 1：管理 Secrets
./scripts/gcp-secrets-manager.sh [PROJECT_ID] setup

# 步驟 2：執行部署
./scripts/deploy-cloudrun.sh nexustrade-prod asia-east1

# 步驟 3：設定監控
./scripts/gcp-monitoring-setup.sh nexustrade-prod asia-east1 nexustrade admin@example.com
```

### 📋 詳細部署步驟

#### 步驟 1：Secrets 管理
使用專用的 Secrets 管理工具：

```bash
# 互動式設定所有 secrets
./scripts/gcp-secrets-manager.sh nexustrade-prod setup

# 驗證 secrets
./scripts/gcp-secrets-manager.sh nexustrade-prod verify

# 列出 secrets 狀態
./scripts/gcp-secrets-manager.sh nexustrade-prod list
```

支援的 Secrets：
- `mongodb-uri` - MongoDB Atlas 連接字串
- `jwt-secret` - JWT 簽名密鑰（可自動生成）
- `google-client-id/secret` - Google OAuth 配置
- `line-client-id/secret` - LINE Login 配置  
- `binance-api-key/secret` - Binance API 配置
- `openrouter-api-key` - OpenRouter AI API 配置

#### 步驟 2：執行部署
使用完整部署腳本：

```bash
./scripts/gcp-deploy-complete.sh [PROJECT_ID] [REGION] [ENVIRONMENT]
```

**參數說明：**
- `PROJECT_ID`: Google Cloud 專案 ID（預設: nexustrade-prod）
- `REGION`: 部署區域（預設: asia-east1）
- `ENVIRONMENT`: 環境名稱（預設: production）

**部署特色：**
- 🔍 自動相依性檢查
- 🔐 GCP 認證驗證
- 📋 專案存在性檢查
- 🔧 API 自動啟用
- 👤 服務帳戶設定
- 🏗️ 多階段 Docker 建置
- 🚀 Cloud Run 優化部署
- 📊 監控和日誌設定

#### 步驟 3：設定監控和警報

```bash
# 完整監控設定
./scripts/gcp-monitoring-setup.sh nexustrade-prod asia-east1 nexustrade admin@example.com
```

**監控功能：**
- 📈 自訂監控儀表板
- 🚨 多重警報策略（延遲、錯誤率、記憶體、實例數）
- ⏰ Uptime 檢查設定
- 📝 日誌型警報
- 📧 電子郵件通知頻道
- 🔄 日誌保留策略

### 步驟 4：設定自訂網域（可選）
```bash
# 新增網域映射
gcloud run domain-mappings create \
  --service nexustrade \
  --domain nexustrade.com \
  --region asia-east1
```

## 🗄️ 資料庫設定選項

### 選項 1：MongoDB Atlas（推薦）
```bash
# 在 MongoDB Atlas 建立叢集
# 1. 前往 https://cloud.mongodb.com
# 2. 建立新叢集（建議 M10 或以上）
# 3. 設定網路存取（允許 0.0.0.0/0 或特定 IP）
# 4. 建立資料庫使用者
# 5. 取得連接字串並更新 mongodb-uri secret
```

### 選項 2：Cloud SQL（需要程式修改）
```bash
# 建立 Cloud SQL PostgreSQL 實例
gcloud sql instances create nexustrade-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-east1 \
  --root-password=your-secure-password

# 建立資料庫
gcloud sql databases create nexustrade --instance=nexustrade-db

# 建立使用者
gcloud sql users create nexustrade-user \
  --instance=nexustrade-db \
  --password=your-app-password
```

## ⚡ Redis 快取設定

### 使用 Memorystore for Redis
```bash
# 建立 Redis 實例
gcloud redis instances create nexustrade-cache \
  --size=1 \
  --region=asia-east1 \
  --redis-version=redis_7_0

# 取得 Redis IP 位址
gcloud redis instances describe nexustrade-cache --region=asia-east1
```

## 🔧 進階配置

### 1. 自動擴縮容設定
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: nexustrade
  annotations:
    autoscaling.knative.dev/minScale: "1"
    autoscaling.knative.dev/maxScale: "100"
    run.googleapis.com/cpu-throttling: "false"
    run.googleapis.com/execution-environment: gen2
```

### 2. 監控和日誌
```bash
# 設定 Cloud Monitoring 警報
gcloud alpha monitoring policies create \
  --policy-from-file=monitoring-policy.yaml
```

### 3. CI/CD Pipeline
使用提供的 `.github/workflows/deploy-gcp.yml` 設定自動部署：

1. 設定 GitHub Secrets：
   - `GCP_PROJECT_ID`
   - `WIF_PROVIDER`
   - `WIF_SERVICE_ACCOUNT`

2. 設定 Workload Identity Federation
3. 推送到 main 分支自動觸發部署

## 💰 成本優化建議

### 1. Cloud Run 成本優化
- 設定適當的 CPU 和記憶體限制
- 使用 `min-instances=0` 在無流量時縮放到零
- 設定適當的 `concurrency` 值

### 2. 資料庫成本優化
- MongoDB Atlas：選擇適當的叢集大小
- Cloud SQL：使用自動調整儲存空間
- 定期清理不必要的日誌和資料

### 3. 網路成本優化
- 使用 Cloud CDN 減少重複請求
- 選擇距離使用者最近的區域
- 適當的快取策略

## ⚙️ 環境變數配置系統

NexusTrade 提供完整的環境變數配置系統，基於專案中真實使用的環境變數自動生成。所有環境變數都經過專案代碼分析，確保涵蓋實際需求。

### 📋 環境變數發現過程

系統透過搜尋專案中所有 `process.env` 的使用來自動發現環境變數：

```bash
# 搜尋命令
grep -r "process\.env\." src/
```

總共發現 **60+ 個環境變數**，分為 9 大功能類別：

### 🏷️ 環境變數分類

#### **1. 核心設定 (6 個)**
- `NODE_ENV` - 應用程式運行環境 (development, production, test)
- `PORT` - 應用程式監聽埠號 (預設: 3000, Cloud Run 使用 8080)
- `APP_NAME` - 應用程式名稱 (預設: NexusTrade)
- `APP_URL` - 應用程式基礎 URL
- `WEBSITE_URL` - 網站 URL，用於 LINE 訊息模板
- `BUILD_DATE` - 建置時間戳

#### **2. 安全設定 (3 個)**
- `JWT_SECRET` - JWT 簽名密鑰 (必須是強隨機字串)
- `SESSION_SECRET` - Express Session 密鑰
- `CORS_ORIGIN` - 允許的 CORS 來源，多個值用逗號分隔

#### **3. 資料庫設定 (3 個)**
- `MONGODB_URI` - MongoDB 生產環境連接字串
- `MONGODB_TEST_URI` - MongoDB 測試環境連接字串
- `SKIP_MONGODB` - 是否跳過 MongoDB 連接 (true/false)

#### **4. Google OAuth (3 個)**
- `GOOGLE_CLIENT_ID` - Google OAuth 2.0 Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth 2.0 Client Secret
- `GOOGLE_CALLBACK_URL` - Google OAuth 回調 URL

#### **5. LINE 服務 (10 個)**
**LOGIN 服務**:
- `LINE_CHANNEL_ID` - LINE Login Channel ID
- `LINE_CHANNEL_SECRET` - LINE Login Channel Secret
- `LINE_CALLBACK_URL` - LINE Login 回調 URL

**MESSAGING API**:
- `LINE_ACCESS_TOKEN` - LINE Bot Channel Access Token
- `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` - LINE Messaging Channel Access Token
- `LINE_MESSAGING_CHANNEL_SECRET` - LINE Messaging Channel Secret
- `LINE_MESSAGING_WEBHOOK_URL` - LINE Messaging Webhook URL

**NOTIFY 服務**:
- `LINE_NOTIFY_CLIENT_ID` - LINE Notify Client ID
- `LINE_NOTIFY_CLIENT_SECRET` - LINE Notify Client Secret
- `LINE_NOTIFY_REDIRECT_URI` - LINE Notify 重定向 URI

#### **6. Binance API (5 個)**
- `BINANCE_API_KEY` - Binance API Key (只需讀取權限)
- `BINANCE_API_SECRET` - Binance API Secret
- `BINANCE_API_URL` - Binance API Base URL (預設: https://api.binance.com)
- `BINANCE_WEBSOCKET_URL` - Binance WebSocket URL
- `BINANCE_WEBSOCKET_STREAM_URL` - Binance WebSocket Stream URL

#### **7. OpenRouter AI (3 個)**
- `OPENROUTER_API_KEY` - OpenRouter API Key，用於 AI 分析服務
- `OPENROUTER_DEFAULT_MODEL` - 預設 AI 模型 (預設: qwen/qwen-2.5-72b-instruct:free)
- `OPENROUTER_FALLBACK_MODEL` - 備用 AI 模型 (預設: meta-llama/llama-3.1-8b-instruct:free)

#### **8. 通知服務 (7 個)**
**SMTP 設定**:
- `SMTP_HOST` - SMTP 伺服器主機
- `SMTP_USER` - SMTP 用戶名
- `SMTP_PASS` - SMTP 密碼
- `SMTP_PORT` - SMTP 埠號

**其他通知**:
- `TELEGRAM_BOT_TOKEN` - Telegram Bot Token
- `TELEGRAM_WEBHOOK_URL` - Telegram Webhook URL
- `DEFAULT_WEBHOOK_URL` - 預設 Webhook URL

#### **9. 系統設定 (6 個)**
- `LOG_LEVEL` - 日誌等級 (debug, info, warn, error)
- `DEBUG` - 除錯模式開關
- `SWAGGER_ENABLED` - 是否啟用 Swagger API 文檔 (true/false)
- `UPLOAD_MAX_SIZE` - 檔案上傳大小限制 (如: 10MB)
- `MAX_NOTIFICATIONS_PER_USER` - 每用戶最大通知數量
- `CACHE_TTL` - 快取存活時間（秒）

### 🔐 Secret Manager 映射

敏感環境變數會自動映射到 GCP Secret Manager：

| 環境變數 | Secret 名稱 | 說明 |
|----------|-------------|------|
| `MONGODB_URI` | `mongodb-uri` | MongoDB 連接字串 |
| `JWT_SECRET` | `jwt-secret` | JWT 簽名密鑰 |
| `GOOGLE_CLIENT_ID` | `google-client-id` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | `google-client-secret` | Google OAuth Client Secret |
| `LINE_CHANNEL_ID` | `line-client-id` | LINE Channel ID |
| `LINE_CHANNEL_SECRET` | `line-client-secret` | LINE Channel Secret |
| `LINE_ACCESS_TOKEN` | `line-access-token` | LINE Access Token |
| `BINANCE_API_KEY` | `binance-api-key` | Binance API Key |
| `BINANCE_API_SECRET` | `binance-api-secret` | Binance API Secret |
| `OPENROUTER_API_KEY` | `openrouter-api-key` | OpenRouter API Key |

### 📁 配置檔案

#### **`scripts/gcp-env-simple.sh`** - 環境變數配置檔案
包含所有環境變數的定義、描述和輔助函數：

```bash
# 查看所有環境變數摘要
./scripts/gcp-env-simple.sh

# 在其他腳本中使用
source scripts/gcp-env-simple.sh
```

#### **`scripts/env-template.txt`** - 環境變數範本
開發者可用的完整環境變數範本檔案：

```bash
# 複製範本並設定開發環境
cp scripts/env-template.txt .env
# 編輯 .env 填入真實的值
```

### 🛠️ 使用方法

#### **開發環境設定**
1. 複製環境變數範本：
   ```bash
   cp scripts/env-template.txt .env
   ```

2. 編輯 `.env` 檔案，至少需要設定以下必要變數：
   ```bash
   # 必要的環境變數
   NODE_ENV=development
   JWT_SECRET=your-super-secure-jwt-secret-change-this
   MONGODB_URI=mongodb://localhost:27017/nexustrade
   OPENROUTER_API_KEY=your-openrouter-api-key
   BINANCE_API_KEY=your-binance-api-key
   BINANCE_API_SECRET=your-binance-api-secret
   ```

3. 執行應用程式：
   ```bash
   npm run dev
   ```

#### **生產環境設定**
使用 Secret Manager 安全地管理敏感資料：

```bash
# 互動式設定所有 secrets
./scripts/gcp-secrets-manager.sh nexustrade-prod setup

# 驗證 secrets 設定
./scripts/gcp-secrets-manager.sh nexustrade-prod verify

# 列出 secrets 狀態
./scripts/gcp-secrets-manager.sh nexustrade-prod list
```

#### **查看配置摘要**
```bash
# 查看所有環境變數和說明
./scripts/gcp-env-simple.sh

# 取得特定環境變數的描述
source scripts/gcp-env-simple.sh
get_env_var_description "JWT_SECRET"
```

### ⚙️ 自動化功能

環境變數配置系統提供以下自動化功能：

#### **Cloud Run 環境變數生成**
```bash
source scripts/gcp-env-simple.sh
prepare_cloudrun_env_vars
# 輸出: NODE_ENV=production,PORT=8080,APP_NAME=NexusTrade,...
```

#### **Cloud Run Secrets 映射生成**
```bash
source scripts/gcp-env-simple.sh
PROJECT_ID="your-project" prepare_cloudrun_secrets
# 輸出: MONGODB_URI=projects/your-project/secrets/mongodb-uri:latest,...
```

#### **必要環境變數檢查**
```bash
source scripts/gcp-env-simple.sh
check_required_env_vars
# 檢查並報告缺少的必要環境變數
```

### 🔧 設定來源連結

各服務的設定方式和取得憑證的連結：

- **Google OAuth**: [Google Cloud Console - API 憑證](https://console.developers.google.com/apis/credentials)
- **LINE 服務**: [LINE Developers Console](https://developers.line.biz/console/)
- **Binance API**: [Binance API 管理](https://www.binance.com/en/my/settings/api-management)
- **OpenRouter AI**: [OpenRouter API Keys](https://openrouter.ai/keys)
- **MongoDB Atlas**: [MongoDB Atlas](https://cloud.mongodb.com)

### 🚨 安全性注意事項

1. **本地開發**：
   - 絕不將 `.env` 檔案提交到版本控制系統
   - 使用強隨機字串作為 `JWT_SECRET`
   - 定期更新 API Keys

2. **生產環境**：
   - 所有敏感資料存儲在 GCP Secret Manager
   - 使用 IAM 控制 Secret 存取權限
   - 定期輪換密鑰和憑證

3. **API 權限**：
   - Binance API 只需要讀取權限
   - Google OAuth 設定正確的回調 URL
   - LINE 服務設定適當的 Webhook 權限

## 🛠️ CLI 部署腳本工具集

NexusTrade 提供完整的 CLI 自動化部署工具集，與環境變數配置系統完全整合，讓您可以輕鬆管理 GCP 雲端部署：

### 🎯 主要腳本

#### 1. `gcp-deploy-complete.sh` - 完整部署腳本
**用途**: 生產環境完整部署解決方案

**特色**:
- 🔄 完整的部署生命週期管理
- 🛡️ 進階錯誤處理和回滾機制
- 📊 內建監控和警報設定
- 🔐 安全的 Secrets 管理
- ✅ 自動化測試和驗證

**使用方法**:
```bash
# 基本使用
./scripts/gcp-deploy-complete.sh nexustrade-prod asia-east1 production

# 查看幫助
./scripts/gcp-deploy-complete.sh --help

# 互動式部署（推薦首次使用）
./scripts/gcp-deploy-complete.sh
```

#### 2. `gcp-secrets-manager.sh` - Secrets 管理工具
**用途**: 管理 Google Cloud Secret Manager 中的敏感資料

**功能**:
- 🔒 互動式 Secrets 設定
- 🔍 Secrets 狀態檢查和驗證  
- 🗂️ 批次 Secrets 管理
- 🔑 自動 JWT Secret 生成
- 📋 IAM 權限設定

**使用方法**:
```bash
# 設定所有 secrets
./scripts/gcp-secrets-manager.sh nexustrade-prod setup

# 驗證 secrets
./scripts/gcp-secrets-manager.sh nexustrade-prod verify

# 列出 secrets 狀態
./scripts/gcp-secrets-manager.sh nexustrade-prod list

# 刪除特定 secret
./scripts/gcp-secrets-manager.sh nexustrade-prod delete jwt-secret

# 備份 secrets 元資料
./scripts/gcp-secrets-manager.sh nexustrade-prod backup
```

#### 3. `gcp-monitoring-setup.sh` - 監控設定工具
**用途**: 設定完整的監控、警報和儀表板系統

**功能**:
- 📊 自訂監控儀表板
- 🔔 多重警報策略設定
- 📧 電子郵件通知整合
- ⏰ Uptime 檢查配置
- 📝 日誌警報和保留策略

**使用方法**:
```bash
# 完整監控設定
./scripts/gcp-monitoring-setup.sh nexustrade-prod asia-east1 nexustrade admin@example.com

# 不設定電子郵件通知
./scripts/gcp-monitoring-setup.sh nexustrade-prod asia-east1 nexustrade

# 查看幫助
./scripts/gcp-monitoring-setup.sh --help
```

#### 4. `gcp-quick-deploy.sh` - 快速部署工具
**用途**: 開發環境和測試的快速部署

**特點**:
- ⚡ 5 分鐘快速設定
- 🔧 預設配置，最小化用戶輸入
- 🧪 適合 demo 和測試環境
- ⚠️ 不推薦生產環境使用

**使用方法**:
```bash
# 快速部署
./scripts/gcp-quick-deploy.sh nexustrade-dev asia-east1
```

### 🔄 完整部署工作流程

#### 情境 1: 首次生產部署
```bash
# 1. 檢查並設定 secrets
./scripts/gcp-secrets-manager.sh nexustrade-prod setup

# 2. 執行完整部署
./scripts/gcp-deploy-complete.sh nexustrade-prod asia-east1 production

# 3. 驗證部署成功
curl -f https://your-service-url/health
```

#### 情境 2: 開發/測試環境快速設定
```bash
# 一鍵快速部署
./scripts/gcp-quick-deploy.sh nexustrade-dev asia-east1
```

#### 情境 3: 監控系統獨立設定
```bash
# 為已存在的服務設定監控
./scripts/gcp-monitoring-setup.sh nexustrade-prod asia-east1 nexustrade admin@example.com
```

### 📋 腳本參數說明

| 腳本 | 參數 1 | 參數 2 | 參數 3 | 參數 4 |
|------|--------|--------|--------|--------|
| `gcp-deploy-complete.sh` | PROJECT_ID | REGION | ENVIRONMENT | - |
| `gcp-secrets-manager.sh` | PROJECT_ID | COMMAND | SECRET_NAME/EMAIL | - |
| `gcp-monitoring-setup.sh` | PROJECT_ID | REGION | SERVICE_NAME | NOTIFY_EMAIL |
| `gcp-quick-deploy.sh` | PROJECT_ID | REGION | - | - |

### 🔍 腳本日誌和除錯

所有腳本都提供詳細的日誌記錄：

- 📄 **部署日誌**: `deploy-YYYYMMDD-HHMMSS.log`
- ❌ **錯誤日誌**: `deploy-errors-YYYYMMDD-HHMMSS.log`  
- 📊 **部署資訊**: `.deploy-info.json`

**查看即時日誌**:
```bash
# 跟踪部署過程
tail -f deploy-*.log

# 查看錯誤詳情
cat deploy-errors-*.log
```

## 🚨 故障排除

### 🔧 常見問題和解決方案

#### 1. **部署失敗**
```bash
# 檢查 Docker 映像建置日誌
docker build -f Dockerfile.cloudrun -t test-image .

# 檢查 gcloud 認證
gcloud auth list

# 檢查專案設定
gcloud config get-value project
```

#### 2. **服務啟動失敗**
```bash
# 檢查 secrets 設定
./scripts/gcp-secrets-manager.sh [PROJECT_ID] verify

# 檢查環境變數
gcloud run services describe nexustrade --region=asia-east1 --format="export"

# 查看啟動錯誤
gcloud logs read --service=nexustrade --limit=50 --format="table(timestamp,textPayload)"
```

#### 3. **資料庫連接失敗**
```bash
# 檢查 MongoDB URI secret
gcloud secrets versions access latest --secret="mongodb-uri"

# 測試資料庫連接（從本地）
mongo "your-mongodb-uri"

# 檢查網路配置
gcloud compute networks list
```

#### 4. **效能問題**
```bash
# 檢查資源使用情況
gcloud run services describe nexustrade --region=asia-east1 \
  --format="table(spec.template.spec.containers[0].resources)"

# 調整資源配置
gcloud run services update nexustrade \
  --memory=8Gi --cpu=4 --region=asia-east1

# 檢查監控指標
gcloud monitoring dashboards list
```

### 📊 監控和診斷

#### 日誌查看
```bash
# 查看最新日誌
gcloud logs read --service=nexustrade --limit=100

# 即時監控日誌  
gcloud logs tail --service=nexustrade

# 篩選錯誤日誌
gcloud logs read --service=nexustrade --filter="severity>=ERROR" --limit=50

# 查看特定時間範圍的日誌
gcloud logs read --service=nexustrade \
  --after="2025-01-18T10:00:00Z" \
  --before="2025-01-18T11:00:00Z"
```

#### 健康檢查
```bash
# 基本健康檢查
curl -f https://your-service-url/health

# 詳細健康檢查
curl -s https://your-service-url/health | jq '.'

# API 端點測試
curl https://your-service-url/api/market/status

# 負載測試（簡單）
for i in {1..10}; do curl -s https://your-service-url/health & done; wait
```

#### 效能監控
```bash
# 檢查服務狀態
gcloud run services describe nexustrade --region=asia-east1

# 檢查最近的部署
gcloud run revisions list --service=nexustrade --region=asia-east1

# 檢查流量分配
gcloud run services describe nexustrade --region=asia-east1 \
  --format="table(status.traffic[].revisionName,status.traffic[].percent)"
```

### 🔄 回滾和恢復

#### 快速回滾
```bash
# 列出所有版本
gcloud run revisions list --service=nexustrade --region=asia-east1

# 回滾到前一個版本
PREVIOUS_REVISION=$(gcloud run revisions list --service=nexustrade --region=asia-east1 --limit=2 --format="value(metadata.name)" | tail -1)

gcloud run services update-traffic nexustrade \
  --to-revisions=$PREVIOUS_REVISION=100 \
  --region=asia-east1
```

#### 災難恢復
```bash
# 緊急停止服務
gcloud run services update nexustrade \
  --min-instances=0 --max-instances=0 \
  --region=asia-east1

# 恢復服務
gcloud run services update nexustrade \
  --min-instances=1 --max-instances=100 \
  --region=asia-east1
```

### 📞 取得協助

如果遇到無法解決的問題：

1. **查看完整日誌**: 使用 `gcloud logs read --service=nexustrade --limit=200`
2. **檢查部署資訊**: 查看 `.deploy-info.json` 檔案
3. **驗證配置**: 使用 `./scripts/gcp-secrets-manager.sh [PROJECT_ID] verify`
4. **重新部署**: 使用 `./scripts/gcp-deploy-complete.sh` 重新執行完整部署

## 📊 監控和維護

### 設定監控面板
1. 前往 Google Cloud Console > Monitoring
2. 建立自訂面板監控關鍵指標：
   - 請求數和延遲
   - 錯誤率
   - 記憶體和 CPU 使用率
   - 資料庫連接數

### 定期維護任務
- 更新 Docker 映像
- 監控資源使用量
- 檢查安全性更新
- 備份資料庫

## 🔐 安全性最佳實踐

1. **使用 Secret Manager** 儲存敏感資料
2. **設定適當的 IAM 權限**
3. **啟用 VPC 安全性群組**
4. **定期更新依賴套件**
5. **設定 HTTPS 和 SSL 憑證**

## 📚 相關資源

### 📖 官方文檔
- [Cloud Run 官方文件](https://cloud.google.com/run/docs)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Cloud Monitoring 文件](https://cloud.google.com/monitoring/docs)
- [MongoDB Atlas GCP 整合](https://www.mongodb.com/atlas/database/google-cloud)
- [Memorystore for Redis](https://cloud.google.com/memorystore/docs/redis)
- [Cloud Build 文件](https://cloud.google.com/build/docs)

### 🛠️ NexusTrade CLI 工具
專案提供的自動化部署腳本：

| 腳本名稱 | 用途 | 適用場景 |
|---------|------|----------|
| `gcp-deploy-complete.sh` | 完整生產部署 | 生產環境、完整功能部署 |
| `gcp-secrets-manager.sh` | Secrets 管理 | 敏感資料管理、安全設定 |
| `gcp-monitoring-setup.sh` | 監控警報設定 | 運營監控、效能追蹤 |
| `gcp-quick-deploy.sh` | 快速部署 | 開發測試、概念驗證 |
| `deploy-cloudrun.sh` | 基本部署 | 基礎 Cloud Run 部署 |

### 🎯 快速開始指令

**生產環境完整部署**:
```bash
./scripts/gcp-deploy-complete.sh nexustrade-prod asia-east1 production
```

**開發環境快速部署**:
```bash
./scripts/gcp-quick-deploy.sh nexustrade-dev asia-east1
```

**Secrets 管理**:
```bash
./scripts/gcp-secrets-manager.sh nexustrade-prod setup
```

**監控設定**:
```bash
./scripts/gcp-monitoring-setup.sh nexustrade-prod asia-east1 nexustrade admin@example.com
```

### 🔗 有用連結
- [Google Cloud Console](https://console.cloud.google.com/)
- [Cloud Run 服務管理](https://console.cloud.google.com/run)
- [Secret Manager](https://console.cloud.google.com/security/secret-manager)
- [Cloud Monitoring](https://console.cloud.google.com/monitoring)
- [Cloud Logging](https://console.cloud.google.com/logs)

---

**最後更新**：2025-01-18
**版本**：NexusTrade v2.0 (CLI 自動化版本)
**維護者**：NexusTrade 開發團隊
**支援**：
- 📖 參考本指南的故障排除章節
- 🛠️ 使用 CLI 工具的 `--help` 參數
- 📝 查看部署日誌檔案
- 🔍 檢查 `.deploy-info.json` 部署資訊