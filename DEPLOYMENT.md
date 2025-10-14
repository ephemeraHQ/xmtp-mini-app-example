# Railway Deployment Guide

This guide will walk you through deploying both the frontend and backend services to Railway.

## Prerequisites

- Railway account (sign up at https://railway.app)
- Railway CLI installed: `npm i -g @railway/cli`
- Your XMTP agent private key
- Farcaster manifest credentials (header, payload, signature)
- Neynar API key

## Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

## Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authenticate.

## Step 3: Create a New Project

```bash
railway init
```

Select "Create a new project" and give it a name (e.g., "xmtp-mini-app").

## Step 4: Link Your Project

```bash
railway link
```

Select the project you just created.

## Step 5: Deploy the Services

Railway will automatically detect the `railway.toml` configuration and deploy both services:

```bash
railway up
```

Railway will:
- Create two services: `frontend` and `backend`
- Build and deploy both automatically
- Provide URLs for the frontend service

## Step 6: Configure Environment Variables

### Backend Service

Go to your Railway dashboard → Select the backend service → Variables tab:

```env
XMTP_ENV=production
KEY=your_xmtp_agent_private_key_here
FRONTEND_URL=https://your-frontend.railway.app
```

**Important:** After the frontend is deployed, update `FRONTEND_URL` with the actual Railway frontend URL.

### Frontend Service

Go to your Railway dashboard → Select the frontend service → Variables tab:

```env
NEXT_PUBLIC_URL=https://your-frontend.railway.app
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_FARCASTER_HEADER=your_farcaster_header
NEXT_PUBLIC_FARCASTER_PAYLOAD=your_farcaster_payload
NEXT_PUBLIC_FARCASTER_SIGNATURE=your_farcaster_signature
NEYNAR_API_KEY=your_neynar_api_key
```

## Step 7: Get Your Service URLs

After deployment, Railway will provide URLs for your services:

1. Go to your Railway dashboard
2. Click on the frontend service
3. Under "Settings" → "Domains", you'll see your Railway URL (e.g., `https://frontend-production-xxx.railway.app`)
4. Copy this URL and update the backend's `FRONTEND_URL` environment variable

## Step 8: Verify Deployment

### Test Frontend

Visit your frontend URL with a test query:
```
https://your-frontend.railway.app?tags=vitalik.eth,fabrizioeth
```

### Check Backend Logs

In the Railway dashboard:
1. Go to the backend service
2. Click on "Deployments"
3. Click on the latest deployment
4. View logs to ensure the agent is running

You should see:
```
Waiting for messages...
Address: 0x...
🔗 [test URL]
```

## Updating Your Deployment

### To update the code:

```bash
railway up
```

### To set a specific environment variable via CLI:

```bash
railway variables --set KEY=value --service backend
```

## Troubleshooting

### Backend keeps restarting

- Check that all environment variables are set correctly
- Verify your XMTP `KEY` is valid
- Check the logs for specific error messages

### Frontend not loading

- Ensure `NEXT_PUBLIC_URL` is set to your Railway frontend URL
- Verify all Farcaster manifest variables are set
- Check the build logs for any errors

### Agent not responding to messages

- Verify `FRONTEND_URL` in backend points to the correct frontend URL
- Check backend logs to see if messages are being received
- Ensure your XMTP agent has been added to the group/conversation

## Railway Features

### Automatic Restarts

The backend is configured to automatically restart on failure (up to 10 times) via `railway.toml`.

### Internal Networking

If needed, services can communicate via internal URLs:
- Backend: `http://backend.railway.internal:PORT`
- Frontend: `http://frontend.railway.internal:PORT`

### Monitoring

Railway provides built-in monitoring:
- CPU and memory usage
- Request logs
- Deployment history

## Cost Considerations

- Railway offers a generous free tier with $5 monthly credit
- Pay-as-you-go pricing after free tier
- Monitor your usage in the Railway dashboard

## Support

For issues:
- Check the [Railway docs](https://docs.railway.app)
- Visit the [XMTP docs](https://docs.xmtp.org)
- Open an issue in this repository

