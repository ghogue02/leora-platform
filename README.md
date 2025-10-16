# Leora Platform

**Clarity you can act on.**

Leora is a multi-tenant, API-first system of record for beverage alcohol distributors, combining a sales rep hub with customer self-service portal, AI-powered insights, and automated compliance.

## Overview

Leora delivers operational clarity through intelligent automation:

- **AI Copilot** – Ask Leora natural-language questions about your sales, orders, and customer health
- **Product Catalog** – Comprehensive inventory with cart, checkout, and order management
- **Sales Intelligence** – Health scoring, pace tracking, revenue risk detection, and sample accountability
- **Analytics Dashboard** – Real-time insights into sales performance, customer behavior, and pipeline health
- **Portal Experience** – Self-service ordering for B2B customers with full order and invoice visibility
- **Automation** – Webhook integrations, background jobs, and compliance filing workflows

### Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19
- **UI**: Tailwind CSS 4, shadcn/ui, Radix UI primitives
- **State**: TanStack Query, Zod validation
- **Backend**: Node 20, Prisma ORM
- **Database**: Supabase Postgres (multi-tenant with RLS)
- **Auth**: JWT (access + refresh tokens), NextAuth integration planned
- **AI**: OpenAI GPT-5 for natural language insights and proactive briefings
- **Testing**: Jest, Playwright, ESLint, Prettier

## Quick Start

### Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL access (Supabase credentials provided separately)
- OpenAI API key for AI features

### Installation

```bash
# Clone and install dependencies
git clone <repository-url>
cd Leora
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your credentials (see Environment Variables section)

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy

# Seed demo data (Well Crafted tenant)
npm run seed

# Start development server
npm run dev
```

Visit `http://localhost:3000` to access the platform.

### Environment Setup

Create `.env.local` with the following required variables:

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Authentication
JWT_SECRET="<generate-32-char-secret>"

# Tenant Defaults
DEFAULT_TENANT_SLUG="well-crafted"
DEFAULT_PORTAL_USER_KEY="dev-portal-user"

# AI Features (required for Ask Leora)
OPENAI_API_KEY="sk-proj-..."

# Optional: Demo/Development
NEXT_PUBLIC_DEFAULT_TENANT_SLUG="well-crafted"
NEXT_PUBLIC_DEMO_SALES_REP_ID="<rep-id>"
NEXT_PUBLIC_DEMO_SALES_REP_NAME="Demo Rep"
```

See `.env.example` for complete variable reference and `docs/deployment/environment-variables.md` for detailed configuration.

## Project Structure

```
leora-platform/
├── app/                    # Next.js App Router
│   ├── (user)/            # Portal routes (auth-protected)
│   ├── api/               # API routes
│   └── workers/           # Background jobs
├── components/            # React components
│   ├── ui/               # shadcn/ui primitives
│   └── portal/           # Portal-specific components
├── lib/                   # Business logic & utilities
│   ├── auth/             # JWT, session management
│   ├── prisma.ts         # Database client & helpers
│   └── services/         # Domain services
├── prisma/               # Database schema & migrations
│   ├── schema.prisma     # Prisma schema definition
│   └── migrations/       # Migration history
├── scripts/              # Utility scripts
│   └── seed-well-crafted-tenant.ts
├── docs/                 # Documentation
│   ├── database/         # Schema documentation
│   ├── deployment/       # Deployment guides
│   └── user-portal/      # Portal feature specs
└── tests/                # Test suites
```

## Key Features

### 1. Multi-Tenant Architecture

Leora supports multiple distributor tenants with complete data isolation:

- Tenant-scoped database access via Prisma helpers (`withTenant`)
- Row-level security (RLS) policies in Supabase
- API middleware for automatic tenant resolution
- Per-tenant settings and customization

### 2. Portal Authentication

Secure JWT-based authentication with:

- Email/password login with rate limiting and lockout protection
- Self-service registration with email verification tokens (24-hour expiry). In non-production environments the verification token is returned in the API payload and logged to the console for convenience.
- `/api/portal/auth/verify-email` auto-activates the user and establishes a session once the token is confirmed.
- `/api/portal/auth/reset-password` issues one-time reset tokens (1-hour expiry) without leaking user existence; `/api/portal/auth/reset-password` `PUT` rotates credentials and revokes active sessions.
- Access and refresh token rotation
- Role-based access control (RBAC)
- Session management with audit logging
- Planned: NextAuth integration for OAuth providers

### 3. Product Catalog & Commerce

Full e-commerce capabilities:

- Product and SKU management with inventory tracking
- Cart and checkout workflows
- Price lists with waterfall pricing rules
- Order and invoice management
- Payment tracking and reconciliation

### 4. Sales Intelligence

Automated insights that drive action:

- **ARPDD Pace Tracking** – Monitor each customer's ordering cadence and flag deviations
- **Revenue Health Monitoring** – Alert when monthly revenue drops ≥15% below established averages
- **Sample Management** – Track samples as inventory transfers with tasting feedback and monthly allowances
- **Call Planning** – Automated reminders for customers due or at risk
- **Top Opportunities** – Surface products each customer hasn't purchased using revenue/volume/penetration metrics

### 5. AI Copilot (Ask Leora)

GPT-5-powered assistant providing:

- **Proactive Briefings** – Daily summaries of overdue orders, revenue changes, sample usage, and recommended actions
- **Natural Language Analytics** – Ask questions like "Which customers slipped pace this week?" and receive grounded answers from live data
- **Action Drill-Downs** – Every insight links to detailed dashboards and suggests follow-up tasks
- **Context Awareness** – Maintains conversation history and tenant-specific context

### 6. Analytics & Reporting

Real-time dashboards and export capabilities:

- Sales performance metrics by rep, region, product
- Customer health scores and risk indicators
- Inventory and sell-through analysis
- Custom report builder with CSV/Excel/PDF export

### 7. Background Automation

Reliable job processing:

- Webhook delivery worker with retry logic
- Scheduled health calculations and alerts
- Integration token management
- Compliance filing automation (planned)

## Available Scripts

### Development

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
```

