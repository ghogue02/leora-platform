# Vercel Database Connection Fix

## Current Error

```
Can't reach database server at aws-1-us-east-1.pooler.supabase.com:5432
```

This means Vercel cannot connect to your Supabase database.

## Root Causes & Solutions

### Issue 1: Wrong Connection String Format

Vercel serverless functions may have issues with **pooled connections**. You need to use the **direct connection** string for `DATABASE_URL`.

### ✅ Solution: Update Vercel Environment Variables

1. **Get Your Connection Strings from Supabase**
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/database
   - Look for **Connection String** section
   - You'll see different types:

   **Connection pooling (Session mode):**
   ```
   postgres://postgres.[PROJECT]:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres
   ```

   **Direct connection:**
   ```
   postgres://postgres.[PROJECT]:[PASSWORD]@aws-1-us-east-1.compute-1.amazonaws.com:5432/postgres
   ```

2. **Which One to Use in Vercel**

   **Option A: Use DIRECT connection for both (Recommended for Vercel)**
   ```
   DATABASE_URL=postgres://postgres.[PROJECT]:[PASSWORD]@aws-1-us-east-1.compute-1.amazonaws.com:5432/postgres
   DIRECT_URL=postgres://postgres.[PROJECT]:[PASSWORD]@aws-1-us-east-1.compute-1.amazonaws.com:5432/postgres
   ```

   **Option B: Use transaction pooler with pgbouncer settings**
   ```
   DATABASE_URL=postgres://postgres.[PROJECT]:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   DIRECT_URL=postgres://postgres.[PROJECT]:[PASSWORD]@aws-1-us-east-1.compute-1.amazonaws.com:5432/postgres
   ```

3. **Update in Vercel**
   - Go to: https://vercel.com/your-project/settings/environment-variables
   - Update `DATABASE_URL`
   - Update `DIRECT_URL`
   - **Important:** Select **Production, Preview, Development** for all environments
   - Click **Save**
   - **Redeploy** your application (or trigger redeploy automatically)

### Issue 2: Supabase Connection Pooling Mode

Supabase has different pooling modes:

- **Port 5432** - Session mode (may not work with Vercel)
- **Port 6543** - Transaction mode (works with serverless)

### ✅ Try Transaction Pooler

If direct connection doesn't work, try transaction pooler:

```
DATABASE_URL=postgres://postgres.[PROJECT]:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Issue 3: IPv6 Issues

Some Vercel regions have IPv6 connectivity issues.

### ✅ Solution: Add IPv4 Parameter

```
DATABASE_URL=your-connection-string?options=--ipv4
```

### Issue 4: Connection Limits

Serverless functions create many concurrent connections.

### ✅ Solution: Add Connection Limit

```
DATABASE_URL=your-connection-string?connection_limit=1&pool_timeout=10
```

## Recommended Vercel Environment Variables

```bash
# Use transaction pooler (port 6543) for serverless compatibility
DATABASE_URL=postgres://postgres.[PROJECT]:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Direct connection for migrations (if needed)
DIRECT_URL=postgres://postgres.[PROJECT]:[PASSWORD]@aws-1-us-east-1.compute-1.amazonaws.com:5432/postgres

# JWT Secret (already set)
JWT_SECRET=vxamyx352b3XjcGJ/WStsZivmCmq7TwrAPvJSQoBjmg=
```

## How to Test

After updating environment variables:

1. Trigger a new deployment in Vercel
2. Check the logs for connection success
3. Try logging in
4. Should see: `[Auth] User authenticated successfully` in logs

## Debugging Steps

If still not working:

1. **Verify Supabase is online**
   - Go to Supabase Dashboard
   - Check project status
   - Try connecting via SQL Editor

2. **Test connection from Vercel**
   - Create a test endpoint: `/api/test-db`
   - Try to connect and query
   - Check Vercel logs for detailed error

3. **Check Supabase Connection Pooler Settings**
   - Go to Database Settings in Supabase
   - Verify pooler is enabled
   - Check connection limit settings

4. **Verify Password in Connection String**
   - Make sure `[PASSWORD]` is replaced with actual password
   - No special characters that need URL encoding
   - If password has special chars, URL encode them

## Common Issues

- ❌ Using port 5432 (session pooler) → Use port 6543 (transaction pooler)
- ❌ Missing `pgbouncer=true` parameter → Add it
- ❌ Wrong region in URL → Check Supabase project region
- ❌ Database paused (free tier) → Unpause in Supabase
- ❌ IP whitelist restrictions → Check Supabase network settings

## Next Steps

1. Update `DATABASE_URL` in Vercel to use **port 6543** with `pgbouncer=true`
2. Save and redeploy
3. Check logs - should see successful connection
4. Login should work immediately
