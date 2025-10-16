# Leora Platform - Detailed Directory Structure

**Version**: 1.0
**Date**: October 15, 2025

## Overview

This document defines the complete directory structure for the new Leora Platform Next.js 15 codebase. The structure follows Next.js App Router conventions while organizing code for maintainability, scalability, and multi-tenant architecture.

---

## Root Directory Structure

```
leora-platform/
├── .github/                          # GitHub configuration
├── app/                              # Next.js 15 App Router (main application)
├── components/                       # React components
├── lib/                              # Core libraries and utilities
├── prisma/                           # Database schema and migrations
├── public/                           # Static assets
├── docs/                             # Project documentation
├── tests/                            # Test suites
├── scripts/                          # Utility scripts
├── .env.example                      # Environment variable template
├── .env.local                        # Local secrets (gitignored)
├── .eslintrc.json                    # ESLint configuration
├── .prettierrc                       # Prettier configuration
├── .gitignore
├── tailwind.config.ts                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
├── next.config.js                    # Next.js configuration
├── package.json
├── package-lock.json
└── README.md
```

---

## 1. `.github/` - GitHub Configuration

```
.github/
├── workflows/                        # GitHub Actions workflows
│   ├── ci.yml                        # Continuous integration (lint, test, type check)
│   ├── deploy-staging.yml            # Auto-deploy to Vercel staging
│   ├── deploy-production.yml         # Manual production deployment
│   ├── prisma-schema-diff.yml        # Schema change detection
│   └── security-scan.yml             # Dependency vulnerability scanning
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   ├── feature_request.md
│   └── performance_issue.md
└── PULL_REQUEST_TEMPLATE.md
```

**Purpose**: CI/CD automation, issue tracking, PR templates

---

## 2. `app/` - Next.js Application (App Router)

