#!/bin/bash
# Vercel Environment Setup Script
# Sets up all required environment variables for Vercel deployment

set -e

echo "🚀 Leora Platform - Vercel Environment Setup"
echo "=============================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel@latest
fi

# Check if user is logged in
echo "Checking Vercel authentication..."
vercel whoami || {
    echo "Please login to Vercel:"
    vercel login
}

echo ""
echo "Select target environment:"
echo "1) Production"
echo "2) Preview (staging)"
echo "3) Development"
read -p "Enter choice [1-3]: " env_choice

case $env_choice in
    1)
        ENV="production"
        ;;
    2)
        ENV="preview"
        ;;
    3)
        ENV="development"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "Setting up environment: $ENV"
echo "=============================================="
echo ""

# Function to add environment variable
add_env_var() {
    local key=$1
    local prompt=$2
    local required=$3
    local secret=$4

    echo ""
    echo "Setting: $key"
    echo "$prompt"

    if [ "$required" = "true" ]; then
        echo "(Required)"
    else
        echo "(Optional - press Enter to skip)"
    fi

    read -sp "Value: " value
    echo ""

    if [ -z "$value" ] && [ "$required" = "true" ]; then
        echo "❌ This variable is required!"
        exit 1
    fi

    if [ -n "$value" ]; then
        if [ "$secret" = "true" ]; then
            echo "$value" | vercel env add "$key" "$ENV" --sensitive
        else
            echo "$value" | vercel env add "$key" "$ENV"
        fi
        echo "✅ $key set successfully"
    else
        echo "⏭️  Skipped $key"
    fi
}

echo "📋 REQUIRED VARIABLES"
echo "=============================================="

add_env_var \
    "DATABASE_URL" \
    "Supabase connection pooler URL (for production)" \
    "true" \
    "true"

add_env_var \
    "DIRECT_URL" \
    "Supabase direct connection URL (for migrations)" \
    "true" \
    "true"

add_env_var \
    "JWT_SECRET" \
    "JWT signing secret (generate with: openssl rand -base64 32)" \
    "true" \
    "true"

add_env_var \
    "DEFAULT_TENANT_SLUG" \
    "Default tenant identifier (e.g., well-crafted)" \
    "true" \
    "false"

add_env_var \
    "DEFAULT_PORTAL_USER_KEY" \
    "Portal user auto-provision key (e.g., dev-portal-user)" \
    "true" \
    "false"

add_env_var \
    "OPENAI_API_KEY" \
    "OpenAI API key for Leora AI features" \
    "true" \
    "true"

echo ""
echo "📋 PUBLIC VARIABLES"
echo "=============================================="

add_env_var \
    "NEXT_PUBLIC_SUPABASE_URL" \
    "Supabase project URL (https://zqezunzlyjkseugujkrl.supabase.co)" \
    "true" \
    "false"

add_env_var \
    "NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    "Supabase anonymous key (safe for client-side)" \
    "true" \
    "false"

add_env_var \
    "NEXT_PUBLIC_DEFAULT_TENANT_SLUG" \
    "Default tenant for client hydration (usually same as DEFAULT_TENANT_SLUG)" \
    "false" \
    "false"

add_env_var \
    "NEXT_PUBLIC_APP_URL" \
    "Application URL (e.g., https://leora.vercel.app)" \
    "false" \
    "false"

echo ""
echo "📋 OPTIONAL VARIABLES"
echo "=============================================="

read -p "Configure optional variables? [y/N]: " configure_optional

if [ "$configure_optional" = "y" ] || [ "$configure_optional" = "Y" ]; then
    add_env_var \
        "SHADOW_DATABASE_URL" \
        "Shadow database for safe migrations" \
        "false" \
        "true"

    add_env_var \
        "NEXTAUTH_URL" \
        "NextAuth canonical URL" \
        "false" \
        "false"

    add_env_var \
        "NEXTAUTH_SECRET" \
        "NextAuth session encryption secret" \
        "false" \
        "true"

    add_env_var \
        "SENTRY_DSN" \
        "Sentry error tracking DSN" \
        "false" \
        "true"

    add_env_var \
        "POSTHOG_API_KEY" \
        "PostHog analytics API key" \
        "false" \
        "true"

    add_env_var \
        "RESEND_API_KEY" \
        "Resend email delivery API key" \
        "false" \
        "true"
fi

echo ""
echo "=============================================="
echo "✅ Environment setup complete for: $ENV"
echo ""
echo "Next steps:"
echo "1. Verify variables in Vercel dashboard"
echo "2. Deploy with: vercel --prod"
echo "3. Run validation: npm run validate:deployment"
echo ""
echo "To view all environment variables:"
echo "  vercel env ls"
echo ""
echo "To remove a variable:"
echo "  vercel env rm VARIABLE_NAME $ENV"
echo "=============================================="
