#!/bin/bash

# NexusTrade PM2 設定腳本
# Namespace: NexusTrade
# 用途：自動安裝和配置 PM2 以及相關設定

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 專案資訊
PROJECT_NAME="NexusTrade"
PROJECT_NAMESPACE="NexusTrade"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log_info "開始設定 PM2 for $PROJECT_NAME (Namespace: $PROJECT_NAMESPACE)"
log_info "專案目錄: $PROJECT_DIR"

# 檢查 Node.js 是否已安裝
check_nodejs() {
    log_info "檢查 Node.js 安裝狀態..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_success "Node.js 已安裝: $NODE_VERSION"
        
        # 檢查版本是否符合需求 (>=18.0.0)
        if [[ "$NODE_VERSION" < "v18.0.0" ]]; then
            log_warning "Node.js 版本過舊 ($NODE_VERSION)，建議升級到 18.0+ 版本"
        fi
    else
        log_error "Node.js 未安裝，請先安裝 Node.js 18.0+ 版本"
        exit 1
    fi
}

# 檢查 npm 是否已安裝
check_npm() {
    log_info "檢查 npm 安裝狀態..."
    
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_success "npm 已安裝: $NPM_VERSION"
    else
        log_error "npm 未安裝，請確認 Node.js 安裝完整"
        exit 1
    fi
}

# 安裝 PM2
install_pm2() {
    log_info "檢查 PM2 安裝狀態..."
    
    if command -v pm2 &> /dev/null; then
        PM2_VERSION=$(pm2 --version)
        log_success "PM2 已安裝: $PM2_VERSION"
    else
        log_info "安裝 PM2..."
        npm install -g pm2
        log_success "PM2 安裝完成"
    fi
}

# 建立必要的目錄
create_directories() {
    log_info "建立必要的目錄..."
    
    mkdir -p "$PROJECT_DIR/logs"
    mkdir -p "$PROJECT_DIR/backups"
    mkdir -p "$PROJECT_DIR/tmp"
    
    log_success "目錄建立完成"
}

# 設定 PM2 日誌輪轉
setup_log_rotation() {
    log_info "設定 PM2 日誌輪轉..."
    
    # 檢查 pm2-logrotate 是否已安裝
    if pm2 list | grep -q "pm2-logrotate"; then
        log_success "pm2-logrotate 已安裝"
    else
        log_info "安裝 pm2-logrotate..."
        pm2 install pm2-logrotate
        
        # 配置日誌輪轉設定
        pm2 set pm2-logrotate:max_size 10M
        pm2 set pm2-logrotate:retain 30
        pm2 set pm2-logrotate:compress true
        pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
        pm2 set pm2-logrotate:workerInterval 30
        pm2 set pm2-logrotate:rotateInterval 0 0 * * *
        
        log_success "pm2-logrotate 安裝和配置完成"
    fi
}

# 設定 PM2 監控 (可選)
setup_monitoring() {
    log_info "設定 PM2 監控..."
    
    # 檢查是否要安裝 pm2-server-monit
    read -p "是否要安裝 PM2 伺服器監控? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pm2 install pm2-server-monit
        log_success "PM2 伺服器監控已安裝"
    else
        log_info "跳過 PM2 伺服器監控安裝"
    fi
}

# 設定開機自啟動
setup_startup() {
    log_info "設定 PM2 開機自啟動..."
    
    # 檢查是否為 root 或有 sudo 權限
    if [[ $EUID -ne 0 ]] && ! command -v sudo &> /dev/null; then
        log_warning "無 sudo 權限，跳過開機自啟動設定"
        return
    fi
    
    # 生成啟動腳本
    STARTUP_SCRIPT=$(pm2 startup | tail -n 1)
    
    if [[ "$STARTUP_SCRIPT" == *"sudo"* ]]; then
        log_info "執行啟動腳本設定: $STARTUP_SCRIPT"
        eval "$STARTUP_SCRIPT"
        log_success "開機自啟動設定完成"
    else
        log_warning "無法設定開機自啟動，請手動執行: $STARTUP_SCRIPT"
    fi
}

# 驗證配置檔案
validate_config() {
    log_info "驗證 PM2 配置檔案..."
    
    CONFIG_FILE="$PROJECT_DIR/ecosystem.config.js"
    
    if [[ -f "$CONFIG_FILE" ]]; then
        log_success "PM2 配置檔案存在: $CONFIG_FILE"
        
        # 檢查配置檔案語法
        if node -c "$CONFIG_FILE" 2>/dev/null; then
            log_success "PM2 配置檔案語法正確"
        else
            log_error "PM2 配置檔案語法錯誤"
            exit 1
        fi
    else
        log_error "PM2 配置檔案不存在: $CONFIG_FILE"
        exit 1
    fi
}