```
app/
├── api/                              # API route handlers
│   ├── portal/                       # Customer portal endpoints
│   │   ├── auth/                     # Authentication
│   │   │   ├── login/
│   │   │   │   └── route.ts          # POST /api/portal/auth/login
│   │   │   ├── register/
│   │   │   │   └── route.ts          # POST /api/portal/auth/register
│   │   │   ├── me/
│   │   │   │   └── route.ts          # GET /api/portal/auth/me
│   │   │   ├── refresh/
│   │   │   │   └── route.ts          # POST /api/portal/auth/refresh
│   │   │   ├── logout/
│   │   │   │   └── route.ts          # POST /api/portal/auth/logout
│   │   │   ├── reset-password/
│   │   │   │   └── route.ts          # POST /api/portal/auth/reset-password
│   │   │   └── verify-email/
│   │   │       └── route.ts          # POST /api/portal/auth/verify-email
│   │   │
│   │   ├── products/                 # Product catalog
│   │   │   ├── route.ts              # GET /api/portal/products (list)
│   │   │   └── [id]/
│   │   │       └── route.ts          # GET /api/portal/products/:id (detail)
│   │   │
│   │   ├── inventory/
│   │   │   ├── route.ts              # GET /api/portal/inventory
│   │   │   └── [skuId]/
│   │   │       └── route.ts          # GET /api/portal/inventory/:skuId
│   │   │
│   │   ├── pricing/
│   │   │   └── route.ts              # POST /api/portal/pricing (calculate)
│   │   │
│   │   ├── orders/                   # Order management
│   │   │   ├── route.ts              # GET /api/portal/orders (list)
│   │   │   │                         # POST /api/portal/orders (create)
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET /api/portal/orders/:id (detail)
│   │   │       │                     # PATCH /api/portal/orders/:id (update)
│   │   │       └── status/
│   │   │           └── route.ts      # POST /api/portal/orders/:id/status
│   │   │
│   │   ├── invoices/                 # Invoice management
│   │   │   ├── route.ts              # GET /api/portal/invoices (list)
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET /api/portal/invoices/:id (detail)
│   │   │       ├── pdf/
│   │   │       │   └── route.ts      # GET /api/portal/invoices/:id/pdf
│   │   │       └── payments/
│   │   │           └── route.ts      # GET /api/portal/invoices/:id/payments
│   │   │
│   │   ├── payments/
│   │   │   ├── route.ts              # GET /api/portal/payments
│   │   │   └── [id]/
│   │   │       └── route.ts          # GET /api/portal/payments/:id
│   │   │
│   │   ├── cart/                     # Shopping cart
│   │   │   ├── route.ts              # GET /api/portal/cart
│   │   │   │                         # DELETE /api/portal/cart (clear)
│   │   │   ├── items/
│   │   │   │   └── route.ts          # POST /api/portal/cart/items (add)
│   │   │   │                         # PATCH /api/portal/cart/items (update)
│   │   │   │                         # DELETE /api/portal/cart/items/:id
│   │   │   └── checkout/
│   │   │       └── route.ts          # POST /api/portal/cart/checkout
│   │   │
│   │   ├── insights/                 # Analytics endpoints
│   │   │   ├── overview/
│   │   │   │   └── route.ts          # GET /api/portal/insights/overview
│   │   │   ├── revenue/
│   │   │   │   └── route.ts          # GET /api/portal/insights/revenue
│   │   │   ├── health/
│   │   │   │   └── route.ts          # GET /api/portal/insights/health
│   │   │   ├── pace/
│   │   │   │   └── route.ts          # GET /api/portal/insights/pace
│   │   │   └── opportunities/
│   │   │       └── route.ts          # GET /api/portal/insights/opportunities
│   │   │
│   │   ├── reports/                  # Report generation
│   │   │   ├── route.ts              # GET /api/portal/reports (list)
│   │   │   ├── [type]/
│   │   │   │   └── route.ts          # POST /api/portal/reports/:type (generate)
│   │   │   └── [id]/
│   │   │       └── export/
│   │   │           └── route.ts      # GET /api/portal/reports/:id/export
│   │   │
│   │   ├── account/
│   │   │   ├── route.ts              # GET /api/portal/account
│   │   │   │                         # PATCH /api/portal/account (update)
│   │   │   └── settings/
│   │   │       └── route.ts          # GET/PATCH /api/portal/account/settings
│   │   │
│   │   ├── favorites/
│   │   │   ├── route.ts              # GET /api/portal/favorites
│   │   │   │                         # POST /api/portal/favorites (add)
│   │   │   └── [id]/
│   │   │       └── route.ts          # DELETE /api/portal/favorites/:id
│   │   │
│   │   ├── lists/                    # Custom product lists
│   │   │   ├── route.ts              # GET /api/portal/lists
│   │   │   │                         # POST /api/portal/lists (create)
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET/PATCH/DELETE /api/portal/lists/:id
│   │   │       └── items/
│   │   │           └── route.ts      # POST /api/portal/lists/:id/items
│   │   │
│   │   └── notifications/
│   │       ├── route.ts              # GET /api/portal/notifications
│   │       └── [id]/
│   │           ├── route.ts          # PATCH /api/portal/notifications/:id
│   │           └── read/
│   │               └── route.ts      # POST /api/portal/notifications/:id/read
│   │
│   ├── sales/                        # Sales rep endpoints
│   │   ├── dashboard/
│   │   │   └── route.ts              # GET /api/sales/dashboard
│   │   ├── activities/
│   │   │   ├── route.ts              # GET/POST /api/sales/activities
│   │   │   └── [id]/
│   │   │       └── route.ts          # GET/PATCH /api/sales/activities/:id
│   │   ├── call-plans/
│   │   │   ├── route.ts              # GET /api/sales/call-plans
│   │   │   └── [id]/
│   │   │       └── route.ts          # GET /api/sales/call-plans/:id
│   │   └── samples/
│   │       ├── route.ts              # GET/POST /api/sales/samples
│   │       └── [id]/
│   │           └── route.ts          # GET/PATCH /api/sales/samples/:id
│   │
│   ├── leora/                        # AI Copilot endpoints
│   │   ├── chat/
│   │   │   └── route.ts              # POST /api/leora/chat
│   │   ├── briefing/
│   │   │   └── route.ts              # GET /api/leora/briefing
│   │   └── health/
│   │       └── route.ts              # GET /api/leora/health (AI service status)
│   │
│   ├── webhooks/                     # Inbound webhooks
│   │   ├── [provider]/
│   │   │   └── route.ts              # POST /api/webhooks/:provider
│   │   └── deliveries/
│   │       └── [id]/
│   │           └── retry/
│   │               └── route.ts      # POST /api/webhooks/deliveries/:id/retry
│   │
│   ├── health/
│   │   └── route.ts                  # GET /api/health (system health check)
│   │
│   └── _utils/                       # Shared API utilities
│       ├── withTenantFromRequest.ts  # Tenant resolution middleware
│       ├── withPortalUserFromRequest.ts  # Portal user middleware
│       ├── requirePermission.ts      # RBAC enforcement
│       ├── rateLimit.ts              # Rate limiting helper
│       ├── validateRequest.ts        # Request validation (Zod)
│       └── apiResponse.ts            # Standardized response helper
│
├── (auth)/                           # Auth layout group (no nav)
│   ├── layout.tsx                    # Auth layout
│   ├── login/
│   │   └── page.tsx                  # Login page
│   ├── register/
│   │   └── page.tsx                  # Registration page
│   ├── reset-password/
│   │   └── page.tsx                  # Password reset page
│   └── verify-email/
│       └── page.tsx                  # Email verification page
│
├── (portal)/                         # Portal layout group (with nav)
│   └── portal/
│       ├── layout.tsx                # Portal layout with navigation
│       ├── page.tsx                  # Redirect to /portal/dashboard
│       │
│       ├── dashboard/
│       │   └── page.tsx              # Dashboard (metrics, briefing)
│       │
│       ├── products/
│       │   ├── page.tsx              # Product catalog (list)
│       │   └── [id]/
│       │       └── page.tsx          # Product detail page
│       │
│       ├── orders/
│       │   ├── page.tsx              # Order history (list)
│       │   └── [id]/
│       │       └── page.tsx          # Order detail page
│       │
│       ├── invoices/
│       │   ├── page.tsx              # Invoice list
│       │   └── [id]/
│       │       └── page.tsx          # Invoice detail page
│       │
│       ├── cart/
│       │   └── page.tsx              # Shopping cart page
│       │
│       ├── insights/
│       │   ├── page.tsx              # Insights overview
│       │   ├── revenue/
│       │   │   └── page.tsx          # Revenue analytics
│       │   ├── health/
│       │   │   └── page.tsx          # Customer health scores
│       │   └── opportunities/
│       │       └── page.tsx          # Top opportunities
│       │
│       ├── reports/
│       │   ├── page.tsx              # Reports listing
│       │   └── [type]/
│       │       └── page.tsx          # Specific report view
│       │
│       ├── account/
│       │   ├── page.tsx              # Account summary
│       │   ├── settings/
│       │   │   └── page.tsx          # Account settings
│       │   └── profile/
│       │       └── page.tsx          # Profile management
│       │
│       ├── favorites/
│       │   └── page.tsx              # Favorite products
│       │
│       ├── lists/
│       │   ├── page.tsx              # Custom lists overview
│       │   └── [id]/
│       │       └── page.tsx          # List detail page
│       │
│       └── leora/
│           └── page.tsx              # AI chat interface
│
├── workers/                          # Background job workers
│   ├── webhook-delivery.ts           # Webhook delivery processor
│   ├── health-scoring.ts             # Customer health scoring job
│   ├── briefing-generator.ts         # AI briefing generation job
│   ├── pace-detection.ts             # Ordering pace detection job
│   ├── sample-reconciliation.ts      # Sample inventory reconciliation
│   └── integration-sync.ts           # Third-party integration sync
│
├── globals.css                       # Global styles (Tailwind 4 entry)
├── layout.tsx                        # Root layout
├── loading.tsx                       # Root loading UI
├── error.tsx                         # Root error boundary
└── not-found.tsx                     # 404 page
```

