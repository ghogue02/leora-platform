# Quick Fix Guide: API Endpoint Failures

**Status:** CRITICAL - Authentication System Down
**Estimated Fix Time:** 1-2 hours
**Impact:** All portal authentication endpoints failing (401/500 errors)

---

## The Problem

All three failing endpoints share the same root cause:

```
/api/portal/auth/me → 401 Unauthorized
/api/portal/auth/refresh → 500 Internal Server Error
/api/portal/insights → 500 Internal Server Error
```

**Root Cause:** `JWT_SECRET` environment variable not loaded at runtime

---

## Why It's Failing

### The Issue Chain

```
1. JWT_SECRET defined in .env.local ✅
   JWT_SECRET="vxamyx352b3XjcGJ/WStsZivmCmq7TwrAPvJSQoBjmg="

2. Next.js loads .env.local at startup ✅

3. BUT: lib/auth/jwt.ts loads JWT_SECRET at MODULE INITIALIZATION ❌
   const JWT_SECRET = process.env.JWT_SECRET;  // Runs BEFORE .env loaded
   const secret = JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : null;

4. When API endpoint runs:
   getCurrentUser() → verifyToken() → getSecret() → throws Error('JWT_SECRET not found')

5. Error caught silently → returns null → 401 Unauthorized ❌
```

### The Code

**File:** `/Users/greghogue/Leora/lib/auth/jwt.ts` (Lines 18-27)

```typescript
// ❌ PROBLEM: Module-level initialization
const JWT_SECRET = process.env.JWT_SECRET;  // undefined at this point
const secret = JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : null;

function getSecret(): Uint8Array {
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}
```

---

## The Fix (3 Steps)

### Step 1: Fix JWT Secret Loading (5 minutes)

**Edit:** `/Users/greghogue/Leora/lib/auth/jwt.ts`

**Find lines 18-27 and replace with:**

```typescript
// ✅ SOLUTION: Load at runtime, not module initialization
let cachedSecret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  // Return cached secret if available
  if (cachedSecret) return cachedSecret;

  // Load from environment at runtime
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    throw new Error(
      'JWT_SECRET environment variable is required. ' +
      'Ensure .env.local exists and restart the Next.js server.'
    );
  }

  // Cache the encoded secret
  cachedSecret = new TextEncoder().encode(JWT_SECRET);
  return cachedSecret;
}
```

### Step 2: Fix Permission Field Usage (2 minutes)

**Edit:** `/Users/greghogue/Leora/app/api/portal/auth/refresh/route.ts`

**Find line 118 and change:**

```typescript
// ❌ BEFORE
const permissions = (user as any).roleAssignments?.flatMap((ra: any) =>
  ra.role.rolePermissions?.map((rp: any) => rp.permission.name)  // Wrong field
) || getPermissionsForRoles(roles);

// ✅ AFTER
const permissions = (user as any).roleAssignments?.flatMap((ra: any) =>
  ra.role.rolePermissions?.map((rp: any) => rp.permission.key)  // Correct field
) || getPermissionsForRoles(roles);
```

### Step 3: Remove Unsafe Default Role (2 minutes)

**Edit:** `/Users/greghogue/Leora/app/api/portal/auth/refresh/route.ts`

**Find lines 115-119 and replace with:**

```typescript
// ❌ BEFORE
const roles = (user as any).roleAssignments?.map((ra: any) => ra.role.name) || ['portal_customer'];

// ✅ AFTER
if (!user.roleAssignments || user.roleAssignments.length === 0) {
  return NextResponse.json(
    {
      success: false,
      error: 'Access denied: no roles assigned. Contact administrator.',
      code: 'NO_ROLES',
    },
    { status: 403 }
  );
}

const roles = user.roleAssignments.map((ra: any) => ra.role.name);
```

---

## Testing the Fix

### 1. Restart Next.js Server

```bash
# Stop current dev server (Ctrl+C)

# Restart
npm run dev
```

### 2. Verify JWT_SECRET Loads

```bash
# Should print the secret value
node -e "require('dotenv').config({ path: '.env.local' }); console.log(process.env.JWT_SECRET)"
```

### 3. Test Endpoints

