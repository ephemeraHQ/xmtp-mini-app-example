# XMTP mini-app examples

This repository provides a debugging toolkit for mini-apps built with the [XMTP](https://docs.xmtp.org/) network and Farcaster Frames.

## Getting started

> [!TIP]
> See XMTP's [xmtp-agents-examples](https://github.com/xmtp/xmtp-agents-examples) for vibe coding agents and best practices.


This debugging toolkit includes a full-stack mini-app example with both frontend and backend components.

### Repository Structure

The debugger is structured as follows:

- [frontend](./frontend): The debugging frontend is a Next.js application with Farcaster Frames integration.
- [backend](./backend): The debugging backend is a Node.js application that handles a group chat for the mini-app.

### Requirements

- Node.js v20 or higher
- Yarn v4 or higher
- Docker (optional, for local network debugging)
- A Farcaster account (for Frames integration testing)

### Backend Installation

Clone the repository and setup the backend:

```bash
# Clone repository
git clone https://github.com/xmtp/xmtp-mini-app-examples.git
# Navigate to backend directory
cd xmtp-mini-app-examples/backend
# Install dependencies
yarn install
# Create .env file
cp .env.example .env
# Generate xmtp env vars: WALLET_KEY and ENCRYPTION_KEY
yarn run gen:keys
# Run in development mode
yarn run dev
```

### Frontend Installation

Setup the frontend env vars:

```bash
# Navigate to backend directory
cd xmtp-mini-app-examples/frontend
# Install dependencies
yarn install
# Create .env file
cp .env.example .env
# Run in development mode
yarn run dev
```

## Debugging Examples

- [Wallet Connection](./frontend/src/examples/WalletConnection.tsx): Connect a wallet to the mini-app.
- [Connection Info](./frontend/src/examples/ConnectionInfo.tsx): Display information about the current connection.
- [Group Management](./frontend/src/examples/GroupManagement.tsx): Join a group chat and send messages through the XMTP express backend.
- [Bot Chat](./frontend/src/examples/BotChat.tsx): A simple example of a bot chat using the XMTP client.

## Deployment of Your Debugged App

Once your mini-app is debugged, you can deploy it to any hosting provider:

1. Update production environment variables
2. For Farcaster Frame integration, update the `farcaster.json` `getFarcasterManifest` [Wallet Connection](./frontend/src/lib/frame.ts) file with:
   - Generated `accountAssociation` from Warpcast Mobile
   - Set proper URLs in the manifest

### Generate farcaster.json manifest for your domain

1. Go to Developer Manifest settings:
   1. On your browser go to [Farcaster Developers > Manifest](https://warpcast.com/~/developers/mini-apps/manifest) 
   2. On your mobile app go to "Settings > Developers (activate developer mode in advanced) > Domains"
2. Insert your domain and generate the manifest for it.

Copy the account association object and paste it in the respective variables in the `.env` file.

You now should have updated the following variables:
```bash
# ...
NEXT_PUBLIC_URL="https://your-domain.com"
NEXT_PUBLIC_FARCASTER_HEADER="..." # copy accountAssociation.header string here
NEXT_PUBLIC_FARCASTER_PAYLOAD="..." # copy accountAssociation.payload string here
NEXT_PUBLIC_FARCASTER_SIGNATURE="..." # copy accountAssociation.signature string here
```


## Debugging Farcaster Frames Integration

To debug your mini-app with Farcaster:

1. Generate domain manifest from Warpcast Mobile
   - Go to Settings > Developer > Domains
   - Insert website hostname
   - Generate domain manifest
2. Update the `accountAssociation` in your code
3. Configure your frame with proper URLs and metadata
4. Use the debugger to validate frame responses

## Debugging with Local XMTP Network

For isolated debugging, use a local XMTP network:

1. Install Docker
2. Start the XMTP service and database

```bash
./dev/up
```

3. Change the `.env` files to use the local network

```bash
XMTP_ENV=local
```

## Common Errors

### Error: `Frontend not displaying something even when forced`

This is a common issue when the frontend and the backend operates on different XMTP_ENVs.
Check the `.env` files to ensure that the frontend and backend are using the same XMTP_ENV network.


## Additional resources

- [xmtp.chat](https://xmtp.chat) - Web best practices with XMTP `browser-sdk`
- [Farcaster MiniApps Documentation](https://miniapps.farcaster.xyz/docs/getting-started)
- [Farcaster Frames Documentation](https://docs.farcaster.xyz/reference/frames/spec)
- [Builders Garden miniapp template](https://github.com/builders-garden/miniapp-next-template)