---

## 3. `components/` - React Components

```
components/
├── ui/                               # shadcn/ui primitives
│   ├── button.tsx
│   ├── card.tsx
│   ├── table.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── input.tsx
│   ├── form.tsx
│   ├── select.tsx
│   ├── textarea.tsx
│   ├── checkbox.tsx
│   ├── radio-group.tsx
│   ├── switch.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   ├── toast.tsx
│   ├── tabs.tsx
│   ├── accordion.tsx
│   ├── popover.tsx
│   ├── tooltip.tsx
│   ├── sheet.tsx
│   ├── skeleton.tsx
│   ├── progress.tsx
│   ├── separator.tsx
│   └── alert.tsx
│
├── portal/                           # Portal-specific components
│   ├── navigation/
│   │   ├── PortalNav.tsx             # Main navigation component
│   │   ├── PortalHeader.tsx          # Top header bar
│   │   ├── PortalSidebar.tsx         # Sidebar navigation
│   │   ├── PortalFooter.tsx          # Footer
│   │   ├── NavLink.tsx               # Active nav link
│   │   └── UserMenu.tsx              # User dropdown menu
│   │
│   ├── dashboard/
│   │   ├── MetricCard.tsx            # Dashboard metric display
│   │   ├── BriefingCard.tsx          # AI briefing card
│   │   ├── ActivityFeed.tsx          # Recent activity feed
│   │   ├── HealthScoreChart.tsx      # Customer health visualization
│   │   ├── RevenueChart.tsx          # Revenue trends chart
│   │   └── QuickActions.tsx          # Quick action buttons
│   │
│   ├── products/
│   │   ├── ProductCard.tsx           # Product card component
│   │   ├── ProductGrid.tsx           # Product grid layout
│   │   ├── ProductList.tsx           # Product list layout
│   │   ├── ProductFilters.tsx        # Filter controls
│   │   ├── ProductSearch.tsx         # Search input
│   │   ├── ProductDetail.tsx         # Product detail view
│   │   ├── InventoryBadge.tsx        # Inventory status indicator
│   │   └── PricingDisplay.tsx        # Price breakdown display
│   │
│   ├── orders/
│   │   ├── OrderList.tsx             # Order list table
│   │   ├── OrderCard.tsx             # Order card summary
│   │   ├── OrderDetail.tsx           # Order detail view
│   │   ├── OrderLineItem.tsx         # Order line item row
│   │   ├── OrderStatusBadge.tsx      # Order status indicator
│   │   ├── OrderTimeline.tsx         # Order status timeline
│   │   └── OrderFilters.tsx          # Order filter controls
│   │
│   ├── invoices/
│   │   ├── InvoiceList.tsx           # Invoice list table
│   │   ├── InvoiceCard.tsx           # Invoice card summary
│   │   ├── InvoiceDetail.tsx         # Invoice detail view
│   │   ├── PaymentHistory.tsx        # Payment history table
│   │   ├── InvoiceStatusBadge.tsx    # Invoice status indicator
│   │   └── InvoicePDFViewer.tsx      # PDF viewer component
│   │
│   ├── cart/
│   │   ├── CartDrawer.tsx            # Slide-out cart drawer
│   │   ├── CartItem.tsx              # Cart item component
│   │   ├── CartSummary.tsx           # Cart total summary
│   │   ├── CartEmptyState.tsx        # Empty cart message
│   │   ├── CheckoutForm.tsx          # Checkout form
│   │   └── CheckoutSummary.tsx       # Checkout order summary
│   │
│   ├── insights/
│   │   ├── MetricChart.tsx           # Generic metric chart
│   │   ├── HealthScoreCard.tsx       # Health score display
│   │   ├── PaceIndicator.tsx         # Ordering pace indicator
│   │   ├── OpportunityCard.tsx       # Top opportunity card
│   │   ├── RevenueBreakdown.tsx      # Revenue breakdown chart
│   │   └── TrendIndicator.tsx        # Trend arrow/percentage
│   │
│   ├── reports/
│   │   ├── ReportCard.tsx            # Report preview card
│   │   ├── ReportViewer.tsx          # Report display component
│   │   ├── ReportFilters.tsx         # Report filter controls
│   │   ├── ExportButton.tsx          # Export button with menu
│   │   └── ReportScheduler.tsx       # Schedule report form
│   │
│   ├── account/
│   │   ├── AccountSummary.tsx        # Account overview
│   │   ├── ProfileForm.tsx           # Profile edit form
│   │   ├── PasswordForm.tsx          # Password change form
│   │   ├── NotificationSettings.tsx  # Notification preferences
│   │   └── BillingInfo.tsx           # Billing information
│   │
│   ├── leora/                        # AI Copilot components
│   │   ├── ChatInterface.tsx         # Main chat component
│   │   ├── ChatMessage.tsx           # Individual message bubble
│   │   ├── ChatInput.tsx             # Message input field
│   │   ├── ChatSuggestions.tsx       # Suggested queries
│   │   ├── ChatThinking.tsx          # AI thinking indicator
│   │   ├── BriefingPanel.tsx         # Daily briefing panel
│   │   └── InsightCard.tsx           # AI insight card
│   │
│   └── shared/                       # Shared portal components
│       ├── EmptyState.tsx            # Generic empty state
│       ├── ErrorState.tsx            # Error display
│       ├── LoadingState.tsx          # Loading spinner
│       ├── Pagination.tsx            # Pagination controls
│       ├── SearchInput.tsx           # Search input with debounce
│       ├── FilterTags.tsx            # Active filter tags
│       ├── DateRangePicker.tsx       # Date range selector
│       ├── ExportMenu.tsx            # Export format menu
│       └── ConfirmDialog.tsx         # Confirmation modal
│
├── providers/                        # Context providers
│   ├── PortalProviders.tsx           # Root provider wrapper
│   ├── PortalSessionProvider.tsx     # Session management
│   ├── QueryProvider.tsx             # TanStack Query provider
│   ├── ThemeProvider.tsx             # Dark mode provider
│   └── ToastProvider.tsx             # Toast notification provider
│
└── guards/
    ├── PortalAuthGuard.tsx           # Protected route wrapper
    └── PermissionGuard.tsx           # Permission-based guard
```

