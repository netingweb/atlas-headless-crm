# 🔐 API Keys Security Guide

## Overview

This guide explains how to securely manage API keys (OpenAI, Jina, etc.) in the CRM Atlas project to prevent accidental exposure in public repositories.

## ⚠️ Security Best Practices

1. **Never commit API keys to the repository**
2. **Use environment variables for all sensitive credentials**
3. **Use `.example` files as templates**
4. **Keep `.env` files in `.gitignore`**

## 📁 File Structure

The project uses a two-file approach for tenant configurations:

- `config/{tenant_id}/tenant.json.example` - Template file with placeholders (committed to repo)
- `config/{tenant_id}/tenant.json` - Actual config with real keys (ignored by git)

## 🚀 Setup Instructions

### Step 1: Copy Example Files

For each tenant, copy the example file:

```bash
# For demo tenant
cp config/demo/tenant.json.example config/demo/tenant.json

# For demo2 tenant
cp config/demo2/tenant.json.example config/demo2/tenant.json
```

### Step 2: Set Environment Variables

Create a `.env` file in the project root (if not already present):

```bash
# .env file (already in .gitignore)
OPENAI_API_KEY=sk-your-actual-openai-key-here
JINA_API_KEY=your-jina-key-here
```

### Step 3: Configure Tenant Files

You have two options:

#### Option A: Use Placeholders (Recommended)

Edit `config/{tenant_id}/tenant.json` and use placeholders:

```json
{
  "embeddingsProvider": {
    "name": "openai",
    "apiKey": "${OPENAI_API_KEY}",
    "model": "text-embedding-3-small"
  }
}
```

The sync script will automatically replace `${OPENAI_API_KEY}` with the actual value from your `.env` file.

#### Option B: Use Direct Values

Edit `config/{tenant_id}/tenant.json` and set the API keys directly:

```json
{
  "embeddingsProvider": {
    "name": "openai",
    "apiKey": "sk-your-actual-key-here",
    "model": "text-embedding-3-small"
  }
}
```

⚠️ **Warning**: If you use Option B, make sure the file is in `.gitignore` (it already is).

### Step 4: Sync Configuration

After setting up your tenant files, sync them to MongoDB:

```bash
pnpm config:sync demo
# or
pnpm config:sync demo2
```

## 🔄 How It Works

### During Sync (`sync-config.ts`)

1. Reads `config/{tenant_id}/tenant.json`
2. Replaces placeholders like `${OPENAI_API_KEY}` with environment variable values
3. Overrides API keys with environment variables if present (highest priority)
4. Saves to MongoDB

### During Runtime (`loader.ts`)

1. Loads tenant config from MongoDB
2. Applies environment variable overrides (if present)
3. Returns config with environment variables taking precedence

This means:

- **Environment variables** have the **highest priority**
- Even if keys are stored in MongoDB, environment variables will override them
- This allows you to change keys without re-syncing configurations

## 🛡️ Protection Mechanisms

### 1. `.gitignore` Protection

The following files are automatically ignored:

```
config/*/tenant.json
.env
.env.local
.env.*.local
```

### 2. Example Files

Template files (`*.example`) are committed to the repository and serve as documentation:

- `config/demo/tenant.json.example`
- `config/demo2/tenant.json.example`

### 3. Runtime Override

Even if API keys are stored in MongoDB, environment variables always take precedence at runtime.

## 📋 Checklist for Public Repository

Before making the repository public:

- [ ] Verify `config/*/tenant.json` files are in `.gitignore`
- [ ] Ensure all `*.example` files use placeholders
- [ ] Check that `.env` files are in `.gitignore`
- [ ] Review git history for any committed keys (use `git log -p` to check)
- [ ] If keys were committed, rotate them immediately
- [ ] Use GitHub Secrets for CI/CD (see below)

## 🔧 CI/CD Configuration

For GitHub Actions, use repository secrets:

1. Go to Repository Settings → Secrets and variables → Actions
2. Add secrets:
   - `OPENAI_API_KEY`
   - `JINA_API_KEY` (if used)

3. Reference in workflows:

```yaml
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## 🔍 Verifying Security

### Check if tenant.json files are tracked:

```bash
git ls-files | grep tenant.json
```

Should return **no results** (only `*.example` files should be tracked).

### Check git history for exposed keys:

```bash
git log -p --all -S "sk-proj-" -- config/
```

If any results appear, those keys are compromised and should be rotated.

## 🚨 If Keys Were Accidentally Committed

1. **Rotate the keys immediately** in the provider dashboard
2. Remove from git history (use `git filter-branch` or BFG Repo-Cleaner)
3. Force push (⚠️ coordinate with team first)
4. Update all environments with new keys

## 📚 Related Documentation

- [OpenAI Setup Guide](./openai-setup.md)
- [Configuration Guide](../README.md)
- [Environment Variables](../README.md#environment-variables)

## ❓ FAQ

**Q: Can I use different API keys for different tenants?**
A: Yes, you can set tenant-specific keys in `config/{tenant_id}/tenant.json`. However, if `OPENAI_API_KEY` is set as an environment variable, it will override all tenant-specific keys.

**Q: What if I don't set environment variables?**
A: The system will use the keys from `tenant.json` files (if present) or from MongoDB (if synced). However, using environment variables is recommended for production.

**Q: How do I update API keys?**
A: Simply update the `.env` file and restart the application. No need to re-sync configurations.

**Q: Are keys encrypted in MongoDB?**
A: No, keys are stored in plain text in MongoDB. Ensure MongoDB access is properly secured. Consider using MongoDB encryption at rest for production deployments.
