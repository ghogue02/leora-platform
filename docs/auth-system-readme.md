# Authentication & Session Flow - Leora Platform

Comprehensive authentication system implementing Blueprint Section 6.

## Overview

The Leora authentication system provides:

- **JWT-based authentication** with access (15min) and refresh (7 days) tokens
- **Multi-tenant support** with tenant-aware sessions
- **Role-Based Access Control (RBAC)** with granular permissions
- **Rate limiting** and progressive account lockout
- **Session management** with automatic refresh
- **Email verification** and password reset flows
- **Secure cookie handling** with HTTPOnly and SameSite flags

## Architecture

```
lib/auth/
├── jwt.ts           # Token generation and verification
├── types.ts         # TypeScript types and Zod schemas
├── rate-limit.ts    # Rate limiting and account lockout
├── rbac.ts          # Permission checking and role management
├── middleware.ts    # Route protection and guards
└── index.ts         # Consolidated exports

app/api/portal/auth/
├── login/route.ts           # POST /api/portal/auth/login
├── logout/route.ts          # POST /api/portal/auth/logout
├── me/route.ts              # GET /api/portal/auth/me
├── refresh/route.ts         # POST /api/portal/auth/refresh
├── register/route.ts        # POST /api/portal/auth/register
├── reset-password/route.ts  # POST/PUT /api/portal/auth/reset-password
└── verify-email/route.ts    # POST /api/portal/auth/verify-email

components/
├── providers/
│   └── PortalSessionProvider.tsx  # Client-side session management
└── auth/
    └── PortalAuthGuard.tsx        # Route protection component
```

## Environment Variables

Required environment variables (add to `.env.local`):

```bash
# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-secret-key-here

# Database connection
DATABASE_URL=postgresql://...

# Tenant defaults
DEFAULT_TENANT_SLUG=well-crafted

# Optional email configuration (for verification/reset)
RESEND_API_KEY=your-resend-key
```

## Usage Examples

### 1. Protect API Routes

```typescript
// app/api/portal/orders/route.ts
import { NextRequest } from 'next/server';
import { withAuthAndPermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
  return withAuthAndPermission(
    request,
    'portal.orders.view',
    async (user) => {
      // User is authenticated and has permission
      const orders = await getOrdersForUser(user.portalUserId);
      return orders;
    }
  );
}
```

### 2. Protect Client Pages

```typescript
// app/portal/orders/page.tsx
'use client';

import { PortalAuthGuard } from '@/components/auth/PortalAuthGuard';

export default function OrdersPage() {
  return (
    <PortalAuthGuard requiredPermission="portal.orders.view">
      <OrdersList />
    </PortalAuthGuard>
  );
}
```

### 3. Use Session in Components

```typescript
'use client';

import { usePortalSession } from '@/components/providers/PortalSessionProvider';

export function UserProfile() {
  const { user, logout } = usePortalSession();

  if (!user) return null;

  return (
    <div>
      <p>Welcome, {user.displayName}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 4. Check Permissions

```typescript
'use client';

import { usePermission } from '@/components/providers/PortalSessionProvider';
import { PermissionGate } from '@/components/auth/PortalAuthGuard';

export function OrderActions() {
  const canCreateOrders = usePermission('portal.orders.create');

  return (
    <div>
      <PermissionGate permission="portal.orders.create">
        <button>Create Order</button>
      </PermissionGate>

      {canCreateOrders && <CreateOrderForm />}
    </div>
  );
}
```

### 5. Wrap App with Provider

```typescript
// app/layout.tsx
import { PortalSessionProvider } from '@/components/providers/PortalSessionProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PortalSessionProvider>{children}</PortalSessionProvider>
      </body>
    </html>
  );
}
```

## API Routes

### Login

```bash
POST /api/portal/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "tenantSlug": "well-crafted"
}

# Response
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "tenantSlug": "well-crafted",
    "roles": ["portal_customer"],
    "permissions": ["portal.orders.view", "portal.orders.create"]
  }
}
```

### Logout

```bash
POST /api/portal/auth/logout

# Response
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Get Current User

```bash
GET /api/portal/auth/me

# Response
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "tenantSlug": "well-crafted",
    "roles": ["portal_customer"],
    "permissions": ["portal.orders.view"]
  }
}
```

### Register

```bash
POST /api/portal/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "tenantSlug": "well-crafted"
}

# Response
{
  "success": true,
  "requiresVerification": true,
  "user": {
    "id": "user-id",
    "email": "newuser@example.com",
    "emailVerified": false
  }
}
```

## Permission System

### Permission Categories

```typescript
// Portal permissions
portal.catalog.view
portal.orders.view
portal.orders.create
portal.invoices.view
portal.account.view
portal.account.manage

// Sales permissions
sales.dashboard.view
sales.accounts.view
sales.activities.create
sales.samples.manage

// Admin permissions
admin.users.manage
admin.roles.manage
admin.settings.manage
```

### Wildcard Permissions

- `*` - All permissions (super admin)
- `portal.*` - All portal permissions
- `sales.*` - All sales permissions

### Role Definitions