---

## 4. `lib/` - Core Libraries

```
lib/
├── auth/
│   ├── jwt.ts                        # JWT token generation/validation
│   ├── cookies.ts                    # Secure cookie helpers
│   ├── session.ts                    # Session management
│   ├── rbac.ts                       # Role-based access control
│   ├── passwords.ts                  # Password hashing (bcrypt)
│   └── rateLimit.ts                  # Rate limiting logic
│
├── prisma.ts                         # Prisma client singleton + withTenant
│
├── ai/
│   ├── openai.ts                     # OpenAI client wrapper
│   ├── prompts.ts                    # System prompts for GPT-5
│   ├── templates.ts                  # SQL query templates
│   ├── cache.ts                      # AI response caching
│   ├── router.ts                     # Intent classification router
│   └── fallbacks.ts                  # Fallback strategies
│
├── services/                         # Business logic services
│   ├── orders.ts                     # Order management service
│   ├── products.ts                   # Product catalog service
│   ├── inventory.ts                  # Inventory availability service
│   ├── invoices.ts                   # Invoice management service
│   ├── payments.ts                   # Payment processing service
│   ├── cart.ts                       # Cart management service
│   ├── insights.ts                   # Analytics insights service
│   ├── reports.ts                    # Report generation service
│   ├── health-engine.ts              # Customer health scoring
│   ├── pricing-waterfall.ts          # Pricing calculation engine
│   ├── sample-management.ts          # Sample tracking service
│   ├── pace-detection.ts             # Ordering pace detection
│   ├── opportunities.ts              # Top opportunities engine
│   └── webhooks.ts                   # Webhook delivery service
│
├── utils/
│   ├── validation.ts                 # Zod schemas for validation
│   ├── currency.ts                   # Currency formatting
│   ├── dates.ts                      # Date formatting/parsing
│   ├── errors.ts                     # Error handling utilities
│   ├── pagination.ts                 # Pagination helpers
│   ├── filtering.ts                  # Filter parsing
│   ├── sorting.ts                    # Sort parameter parsing
│   ├── slugify.ts                    # String slugification
│   └── logger.ts                     # Logging utility
│
├── hooks/                            # React custom hooks
│   ├── usePortalSession.ts           # Access portal session context
│   ├── usePermission.ts              # Check user permissions
│   ├── usePagination.ts              # Pagination state management
│   ├── useDebounce.ts                # Debounce input values
│   ├── useLocalStorage.ts            # localStorage sync
│   └── useMediaQuery.ts              # Responsive breakpoints
│
├── types/                            # TypeScript type definitions
│   ├── api.ts                        # API request/response types
│   ├── auth.ts                       # Auth-related types
│   ├── tenant.ts                     # Tenant types
│   ├── portal.ts                     # Portal user types
│   ├── orders.ts                     # Order types
│   ├── products.ts                   # Product types
│   ├── insights.ts                   # Insights types
│   └── leora.ts                      # AI Copilot types
│
└── constants.ts                      # App-wide constants
```

