#!/bin/bash
# Supabase Database Reset Commands
# Copy and paste these commands one at a time

echo "🚨 SUPABASE DATABASE RESET"
echo "================================"
echo ""
echo "⚠️  WARNING: This will DELETE ALL DATA!"
echo "   - 21,215 customers"
echo "   - 4,268 orders"
echo "   - All tables and schemas"
echo ""
echo "Press Ctrl+C now if you want to cancel"
echo ""
sleep 3

# Step 1: Set access token
export SUPABASE_ACCESS_TOKEN="sbp_8202d904ec05631d02528679a0493731de852521"
echo "✅ Access token set"

# Step 2: Link to project
cd /Users/greghogue/Leora
supabase link --project-ref zqezunzlyjkseugujkrl
echo "✅ Project linked"

# Step 3: Perform reset
echo ""
echo "🔄 Starting database reset..."
echo "This will delete everything and rebuild from scratch"
echo ""
supabase db reset --linked

echo ""
echo "✅ Reset complete!"
echo ""
echo "📋 Next steps:"
echo "1. Push Prisma schema: npx prisma db push"
echo "2. Seed data: npm run seed"
echo "3. Test: npx tsx scripts/test-deployed-schema.ts"
echo "4. Deploy: git push"
