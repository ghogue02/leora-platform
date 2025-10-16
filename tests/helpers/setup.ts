/**
 * Jest global setup file
 * Runs before all tests to configure the test environment
 */

import { TextEncoder, TextDecoder } from 'util';

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Mock environment variables (using Object.defineProperty to avoid read-only errors)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-do-not-use-in-production';
}
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/leora_test';
}
if (!process.env.DEFAULT_TENANT_SLUG) {
  process.env.DEFAULT_TENANT_SLUG = 'test-tenant';
}
if (!process.env.DEFAULT_PORTAL_USER_KEY) {
  process.env.DEFAULT_PORTAL_USER_KEY = 'test-portal-user';
}

// Suppress console output during tests (optional)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(10000);

// Mock Next.js modules
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
  headers: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Global afterEach cleanup
afterEach(() => {
  jest.clearAllMocks();
});
