# Deployment Guide for Next.js on Cloudflare

This guide explains how to deploy your Next.js application to Cloudflare Pages or Workers using GitHub Actions.

## Prerequisites

1. A Cloudflare account ([Sign up free](https://dash.cloudflare.com/sign-up))
2. A GitHub repository for your project
3. Node.js 18+ and pnpm installed locally

## Quick Start

### Step 1: Get Cloudflare Credentials

1. **Account ID**: 
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Find your Account ID in the right sidebar
   - Copy this value

2. **API Token**:
   - Go to [API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - Click "Create Token"
   - Use the "Custom token" template with these permissions:
     - **Account**: `Cloudflare Pages:Edit`
     - **Zone** (if using custom domain): `Page Rules:Edit`
   - Create token and copy the value (you won't see it again!)

3. **Project Name**:
   - Choose a name for your project (lowercase, alphanumeric with hyphens)
   - This becomes your URL: `project-name.pages.dev`

### Step 2: Configure GitHub Secrets

In your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these repository secrets:

| Secret Name | Value | Required |
|------------|-------|----------|
| `CLOUDFLARE_ACCOUNT_ID` | Your account ID | ✅ |
| `CLOUDFLARE_API_TOKEN` | Your API token | ✅ |
| `CLOUDFLARE_PROJECT_NAME` | Your project name | ✅ |
| `NEXT_PUBLIC_APP_URL` | Your production URL | ✅ |
| `NEXT_PUBLIC_API_URL` | API endpoint URL | ✅ |
| `NEXT_PUBLIC_APP_NAME` | App display name | ⚪ |
| `NEXT_PUBLIC_APP_DESCRIPTION` | App description | ⚪ |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID | ⚪ |

### Step 3: Local Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your local development values in `.env.local`

3. Test locally:
   ```bash
   pnpm install
   pnpm dev
   ```

### Step 4: Choose Deployment Method

#### Option A: Cloudflare Pages (Recommended)

Best for static sites and SSG. Uses `.github/workflows/deploy-cloudflare-pages.yml`.

**Features:**
- Automatic preview deployments for PRs
- Built-in CDN and caching
- Custom domains support
- Rollback capabilities

**Deploy:**
```bash
git push origin main
```

#### Option B: Cloudflare Workers

Best for SSR and API routes. Uses `.github/workflows/deploy-cloudflare-workers.yml`.

**Features:**
- Full edge runtime support
- KV, D1, R2 bindings
- Cron triggers
- WebSocket support

**Deploy:**
```bash
git push origin main
```

### Step 5: First Deployment

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Initial deployment setup"
   git push origin main
   ```

2. Check GitHub Actions:
   - Go to your repo's **Actions** tab
   - Watch the workflow run
   - Check for any errors

3. Access your site:
   - Production: `https://your-project-name.pages.dev`
   - Preview (PRs): `https://[pr-number].your-project-name.pages.dev`

## Manual Deployment

If you prefer to deploy manually without GitHub Actions:

### Using Wrangler CLI

1. Install Wrangler globally:
   ```bash
   pnpm add -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Build and deploy:
   ```bash
   pnpm run pages:build
   wrangler pages deploy .vercel/output/static --project-name=your-project-name
   ```

### Using Cloudflare Dashboard

1. Build locally:
   ```bash
   pnpm run pages:build
   ```

2. Go to [Cloudflare Pages](https://dash.cloudflare.com/pages)
3. Click "Create a project" → "Upload assets"
4. Upload the `.vercel/output/static` folder
5. Configure project settings and deploy

## Environment Variables in Production

### Setting via Cloudflare Dashboard

1. Go to your Pages project
2. Navigate to **Settings** → **Environment variables**
3. Add variables for both Production and Preview environments
4. Redeploy to apply changes

### Setting via Wrangler

```bash
wrangler pages secret put API_SECRET --project-name=your-project-name
```

## Custom Domains

1. In Cloudflare Pages dashboard, go to your project
2. Navigate to **Custom domains**
3. Click **Set up a custom domain**
4. Follow the DNS configuration instructions

## Monitoring & Logs

### View Logs
- **Pages**: Dashboard → Your Project → Functions → Real-time logs
- **Workers**: Dashboard → Workers & Pages → Your Worker → Logs

### Analytics
- Built-in analytics available in the Cloudflare dashboard
- Web Analytics can be enabled for free

## Troubleshooting

### Build Failures

1. **Module not found errors**:
   - Ensure all dependencies are in `package.json`
   - Check case sensitivity (Linux vs Windows)

2. **Type errors**:
   - Run `pnpm run type-check` locally
   - Fix any TypeScript errors before pushing

3. **Environment variable issues**:
   - Verify all required secrets are set in GitHub
   - Check variable names match exactly

### Deployment Issues

1. **API token errors**:
   - Regenerate token with correct permissions
   - Update GitHub secret

2. **Project name conflicts**:
   - Choose a unique project name
   - Delete existing project if needed

3. **Build output missing**:
   - Ensure `pnpm run pages:build` runs successfully
   - Check `.vercel/output/static` exists

### Runtime Errors

1. **Edge runtime compatibility**:
   - Avoid Node.js-specific APIs
   - Use Web APIs instead

2. **Memory limits**:
   - Workers have 128MB limit
   - Optimize bundle size

## Advanced Configuration

### KV Storage Setup

1. Create KV namespace:
   ```bash
   wrangler kv:namespace create MY_KV
   ```

2. Update `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "MY_KV"
   id = "your-namespace-id"
   ```

### D1 Database Setup

1. Create database:
   ```bash
   wrangler d1 create my-database
   ```

2. Update `wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "my-database"
   database_id = "your-database-id"
   ```

### R2 Storage Setup

1. Create bucket:
   ```bash
   wrangler r2 bucket create my-bucket
   ```

2. Update `wrangler.toml`:
   ```toml
   [[r2_buckets]]
   binding = "MY_BUCKET"
   bucket_name = "my-bucket"
   ```

## Support

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Next.js on Pages Guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)

## Security Best Practices

1. **Never commit secrets**: Use `.env.local` and GitHub Secrets
2. **Rotate API tokens regularly**: Regenerate tokens every 90 days
3. **Use least privilege**: Only grant necessary permissions
4. **Enable 2FA**: On both GitHub and Cloudflare accounts
5. **Audit logs**: Regularly review deployment and access logs
