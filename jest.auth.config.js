module.exports = {
  displayName: 'Auth Tests',
  testMatch: [
    '<rootDir>/tests/auth/**/*.test.js'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/auth/setup.js'
  ],
  testEnvironment: 'jsdom',
  setupFiles: [
    '<rootDir>/tests/auth/jsdom-setup.js'
  ],
  collectCoverageFrom: [
    'src/controllers/auth.controller.js',
    'src/controllers/oauth.controller.js',
    'src/middleware/auth.middleware.js',
    'public/js/lib/auth-state-manager.js',
    'public/js/components/LoginModal.js'
  ],
  coverageDirectory: 'coverage/auth',
  verbose: true,
  detectOpenHandles: true,
  forceExit: true
};
