#!/bin/bash

# ============================================================================
# GitHub Secrets Setup Script for Leora Platform
# ============================================================================
# This script helps you add secrets to your GitHub repository
# Run: bash scripts/setup-github-secrets.sh
#
# Prerequisites:
# 1. Install GitHub CLI: brew install gh
# 2. Authenticate: gh auth login
# 3. Have .env file with actual values
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     GitHub Secrets Setup for Leora Platform               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo -e "${YELLOW}Install with: brew install gh${NC}"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI${NC}"
    echo -e "${YELLOW}Run: gh auth login${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo -e "${YELLOW}Create .env file with your actual secrets first${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}\n"

# Load environment variables
set -a  # automatically export all variables
source .env
set +a

# Function to safely get secret value
get_secret() {
    local var_name=$1
    local var_value="${!var_name}"

    if [ -z "$var_value" ]; then
        echo -e "${YELLOW}⚠️  ${var_name} is not set in .env${NC}"
        return 1
    fi
    echo "$var_value"
}

# Function to set GitHub secret
set_github_secret() {
    local secret_name=$1
    local secret_value=$2

    if [ -z "$secret_value" ]; then
        echo -e "${YELLOW}⏭️  Skipping ${secret_name} (not set)${NC}"
        return
    fi

    echo -e "${BLUE}Setting ${secret_name}...${NC}"

    if echo "$secret_value" | gh secret set "$secret_name" --app actions; then
        echo -e "${GREEN}✅ ${secret_name} set successfully${NC}"
    else
        echo -e "${RED}❌ Failed to set ${secret_name}${NC}"
    fi
}

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Reading secrets from .env file...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Required secrets
echo -e "${GREEN}📦 Setting required secrets...${NC}\n"

# Vercel Configuration
VERCEL_ORG_ID="team_uWPW80lrIgTJMt975tCXqP4k"
VERCEL_PROJECT_ID="prj_A3JP6SKBisXsyb7IO92H27MZcQLx"

set_github_secret "VERCEL_ORG_ID" "$VERCEL_ORG_ID"
set_github_secret "VERCEL_PROJECT_ID" "$VERCEL_PROJECT_ID"

# Vercel Token (needs to be created manually)
echo ""
echo -e "${YELLOW}⚠️  VERCEL_TOKEN must be created manually:${NC}"
echo -e "${YELLOW}1. Go to: https://vercel.com/account/tokens${NC}"
echo -e "${YELLOW}2. Create token with 'Full Account' or deployment scope${NC}"
echo -e "${YELLOW}3. Copy the token${NC}"
echo ""
read -p "Paste your Vercel token (or press Enter to skip): " VERCEL_TOKEN

if [ -n "$VERCEL_TOKEN" ]; then
    set_github_secret "VERCEL_TOKEN" "$VERCEL_TOKEN"
else
    echo -e "${YELLOW}⏭️  Skipping VERCEL_TOKEN (you can add it later)${NC}"
fi

# Database URLs
echo ""
DATABASE_URL=$(get_secret "DATABASE_URL")
set_github_secret "DATABASE_URL" "$DATABASE_URL"

DIRECT_URL=$(get_secret "DIRECT_URL")
set_github_secret "DIRECT_URL" "$DIRECT_URL"

# JWT Secret
echo ""
JWT_SECRET=$(get_secret "JWT_SECRET")
set_github_secret "JWT_SECRET" "$JWT_SECRET"

# Application URL
echo ""
NEXT_PUBLIC_APP_URL=$(get_secret "NEXT_PUBLIC_APP_URL")
set_github_secret "NEXT_PUBLIC_APP_URL" "$NEXT_PUBLIC_APP_URL"

# Optional: Staging environment secrets
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Optional: Staging Environment Secrets${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

read -p "Do you have a separate staging environment? (y/N): " has_staging

if [[ "$has_staging" =~ ^[Yy]$ ]]; then
    STAGING_DATABASE_URL=$(get_secret "STAGING_DATABASE_URL") || true
    set_github_secret "STAGING_DATABASE_URL" "$STAGING_DATABASE_URL"

    STAGING_DIRECT_URL=$(get_secret "STAGING_DIRECT_URL") || true
    set_github_secret "STAGING_DIRECT_URL" "$STAGING_DIRECT_URL"

    STAGING_JWT_SECRET=$(get_secret "STAGING_JWT_SECRET") || true
    set_github_secret "STAGING_JWT_SECRET" "$STAGING_JWT_SECRET"
else
    echo -e "${YELLOW}⏭️  Skipping staging secrets${NC}"
fi

# Optional: OpenAI API Key (for future "Ask Leora" feature)
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Optional: AI Features (Ask Leora)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

read -p "Do you have an OpenAI API key? (y/N): " has_openai

if [[ "$has_openai" =~ ^[Yy]$ ]]; then
    OPENAI_API_KEY=$(get_secret "OPENAI_API_KEY") || true
    set_github_secret "OPENAI_API_KEY" "$OPENAI_API_KEY"
else
    echo -e "${YELLOW}⏭️  Skipping OPENAI_API_KEY (can be added later)${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ GitHub Secrets Setup Complete!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# List all secrets
echo -e "${BLUE}Current GitHub Secrets:${NC}"
gh secret list --app actions

echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Verify secrets: gh secret list --app actions"
echo -e "2. Create a PR to test preview deployment"
echo -e "3. Check Actions tab for workflow runs"
echo ""
echo -e "${GREEN}📚 Documentation: docs/github-secrets-setup.md${NC}"
