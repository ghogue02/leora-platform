# Agent Configuration Guide - Leora Platform

**For All AI Agents Working on Leora Platform**
**Last Updated**: October 16, 2025

---

## 🎯 Core Principles

This document provides essential guidance for AI agents (Claude Code, Claude Flow agents, and other autonomous agents) working on the Leora Platform codebase.

---

## 🗄️ DATABASE OPERATIONS - CRITICAL RULES

### Primary Reference
**ALWAYS READ FIRST**: `/Users/greghogue/Leora/docs/database/DATABASE-SCHEMA-REFERENCE.md`

This comprehensive reference contains:
- Complete model definitions
- Common query patterns
- Prisma usage examples
- Multi-tenant best practices
- Common mistakes to avoid

### The Golden Rules

#### 1. NO ENUMS - All Fields Are Strings
```typescript
// ❌ WRONG - Enums don't exist in this schema
const user = await prisma.user.create({
  data: {
    role: UserRole.ADMIN  // ❌ This will fail at compile time
  }
});

// ✅ CORRECT - Use string literals
const user = await prisma.user.create({
  data: {
    role: "ADMIN"  // ✅ Valid string value
  }
});
```

**Valid string values for common fields:**
- **User.status**: `"ACTIVE"`, `"INACTIVE"`, `"LOCKED"`
- **PortalUser.status**: `"ACTIVE"`, `"INACTIVE"`, `"LOCKED"`
- **Customer.status**: `"ACTIVE"`, `"INACTIVE"`, `"SUSPENDED"`
- **Order.status**: `"DRAFT"`, `"PENDING"`, `"CONFIRMED"`, `"SHIPPED"`, `"DELIVERED"`, `"CANCELLED"`
- **Product.status**: `"ACTIVE"`, `"INACTIVE"`, `"DISCONTINUED"`
- **Product.alcoholType**: `"WINE"`, `"BEER"`, `"SPIRITS"`, `"CIDER"`, `"SAKE"`, `"MEAD"`, `"OTHER"`

#### 2. Use Prisma Relations (Never Raw Foreign Keys)
```typescript
// ❌ WRONG - Direct foreign key assignment
await prisma.orderLine.create({
  data: {
    orderId: "order_123",
    productId: "product_456",  // ❌ This will fail
    quantity: 2
  }
});

// ✅ CORRECT - Use Prisma relation syntax
await prisma.orderLine.create({
  data: {
    order: { connect: { id: "order_123" } },
    product: { connect: { id: "product_456" } },  // ✅ Correct
    quantity: 2
  }
});
```

#### 3. Multi-Tenant Isolation (ALWAYS Filter by tenantId)
```typescript
// ❌ WRONG - Missing tenant isolation
const customers = await prisma.customer.findMany({
  where: {
    status: "ACTIVE"
  }
});
// This will return customers from ALL tenants - security breach!

// ✅ CORRECT - Always include tenantId
const customers = await prisma.customer.findMany({
  where: {
    tenantId: currentTenant.id,  // ✅ Required for security
    status: "ACTIVE"
  }
});
```

#### 4. Use Prisma.Decimal for Money (Never Plain Numbers)
```typescript
import { Prisma } from '@prisma/client';

// ❌ WRONG - Floating point precision errors
await prisma.order.create({
  data: {
    totalAmount: 19.99  // ❌ Will cause precision issues
  }
});

// ✅ CORRECT - Use Prisma.Decimal
await prisma.order.create({
  data: {
    totalAmount: new Prisma.Decimal(19.99)  // ✅ Precise decimal handling
  }
});
```

---

## 📋 Pre-Development Checklist

Before writing ANY database-related code:

- [ ] Read `/docs/database/DATABASE-SCHEMA-REFERENCE.md`
- [ ] Check the exact model in `prisma/schema.prisma`
- [ ] Confirm field types (String vs Enum - use String!)
- [ ] Plan multi-tenant isolation (include tenantId)
- [ ] Use Prisma.Decimal for money fields
- [ ] Use `connect` syntax for relations
- [ ] Include error handling for database operations

---

## 🏗️ Architecture & Project Structure

### Primary Reference
**Blueprint**: `/Users/greghogue/Leora/leora-platform-blueprint.md`

This is the authoritative source for:
- Platform vision & scope
- Technical requirements
- Feature specifications
- Brand guidelines
- Deployment standards