### Database

```bash
npm run db:generate        # Generate Prisma client
npm run db:migrate:dev     # Create and apply migrations (dev)
npm run db:migrate:deploy  # Apply migrations (production)
npm run db:migrate:status  # Check migration status
npm run db:push           # Push schema changes (dev only)
npm run db:pull           # Introspect database schema
npm run db:studio         # Open Prisma Studio
npm run seed              # Seed Well Crafted demo data
npm run db:reset          # Reset database (warning: deletes data)
```

### Testing

```bash
npm run test             # Run Jest unit tests
npm run test:e2e         # Run Playwright end-to-end tests
npm run test:watch       # Jest in watch mode
```

## Documentation

- **[Platform Blueprint](./leora-platform-blueprint.md)** – Architecture, infrastructure, and implementation guide
- **[Database Schema](./docs/database/supabase-schema-overview.md)** – Complete schema documentation
- **[API Documentation](./docs/api/)** – Endpoint reference and contracts
- **[Portal Features](./docs/user-portal/)** – Feature specifications and routing
- **[Deployment Guide](./docs/deployment/)** – Vercel deployment and environment setup
- **[SPARC Workflow](./CLAUDE.md)** – Development methodology and agent orchestration

## Brand Guidelines

Leora follows a warm, assured, and concise brand voice:

- **Tagline**: Clarity you can act on
- **Voice**: Short sentences. Active verbs. Skip jargon.
- **Copy**: No emojis in UI or product copy
- **Icons**: Lucide icons (outline variants only)
- **Typography**: Inter font family with Title Case for feature names
- **Colors**: Ivory, Ink, Gold, Slate with Indigo, Sage, Clay, Sand accents

See `Leora_Brand_Press_Kit/` for complete brand assets and tokens.

## Multi-Tenant Support

### Current Tenant: Well Crafted

The platform launches with Well Crafted as the first customer, using live Supabase data. Never substitute mock data—when screens have no data, display explicit "no data" prompts and guide users to connect feeds.

### Adding New Tenants

1. Create tenant record via admin API or Prisma script
2. Configure tenant settings and preferences
3. Import products, customers, and historical data
4. Assign portal users and roles
5. Enable integrations and webhooks

All modules are architected to generalize across tenants without code changes.

## API Structure

### Authentication Endpoints

- `POST /api/portal/auth/login` – Email/password authentication
- `POST /api/portal/auth/logout` – Clear session and tokens
- `GET /api/portal/auth/me` – Retrieve current session
- `POST /api/portal/auth/refresh` – Refresh access token
- `POST /api/portal/auth/register` – Create new portal user
- `POST /api/portal/auth/reset-password` – Password reset flow
- `POST /api/portal/auth/verify-email` – Email verification

### Portal Endpoints

- `GET /api/portal/products` – Product catalog with filtering
- `GET /api/portal/orders` – Order history
- `GET /api/portal/orders/[id]` – Order details
- `GET /api/portal/invoices` – Invoice list
- `GET /api/portal/insights/*` – Analytics and insights
- `POST /api/portal/cart/*` – Cart management
- `GET /api/portal/reports` – Generate reports

### Sales Dashboard

- `GET /api/sales/dashboard` – Comprehensive sales metrics and KPIs

