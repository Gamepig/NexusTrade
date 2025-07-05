// NexusTrade ESLint 配置檔案
// ESLint 9.x 配置格式

import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        // Node.js 全域變數
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
        
        // 瀏覽器全域變數
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        FormData: 'readonly',
        CustomEvent: 'readonly',
        AbortController: 'readonly',
        ResizeObserver: 'readonly',
        performance: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        
        // 測試環境全域變數
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error'
    }
  },
  {
    ignores: [
      'node_modules/**',
      'logs/**',
      'coverage/**',
      '.pm2/**',
      'docker/**',
      'tmp/**',
      '*.config.js',
      'debug/**',
      'tests/**',
      'test/**',
      'archive/**',
      'backups/**',
      'memory-bank/**',
      'reference/**',
      'tasks/**',
      'test-*.js',
      'diagnose-*.js',
      'fix-*.js',
      'emergency-*.js',
      'organize-*.js',
      'simple-*.js',
      'check-*.js',
      'clear-*.js',
      'create-*.js',
      'demo-*.js',
      'monitor-*.js',
      'quick-*.js',
      'reset-*.js',
      '**/test_*.js',
      '**/debug_*.js',
      '**/diagnose_*.js',
      '**/emergency_*.js',
      'public/test_*.html',
      'public/debug_*.html',
      'public/manual_*.html',
      'public/oauth_*.html',
      'public/simple*.html',
      'public/check_*.js',
      'openrouter-rate-limit-monitor/**',
      '**/*.test.js',
      '**/*.spec.js',
      '**/*.config.js',
      '**/*.config.mjs'
    ]
  }
];