### Project Structure
```
/Users/greghogue/Leora/
├── app/                    # Next.js 15 App Router
│   ├── api/               # API routes
│   │   ├── portal/        # B2B customer portal APIs
│   │   └── admin/         # Internal admin APIs
│   └── (routes)/          # Frontend pages
├── lib/                   # Shared utilities
│   ├── services/          # Business logic
│   │   ├── order-service.ts      # Order management
│   │   ├── pricing.ts            # Pricing calculations
│   │   └── ...
│   ├── auth/              # Authentication
│   └── prisma.ts          # Prisma client singleton
├── prisma/
│   ├── schema.prisma      # Database schema (source of truth)
│   └── migrations/        # Database migrations
├── docs/                  # Documentation
│   ├── database/          # Database documentation
│   │   └── DATABASE-SCHEMA-REFERENCE.md  # ⭐ Primary DB reference
│   └── ...
└── CLAUDE.md              # Claude Code configuration
```

---

## 🔧 Common Patterns & Helper Functions

### 1. Tenant-Scoped Transactions
```typescript
import { withTenant } from '@/lib/prisma';

// Always use this helper for tenant-isolated operations
const result = await withTenant(tenantId, async (tx) => {
  return tx.customer.findMany({
    where: { tenantId }  // Helper ensures tenant isolation
  });
});
```

### 2. Order Creation Pattern
```typescript
import { Prisma } from '@prisma/client';
import {
  prepareOrderLines,
  generateOrderNumber,
  adjustInventoryForOrder
} from '@/lib/services/order-service';

const order = await prisma.$transaction(async (tx) => {
  // 1. Prepare order lines (validates inventory, calculates prices)
  const prepared = await prepareOrderLines(
    tx,
    tenantId,
    customerId,
    lineItems
  );

  // 2. Generate unique order number
  const orderNumber = await generateOrderNumber(tx, tenantId);

  // 3. Create order with lines
  const newOrder = await tx.order.create({
    data: {
      orderNumber,
      tenantId,
      customerId,
      status: "PENDING",
      subtotal: new Prisma.Decimal(prepared.subtotal),
      totalAmount: new Prisma.Decimal(prepared.subtotal),
      lines: {
        create: prepared.createInputs  // Already formatted correctly
      }
    }
  });

  // 4. Adjust inventory
  await adjustInventoryForOrder(tx, prepared.inventoryAdjustments);

  return newOrder;
});
```

### 3. Authentication Query Pattern
```typescript
// For portal users (B2B customers)
const portalUser = await prisma.portalUser.findFirst({
  where: {
    tenantId: currentTenant.id,
    email: email.toLowerCase(),
    status: "ACTIVE"
  },
  include: {
    customer: true,
    roleAssignments: {
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true }
            }
          }
        }
      }
    }
  }
});
```

### 4. Product Search Pattern
```typescript
const products = await prisma.product.findMany({
  where: {
    tenantId: currentTenant.id,
    status: "ACTIVE",
    OR: [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { sku: { contains: searchTerm, mode: 'insensitive' } },
      { brand: { contains: searchTerm, mode: 'insensitive' } }
    ]
  },
  include: {
    inventoryRecords: {
      where: {
        quantityAvailable: { gt: 0 }
      }
    },
    priceListEntries: {
      where: {
        priceListName: "standard"
      }
    }
  },
  take: 20
});
```

---

## 🚨 Common Mistakes & How to Avoid Them

### Mistake 1: Using Enum Types
```typescript
// ❌ WRONG
import { UserRole } from '@prisma/client';
const role = UserRole.ADMIN;

// ✅ CORRECT
const role = "ADMIN";
```

**Why**: All enum columns were converted to TEXT for Prisma compatibility. The TypeScript enums no longer exist.

### Mistake 2: Direct Foreign Keys
```typescript
// ❌ WRONG
await prisma.orderLine.create({
  data: {
    productId: "abc123"
  }
});

// ✅ CORRECT
await prisma.orderLine.create({
  data: {
    product: {
      connect: { id: "abc123" }
    }
  }
});
```

**Why**: Prisma 5.22+ requires explicit relation syntax for type safety and validation.

### Mistake 3: Missing Tenant Filtering
```typescript
// ❌ WRONG - Security vulnerability!
const count = await prisma.customer.count({
  where: { status: "ACTIVE" }
});

// ✅ CORRECT - Tenant-isolated
const count = await prisma.customer.count({
  where: {
    tenantId: currentTenant.id,
    status: "ACTIVE"
  }
});
```