# 測試 PM2 設定
test_pm2_setup() {
    log_info "測試 PM2 設定..."
    
    cd "$PROJECT_DIR"
    
    # 檢查是否有現有的 PM2 進程
    if pm2 list | grep -q "nexustrade"; then
        log_warning "發現現有的 NexusTrade PM2 進程，將先停止..."
        pm2 delete nexustrade-api 2>/dev/null || true
        pm2 delete nexustrade-static 2>/dev/null || true
    fi
    
    # 啟動應用程式
    log_info "測試啟動應用程式..."
    pm2 start ecosystem.config.js --only nexustrade-api
    
    # 等待啟動
    sleep 3
    
    # 檢查狀態
    if pm2 list | grep -q "nexustrade-api.*online"; then
        log_success "PM2 測試啟動成功"
        
        # 停止測試進程
        pm2 stop nexustrade-api
        log_info "測試完成，已停止測試進程"
    else
        log_error "PM2 測試啟動失敗"
        pm2 logs nexustrade-api --lines 10
        exit 1
    fi
}

# 建立 PM2 管理腳本
create_management_scripts() {
    log_info "建立 PM2 管理腳本..."
    
    # 啟動腳本
    cat > "$PROJECT_DIR/scripts/start.sh" << 'EOF'
#!/bin/bash
# NexusTrade 啟動腳本
cd "$(dirname "$0")/.."
pm2 start ecosystem.config.js
pm2 save
echo "NexusTrade 已啟動"
EOF

    # 停止腳本
    cat > "$PROJECT_DIR/scripts/stop.sh" << 'EOF'
#!/bin/bash
# NexusTrade 停止腳本
pm2 stop nexustrade-api nexustrade-static 2>/dev/null || true
echo "NexusTrade 已停止"
EOF

    # 重啟腳本
    cat > "$PROJECT_DIR/scripts/restart.sh" << 'EOF'
#!/bin/bash
# NexusTrade 重啟腳本
cd "$(dirname "$0")/.."
pm2 reload ecosystem.config.js
echo "NexusTrade 已重啟"
EOF

    # 狀態檢查腳本
    cat > "$PROJECT_DIR/scripts/status.sh" << 'EOF'
#!/bin/bash
# NexusTrade 狀態檢查腳本
echo "=== PM2 進程狀態 ==="
pm2 list
echo ""
echo "=== NexusTrade 健康檢查 ==="
curl -f http://localhost:3000/health 2>/dev/null && echo "✅ API 服務正常" || echo "❌ API 服務異常"
EOF

    # 日誌查看腳本
    cat > "$PROJECT_DIR/scripts/logs.sh" << 'EOF'
#!/bin/bash
# NexusTrade 日誌查看腳本
if [[ "$1" == "follow" ]] || [[ "$1" == "-f" ]]; then
    pm2 logs nexustrade-api --lines 100
else
    pm2 logs nexustrade-api --lines "${1:-50}"
fi
EOF

    # 設定執行權限
    chmod +x "$PROJECT_DIR/scripts"/*.sh
    
    log_success "PM2 管理腳本建立完成"
}

# 顯示設定完成資訊
show_completion_info() {
    log_success "🎉 PM2 設定完成！"
    echo ""
    echo "=== NexusTrade PM2 管理指令 ==="
    echo "啟動服務:    ./scripts/start.sh"
    echo "停止服務:    ./scripts/stop.sh" 
    echo "重啟服務:    ./scripts/restart.sh"
    echo "查看狀態:    ./scripts/status.sh"
    echo "查看日誌:    ./scripts/logs.sh [行數|follow]"
    echo ""
    echo "=== PM2 原生指令 ==="
    echo "pm2 start ecosystem.config.js        # 啟動所有服務"
    echo "pm2 list                             # 列出所有進程"
    echo "pm2 monit                           # 監控介面"
    echo "pm2 logs nexustrade-api             # 查看日誌"
    echo "pm2 restart nexustrade-api          # 重啟服務"
    echo ""
    echo "=== 專案資訊 ==="
    echo "專案名稱:    $PROJECT_NAME"
    echo "Namespace:    $PROJECT_NAMESPACE"
    echo "專案目錄:    $PROJECT_DIR"
    echo "配置檔案:    ecosystem.config.js"
    echo ""
    log_info "現在可以執行 './scripts/start.sh' 來啟動 NexusTrade！"
}

# 主要執行流程
main() {
    echo "========================================"
    echo "  NexusTrade PM2 設定腳本"
    echo "  Namespace: $PROJECT_NAMESPACE"
    echo "========================================"
    echo ""
    
    check_nodejs
    check_npm
    install_pm2
    create_directories
    setup_log_rotation
    setup_monitoring
    validate_config
    test_pm2_setup
    create_management_scripts
    setup_startup
    
    echo ""
    show_completion_info
}

# 檢查是否以腳本方式執行
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi