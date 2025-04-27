# XMTP Mini-App Examples

This repository contains examples of mini-apps built with the [XMTP](https://docs.xmtp.org/) network and Farcaster Frames.

## Why XMTP?

- **End-to-end & compliant**: Data is encrypted in transit and at rest, meeting strict security and regulatory standards.
- **Open-source & trustless**: Built on top of the [MLS](https://messaginglayersecurity.rocks/) protocol, it replaces trust in centralized certificate authorities with cryptographic proofs.
- **Privacy & metadata protection**: Offers anonymous usage through SDKs and pseudonymous usage with nodes tracking minimum metadata.
- **Decentralized**: Operates on a peer-to-peer network, eliminating single points of failure and ensuring continued operation even if some nodes go offline.
- **Multi-agent**: Allows confidential communication between multiple agents and humans through MLS group chats.


## Getting Started

This repository contains a full-stack mini-app example with both frontend and backend components.

### Repository Structure

The repository is structured as follows:

- [frontend](./frontend): The frontend is a Next.js application with Farcaster Frames integration.
- [backend](./backend): The backend is a Node.js application that handles a group chat for the mini-app.

### Requirements

- Node.js v20 or higher
- Yarn v4 or higher
- Docker (optional, for local network)
- A Farcaster account (for Frames integration)

### Running the mini-app

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

## Examples

- [Wallet Connection](./frontend/src/examples/WalletConnection.tsx)
- [Connection Info](./frontend/src/examples/ConnectionInfo.tsx)
- [Group Management](./frontend/src/examples/GroupManagement.tsx) 
- [Group Chat](./frontend/src/examples/GroupChat.tsx)
- [Backend Info](./frontend/src/examples/BackendInfo.tsx)

## Deployment

This is a standard Next.js app that can be deployed to any hosting provider. For the backend, we recommend using a container-based service.

1. Update production environment variables
2. For Farcaster Frame integration, update the `farcaster.json` manifest file with:
   - Generated `accountAssociation` from Warpcast Mobile
   - Set proper URLs in the manifest

## Farcaster Frames Integration

To use the mini-app with Farcaster:

1. Generate domain manifest from Warpcast Mobile
   - Go to Settings > Developer > Domains
   - Insert website hostname
   - Generate domain manifest
2. Update the `accountAssociation` in your code
3. Configure your frame with proper URLs and metadata

## API Endpoints

All protected endpoints require the `API_SECRET_KEY` to be provided in the request headers as `x-api-secret`.

- `GET /health`: Health check endpoint
- `POST /api/xmtp/add-inbox`: Add a user to the default group chat
- `POST /api/xmtp/remove-inbox`: Remove a user from the default group chat
- `POST /api/xmtp/add-inbox`: Add a user to the default group chat
- `GET /api/xmtp/get-group-id`: Get the default group chat ID


## Work with Local XMTP Network

`dev` and `production` networks are hosted by XMTP, while `local` network is hosted by yourself.

1. Install Docker
2. Start the XMTP service and database

```bash
./dev/up
```

3. Change the `.env` files to use the local network

```bash
XMTP_ENV=local
```

## Web inbox

See web best practices with XMTP `browser-sdk` using [xmtp.chat](https://xmtp.chat), and it's open source version [xmtp-chat-web](https://github.com/xmtp/xmtp-js/tree/main/apps/xmtp.chat).

![](./screenshot.png)


## Additional Resources

- [Farcaster Frames Documentation](https://docs.farcaster.xyz/reference/frames/spec)
- [Builders Garden miniapp template](https://github.com/builders-garden/miniapp-next-template)