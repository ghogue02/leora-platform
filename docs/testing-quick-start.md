# Testing Quick Start Guide

## Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install
```

## Running Tests

### Quick Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (development)
npm run test:watch

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests
npm run test:e2e

# E2E with UI mode
npm run test:e2e:ui
```

## Test Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate:deploy

# Seed test data
npm run test:seed

# Clean test data
npm run test:clean
```

## Project Structure

```
/Users/greghogue/Leora/
├── jest.config.js              # Jest configuration
├── playwright.config.ts        # Playwright configuration
├── tests/
│   ├── helpers/
│   │   ├── setup.ts           # Jest global setup
│   │   ├── auth.ts            # Auth test helpers
│   │   └── db.ts              # Database test helpers
│   ├── fixtures/
│   │   └── seed-data.ts       # Test data fixtures
│   ├── integration/
│   │   ├── api-auth.test.ts   # Auth API tests
│   │   └── api-orders.test.ts # Orders API tests
│   └── e2e/
│       ├── auth-flow.spec.ts  # Auth E2E tests
│       ├── order-flow.spec.ts # Order E2E tests
│       └── ai-chat.spec.ts    # AI chat E2E tests
├── lib/
│   ├── auth/__tests__/        # Auth unit tests
│   └── intelligence/__tests__/ # Intelligence unit tests
└── app/api/_utils/__tests__/  # API utilities tests
```

## Environment Setup

Create `.env.test` file:

```bash
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/leora_test
JWT_SECRET=test-jwt-secret-key-change-in-production
DEFAULT_TENANT_SLUG=test-tenant
DEFAULT_PORTAL_USER_KEY=test-portal-user
```

## Coverage Goals

- Overall: 80%+
- Business Logic (/lib): 90%+
- API Routes: 80%+
- Components: 70%+

## Common Tasks

### Add New Unit Test

1. Create test file: `module/__tests__/feature.test.ts`
2. Import test utilities
3. Write test suites
4. Run: `npm run test:unit`

### Add New Integration Test

1. Create test file: `tests/integration/api-feature.test.ts`
2. Use database helpers
3. Test API endpoints
4. Run: `npm run test:integration`

### Add New E2E Test

1. Create test file: `tests/e2e/feature-flow.spec.ts`
2. Use Playwright test framework
3. Test user workflows
4. Run: `npm run test:e2e`

## CI/CD

Tests run automatically on:
- Push to main/develop
- Pull requests
- Manual workflow dispatch

View results in GitHub Actions.

## Troubleshooting

### Tests Failing Locally

```bash
# Clean and reinstall
rm -rf node_modules coverage .next
npm install

# Reset test database
npm run test:clean
npm run test:seed

# Run tests again
npm test
```

### E2E Tests Not Working

```bash
# Reinstall Playwright browsers
npx playwright install --with-deps

# Run in headed mode to see what's happening
npm run test:e2e:headed
```

### Coverage Not Updating

```bash
# Clear Jest cache
npx jest --clearCache

# Run coverage again
npm run test:coverage
```

## Next Steps

- Read full documentation: `/docs/testing.md`
- Review test examples in codebase
- Check CI/CD workflow: `.github/workflows/test.yml`
- Join #testing channel for questions

---

**Need Help?** Check `/docs/testing.md` for detailed documentation.
