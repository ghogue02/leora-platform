#!/bin/bash
# Quick script to check Vercel logs for specific errors

echo "🔍 Checking latest Vercel deployment logs..."
echo ""

# Get the latest deployment URL
LATEST=$(vercel ls --yes 2>/dev/null | grep "https://" | head -1 | awk '{print $2}')

echo "Latest deployment: $LATEST"
echo ""
echo "Recent errors:"
echo "=============="

vercel logs "$LATEST" --since 15m 2>&1 | grep -i "error\|prisma\|column\|500" | tail -30
