# Database Schema Reference - Leora Platform

**Last Updated**: October 16, 2025
**Schema Version**: Production v1.0
**Database**: PostgreSQL (Supabase)
**ORM**: Prisma 5.22.0

---

## 🎯 Quick Reference

**Schema File**: `prisma/schema.prisma`
**Generated Client**: `node_modules/@prisma/client`
**Database URL**: `process.env.DATABASE_URL`
**Direct URL**: `process.env.DIRECT_URL`

---

## 📊 Database Statistics

- **Total Tables**: 42
- **Total Customers**: 21,215
- **Total Orders**: 4,268
- **Total Products**: 1,937
- **Primary Tenant**: Well Crafted (slug: "well-crafted")

---

## 🔑 Critical Rules

### 1. **ALL Fields Are String (No Enums)**
```typescript
// ❌ WRONG - Enums don't exist in this schema
model User {
  role     UserRole  // This will fail
}

// ✅ CORRECT - All enum fields are String
model User {
  role     String    // Valid values: "ADMIN", "SALES_REP", "MANAGER"
}
```

### 2. **Use Prisma Relations (Not Foreign Keys)**
```typescript
// ❌ WRONG - Don't use raw foreign keys in create
await prisma.orderLine.create({
  data: {
    productId: "abc123",  // This will fail
  }
});

// ✅ CORRECT - Use Prisma relation syntax
await prisma.orderLine.create({
  data: {
    product: {
      connect: { id: "abc123" }
    }
  }
});
```

### 3. **Always Include tenantId for Multi-Tenancy**
```typescript
// ❌ WRONG - Missing tenant isolation
await prisma.customer.findMany({
  where: { status: "ACTIVE" }
});

// ✅ CORRECT - Always filter by tenant
await prisma.customer.findMany({
  where: {
    tenantId: "tenant_123",
    status: "ACTIVE"
  }
});
```

### 4. **Use Decimal for Money (Not Number)**
```typescript
import { Prisma } from '@prisma/client';

// ❌ WRONG - Floating point errors
amount: 19.99

// ✅ CORRECT - Use Prisma.Decimal
amount: new Prisma.Decimal(19.99)
```

---

## 📋 Core Models

### 1. Tenant (Multi-Tenancy Root)
```prisma
model Tenant {
  id                String   @id @default(cuid())
  slug              String   @unique          // URL-friendly identifier
  name              String                    // Display name
  domain            String?                   // Custom domain
  status            String   @default("ACTIVE") // ACTIVE | SUSPENDED | ARCHIVED
  subscriptionTier  String   @default("starter")

  // Relations - ALL models link to tenant
  users             User[]
  portalUsers       PortalUser[]
  customers         Customer[]
  products          Product[]
  orders            Order[]
  // ... 15+ more relations
}
```

**Valid Status Values**: `"ACTIVE"`, `"SUSPENDED"`, `"ARCHIVED"`

**Usage**:
```typescript
const tenant = await prisma.tenant.findUnique({
  where: { slug: "well-crafted" }
});
```

---

### 2. User (Internal Staff)
```prisma
model User {
  id                String   @id @default(cuid())
  tenantId          String
  email             String
  passwordHash      String?
  firstName         String?
  lastName          String?
  status            String   @default("ACTIVE") // ACTIVE | INACTIVE | LOCKED
  emailVerified     Boolean  @default(false)

  // Relations
  roleAssignments   UserRole[]
  activities        Activity[]
  createdOrders     Order[] @relation("OrderCreatedBy")
}
```

**Valid Status Values**: `"ACTIVE"`, `"INACTIVE"`, `"LOCKED"`

**Usage**:
```typescript
const user = await prisma.user.findFirst({
  where: {
    tenantId: "tenant_123",
    email: "user@example.com",
    status: "ACTIVE"
  },
  include: {
    roleAssignments: {
      include: { role: true }
    }
  }
});
```

---