**Why**: Multi-tenant architecture requires strict data isolation for security and compliance.

### Mistake 4: Number for Money
```typescript
// ❌ WRONG - Precision loss
const order = await prisma.order.create({
  data: {
    totalAmount: 99.99  // 0.1 + 0.2 = 0.30000000000000004
  }
});

// ✅ CORRECT - Precise decimal math
const order = await prisma.order.create({
  data: {
    totalAmount: new Prisma.Decimal("99.99")
  }
});
```

**Why**: Financial calculations require precise decimal arithmetic, not IEEE 754 floating point.

---

## 📊 Database Statistics (As of Oct 16, 2025)

- **Total Tables**: 42
- **Total Customers**: 21,215
- **Total Orders**: 4,268
- **Total Products**: 1,937
- **Primary Tenant**: Well Crafted (slug: "well-crafted")

---

## 🔗 Essential Files

### Must Read Before Coding:
1. `/docs/database/DATABASE-SCHEMA-REFERENCE.md` - Complete database reference
2. `/leora-platform-blueprint.md` - Platform specifications
3. `/prisma/schema.prisma` - Database schema source of truth
4. `/CLAUDE.md` - Development environment setup

### Key Service Files:
- `/lib/services/order-service.ts` - Order management
- `/lib/services/pricing.ts` - Price calculations
- `/lib/auth/` - Authentication utilities
- `/lib/prisma.ts` - Prisma client setup

### API Reference Implementations:
- `/app/api/portal/cart/checkout/route.ts` - Checkout flow
- `/app/api/portal/orders/route.ts` - Order creation
- `/app/api/portal/auth/login/route.ts` - Authentication

---

## 🎯 Agent-Specific Guidelines

### For Backend Development Agents:
1. **Always** read database schema reference first
2. **Never** use enum types - use strings
3. **Always** filter by tenantId
4. **Always** use Prisma.Decimal for money
5. **Always** use transaction wrappers for multi-step operations

### For Frontend Development Agents:
1. API routes return lowercase status strings
2. Customer count should display 21,215 (production data)
3. Use TypeScript types generated from Prisma
4. Handle authentication states properly

### For Testing Agents:
1. Mock Prisma client for unit tests
2. Test multi-tenant isolation
3. Test decimal precision for money
4. Verify relation syntax in integration tests

### For Documentation Agents:
1. Reference `/docs/database/DATABASE-SCHEMA-REFERENCE.md`
2. Keep examples up-to-date with schema
3. Document multi-tenant patterns
4. Show correct Prisma syntax

---

## 🚀 Quick Start Template

```typescript
import { Prisma, PrismaClient } from '@prisma/client';
import { withTenant } from '@/lib/prisma';

// Example: Create a new entity with proper patterns
async function createExample(
  tenantId: string,
  customerId: string,
  data: ExampleInput
) {
  return withTenant(tenantId, async (tx) => {
    // ✅ Tenant isolation
    // ✅ Transaction wrapper
    // ✅ Prisma.Decimal for money
    // ✅ Relation syntax
    return tx.example.create({
      data: {
        tenantId,  // ✅ Always include
        customer: { connect: { id: customerId } },  // ✅ Relation
        amount: new Prisma.Decimal(data.amount),  // ✅ Decimal
        status: "ACTIVE"  // ✅ String, not enum
      }
    });
  });
}
```

---

## 📞 Getting Help

If you encounter issues:

1. **Database Questions**: Check `/docs/database/DATABASE-SCHEMA-REFERENCE.md`
2. **Architecture Questions**: Read `/leora-platform-blueprint.md`
3. **Prisma Issues**: Consult `prisma/schema.prisma` and Prisma docs
4. **Build Errors**: Run `npm run build` to see full error context

---

## ✅ Final Checklist

Before submitting any database-related code:

- [ ] No enum types used (all fields are String)
- [ ] All relations use `connect` syntax
- [ ] All queries include `tenantId` filter
- [ ] All money amounts use `Prisma.Decimal`
- [ ] Transactions used for multi-step operations
- [ ] Error handling implemented
- [ ] TypeScript types correct
- [ ] Multi-tenant security verified

---

**Remember**: The database schema reference is your single source of truth for all database operations. When in doubt, consult `/docs/database/DATABASE-SCHEMA-REFERENCE.md` first!

---

**Last Updated**: October 16, 2025
**Schema Version**: Production v1.0
**Migration Status**: ✅ Complete (28 enums → String)
