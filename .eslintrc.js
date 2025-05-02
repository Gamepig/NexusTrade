module.exports = {
  env: {
    browser: true, // 如果你的 JS 會在瀏覽器運行
    es2021: true,
    node: true,
    jest: true, // 如果使用 Jest 進行測試
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended', // 將 Prettier 規則整合進 ESLint
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': 'warn', // 將 Prettier 問題顯示為警告
    'no-unused-vars': 'warn', // 將未使用的變數顯示為警告
    // 在這裡添加更多自訂規則
  },
}; 