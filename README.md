# XMTP Mini App

Full-stack XMTP application with Next.js frontend and XMTP agent backend running together.

## Quick Start

```bash
# Install
yarn install

# Run both frontend and backend
yarn dev

# Deploy to Railway
railway up
```

## Structure

```
.
├── src/              # Next.js frontend (main app)
├── backend/          # XMTP agent (runs alongside)
├── package.json      # Unified configuration
└── railway.toml      # Single service deployment
```

## Environment Variables

Set these in Railway or `.env`:

```env
# Backend
XMTP_ENV=production
KEY=your_xmtp_private_key
FRONTEND_URL=https://your-app.railway.app

# Frontend
NEXT_PUBLIC_URL=https://your-app.railway.app
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_FARCASTER_HEADER=...
NEXT_PUBLIC_FARCASTER_PAYLOAD=...
NEXT_PUBLIC_FARCASTER_SIGNATURE=...
NEYNAR_API_KEY=...
```

## Deploy to Railway

1. Install CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Deploy: `railway up`
4. Set environment variables in Railway dashboard

That's it! Both services run as one deployment.

