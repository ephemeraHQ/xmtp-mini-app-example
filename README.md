# XMTP mini-app examples

This repository provides a debugging toolkit for mini-apps built with the [XMTP](https://docs.xmtp.org/) network and Farcaster Frames.

## Why XMTP?

- **End-to-end & compliant**: Data is encrypted in transit and at rest, meeting strict security and regulatory standards.
- **Open-source & trustless**: Built on top of the [MLS](https://messaginglayersecurity.rocks/) protocol, it replaces trust in centralized certificate authorities with cryptographic proofs.
- **Privacy & metadata protection**: Offers anonymous usage through SDKs and pseudonymous usage with nodes tracking minimum metadata.
- **Decentralized**: Operates on a peer-to-peer network, eliminating single points of failure and ensuring continued operation even if some nodes go offline.
- **Multi-agent**: Allows confidential communication between multiple agents and humans through MLS group chats.

## Getting started

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

### Installation

```bash
# Clone repository
git clone https://github.com/xmtp/xmtp-mini-app-examples.git
# Navigate to backend directory
cd xmtp-mini-app-examples/backend
# Install dependencies
yarn install
# Create .env file
cp .env.example .env
# Run in development mode
yarn run dev
```

### Running the debugger

Create a `.env` file in the `frontend` directory with the following variables:

```bash
NEXT_PUBLIC_URL= # Your local/production URL
NEXT_PUBLIC_APP_ENV=development # Enable Eruda for debugging
NEXT_PUBLIC_NEYNAR_API_KEY= # Neynar API key from https://neynar.com
JWT_SECRET= # Generate with openssl rand -base64 32
XMTP_PRIVATE_KEY= # Private key of your XMTP account
XMTP_ENV=dev # XMTP environment (dev/production)
NEXT_PUBLIC_ENCRYPTION_KEY= # XMTP encryption key for the browser
```

## Debugging Examples

- [Wallet Connection](./frontend/src/examples/WalletConnection.tsx): Connect a wallet to the mini-app.
- [Connection Info](./frontend/src/examples/ConnectionInfo.tsx): Display information about the current connection.
- [Group Management](./frontend/src/examples/GroupManagement.tsx): Join a group chat and send messages through the XMTP express backend.
- [Bot Chat](./frontend/src/examples/BotChat.tsx): A simple example of a bot chat using the XMTP client.

## Deployment of Your Debugged App

Once your mini-app is debugged, you can deploy it to any hosting provider:

1. Update production environment variables
2. For Farcaster Frame integration, update the `farcaster.json` manifest file with:
   - Generated `accountAssociation` from Warpcast Mobile
   - Set proper URLs in the manifest

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

## Additional resources

- [xmtp.chat](https://xmtp.chat) - Web best practices with XMTP `browser-sdk`
- [Farcaster Frames Documentation](https://docs.farcaster.xyz/reference/frames/spec)
- [Builders Garden miniapp template](https://github.com/builders-garden/miniapp-next-template)