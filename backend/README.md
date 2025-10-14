# XMTP Agent Backend

This backend agent listens for XMTP messages containing mentions and resolves them to Ethereum addresses, then opens a mini app to display the resolved addresses.

## Features

- 🔍 Extracts mentions from messages (`@username.eth`, `@username`, `0x...` addresses)
- 🌐 Resolves usernames to Ethereum addresses using Web3.bio
- 🚀 Opens mini app with resolved addresses via URL
- 👥 Supports shortened addresses in group conversations

## Setup

### Prerequisites

- Node.js >= 20
- Yarn

### Installation

```bash
yarn install
```

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# XMTP Configuration
XMTP_ENV=production
# Options: local | dev | production

# Agent Authentication (required)
# Your XMTP agent private key
KEY=your_private_key_here

# Web3.bio API Key (optional but recommended for better name resolution)
WEB3_BIO_API_KEY=your_web3_bio_api_key

# Frontend URL for Mini App (required)
# This is the URL where your mini app is hosted
# For local development:
FRONTEND_URL=http://localhost:3000
# For production:
# FRONTEND_URL=https://your-mini-app.vercel.app
```

## Running the Agent

### Development Mode (with auto-reload)

```bash
yarn dev
```

### Production Mode

```bash
yarn start
```

## How It Works

1. The agent listens for text messages on XMTP
2. When a message contains mentions (e.g., `@vitalik.eth`, `@fabriziovigevani`), it extracts them
3. It resolves each mention to an Ethereum address using:
   - Direct address matching (if it's already a full 0x address)
   - Shortened address matching (in group chats)
   - Web3.bio name resolution (for .eth and .farcaster.eth domains)
4. After resolving, it constructs a mini app URL with all resolved addresses as query parameters
5. The agent sends a message with the mini app link, which users can click to view the addresses in a beautiful UI

## Example Usage

Send a message to the agent:

```
@vitalik.eth @fabriziovigevani @jessepollak.eth
```

The agent will respond with:

```
🔍 Resolved:

✅ Found 3 addresses!

🚀 View in Mini App:
http://localhost:3000?users=0x1234...,0x5678...,0xabcd...

✅ vitalik.eth → 0xd8da...0280
✅ fabriziovigevani → 0xfb55...1944
✅ jessepollak.eth → 0x2b40...9a41
```

Clicking the mini app link will open the frontend with all the resolved addresses displayed in a clean, mobile-friendly interface.

## Scripts

- `yarn dev` - Start development server with auto-reload
- `yarn start` - Start production server
- `yarn build` - Build TypeScript to JavaScript
- `yarn revoke` - Revoke XMTP installations
- `yarn gen:keys` - Generate new keys

## Troubleshooting

### "No valid Ethereum addresses found"

Make sure the `FRONTEND_URL` environment variable is set correctly and points to your running frontend application.

### Name resolution not working

If name resolution isn't working properly:
1. Check that `WEB3_BIO_API_KEY` is set (optional but recommended)
2. Ensure the username format is correct (e.g., `@username` will be resolved as `username.farcaster.eth`)
3. Check the console logs for resolution errors

### Agent not responding

1. Ensure your `.env` file is properly configured
2. Check that the `KEY` variable contains a valid private key
3. Verify the `XMTP_ENV` matches your network (usually `production`)

