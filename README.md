# XMTP Mini-App Examples

This repository contains examples of mini-apps built with the [XMTP](https://docs.xmtp.org/) network and Farcaster Frames.

## Why XMTP for Mini-Apps?

- **End-to-end encryption**: All data is encrypted in transit and at rest, ensuring user privacy and security.
- **Open-source & trustless**: Built on top of the [MLS](https://messaginglayersecurity.rocks/) protocol, it replaces trust in centralized certificate authorities with cryptographic proofs.
- **Privacy & metadata protection**: Offers anonymous usage through SDKs and pseudonymous usage with nodes tracking minimum metadata.
- **Decentralized**: Operates on a peer-to-peer network, eliminating single points of failure and ensuring continued operation even if some nodes go offline.
- **Group messaging**: Enables rich group chat experiences between users through MLS group chats.

## Getting Started

This repository contains a full-stack mini-app example with both frontend and backend components.

### Requirements

- Node.js v20 or higher
- Yarn v4 or higher
- Docker (optional, for local network)
- A Farcaster account (for Frames integration)

## Frontend Setup

The frontend is a Next.js application with Farcaster Frames integration.

### Environment Variables
Create a `.env.local` file in the `frontend` directory with the following variables:

```bash
NEXT_PUBLIC_URL= # Your local/production URL
NEXT_PUBLIC_APP_ENV=development # Enable Eruda for debugging
NEXT_PUBLIC_NEYNAR_API_KEY= # Neynar API key from https://neynar.com
JWT_SECRET= # Generate with openssl rand -base64 32
XMTP_PRIVATE_KEY= # Private key of your XMTP account
XMTP_ENV=dev # XMTP environment (dev/production)
NEXT_PUBLIC_ENCRYPTION_KEY= # XMTP encryption key for the browser
```

### Run the Frontend

```bash
# Navigate to frontend directory
cd frontend
# Install dependencies
yarn install
# Run in development mode
yarn dev
```

## Backend Setup

The backend handles XMTP operations for the mini-app.

### Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```bash
PORT=5001 # Server port
API_SECRET_KEY= # Secret key for API authentication, generate with openssl rand -base64 32
XMTP_PRIVATE_KEY= # XMTP private key
XMTP_ENCRYPTION_KEY= # XMTP encryption key
XMTP_ENV=dev # XMTP environment (dev/local/production)
GROUP_ID= # Default XMTP conversation ID
```

### Run the Backend

```bash
# Navigate to backend directory
cd backend
# Install dependencies
yarn install
# Run in development mode
yarn dev
```

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

The backend server provides these endpoints:

### Public endpoints
- `GET /health`: Health check endpoint

### Protected endpoints
All protected endpoints require the `API_SECRET_KEY` to be provided in the request headers as `x-api-secret`.

- `POST /api/xmtp/add-inbox`: Add a user to the default group chat
- `GET /api/xmtp/get-group-id`: Get the default group chat ID

## Additional Resources

- [XMTP Documentation](https://docs.xmtp.org/)
- [Farcaster Frames Documentation](https://docs.farcaster.xyz/reference/frames/spec)
- [XMTP Web Inbox](https://xmtp.chat/) - Test your mini-app integration
