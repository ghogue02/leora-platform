# Leora Platform - Database Migration Guide

## Initial Setup

### 1. Install Dependencies

```bash
npm install prisma @prisma/client
npm install -D ts-node @types/node
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and update credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `DATABASE_URL` - Supabase pooled connection
- `DIRECT_URL` - Supabase direct connection
- `JWT_SECRET` - Generate with `openssl rand -base64 32`

### 3. Generate Prisma Client

```bash
npx prisma generate
```

## Migration Workflow

### Development Migrations

```bash
# Create new migration
npx prisma migrate dev --name descriptive_name

# Example: Add new table
npx prisma migrate dev --name add_promotions_table

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Production Migrations

```bash
# Deploy pending migrations
npx prisma migrate deploy

# Verify deployment
npx prisma migrate status

# View migration history
npx prisma migrate history
```

## Applying RLS Policies

After running Prisma migrations, apply RLS policies:

```bash
# Using psql
psql $DATABASE_URL -f prisma/rls-policies.sql

# Or using Supabase SQL Editor
# Copy contents of prisma/rls-policies.sql and execute
```

## Seeding Database

### Initial Seed

```bash
# Run seed script
npm run seed

# Or directly
npx ts-node scripts/seed-well-crafted-tenant.ts
```

### Custom Seeds

Create additional seed scripts in `/scripts`:

```typescript
// scripts/seed-custom-data.ts
import { prisma } from '../lib/prisma';

async function main() {
  // Your seed logic
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Migration Best Practices

### 1. Schema Changes

**DO:**
- Make incremental changes
- Test migrations on development first
- Use descriptive migration names
- Add indexes for performance
- Include comments for complex logic

**DON'T:**
- Delete columns without backup
- Change column types without migration strategy
- Skip RLS policy updates
- Deploy untested migrations

### 2. Data Migrations

For complex data transformations:

```typescript
// migrations/20250115_transform_data/migration.ts
import { PrismaClient } from '@prisma/client';

export async function up(prisma: PrismaClient) {
  // Transform existing data
  const products = await prisma.product.findMany();

  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        // Transformation logic
      }
    });
  }
}
```

### 3. Rollback Strategy

```bash
# Mark migration as rolled back
npx prisma migrate resolve --rolled-back "migration_name"

# Manually revert schema changes
# Then create new migration
npx prisma migrate dev --name revert_previous_change
```

## Common Migration Scenarios

### Adding a New Table

```prisma
model Promotion {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])

  name        String
  description String?
  discountPercent Decimal @db.Decimal(5,2)

  validFrom   DateTime
  validUntil  DateTime

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([tenantId])
  @@map("promotions")
}
```

Then:
```bash
npx prisma migrate dev --name add_promotions
```

### Adding a Column

```prisma
model Product {
  // ... existing fields
  featured    Boolean  @default(false)  // New field
}
```

```bash
npx prisma migrate dev --name add_product_featured_flag
```

### Adding an Index

```prisma
model Order {
  // ... existing fields

  @@index([tenantId, status, orderDate])  // New composite index
}
```

```bash
npx prisma migrate dev --name add_order_status_date_index
```

### Changing a Relationship

```prisma
// Before
model Order {
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
}

// After - Add optional sales rep
model Order {
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])

  salesRepId String?
  salesRep   User?    @relation(fields: [salesRepId], references: [id])
}
```

```bash
npx prisma migrate dev --name add_order_sales_rep
```

## Testing Migrations

### Local Testing

```bash
# 1. Create test database
createdb leora_test

# 2. Set test DATABASE_URL
export DATABASE_URL="postgresql://..."

# 3. Run migrations
npx prisma migrate deploy

# 4. Run seed
npm run seed

# 5. Verify data
npx prisma studio
```

### CI/CD Testing

```yaml
# .github/workflows/test.yml
- name: Run migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

- name: Run tests
  run: npm test
```

## Troubleshooting

### Migration Failed

```bash
# Check status
npx prisma migrate status

# View failed migration
npx prisma migrate history

# Resolve manually
npx prisma migrate resolve --applied "migration_name"
# or
npx prisma migrate resolve --rolled-back "migration_name"
```

### Schema Drift

```bash
# Check for drift
npx prisma migrate diff

# Pull current database schema
npx prisma db pull

# Create migration to fix drift
npx prisma migrate dev --name fix_schema_drift
```

### Connection Issues

```bash
# Test connection
npx prisma db execute --stdin <<< "SELECT 1"

# Verify SSL settings
echo $DATABASE_URL | grep sslmode
```

### RLS Policy Issues

```sql
-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- Temporarily disable RLS (development only)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Re-enable
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

## Production Deployment Checklist

- [ ] Backup database before migration
- [ ] Test migration on staging environment
- [ ] Review migration SQL
- [ ] Plan rollback strategy
- [ ] Deploy during maintenance window
- [ ] Run migration: `npx prisma migrate deploy`
- [ ] Apply RLS policies: `psql $DATABASE_URL -f prisma/rls-policies.sql`
- [ ] Verify data integrity
- [ ] Monitor application logs
- [ ] Update API documentation if schema changed

## Useful Commands

```bash
# View Prisma client version
npx prisma --version

# Format schema file
npx prisma format

# Validate schema
npx prisma validate

# Open Prisma Studio (GUI)
npx prisma studio

# Introspect existing database
npx prisma db pull

# Push schema without migration (dev only)
npx prisma db push

# Generate ERD diagram
npx prisma-erd-generator
```

## Resources

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Supabase Migrations](https://supabase.com/docs/guides/database/overview)
- [PostgreSQL Migration Best Practices](https://www.postgresql.org/docs/current/ddl.html)
