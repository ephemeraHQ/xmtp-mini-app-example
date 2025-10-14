# XMTP Agent Backend

This backend agent listens for XMTP messages containing mentions and extracts them as tags, then opens a mini app where the frontend resolves the tags to Ethereum addresses.

## Features

- 🔍 Extracts mentions from messages (`@username.eth`, `@username`, `0x...` addresses)
- 🚀 Opens mini app with tags as URL parameters
- 👥 Supports full addresses, ENS names, Farcaster usernames, and shortened addresses
- ⚡ Lightweight - resolution happens on the frontend for better performance

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

1. The agent listens for text messages on XMTP in group chats
2. When a message contains the trigger `@game` and mentions (e.g., `@vitalik.eth`, `@fabrizioeth`), it extracts them
3. The agent constructs a mini app URL with all tags as query parameters
4. The agent sends a message with the mini app link
5. Users click the link to open the frontend, which resolves each tag to an Ethereum address
6. Resolution happens on the frontend using the web3.bio API for better performance and user experience

## Example Usage

Send a message in a group chat to the agent:

```
@game @vitalik.eth fabrizioeth @jessepollak.eth
```

The agent will respond with:

```
🚀 View in Mini App:
http://localhost:3000?tags=vitalik.eth,fabrizioeth,jessepollak.eth
```

Clicking the mini app link will open the frontend which resolves each tag and displays:
- The original identifier (name)
- The resolved Ethereum address
- A copy button for each address

All in a clean, mobile-friendly interface with loading states during resolution.

## Scripts

- `yarn dev` - Start development server with auto-reload
- `yarn start` - Start production server
- `yarn build` - Build TypeScript to JavaScript
- `yarn revoke` - Revoke XMTP installations
- `yarn gen:keys` - Generate new keys

## Troubleshooting

### Agent not extracting mentions

Make sure your message includes the trigger word `@game` followed by the mentions you want to extract.

### Mini app link not working

Make sure the `FRONTEND_URL` environment variable is set correctly and points to your running frontend application.

### Agent not responding

1. Ensure your `.env` file is properly configured
2. Check that the `KEY` variable contains a valid private key
3. Verify the `XMTP_ENV` matches your network (usually `production`)
4. Check console logs for any errors during mention extraction

### Resolution issues in frontend

If names aren't resolving properly in the mini app:
1. Check the browser console for API errors
2. Verify the tags are formatted correctly (ENS names, Farcaster usernames, or addresses)
3. Note that resolution happens client-side using the web3.bio API

