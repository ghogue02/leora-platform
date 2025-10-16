#!/bin/bash

# ============================================================================
# GitHub Secrets Verification Script
# ============================================================================
# Checks if all required secrets are configured in GitHub
# Run: bash scripts/verify-github-secrets.sh
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     GitHub Secrets Verification                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI not installed${NC}"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI${NC}"
    exit 1
fi

# Required secrets for development
REQUIRED_SECRETS=(
    "VERCEL_TOKEN"
    "VERCEL_ORG_ID"
    "VERCEL_PROJECT_ID"
    "DATABASE_URL"
    "DIRECT_URL"
    "JWT_SECRET"
)

# Optional secrets
OPTIONAL_SECRETS=(
    "NEXT_PUBLIC_APP_URL"
    "STAGING_DATABASE_URL"
    "STAGING_DIRECT_URL"
    "STAGING_JWT_SECRET"
    "OPENAI_API_KEY"
)

# Get list of configured secrets
CONFIGURED_SECRETS=$(gh secret list --app actions | awk '{print $1}')

missing_count=0
optional_count=0

echo -e "${BLUE}Checking required secrets...${NC}\n"

for secret in "${REQUIRED_SECRETS[@]}"; do
    if echo "$CONFIGURED_SECRETS" | grep -q "^${secret}$"; then
        echo -e "${GREEN}✅ ${secret}${NC}"
    else
        echo -e "${RED}❌ ${secret} - MISSING${NC}"
        ((missing_count++))
    fi
done

echo ""
echo -e "${BLUE}Checking optional secrets...${NC}\n"

for secret in "${OPTIONAL_SECRETS[@]}"; do
    if echo "$CONFIGURED_SECRETS" | grep -q "^${secret}$"; then
        echo -e "${GREEN}✅ ${secret}${NC}"
    else
        echo -e "${YELLOW}⚠️  ${secret} - Not configured (optional)${NC}"
        ((optional_count++))
    fi
done

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

if [ $missing_count -eq 0 ]; then
    echo -e "${GREEN}✅ All required secrets are configured!${NC}"
    echo ""
    echo -e "${BLUE}Summary:${NC}"
    echo -e "  Required: ${GREEN}${#REQUIRED_SECRETS[@]}/${#REQUIRED_SECRETS[@]} configured${NC}"
    echo -e "  Optional: ${YELLOW}$((${#OPTIONAL_SECRETS[@]} - $optional_count))/${#OPTIONAL_SECRETS[@]} configured${NC}"
    echo ""
    echo -e "${GREEN}Ready to run CI/CD workflows! 🚀${NC}"
else
    echo -e "${RED}❌ Missing ${missing_count} required secret(s)${NC}"
    echo ""
    echo -e "${YELLOW}To add missing secrets:${NC}"
    echo -e "1. Run: ${BLUE}bash scripts/setup-github-secrets.sh${NC}"
    echo -e "2. Or manually via: ${BLUE}gh secret set SECRET_NAME${NC}"
    echo ""
    exit 1
fi

echo ""
echo -e "${BLUE}All configured secrets:${NC}"
gh secret list --app actions

echo ""
echo -e "${YELLOW}To test your setup:${NC}"
echo -e "1. Create a test branch: ${BLUE}git checkout -b test-ci${NC}"
echo -e "2. Make a small change and commit"
echo -e "3. Create PR: ${BLUE}gh pr create${NC}"
echo -e "4. Check Actions tab for workflow run"
