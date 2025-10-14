# XMTP Mini App Frontend

A Next.js application that resolves and displays member identities from tags (ENS names, Farcaster usernames, or Ethereum addresses).

> **Note:** This is part of a monorepo. See the [root README](../README.md) for complete deployment instructions.

## Features

- Resolve ENS names (e.g., `vitalik.eth`, `byteai.base.eth`)
- Resolve Farcaster usernames (automatically appends `.farcaster.eth`)
- Handle full Ethereum addresses (pass-through)
- Match shortened addresses (e.g., `0xabc5…f002`)
- Display both name/identifier and resolved address
- Copy addresses to clipboard
- Responsive design with dark theme

## Usage

Visit the app with the following URL format:

```
https://your-domain.com?tags=vitalik.eth,fabrizioeth,0x1234...
```

### Examples

```
https://mini-app.vercel.com?tags=vitalik.eth,fabrizioeth.farcaster.eth,0xfb55CB623f2aB58Da17D8696501054a2ACeD1944
```

## Development

### Prerequisites

- Node.js >= 20
- Yarn 4.x

### Installation

From the project root:
```bash
yarn install
```

Or from this directory:
```bash
cd frontend
yarn install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development

# Farcaster Manifest (required for Farcaster mini apps)
NEXT_PUBLIC_FARCASTER_HEADER=your_header
NEXT_PUBLIC_FARCASTER_PAYLOAD=your_payload
NEXT_PUBLIC_FARCASTER_SIGNATURE=your_signature

# Ngrok configuration (optional, for dev:ngrok)
NGROK_AUTHTOKEN=your_ngrok_authtoken
NGROK_DOMAIN=your-custom-domain.ngrok.app
```

### Run Development Server

From the project root:
```bash
yarn dev:frontend
```

Or from this directory:
```bash
yarn dev
```

Visit `http://localhost:3000?tags=vitalik.eth,fabrizioeth`

### Run with Ngrok (Optional)

For testing Farcaster frames or external services:

```bash
yarn dev:ngrok
```

Get your ngrok authtoken at: https://dashboard.ngrok.com/get-started/your-authtoken

## Deployment

### Deploy to Railway

This service is configured to deploy to Railway as part of the monorepo. See the [root README](../README.md) for complete deployment instructions.

**Environment variables required on Railway:**
- `NEXT_PUBLIC_URL` - Your production URL (provided by Railway)
- `NEXT_PUBLIC_APP_ENV` - Set to `production`
- `NEXT_PUBLIC_FARCASTER_HEADER` - Farcaster manifest header
- `NEXT_PUBLIC_FARCASTER_PAYLOAD` - Farcaster manifest payload
- `NEXT_PUBLIC_FARCASTER_SIGNATURE` - Farcaster manifest signature
- `NEYNAR_API_KEY` - Neynar API key for Farcaster integration

Railway will automatically detect Next.js and configure the build process.

## Build for Production

```bash
yarn build
yarn start
```

## License

MIT
