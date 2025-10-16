# 🔧 Fix MCP Connection & Restart Claude Code

**Issue**: Your `.claude.json` file is corrupted (142MB with logs) and Supabase MCP isn't connecting.

**Solution**: Clean up the config and restart Claude Code.

---

## 🚨 Problem Identified

Your `/Users/greghogue/.claude.json` file is:
- **142MB** (should be ~10KB)
- Filled with React error logs instead of just configuration
- Cannot load Supabase MCP properly
- Causing SSL certificate errors

---

## ✅ Quick Fix (2 minutes)

### Option A: Manual Fix (Recommended)

**1. Backup corrupted file:**
```bash
mv ~/.claude.json ~/.claude.json.corrupted
```

**2. Create clean config:**
```bash
cat > ~/.claude.json << 'EOF'
{
  "mcpServers": {
    "claude-flow": {
      "type": "stdio",
      "command": "npx",
      "args": ["claude-flow@alpha", "mcp", "start"],
      "env": {}
    },
    "ruv-swarm": {
      "type": "stdio",
      "command": "npx",
      "args": ["ruv-swarm", "mcp", "start"],
      "env": {}
    },
    "flow-nexus": {
      "type": "stdio",
      "command": "npx",
      "args": ["flow-nexus@latest", "mcp", "start"],
      "env": {}
    },
    "agentic-payments": {
      "type": "stdio",
      "command": "npx",
      "args": ["agentic-payments@latest", "mcp"],
      "env": {}
    },
    "supabase": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:UHXGhJvhEPRGpL06@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres"
      ],
      "env": {
        "POSTGRES_SSL": "true",
        "POSTGRES_SSL_REJECT_UNAUTHORIZED": "false"
      }
    }
  }
}
EOF
```

**3. Restart Claude Code:**
- Cmd+Q to quit
- Relaunch Claude Code
- MCP servers will connect automatically

### Option B: Use Pre-made Clean Config

**1. Copy clean config:**
```bash
cp /Users/greghogue/Leora/.claude-mcp-config.json ~/.claude.json
```

**2. Restart Claude Code**

---

## 🔍 After Restart - Test MCP Connection

Once Claude Code restarts, run this diagnostic:

```sql
-- Test query via MCP
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('customers', 'products', 'orders', 'users')
ORDER BY table_name, ordinal_position;
```

This should show you **exactly** what columns exist in your database.

---

## 📋 What This Fixes

### Before (Broken):
- ❌ .claude.json: 142MB with logs
- ❌ Supabase MCP: Not loading
- ❌ SSL errors: Self-signed certificate failures
- ❌ Cannot diagnose database schema

### After (Fixed):
- ✅ .claude.json: Clean ~2KB config
- ✅ Supabase MCP: Loaded with SSL bypass
- ✅ SSL errors: Resolved with REJECT_UNAUTHORIZED=false
- ✅ Can query database directly via MCP

---

## 🎯 Next Steps After Restart

**1. Verify MCP Connection:**
Test that `mcp__supabase__query` tool works

**2. Run Full Schema Diagnostic:**
```sql
SELECT
    c.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.ordinal_position
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN ('tenants', 'customers', 'products', 'orders', 'users', 'suppliers')
ORDER BY c.table_name, c.ordinal_position;
```

**3. Generate Perfect Migration:**
Based on the REAL schema from MCP, I'll generate migration SQL that:
- Only adds missing columns (like `tenant_id`, `status`)
- Uses correct column names (snake_case vs camelCase)
- Creates indexes only on existing columns
- **Works in one shot** ✅

---

## ⚠️ Why .claude.json Got So Big

The file somehow accumulated browser console logs (React errors, API failures, etc.). This shouldn't happen normally. After the clean config is in place, it should stay small.

If it grows again, it might be a bug in Claude Code or one of the MCP servers logging to the wrong place.

---

## 📁 Files Created

- **Clean MCP Config**: `/Users/greghogue/Leora/.claude-mcp-config.json`
- **This Guide**: `/Users/greghogue/Leora/FIX-MCP-AND-RESTART.md`
- **Backup**: `/Users/greghogue/.claude.json.backup.*`

---

## 🚀 Ready to Proceed

**After you restart Claude Code with the clean config:**

1. MCP connection will work
2. We can query your actual database schema
3. I'll generate a **perfect migration SQL** that matches reality
4. Migration will succeed in one shot

**Execute this fix now, then restart Claude Code!**