### 3. PortalUser (B2B Customer Users)
```prisma
model PortalUser {
  id                String   @id @default(cuid())
  tenantId          String
  customerId        String?
  email             String
  passwordHash      String?
  status            String   @default("ACTIVE") // ACTIVE | INACTIVE | LOCKED
  emailVerified     Boolean  @default(false)

  // 🔐 Authentication Tokens (Added Oct 2025)
  emailVerificationToken  String?
  emailVerificationExpiry DateTime?
  passwordResetToken      String?
  passwordResetExpiry     DateTime?

  // Relations
  customer          Customer?
  roleAssignments   PortalUserRole[]
  orders            Order[]
  carts             Cart[]
}
```

**Valid Status Values**: `"ACTIVE"`, `"INACTIVE"`, `"LOCKED"`

**Usage**:
```typescript
// Login query
const portalUser = await prisma.portalUser.findFirst({
  where: {
    tenantId: "tenant_123",
    email: "customer@example.com",
    status: "ACTIVE"
  },
  include: {
    customer: true,
    roleAssignments: {
      include: { role: true }
    }
  }
});

// Password reset
await prisma.portalUser.update({
  where: { id: portalUser.id },
  data: {
    passwordResetToken: "token_abc123",
    passwordResetExpiry: new Date(Date.now() + 3600000) // 1 hour
  }
});
```

---

### 4. Customer (B2B Accounts)
```prisma
model Customer {
  id                String   @id @default(cuid())
  tenantId          String
  accountNumber     String?
  companyName       String
  tradeName         String?
  status            String   @default("ACTIVE") // ACTIVE | INACTIVE | SUSPENDED
  tier              String?                      // "standard" | "premium" | "vip"

  // Licensing
  licenseNumber     String?
  licenseState      String?
  licenseExpiry     DateTime?

  // Credit
  creditLimit       Decimal? @db.Decimal(10,2)

  // Relations
  portalUsers       PortalUser[]
  orders            Order[]
  healthSnapshots   AccountHealthSnapshot[]
}
```

**Valid Status Values**: `"ACTIVE"`, `"INACTIVE"`, `"SUSPENDED"`

**Usage**:
```typescript
// Get customers with health scores
const customers = await prisma.customer.findMany({
  where: {
    tenantId: "tenant_123",
    status: "ACTIVE"
  },
  include: {
    healthSnapshots: {
      orderBy: { snapshotDate: 'desc' },
      take: 1
    },
    orders: {
      where: {
        orderDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    }
  }
});
```

---

### 5. Product (Inventory Items)
```prisma
model Product {
  id                String   @id @default(cuid())
  tenantId          String
  supplierId        String?
  sku               String
  name              String
  category          String?
  brand             String?
  alcoholType       String?  // "WINE" | "BEER" | "SPIRITS" | "CIDER"
  alcoholPercent    Decimal? @db.Decimal(5,2)
  status            String   @default("ACTIVE") // ACTIVE | INACTIVE | DISCONTINUED
  isSample          Boolean  @default(false)

  // Relations
  skus              Sku[]
  orderLines        OrderLine[]
  cartItems         CartItem[]
  priceListEntries  PriceListEntry[]
}
```

**Valid Status Values**: `"ACTIVE"`, `"INACTIVE"`, `"DISCONTINUED"`
**Valid AlcoholType Values**: `"WINE"`, `"BEER"`, `"SPIRITS"`, `"CIDER"`, `"SAKE"`, `"MEAD"`, `"OTHER"`

**Usage**:
```typescript
// Get active wine products with pricing
const products = await prisma.product.findMany({
  where: {
    tenantId: "tenant_123",
    status: "ACTIVE",
    alcoholType: "WINE"
  },
  include: {
    priceListEntries: {
      where: {
        priceListName: "standard",
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } }
        ]
      }
    },
    inventoryRecords: true
  }
});
```

---

### 6. Order (Sales Orders)
```prisma
model Order {
  id                String   @id @default(cuid())
  tenantId          String
  customerId        String
  portalUserId      String?
  orderNumber       String   @unique
  status            String   @default("PENDING")

  // Dates
  orderDate         DateTime @default(now())
  requestedDeliveryDate DateTime?

  // Amounts (Decimal for precision)
  subtotal          Decimal  @db.Decimal(10,2)
  taxAmount         Decimal  @db.Decimal(10,2)
  shippingAmount    Decimal  @db.Decimal(10,2)
  totalAmount       Decimal  @db.Decimal(10,2)

  isSampleOrder     Boolean  @default(false)

  // Relations
  customer          Customer
  portalUser        PortalUser?
  lines             OrderLine[]
  invoices          Invoice[]
}
```