All endpoints return consistent JSON structure:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

## AI Integration

### GPT-5 Configuration

Leora uses OpenAI's GPT-5 model for natural language insights. Before implementation:

1. Consult latest OpenAI documentation for correct endpoints and parameters
2. Configure `OPENAI_API_KEY` in environment variables (server-side only)
3. Implement retry logic, timeout handling, and token usage logging
4. Set up response caching per tenant/user with change invalidation

### Implementation Phases

1. **Enablement** – Server-side OpenAI client wrapper with error handling
2. **Proactive Insights MVP** – Daily briefing job with Prisma metrics and GPT-5 narrative
3. **Chat Prototype** – Intent classification and SQL template mapping with real data citations
4. **Advanced Features** – Session memory, command routing, confidence scoring

### Operational Considerations

- Log token usage per tenant for future billing
- Capture prompts/responses (encrypted, tenant-scoped) for audits
- Implement fallbacks when GPT-5 or data services are unavailable
- Maintain prompt templates and runbooks in `docs/ai/`

## Deployment

### Vercel Deployment

1. Connect repository to Vercel project
2. Configure environment variables via Vercel CLI:

```bash
vercel env add DATABASE_URL
vercel env add DIRECT_URL
vercel env add JWT_SECRET
vercel env add OPENAI_API_KEY
# ... add all required variables from .env.example
```

3. Enable automatic deployments from main branch
4. Configure preview deployments for pull requests

### Supabase Configuration

- Enable Row-Level Security (RLS) on all business tables
- Create policies referencing `current_setting('app.current_tenant_id')`
- Verify network policies allow Vercel IPs
- Configure connection pooler for serverless environments

### Post-Deployment Checklist

- [ ] Smoke test login and authentication flows
- [ ] Verify dashboard loads with real data
- [ ] Test order and invoice retrieval
- [ ] Confirm insights and analytics endpoints
- [ ] Validate AI briefing and chat functionality
- [ ] Check webhook worker scheduling
- [ ] Monitor logs for Prisma connection errors
- [ ] Verify all environment variables are set

See `leora-platform-blueprint.md` Section 9 for complete deployment checklist.

## Security

- JWT secrets managed via environment variables (never committed)
- Row-Level Security (RLS) enforced in Supabase
- Rate limiting and account lockout on authentication endpoints
- Input validation using Zod schemas
- Secure cookie configuration (SameSite, HttpOnly, Secure flags)
- RBAC enforcement on all protected routes
- Webhook signature verification (planned)

## Performance

- Server-side rendering with React Server Components
- TanStack Query for optimized client-side caching
- Database connection pooling via Supabase
- Incremental Static Regeneration (ISR) for catalog pages
- Image optimization with Next.js Image component
- Background job processing for heavy operations

## Roadmap

### Phase 1: Foundation (Complete)
- [x] Next.js 15 + React 19 setup
- [x] Prisma schema and migrations
- [x] JWT authentication
- [x] Multi-tenant architecture

### Phase 2: Core Features (In Progress)
- [x] Product catalog and cart
- [x] Order and invoice management
- [ ] Complete checkout workflow
- [ ] Favorites and lists
- [ ] Report builder

### Phase 3: Intelligence (In Progress)
- [ ] ARPDD pace tracking
- [ ] Revenue health monitoring
- [ ] Sample management
- [ ] Call planning automation
- [ ] AI briefing job
- [ ] Chat interface

### Phase 4: Integration (Planned)
- [ ] NextAuth provider integration
- [ ] Webhook worker deployment
- [ ] Email notifications (Resend)
- [ ] Accounting system sync
- [ ] Compliance automation

### Phase 5: Scale (Future)
- [ ] Multi-distributor onboarding
- [ ] Billing and payments (Stripe)
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] API marketplace

## Contributing

This is a private commercial project. For development guidelines:

1. Follow SPARC methodology (see `CLAUDE.md`)
2. Write tests before implementation (TDD)
3. Use TypeScript strict mode
4. Keep files under 500 lines
5. Document all public APIs
6. Never hardcode secrets or credentials

### Development Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes with tests
npm run test

# Ensure types and linting pass
npm run typecheck
npm run lint

# Build and verify
npm run build

# Commit and push
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature
```

## Support

For platform support or technical questions:

- **Documentation**: See `docs/` directory
- **Technical Issues**: Review `leora-platform-blueprint.md`
- **Database**: Check `docs/database/supabase-schema-overview.md`
- **Deployment**: Consult `docs/deployment/`

## License

Proprietary and confidential. Unauthorized copying or distribution prohibited.

---

**Leora™** – Light for your operations. See the next move.
