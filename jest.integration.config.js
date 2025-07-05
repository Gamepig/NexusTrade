module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/*.integration.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js'],
  verbose: true,
  maxWorkers: 2,
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/integration',
  coverageReporters: ['text', 'lcov']
}; 