**Valid Status Values**: `"DRAFT"`, `"PENDING"`, `"CONFIRMED"`, `"IN_PROGRESS"`, `"SHIPPED"`, `"DELIVERED"`, `"CANCELLED"`, `"ON_HOLD"`

**Usage**:
```typescript
import { Prisma } from '@prisma/client';

// Create order with lines
const order = await prisma.order.create({
  data: {
    orderNumber: "ORD-2025-000123",
    tenantId: "tenant_123",
    customerId: "customer_456",
    portalUserId: "portal_789",
    status: "PENDING",
    subtotal: new Prisma.Decimal(100.00),
    taxAmount: new Prisma.Decimal(9.00),
    shippingAmount: new Prisma.Decimal(5.00),
    totalAmount: new Prisma.Decimal(114.00),
    lines: {
      create: [
        {
          product: { connect: { id: "product_abc" } },
          lineNumber: 1,
          quantity: 2,
          unitPrice: new Prisma.Decimal(50.00),
          subtotal: new Prisma.Decimal(100.00),
          totalAmount: new Prisma.Decimal(100.00)
        }
      ]
    }
  },
  include: {
    lines: {
      include: { product: true }
    }
  }
});
```

---

### 7. Cart (Shopping Cart)
```prisma
model Cart {
  id                String   @id @default(cuid())
  tenantId          String
  portalUserId      String
  customerId        String?
  status            String   @default("ACTIVE") // ACTIVE | CONVERTED | ABANDONED

  // Amounts
  subtotal          Decimal  @db.Decimal(10,2) @default(0)
  taxAmount         Decimal  @db.Decimal(10,2) @default(0)
  totalAmount       Decimal  @db.Decimal(10,2) @default(0)

  convertedToOrderId String?
  expiresAt         DateTime?

  // Relations
  items             CartItem[]
}
```

**Valid Status Values**: `"ACTIVE"`, `"CONVERTED"`, `"ABANDONED"`, `"EXPIRED"`

**Usage**:
```typescript
// Get active cart with items
const cart = await prisma.cart.findFirst({
  where: {
    portalUserId: "portal_789",
    status: "ACTIVE"
  },
  include: {
    items: {
      include: {
        product: {
          include: {
            priceListEntries: true
          }
        }
      }
    }
  }
});
```

---

## 🔗 Common Relations

### Many-to-Many: Users and Roles
```prisma
// User ←→ UserRole ←→ Role
model UserRole {
  userId      String
  roleId      String
  user        User  @relation(fields: [userId], references: [id])
  role        Role  @relation(fields: [roleId], references: [id])
}
```

**Usage**:
```typescript
// Add role to user
await prisma.userRole.create({
  data: {
    userId: "user_123",
    roleId: "role_456"
  }
});

// Get user with roles
const user = await prisma.user.findUnique({
  where: { id: "user_123" },
  include: {
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

---

## 📦 Common Query Patterns

### 1. Multi-Tenant Queries (ALWAYS Use)
```typescript
// Helper function for tenant isolation
import { PrismaClient } from '@prisma/client';