```bash
# Test auth/me (should return 401 if no token, not 500)
curl http://localhost:3000/api/portal/auth/me

# If you have a valid token cookie:
curl http://localhost:3000/api/portal/auth/me \
  -H "Cookie: leora_access_token=YOUR_TOKEN"

# Should return user data or proper 401, NOT 500
```

### 4. Test Login Flow

1. Open browser to `http://localhost:3000/portal/login`
2. Enter credentials
3. Should successfully authenticate
4. Check that `/api/portal/auth/me` returns user data
5. Navigate to `/portal/insights` - should load without 500 error

---

## Expected Results

### Before Fix

```json
// GET /api/portal/auth/me
{
  "success": false,
  "error": "Not authenticated",
  "code": "UNAUTHORIZED"
}
// Status: 401 ❌

// POST /api/portal/auth/refresh
{
  "success": false,
  "error": "Failed to refresh token"
}
// Status: 500 ❌

// GET /api/portal/insights
{
  "success": false,
  "error": "Failed to fetch insights"
}
// Status: 500 ❌
```

### After Fix

```json
// GET /api/portal/auth/me (with valid token)
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "displayName": "Demo User",
    "tenantId": "tenant_456",
    "roles": ["portal_customer"],
    "permissions": ["portal.catalog.view", "portal.orders.view", ...]
  }
}
// Status: 200 ✅

// POST /api/portal/auth/refresh (with valid refresh token)
{
  "success": true,
  "message": "Token refreshed successfully"
}
// Status: 200 ✅

// GET /api/portal/insights (authenticated)
{
  "success": true,
  "data": {
    "summary": { ... },
    "health": { ... },
    "opportunities": [ ... ]
  }
}
// Status: 200 ✅
```

---

## Additional Recommended Fixes (Optional)

### Add Startup Validation

**Create:** `/Users/greghogue/Leora/scripts/validate-env.js`

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const REQUIRED = ['JWT_SECRET', 'DATABASE_URL'];

function loadEnvFile(filename) {
  const envPath = path.join(process.cwd(), filename);
  if (!fs.existsSync(envPath)) return {};

  const content = fs.readFileSync(envPath, 'utf8');
  const vars = {};

  content.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) {
      vars[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  });

  return vars;
}

const envVars = {
  ...loadEnvFile('.env'),
  ...loadEnvFile('.env.local'),
  ...process.env,
};

const missing = REQUIRED.filter(key => !envVars[key]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(key => console.error(`   - ${key}`));
  console.error('\nCreate .env.local and add these variables.');
  process.exit(1);
}

console.log('✅ Environment configuration valid');
```

**Update:** `package.json`

```json
{
  "scripts": {
    "dev": "node scripts/validate-env.js && next dev",
    "build": "node scripts/validate-env.js && next build"
  }
}
```

---

## Common Issues After Fix

### Issue: Still Getting 401

**Check:**
1. Clear browser cookies
2. Login again to get fresh tokens
3. Verify `.env.local` has `JWT_SECRET`
4. Restart dev server

### Issue: Permission Denied

**Check:**
1. User has role assignments in database
2. Roles have permission assignments
3. Permission keys match expected values

### Issue: Insights Still 500

**Check:**
1. Database connection working
2. Tenant exists with slug 'well-crafted'
3. PortalUser record exists for logged-in user

---

## Rollback Plan

If the fix causes issues:

```bash
git diff lib/auth/jwt.ts app/api/portal/auth/refresh/route.ts
git checkout lib/auth/jwt.ts app/api/portal/auth/refresh/route.ts
```

---

## Success Checklist

- [ ] Updated `lib/auth/jwt.ts` with runtime secret loading
- [ ] Changed `permission.name` to `permission.key`
- [ ] Removed unsafe default role assignment
- [ ] Restarted Next.js dev server
- [ ] Verified JWT_SECRET loads correctly
- [ ] Tested `/api/portal/auth/me` returns 200 or proper 401
- [ ] Tested login flow works end-to-end
- [ ] Tested `/api/portal/insights` loads successfully
- [ ] All auth endpoints returning appropriate responses

---

## Full Analysis

For complete code quality analysis, security findings, and long-term recommendations, see:

**[API Failure Analysis Report](./api-failure-analysis.md)**

---

**Last Updated:** October 16, 2025
**Estimated Fix Time:** 10-15 minutes for critical fixes
