# Migration Summary: Vercel to Railway Monorepo

This document summarizes the changes made to migrate from a Vercel-based deployment to a Railway monorepo structure.

## Date
October 14, 2025

## Overview
Transformed the project from separate frontend/backend directories optimized for Vercel into a unified monorepo ready for Railway deployment.

## Changes Made

### 1. Monorepo Structure ✅

**Created:**
- `/package.json` - Root workspace configuration with Yarn workspaces
  - Manages both `frontend` and `backend` as workspaces
  - Includes scripts for development and building both services
  - Added `concurrently` for running both services simultaneously

### 2. Removed Vercel Dependencies ✅

**Deleted:**
- `frontend/vercel.json` - Vercel-specific routing configuration (not needed for Railway)

**Modified:**
- `frontend/package.json` - Removed `@vercel/og` dependency
- `frontend/src/app/api/og/image/[conversationId]/route.tsx` - Updated to use `next/og` instead of `@vercel/og`

**Fixed:**
- `backend/package.json` - Corrected typo in `start` script (was `source ~/.bashrc;pr_pushindex.ts`, now `tsx index.ts`)

### 3. Railway Configuration ✅

**Created:**
- `/railway.toml` - Railway deployment configuration
  - Defines two services: `frontend` and `backend`
  - Configures build and start commands
  - Sets up health checks for frontend
  - Configures restart policy for backend

### 4. Documentation Updates ✅

**Created:**
- `/README.md` - Root documentation with:
  - Project structure overview
  - Quick start guide
  - Railway deployment instructions
  - Available commands
  - Environment variables reference

- `/DEPLOYMENT.md` - Comprehensive Railway deployment guide with:
  - Step-by-step deployment process
  - Environment variable configuration
  - Troubleshooting tips
  - Railway features overview

- `/.gitignore` - Root gitignore for monorepo

**Updated:**
- `backend/README.md` - Added monorepo context and Railway deployment section
- `frontend/README.md` - Added monorepo context and Railway deployment section

## New Workspace Commands

```bash
# Development
yarn dev                 # Run both services concurrently
yarn dev:frontend        # Run only frontend
yarn dev:backend         # Run only backend

# Build
yarn build              # Build both services
yarn build:frontend     # Build only frontend
yarn build:backend      # Build only backend

# Production
yarn start:frontend     # Start frontend in production
yarn start:backend      # Start backend in production
```

## Environment Variables

### Backend (Railway)
- `XMTP_ENV` - XMTP environment (production/dev/local)
- `KEY` - XMTP agent private key
- `FRONTEND_URL` - Railway frontend URL

### Frontend (Railway)
- `NEXT_PUBLIC_URL` - Railway frontend URL
- `NEXT_PUBLIC_APP_ENV` - Environment (development/production)
- `NEXT_PUBLIC_FARCASTER_HEADER` - Farcaster manifest header
- `NEXT_PUBLIC_FARCASTER_PAYLOAD` - Farcaster manifest payload
- `NEXT_PUBLIC_FARCASTER_SIGNATURE` - Farcaster manifest signature
- `NEYNAR_API_KEY` - Neynar API key

## Deployment Architecture

### Before (Vercel)
```
frontend/ → Vercel (Serverless)
backend/  → Not deployed (or separate platform)
```

### After (Railway)
```
Monorepo → Railway
├── Frontend Service (Next.js)
└── Backend Service (XMTP Agent - long-running)
```

## Benefits of This Migration

1. **Unified deployment** - Single platform for both services
2. **Long-running process support** - Backend can run continuously (perfect for XMTP agent)
3. **Simplified environment management** - All config in one place
4. **Better local development** - Workspace commands for easy development
5. **Cost-effective** - Railway's pricing model better suited for this architecture

## Next Steps

1. Install dependencies: `yarn install`
2. Set up environment variables for both services
3. Test locally: `yarn dev`
4. Deploy to Railway following the guide in `DEPLOYMENT.md`

## Files Structure

```
xmtp-mini-app-monorepo/
├── package.json              # ← New (root workspace)
├── railway.toml              # ← New (Railway config)
├── README.md                 # ← New (root documentation)
├── DEPLOYMENT.md            # ← New (deployment guide)
├── .gitignore               # ← New (root gitignore)
├── backend/
│   ├── package.json         # Modified (fixed start script)
│   └── README.md            # Modified (added Railway info)
└── frontend/
    ├── package.json         # Modified (removed @vercel/og)
    ├── vercel.json          # ← Deleted
    ├── README.md            # Modified (added Railway info)
    └── src/app/api/og/
        └── image/[conversationId]/
            └── route.tsx    # Modified (uses next/og)
```

## Migration Complete ✅

The project is now ready for Railway deployment. All Vercel-specific configurations have been removed and replaced with Railway-compatible alternatives.

