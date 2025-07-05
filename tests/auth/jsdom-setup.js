/**
 * JSDOM 環境設定 - 認證測試
 */

// 修復 Node.js 兼容性問題
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { JSDOM } = require('jsdom');

// 設定 JSDOM 環境
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3001',
  pretendToBeVisual: true,
  resources: 'usable'
});

const { window } = dom;

// 設定全域變數
global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;
global.sessionStorage = window.sessionStorage;
global.addEventListener = window.addEventListener.bind(window);
global.removeEventListener = window.removeEventListener.bind(window);
global.location = window.location;
global.history = window.history;

// Mock fetch
global.fetch = jest.fn();

// Mock console 方法避免測試輸出過多
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// 清理函數
global.cleanupJSDOM = () => {
  dom.window.close();
};
