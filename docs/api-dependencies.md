# API Dependencies

## Required npm Packages

Add these dependencies to your `package.json`:

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "zod": "^3.22.4",
    "@prisma/client": "^5.0.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Installation Commands

```bash
# Install Zod for validation
npm install zod

# Install Prisma (if not already installed)
npm install @prisma/client
npm install -D prisma

# Ensure TypeScript types
npm install -D @types/node
```

## Environment Variables

Add to `.env.local`:

```bash
# Database (from Blueprint Section 3)
DATABASE_URL="postgresql://postgres.zqezunzlyjkseugujkrl:UHXGhJvhEPRGpL06@aws-0-us-east-2.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:UHXGhJvhEPRGpL06@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres"

# Authentication
JWT_SECRET="your-secret-key-here-32-chars-minimum"

# Tenant Defaults
DEFAULT_TENANT_SLUG="well-crafted"
DEFAULT_PORTAL_USER_KEY="dev-portal-user"

# Optional: Public client-side defaults
NEXT_PUBLIC_DEFAULT_TENANT_SLUG="well-crafted"
NEXT_PUBLIC_DEFAULT_PORTAL_USER_ID="demo-user-id"
NEXT_PUBLIC_DEFAULT_PORTAL_USER_EMAIL="demo@wellcrafted.com"
```

## TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

## Next Steps

1. Run `npm install` to install dependencies
2. Set up environment variables
3. Initialize Prisma: `npx prisma generate`
4. Test API endpoints: `npm run dev`
