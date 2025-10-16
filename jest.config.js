/** @type {import('jest').Config} */
const config = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Root directory
  rootDir: '.',

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.tsx'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/api/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/dist/**',
    '!**/coverage/**'
  ],

  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80
    },
    './lib/': {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90
    }
  },

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Module path aliases (match tsconfig paths)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.ts'],

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Environment variables for tests
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};

module.exports = config;