---

## 5. `prisma/` - Database Schema

```
prisma/
├── schema.prisma                     # Main Prisma schema
├── migrations/                       # Migration history
│   ├── 20250101000000_init/
│   │   └── migration.sql
│   ├── 20250115000000_add_portal_users/
│   │   └── migration.sql
│   └── migration_lock.toml
├── seed.ts                           # Database seeding script
└── seeds/                            # Seed data files
    ├── tenants.json
    ├── users.json
    └── products.csv
```

---

## 6. `public/` - Static Assets

```
public/
├── logos/                            # Brand logos
│   ├── leora-wordmark-dark.svg
│   ├── leora-wordmark-light.svg
│   ├── leora-spark.svg
│   └── leora-icon.png
├── icons/                            # Favicons
│   ├── favicon.svg
│   ├── favicon-512.png
│   ├── favicon-192.png
│   ├── apple-touch-icon.png
│   └── manifest.json
├── images/                           # Static images
│   ├── empty-states/
│   │   ├── no-orders.svg
│   │   ├── no-products.svg
│   │   └── no-data.svg
│   └── og/
│       ├── og-image-light.png
│       └── og-image-dark.png
└── fonts/                            # Custom fonts (if needed)
    └── Inter/
```

---

## 7. `docs/` - Documentation

