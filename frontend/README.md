# XMTP Group Chat MiniApp

A simplified Farcaster MiniApp focused on XMTP group chat functionality.

## Getting started

> [!TIP] This frontend works with any Farcaster client including Warpcast.

### Requirements

- Node.js v20 or higher
- Yarn v4 or higher
- A Farcaster account

### Environment variables

To run your XMTP Group Chat MiniApp, you must create a `.env.local` file with the following
variables:

```bash
NEXT_PUBLIC_URL= # Your local/production URL
NEXT_PUBLIC_APP_ENV=development # Enable Eruda for debugging
NEXT_PUBLIC_NEYNAR_API_KEY= # Neynar API key from https://neynar.com
JWT_SECRET= # Generate with openssl rand -base64 32
XMTP_PRIVATE_KEY= # Private key of your XMTP account
XMTP_ENV=dev # XMTP environment (dev/production)
NEXT_PUBLIC_ENCRYPTION_KEY= # XMTP encryption key for the browser
```

> [!WARNING] Store your keys securely and never commit them to version control.

### Run the frontend

```bash
# Navigate to frontend directory
cd xmtp-mini-app/frontend
# Install dependencies
yarn install
# Create .env.local file
cp .env.example .env.local
# Run in development mode
yarn dev
```

## Deployment

This is a standard Next.js app that can be deployed to any hosting provider.

1. Update production environment variables
2. Update the `farcaster.json` manifest file with:
   - Generated `accountAssociation` from Warpcast Mobile
   - Set proper URLs in the manifest
