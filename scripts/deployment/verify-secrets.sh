#!/bin/bash
# Verify Environment Secrets Script
# Checks that all required environment variables are set

set -e

echo "🔐 Verifying Environment Secrets"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Required variables
REQUIRED_VARS=(
  "DATABASE_URL"
  "DIRECT_URL"
  "JWT_SECRET"
  "DEFAULT_TENANT_SLUG"
  "DEFAULT_PORTAL_USER_KEY"
  "OPENAI_API_KEY"
)

# Optional but recommended
RECOMMENDED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SENTRY_DSN"
)

# Check if running in CI/CD
if [ "$CI" = "true" ] || [ "$VERCEL" = "1" ]; then
  echo "Running in CI/CD environment"
  ENVIRONMENT="CI/CD"
else
  echo "Running in local environment"
  ENVIRONMENT="local"
fi

echo ""

# Function to check if variable is set
check_var() {
  local var_name=$1
  local required=$2

  if [ -z "${!var_name}" ]; then
    if [ "$required" = "true" ]; then
      echo -e "${RED}❌ MISSING (REQUIRED): $var_name${NC}"
      return 1
    else
      echo -e "${YELLOW}⚠️  MISSING (recommended): $var_name${NC}"
      return 0
    fi
  else
    # Check if it's a placeholder value
    if [[ "${!var_name}" == *"your-"* ]] || [[ "${!var_name}" == *"PASSWORD"* ]]; then
      echo -e "${RED}❌ PLACEHOLDER VALUE: $var_name${NC}"
      return 1
    fi

    # Show first/last few characters for verification
    local value="${!var_name}"
    local masked="${value:0:8}...${value: -8}"
    echo -e "${GREEN}✅ SET: $var_name ($masked)${NC}"
    return 0
  fi
}

# Check required variables
echo "REQUIRED VARIABLES:"
echo "-------------------"
MISSING_REQUIRED=0
for var in "${REQUIRED_VARS[@]}"; do
  if ! check_var "$var" "true"; then
    MISSING_REQUIRED=$((MISSING_REQUIRED + 1))
  fi
done

echo ""

# Check recommended variables
echo "RECOMMENDED VARIABLES:"
echo "----------------------"
for var in "${RECOMMENDED_VARS[@]}"; do
  check_var "$var" "false"
done

echo ""
echo "=================================="

# Summary
if [ $MISSING_REQUIRED -gt 0 ]; then
  echo -e "${RED}❌ VALIDATION FAILED${NC}"
  echo "Missing $MISSING_REQUIRED required variable(s)"
  echo ""
  echo "Fix:"
  echo "1. Copy .env.example to .env.local"
  echo "2. Update with actual values"
  echo "3. For Vercel: vercel env add VARIABLE_NAME"
  exit 1
else
  echo -e "${GREEN}✅ VALIDATION PASSED${NC}"
  echo "All required environment variables are set"
  exit 0
fi