```
docs/
├── implementation-strategy.md        # Main strategy document
├── architecture-diagrams.md          # Text-based architecture diagrams
├── integration-points.md             # Module integration documentation
├── risk-mitigation.md                # Risk assessment
│
├── api/                              # API documentation
│   ├── portal-endpoints.md           # Portal API reference
│   ├── sales-endpoints.md            # Sales rep API reference
│   ├── leora-ai.md                   # AI Copilot API reference
│   └── webhooks.md                   # Webhook documentation
│
├── ai/                               # AI Copilot documentation
│   ├── prompt-templates.md           # System prompt templates
│   ├── model-usage.md                # OpenAI model usage guide
│   ├── query-templates.md            # SQL query templates
│   └── runbooks.md                   # AI troubleshooting runbooks
│
├── database/
│   ├── supabase-schema-overview.md   # Current schema snapshot
│   ├── rls-policies.md               # Row-level security policies
│   └── migration-guide.md            # Migration procedures
│
├── deployment/
│   ├── vercel-setup.md               # Vercel deployment guide
│   ├── environment-variables.md      # Environment configuration
│   └── ci-cd-pipeline.md             # CI/CD documentation
│
├── features/
│   ├── health-scoring.md             # Customer health engine
│   ├── pricing-waterfall.md          # Pricing engine
│   ├── sample-management.md          # Sample tracking
│   └── pace-detection.md             # Ordering pace detection
│
└── guides/
    ├── developer-onboarding.md       # New developer guide
    ├── coding-standards.md           # Code style guide
    └── testing-guide.md              # Testing strategy
```

---

## 8. `tests/` - Test Suites

