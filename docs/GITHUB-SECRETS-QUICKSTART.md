# GitHub Secrets Quick Start Guide

## 🚀 Fast Setup (5 Minutes)

### Step 1: Install GitHub CLI (if not installed)

```bash
# macOS
brew install gh

# Or download from: https://cli.github.com/
```

### Step 2: Authenticate

```bash
gh auth login
# Follow prompts, select HTTPS, authenticate via browser
```

### Step 3: Run Setup Script

```bash
# From project root
bash scripts/setup-github-secrets.sh
```

The script will:
- ✅ Read secrets from your `.env` file
- ✅ Automatically configure Vercel project IDs
- ✅ Prompt for Vercel token (needs manual creation)
- ✅ Upload all secrets to GitHub
- ✅ Verify configuration

---

## 📋 What You Need Before Running

### 1. **Vercel Token** (Create manually)

Go to: https://vercel.com/account/tokens

1. Click "Create Token"
2. Name: `GitHub Actions - Leora`
3. Scope: Select `Full Account` or specific project
4. Expiration: No expiration (or set your preference)
5. **Copy the token** (shown only once!)

### 2. **Your `.env` file** (Already exists)

Your `.env` file contains:
- ✅ DATABASE_URL (from Supabase)
- ✅ DIRECT_URL (from Supabase)
- ✅ JWT_SECRET
- ✅ Other configuration

---

## 🔧 Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Vercel Configuration
gh secret set VERCEL_ORG_ID --body "team_uWPW80lrIgTJMt975tCXqP4k"
gh secret set VERCEL_PROJECT_ID --body "prj_A3JP6SKBisXsyb7IO92H27MZcQLx"
gh secret set VERCEL_TOKEN  # Will prompt for value

# Database (paste your values from .env)
gh secret set DATABASE_URL  # Paste from .env
gh secret set DIRECT_URL    # Paste from .env

# Authentication
gh secret set JWT_SECRET    # Paste from .env

# Application URL (optional)
gh secret set NEXT_PUBLIC_APP_URL --body "https://leora.vercel.app"
```

---

## ✅ Verify Setup

```bash
# Run verification script
bash scripts/verify-github-secrets.sh

# Or manually check
gh secret list --app actions
```

**Expected output:**
```
VERCEL_ORG_ID        Updated 2025-10-16
VERCEL_PROJECT_ID    Updated 2025-10-16
VERCEL_TOKEN         Updated 2025-10-16
DATABASE_URL         Updated 2025-10-16
DIRECT_URL           Updated 2025-10-16
JWT_SECRET           Updated 2025-10-16
```

---

## 🧪 Test Your Setup

Create a test PR to trigger the workflow:

```bash
# Create test branch
git checkout -b test-ci-setup

# Make a small change
echo "# Test" >> README.md

# Commit and push
git add README.md
git commit -m "test: CI setup verification"
git push origin test-ci-setup

# Create PR
gh pr create --title "Test: CI Setup" --body "Testing GitHub Actions workflow"
```

**What should happen:**
1. ✅ Workflow runs automatically
2. ✅ Lint and type check pass
3. ✅ Preview deployment to Vercel
4. ✅ Bot comments on PR with preview URL

**Check progress:**
- GitHub: Go to **Actions** tab
- Or run: `gh run list`

---

## 🔐 Security Reminders

- ✅ Secrets are encrypted at rest by GitHub
- ✅ Secrets are not visible in logs (GitHub masks them)
- ✅ Only repository collaborators can manage secrets
- ✅ Secrets are scoped to specific steps in workflows

**Never:**
- ❌ Commit `.env` files with real secrets
- ❌ Share secrets via Slack/email
- ❌ Use production secrets in development
- ❌ Log secrets in your application code

---

## 🆘 Troubleshooting

### "gh: command not found"
Install GitHub CLI: `brew install gh`

### "Not authenticated"
Run: `gh auth login`

### "Secret not found in .env"
Check your `.env` file has the required variables

### "Failed to set secret"
- Verify you have admin access to the repository
- Check authentication: `gh auth status`
- Try manual setup with `gh secret set SECRET_NAME`

### Workflow fails with "secret is not set"
Run verification: `bash scripts/verify-github-secrets.sh`

---

## 📚 Additional Resources

- **Full Setup Guide:** `docs/github-secrets-setup.md`
- **Workflow Configuration:** `.github/workflows/ci.yml`
- **Environment Template:** `.env.example`
- **GitHub CLI Docs:** https://cli.github.com/manual/

---

## ⏭️ Next Steps After Setup

1. ✅ Secrets configured
2. ✅ Test PR created successfully
3. ⏭️ Monitor first workflow run
4. ⏭️ Verify preview deployment works
5. ⏭️ Set up staging environment (optional)
6. ⏭️ Configure branch protection rules
7. ⏭️ Enable Dependabot for security updates

**Happy deploying! 🚀**
