# Testing Strategy - Leora Platform

## Overview

Comprehensive testing infrastructure for the Leora Platform, targeting 80%+ code coverage on business logic with a focus on reliability, maintainability, and fast feedback loops.

## Table of Contents

- [Testing Pyramid](#testing-pyramid)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Coverage Goals](#coverage-goals)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Testing Pyramid

```
     /\
    /  \   E2E Tests (10%)
   /____\
  /      \  Integration Tests (20%)
 /________\
/__________\ Unit Tests (70%)
```

### Distribution Strategy

- **Unit Tests (70%)**: Fast, isolated tests for business logic
- **Integration Tests (20%)**: API endpoints, database interactions
- **E2E Tests (10%)**: Critical user flows and workflows

## Test Types

### 1. Unit Tests

**Location**: `**/__tests__/*.test.ts`

**Purpose**: Test individual functions, classes, and utilities in isolation

**Examples**:
- `/lib/auth/__tests__/jwt.test.ts` - JWT token creation and validation
- `/lib/intelligence/__tests__/health-scoring.test.ts` - Account health calculations
- `/lib/intelligence/__tests__/pace-detection.test.ts` - Ordering pace detection
- `/app/api/_utils/__tests__/tenant.test.ts` - Tenant utilities
- `/app/api/_utils/__tests__/response.test.ts` - API response formatting

**Run Command**:
```bash
npm run test:unit
```

### 2. Integration Tests

**Location**: `/tests/integration/*.test.ts`

**Purpose**: Test API endpoints and database operations with real dependencies

**Examples**:
- `/tests/integration/api-auth.test.ts` - Authentication endpoints
- `/tests/integration/api-orders.test.ts` - Order management endpoints

**Run Command**:
```bash
npm run test:integration
```

### 3. E2E Tests

**Location**: `/tests/e2e/*.spec.ts`

**Purpose**: Test complete user workflows in a browser environment

**Examples**:
- `/tests/e2e/auth-flow.spec.ts` - Login, logout, session management
- `/tests/e2e/order-flow.spec.ts` - Cart, checkout, order viewing
- `/tests/e2e/ai-chat.spec.ts` - AI assistant interactions

**Run Command**:
```bash
npm run test:e2e
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test File
```bash
npm test -- path/to/test.test.ts
```

### Specific Test Suite
```bash
npm test -- --testNamePattern="JWT Utilities"
```

### E2E Tests (Specific Browser)
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### E2E Tests (Headed Mode)
```bash
npx playwright test --headed
```

### E2E Tests (Debug Mode)
```bash
npx playwright test --debug
```

## Writing Tests

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Feature Name', () => {
  let instance: YourClass;

  beforeEach(() => {
    instance = new YourClass();
  });

  describe('methodName', () => {
    it('should perform expected behavior', () => {
      const result = instance.methodName('input');

      expect(result).toBe('expected');
    });

    it('should handle edge cases', () => {
      expect(() => instance.methodName(null)).toThrow();
    });
  });
});
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { cleanDatabase, createTestTenant } from '@/tests/helpers/db';

describe('API Endpoint', () => {
  let tenant: any;

  beforeAll(async () => {
    await cleanDatabase();
    tenant = await createTestTenant();
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  it('should handle request', async () => {
    const response = await fetch('/api/endpoint');
    expect(response.status).toBe(200);
  });
});
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete workflow', async ({ page }) => {
    await page.getByLabel('Input').fill('value');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page).toHaveURL('/success');
  });
});
```

## Test Helpers

### Database Helpers

Located in `/tests/helpers/db.ts`:

- `getPrismaTestClient()` - Get Prisma client for tests
- `cleanDatabase()` - Clean all test data
- `createTestTenant()` - Create test tenant
- `createTestPortalUser()` - Create test user
- `createTestProduct()` - Create test product
- `seedTestDatabase()` - Seed complete test dataset

### Authentication Helpers

Located in `/tests/helpers/auth.ts`:

- `createTestAccessToken()` - Generate JWT access token
- `createTestRefreshToken()` - Generate JWT refresh token
- `createAuthHeaders()` - Create authenticated request headers
- `createAuthenticatedRequest()` - Create mock authenticated request

### Test Fixtures

Located in `/tests/fixtures/seed-data.ts`:

Pre-defined test data for consistent testing:
- `testTenantData` - Test tenant configuration
- `testPortalUsers` - Test user accounts
- `testProducts` - Test product catalog
- `testOrders` - Test order history

## Coverage Goals

### Global Targets
- **Overall**: 80%+ coverage
- **Business Logic (`/lib`)**: 90%+ coverage
- **API Routes**: 80%+ coverage
- **Components**: 70%+ coverage

### Current Coverage

Run `npm run test:coverage` to view detailed coverage report.

Coverage reports are generated in `/coverage` directory:
- HTML report: `/coverage/lcov-report/index.html`
- JSON summary: `/coverage/coverage-summary.json`

### Viewing Coverage

```bash
# Generate and open coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

## CI/CD Integration

### GitHub Actions Workflow

Location: `.github/workflows/test.yml`

**Runs on**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Pipeline Stages**:

1. **Unit Tests**
   - Fast feedback (<2 minutes)
   - No external dependencies
   - Uploads coverage to Codecov

2. **Integration Tests**
   - Postgres database service
   - Real database interactions
   - API endpoint testing

3. **E2E Tests**
   - Full application testing
   - Playwright with Chromium
   - Screenshot capture on failure

4. **Lint & Type Check**
   - ESLint validation
   - TypeScript compilation
   - Code quality checks

### Test Database Setup

For CI environments:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed test data
npm run test:seed
```

## Best Practices

### 1. Test Organization

- **Group related tests** using `describe` blocks
- **Use descriptive test names** that explain expected behavior
- **Follow AAA pattern**: Arrange, Act, Assert

### 2. Test Independence

- **No shared state** between tests
- **Clean up after tests** using `afterEach` or `afterAll`
- **Use factories/fixtures** for test data

### 3. Mocking Strategy

- **Mock external services** (APIs, third-party libraries)
- **Don't mock what you own** (test real implementations)
- **Use test doubles** for database in unit tests only

### 4. Assertions

- **Use specific matchers**: `toBe()`, `toEqual()`, `toContain()`
- **Test both positive and negative cases**
- **Verify error handling**

### 5. Performance

- **Keep unit tests fast** (<100ms per test)
- **Parallelize when possible** (Jest and Playwright support this)
- **Use `beforeAll` for expensive setup**

### 6. Maintenance

- **Update tests with code changes**
- **Remove obsolete tests**
- **Refactor test utilities**
- **Document complex test scenarios**

## Test Data Management

### Seeding Test Database

```bash
# Seed test data
npm run test:seed

# Clean test database
npm run test:clean
```

### Environment Variables

Required for testing:

```bash
# .env.test
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/leora_test
JWT_SECRET=test-jwt-secret
DEFAULT_TENANT_SLUG=test-tenant
```

## Debugging Tests

### Jest Tests

```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# VS Code launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal"
}
```

### Playwright Tests

```bash
# Debug mode with browser inspector
npx playwright test --debug

# Show browser while running
npx playwright test --headed

# Slow down execution
npx playwright test --headed --slow-mo=1000
```

## Continuous Improvement

### Weekly Tasks

- [ ] Review coverage reports
- [ ] Update failing tests
- [ ] Add tests for new features
- [ ] Refactor flaky tests

### Monthly Tasks

- [ ] Analyze test performance
- [ ] Update test dependencies
- [ ] Review test strategy effectiveness
- [ ] Document testing patterns

## Resources

### Documentation

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Library](https://testing-library.com/docs/)

### Tools

- **Jest**: Unit and integration testing
- **Playwright**: E2E testing
- **Codecov**: Coverage reporting
- **GitHub Actions**: CI/CD automation

### Support

For testing questions or issues:
1. Check this documentation
2. Review existing tests for examples
3. Ask in #testing channel
4. Create GitHub issue with `testing` label

---

**Last Updated**: 2025-10-15
**Owner**: QA Engineering Team
**Status**: Active