```
tests/
├── unit/                             # Jest unit tests
│   ├── auth/
│   │   ├── jwt.test.ts
│   │   ├── session.test.ts
│   │   └── rbac.test.ts
│   ├── services/
│   │   ├── orders.test.ts
│   │   ├── products.test.ts
│   │   ├── health-engine.test.ts
│   │   └── pricing-waterfall.test.ts
│   ├── utils/
│   │   ├── validation.test.ts
│   │   ├── currency.test.ts
│   │   └── dates.test.ts
│   └── ai/
│       ├── prompts.test.ts
│       └── router.test.ts
│
├── integration/                      # API integration tests
│   ├── api/
│   │   ├── auth.test.ts
│   │   ├── products.test.ts
│   │   ├── orders.test.ts
│   │   ├── cart.test.ts
│   │   └── leora.test.ts
│   └── prisma/
│       ├── tenant-isolation.test.ts
│       └── rls-policies.test.ts
│
├── e2e/                              # Playwright E2E tests
│   ├── portal/
│   │   ├── auth-flow.spec.ts
│   │   ├── product-catalog.spec.ts
│   │   ├── order-flow.spec.ts
│   │   ├── cart-checkout.spec.ts
│   │   └── dashboard.spec.ts
│   └── fixtures/
│       └── test-data.ts
│
├── setup/
│   ├── jest.config.js
│   ├── jest.setup.ts
│   └── playwright.config.ts
│
└── mocks/
    ├── prisma.ts                     # Prisma mock client
    ├── openai.ts                     # OpenAI mock responses
    └── supabase.ts                   # Supabase mock data
```

---

## 9. `scripts/` - Utility Scripts

```
scripts/
├── seed-well-crafted.ts              # Well Crafted tenant seed script
├── generate-types.ts                 # Generate TypeScript types from Prisma
├── check-rls-policies.ts             # Verify RLS policies
├── rotate-secrets.ts                 # Secret rotation utility
├── backup-database.ts                # Database backup script
└── migrate-tenants.ts                # Tenant migration utility
```

---

## Module Naming Conventions

### Files
- **React Components**: PascalCase (e.g., `ProductCard.tsx`)
- **Utilities/Services**: camelCase (e.g., `validation.ts`, `orderService.ts`)
- **API Routes**: kebab-case directories, `route.ts` filename
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_PAGE_SIZE`)

### Directories
- **Feature-based**: Group by domain (e.g., `products/`, `orders/`)
- **Layout Groups**: Next.js convention `(portal)/`, `(auth)/`
- **Private Folders**: Prefix with `_` (e.g., `_utils/`)

### Imports
- **Absolute imports from `@/`**: Configured in `tsconfig.json`
  - `@/components/ui/button` instead of `../../components/ui/button`
  - `@/lib/utils` instead of `../../../lib/utils`

---

## File Size Guidelines

- **Components**: Maximum 300 lines (split into smaller components if larger)
- **Services**: Maximum 500 lines (split by responsibility)
- **API Routes**: Maximum 200 lines (extract logic to services)
- **Utilities**: Maximum 150 lines per file

---

## Key Files by Purpose

### Authentication
- `app/api/portal/auth/login/route.ts` - Login endpoint
- `lib/auth/jwt.ts` - JWT token handling
- `components/providers/PortalSessionProvider.tsx` - Session context
- `components/guards/PortalAuthGuard.tsx` - Route protection

### Multi-Tenancy
- `lib/prisma.ts` - `withTenant` helper
- `app/api/_utils/withTenantFromRequest.ts` - Tenant middleware
- `docs/database/rls-policies.md` - RLS documentation

### AI Copilot
- `app/api/leora/chat/route.ts` - Chat endpoint
- `lib/ai/openai.ts` - OpenAI client
- `lib/ai/prompts.ts` - System prompts
- `components/portal/leora/ChatInterface.tsx` - Chat UI

### Business Logic
- `lib/services/health-engine.ts` - Health scoring
- `lib/services/pricing-waterfall.ts` - Pricing calculations
- `lib/services/sample-management.ts` - Sample tracking
- `lib/services/pace-detection.ts` - Ordering pace

---

## Next Steps

1. **Initialize directory structure** in new repository
2. **Configure TypeScript path aliases** in `tsconfig.json`
3. **Set up ESLint rules** for directory organization
4. **Document any deviations** from this structure in `CHANGELOG.md`

---

**Document Status**: ✅ Complete
**Owner**: Architecture Team
**Last Updated**: October 15, 2025
