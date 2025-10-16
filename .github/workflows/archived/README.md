# Archived Workflows

These workflows have been replaced by the simplified `ci.yml` workflow for development.

## Archived Files:

- **deploy.yml.backup** - Original comprehensive deployment workflow
- **database-migrations.yml.backup** - Database migration automation workflow
- **test.yml.backup** - Comprehensive testing pipeline

## Why Archived?

These workflows were designed for production environments with:
- Complex multi-environment deployments
- Automated database migration and rollback
- E2E testing
- Security scanning
- Coverage reporting

For pre-production development, these features add unnecessary complexity and maintenance overhead.

## When to Restore?

Consider restoring and adapting these workflows when:
1. Approaching production launch
2. Need automated database migrations with rollback
3. Want comprehensive E2E testing
4. Require production deployment automation
5. Need advanced security scanning

## Current Active Workflow:

**`.github/workflows/ci.yml`** - Simplified CI/CD for development:
- Linting and type checking
- Unit tests
- Preview deployments on PRs
- Staging deployment (optional)
- Basic security checks

---

*Archived on: 2025-10-16*
*Reason: Simplification for pre-production development*