export async function withTenant<T>(
  tenantId: string,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  const prisma = new PrismaClient();
  try {
    return await callback(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

// Usage
const customers = await withTenant("tenant_123", async (tx) => {
  return tx.customer.findMany({
    where: { tenantId: "tenant_123" }
  });
});
```

### 2. Get Customer with Health Score
```typescript
const customer = await prisma.customer.findUnique({
  where: { id: "customer_123" },
  include: {
    healthSnapshots: {
      orderBy: { snapshotDate: 'desc' },
      take: 1
    },
    orders: {
      where: {
        orderDate: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { orderDate: 'desc' }
    }
  }
});

const latestHealth = customer.healthSnapshots[0];
const recentOrders = customer.orders;
```

### 3. Create Order from Cart
```typescript
import { prepareOrderLines, generateOrderNumber } from '@/lib/services/order-service';

const order = await prisma.$transaction(async (tx) => {
  const cart = await tx.cart.findFirst({
    where: {
      portalUserId: "portal_789",
      status: "ACTIVE"
    },
    include: { items: true }
  });

  const prepared = await prepareOrderLines(
    tx,
    tenantId,
    customerId,
    cart.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity
    }))
  );

  const orderNumber = await generateOrderNumber(tx, tenantId);

  const newOrder = await tx.order.create({
    data: {
      orderNumber,
      tenantId,
      customerId,
      status: "PENDING",
      subtotal: new Prisma.Decimal(prepared.subtotal),
      totalAmount: new Prisma.Decimal(prepared.subtotal),
      lines: {
        create: prepared.createInputs
      }
    }
  });

  // Clear cart
  await tx.cart.update({
    where: { id: cart.id },
    data: { status: "CONVERTED" }
  });

  return newOrder;
});
```

### 4. Product Search with Inventory
```typescript
const products = await prisma.product.findMany({
  where: {
    tenantId: "tenant_123",
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

### 5. Authentication Queries
```typescript
// Login
const portalUser = await prisma.portalUser.findFirst({
  where: {
    tenantId: "tenant_123",
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

// Update last login
await prisma.portalUser.update({
  where: { id: portalUser.id },
  data: {
    lastLoginAt: new Date(),
    lastLoginIp: ipAddress,
    failedLoginAttempts: 0
  }
});
```

---

## 🚨 Common Mistakes to Avoid

### 1. ❌ Using Enum Types
```typescript
// WRONG - Enums don't exist
const user = await prisma.user.create({
  data: {
    role: UserRole.ADMIN  // ❌ UserRole enum doesn't exist
  }
});

// CORRECT - Use string literals
const user = await prisma.user.create({
  data: {
    role: "ADMIN"  // ✅ Plain string
  }
});
```

### 2. ❌ Direct Foreign Keys
```typescript
// WRONG - Don't use foreign keys directly
await prisma.orderLine.create({
  data: {
    orderId: "order_123",
    productId: "product_456"  // ❌ This will fail
  }
});

// CORRECT - Use Prisma relations
await prisma.orderLine.create({
  data: {
    order: { connect: { id: "order_123" } },
    product: { connect: { id: "product_456" } }  // ✅
  }
});
```

### 3. ❌ Forgetting Tenant Isolation
```typescript
// WRONG - No tenant filter
const orders = await prisma.order.findMany({
  where: { status: "PENDING" }  // ❌ Will return ALL tenants
});

// CORRECT - Always filter by tenant
const orders = await prisma.order.findMany({
  where: {
    tenantId: "tenant_123",  // ✅
    status: "PENDING"
  }
});
```

### 4. ❌ Number for Money
```typescript
// WRONG - Floating point errors
await prisma.order.create({
  data: {
    totalAmount: 19.99  // ❌ Will cause precision issues
  }
});

// CORRECT - Use Prisma.Decimal
await prisma.order.create({
  data: {
    totalAmount: new Prisma.Decimal(19.99)  // ✅
  }
});
```

---

## 🔧 Utility Functions

### Get Prisma Client
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
```

### Tenant-Scoped Transactions
```typescript
// lib/prisma.ts
export async function withTenant<T>(
  tenantId: string,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return callback(prisma);
}
```

---

## 📚 Additional Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **Schema File**: `/prisma/schema.prisma`
- **Migration Docs**: `/docs/database/MIGRATION-SUCCESS-SUMMARY.md`
- **API Examples**: `/app/api/portal/` (reference implementations)

---

## 🎯 Quick Checklist for Database Operations

Before writing any database query, check:

- [ ] Using String for status/role/type fields (not enums)
- [ ] Using Prisma.Decimal for money amounts
- [ ] Using relation syntax (connect/create/createMany)
- [ ] Including tenantId in WHERE clause
- [ ] Using transactions for multi-step operations
- [ ] Including proper error handling
- [ ] Using proper TypeScript types from Prisma

---

**Last Updated**: October 16, 2025
**Schema Version**: Production v1.0
**Status**: ✅ Migration Complete - All 28 enums converted to String