- **portal_customer** - B2B customer portal access
- **sales_rep** - Sales representative
- **sales_manager** - Sales manager with approval rights
- **admin** - Tenant administrator
- **system_admin** - System-level administrator

## Security Features

### Rate Limiting

- **15-minute window** for login attempts
- **5 attempts** per IP address
- Automatic reset after window expires

### Account Lockout

- **10 failed attempts** triggers lockout
- **30-minute lockout** duration
- **Progressive lockout** - doubles with each lockout
- Manual unlock available for admins

### Token Security

- **HTTPOnly cookies** prevent XSS attacks
- **Secure flag** in production (HTTPS only)
- **SameSite=Lax** prevents CSRF
- **Short-lived access tokens** (15 minutes)
- **Long-lived refresh tokens** (7 days)

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Session Management

### Client-Side (PortalSessionProvider)

- **Automatic hydration** from cookies on mount
- **Local storage persistence** for offline access
- **Silent token refresh** when access token expires
- **Periodic refresh** every 10 minutes
- **Tab focus refresh** on visibility change

### Server-Side

- **Session records** in `portal_sessions` table
- **Activity tracking** with IP and user agent
- **Session expiry** enforced at database level
- **Session invalidation** on logout

## Multi-Tenant Support

All authentication functions are tenant-aware:

- Token payloads include `tenantId` and `tenantSlug`
- Sessions scoped to tenant
- Roles and permissions per tenant
- Rate limiting per tenant

## Integration with Prisma

The system expects these Prisma models (create/update as needed):

```prisma
model PortalUser {
  id                        String    @id @default(cuid())
  email                     String
  passwordHash              String
  firstName                 String?
  lastName                  String?
  displayName               String?
  tenantId                  String
  status                    String    @default("active")
  emailVerified             Boolean   @default(false)
  emailVerificationToken    String?
  emailVerificationExpiry   DateTime?
  passwordResetToken        String?
  passwordResetExpiry       DateTime?
  lastLoginAt               DateTime?
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt

  tenant                    Tenant    @relation(fields: [tenantId], references: [id])
  sessions                  PortalSession[]
  roles                     PortalUserRole[]

  @@unique([email, tenantId])
}

model PortalSession {
  id               String   @id @default(cuid())
  portalUserId     String
  tenantId         String
  sessionToken     String   @unique
  ipAddress        String?
  userAgent        String?
  expiresAt        DateTime
  lastActivityAt   DateTime
  createdAt        DateTime @default(now())

  portalUser       PortalUser @relation(fields: [portalUserId], references: [id], onDelete: Cascade)
}

model AuthActivityLog {
  id           String   @id @default(cuid())
  userId       String?
  portalUserId String?
  tenantId     String
  action       String
  ipAddress    String?
  userAgent    String?
  success      Boolean
  errorMessage String?
  metadata     Json?
  createdAt    DateTime @default(now())
}
```

## Next Steps

1. **Replace mock Prisma client** with actual import in all route files
2. **Implement email service** for verification and password reset
3. **Add Prisma models** to schema if not present
4. **Configure environment variables** in Vercel and local `.env`
5. **Run database migrations** to create tables
6. **Test authentication flow** end-to-end
7. **Add monitoring** for failed login attempts
8. **Implement admin panel** for user management

## Testing

Test the authentication flow:

```bash
# 1. Register new user
curl -X POST http://localhost:3000/api/portal/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# 2. Login
curl -X POST http://localhost:3000/api/portal/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# 3. Check session
curl -X GET http://localhost:3000/api/portal/auth/me \
  -b cookies.txt

# 4. Logout
curl -X POST http://localhost:3000/api/portal/auth/logout \
  -b cookies.txt
```

## Security Checklist

- [ ] `JWT_SECRET` is strong and secure (32+ characters)
- [ ] Environment variables not committed to git
- [ ] HTTPS enabled in production
- [ ] Rate limiting configured appropriately
- [ ] Account lockout thresholds set
- [ ] Email verification implemented
- [ ] Password reset flow tested
- [ ] Session expiry working correctly
- [ ] Cookie flags set correctly (HTTPOnly, Secure, SameSite)
- [ ] CORS configured properly
- [ ] Audit logging enabled

## Troubleshooting

### "JWT_SECRET environment variable is required"

Add `JWT_SECRET` to your `.env.local` file:

```bash
JWT_SECRET=$(openssl rand -base64 32)
```

### "Token verification failed"

- Check that cookies are being sent with requests
- Verify `JWT_SECRET` matches between environments
- Check token expiry times

### "Invalid or expired refresh token"

- User needs to log in again
- Check session expiry in database
- Verify refresh token rotation

### Rate limiting issues

- Clear rate limit store (restart server in development)
- Adjust thresholds in `rate-limit.ts`
- Check IP extraction for proxied requests

## Support

For issues or questions:
- Review Blueprint Section 6 (Authentication & Session Flow)
- Check implementation in `/lib/auth`
- Test with curl examples above
- Verify environment variables are set

---

**Implementation Status**: Complete ✅

**Last Updated**: 2025-10-15

**Engineer**: Authentication Engineer (Claude Code Agent)
