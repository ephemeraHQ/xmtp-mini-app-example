# XMTP MiniApp with Next.js

A Farcaster MiniApp with XMTP private chat example.

## Getting started

> [!TIP] This frontend works with any Farcaster client including Warpcast.

### Requirements

- Node.js v20 or higher
- Yarn v4 or higher
- Docker (optional, for local network)
- A Farcaster account

### Environment variables

To run your XMTP MiniApp, you must create a `.env.local` file with the following
variables:

```bash
NEXT_PUBLIC_URL= # Your local/production URL
NEXT_PUBLIC_APP_ENV=development # Enable Eruda for debugging
NEXT_PUBLIC_NEYNAR_API_KEY= # Neynar API key from https://neynar.com
JWT_SECRET= # Generate with openssl rand -base64 32
XMTP_PRIVATE_KEY= # Private key of your XMTP account
XMTP_ENV=dev # XMTP environment (dev/production)
XMTP_ENCRYPTION_KEY= # Optional, generated automatically on first run
```

> [!WARNING] Store your keys securely and never commit them to version control.

### Run the frontend

```bash
# Clone repository
git clone https://github.com/xmtp/xmtp-mini-app.git
# Navigate to frontend directory
cd xmtp-mini-app/frontend
# Install dependencies
yarn install
# Create .env.local file
cp .env.example .env.local
# Run in development mode
yarn dev
# Run frames.js debugger (optional)
yarn frames
```

## Debugging

There are multiple ways to test your MiniApp:

### Using frames.js debugger

```bash
yarn frames
```

Then enter your `NEXT_PUBLIC_URL` (e.g., http://localhost:3000)

### Using Warpcast debug page

Go to https://warpcast.com/~/developers/mini-apps/debug and insert
http://localhost:3000

### Using ngrok for mobile testing

```bash
# Install ngrok and get a custom static domain
ngrok http --url=<your-custom-domain>.ngrok-free.app 3000
```

Update NEXT_PUBLIC_URL in .env.local with your ngrok URL

### Using Cloudflare Tunnel

Follow
[Cloudflare Tunnel setup instructions](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/local-management/create-local-tunnel/)

## Deployment

This is a standard Next.js app that can be deployed to any hosting provider.

1. Update production environment variables
2. Update the `farcaster.json` manifest file with:
   - Generated `accountAssociation` from Warpcast Mobile (Settings > Developer >
     Domains)
   - Set proper URLs in the manifest
