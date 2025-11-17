/**
 * Jest Configuration
 * Test configuration for backend API
 */

export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'routes/**/*.js',
    'utils/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};

