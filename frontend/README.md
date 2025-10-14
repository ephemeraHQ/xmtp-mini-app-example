# Tagged Member Resolver

A Next.js application that resolves and displays member identities from tags (ENS names, Farcaster usernames, or Ethereum addresses).

## Overview

This app resolves various identity formats (ENS domains, Farcaster usernames, Ethereum addresses) to display both the human-readable name and the corresponding Ethereum address. It uses the web3.bio API for name resolution and provides a clean, mobile-friendly interface.

## Usage

### URL Format

Visit the app with the following URL format:

```
https://your-domain.com?tags=vitalik.eth,fabrizioeth,0x1234...
```

### Examples

```
https://mini-app.vercel.com?tags=vitalik.eth,fabrizioeth.farcaster.eth,0xfb55CB623f2aB58Da17D8696501054a2ACeD1944
```

```
https://mini-app.vercel.com?tags=byteai.base.eth,0xabc5…f002
```

## Features

- ✅ Resolve ENS names (e.g., `vitalik.eth`, `byteai.base.eth`)
- ✅ Resolve Farcaster usernames (automatically appends `.farcaster.eth`)
- ✅ Handle full Ethereum addresses (pass-through)
- ✅ Match shortened addresses (e.g., `0xabc5…f002`)
- ✅ Display both name/identifier and resolved address
- ✅ Real-time resolution with loading states
- ✅ Copy addresses to clipboard with one click
- ✅ Error handling for unresolved identities
- ✅ Responsive design with dark theme

## Development

### Prerequisites

- Node.js >= 20
- Yarn 4.x

### Installation

```bash
yarn install
```

### Run Development Server

```bash
yarn dev
```

Visit `http://localhost:3000?tags=vitalik.eth,fabrizioeth` to see the app in action.

### Run with Ngrok (for Farcaster Frame Testing)

To test your app with Farcaster frames or external services, you can expose your local server using ngrok:

```bash
yarn dev:ngrok
```

This will:
1. Start the Next.js dev server on port 3000
2. Create an ngrok tunnel to expose it publicly
3. Display both local and public URLs in the console

#### Ngrok Configuration

Add your ngrok authtoken to `.env.local`:

```env
# Required: Ngrok authentication token
NGROK_AUTHTOKEN=your_ngrok_authtoken

# Optional: Custom ngrok domain (requires paid plan)
NGROK_DOMAIN=your-custom-domain.ngrok.app
```

**Getting your ngrok authtoken:**
1. Sign up at: https://dashboard.ngrok.com/signup (free tier available)
2. Get your authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
3. Add it to your `.env.local` file

**Note:** The authtoken is required for ngrok to work. With the free tier, you'll get a random public URL. Paid plans offer custom domains and additional features.

### Build for Production

```bash
yarn build
```

### Start Production Server

```bash
yarn start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                  # Next.js app directory
│   │   ├── api/             # API routes
│   │   │   ├── farcaster/   # Farcaster search
│   │   │   ├── og/          # OG image generation
│   │   │   └── proxy/       # Health check
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Home page
│   ├── components/          # React components
│   │   ├── MemberRenderer.tsx    # Main member display component
│   │   ├── Header.tsx       # App header
│   │   ├── Button.tsx       # Reusable button
│   │   └── ...
│   ├── context/             # React contexts
│   │   └── frame-context.tsx     # Farcaster Frame SDK context
│   ├── lib/                 # Utility functions
│   │   ├── constants.ts     # App constants
│   │   ├── env.ts          # Environment variables
│   │   ├── resolver.ts     # Identity resolution logic
│   │   ├── types.ts        # TypeScript types
│   │   └── ...
│   ├── pages/              # Page components
│   │   └── Page.tsx        # Main page component
│   └── providers/          # Context providers
│       └── index.tsx       # Combined providers
└── package.json
```

## Key Components

### MemberRenderer

The main component that:
1. Reads the `tags` query parameter from the URL
2. Resolves each tag to an Ethereum address using web3.bio API
3. Displays both the identifier (name) and resolved address
4. Shows loading states during resolution
5. Provides copy-to-clipboard functionality for resolved addresses

### Header

Simple header with:
- App title
- Debug console toggle (development only)

### SafeAreaContainer

Handles safe area insets for mobile devices, especially important when running in Farcaster mini apps.

## Identity Resolution

The app uses the `lib/resolver.ts` module to resolve various identity formats:

### Supported Formats

1. **Full Ethereum addresses**: `0x1234...` (42 characters)
   - Passed through as-is

2. **ENS names**: `vitalik.eth`, `byteai.base.eth`
   - Resolved via web3.bio API

3. **Farcaster usernames**: `fabrizioeth`
   - Automatically appends `.farcaster.eth` and resolves

4. **Shortened addresses**: `0xabc5…f002`
   - Matched against a list of known addresses (for group contexts)

### Resolution Flow

1. Tags are extracted from the URL query parameter
2. Each tag is resolved asynchronously
3. UI shows loading state during resolution
4. Resolved addresses are displayed with the original identifier
5. Failed resolutions show an error message

## Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development

# Farcaster Manifest (required for Farcaster mini apps)
NEXT_PUBLIC_FARCASTER_HEADER=your_header
NEXT_PUBLIC_FARCASTER_PAYLOAD=your_payload
NEXT_PUBLIC_FARCASTER_SIGNATURE=your_signature

# Ngrok configuration (required if using yarn dev:ngrok)
NGROK_AUTHTOKEN=your_ngrok_authtoken
# Optional: Custom domain (requires ngrok paid plan)
NGROK_DOMAIN=your-custom-domain.ngrok.app
```

## Removed Features

The following features were removed from the original XMTP Mini App:

- ❌ XMTP Browser SDK integration
- ❌ Wallet authentication (wagmi, viem)
- ❌ XMTP client initialization
- ❌ Group chat functionality
- ❌ Bot chat functionality
- ❌ Message sending/receiving
- ❌ Conversation management
- ❌ Authentication routes
- ❌ Wallet connection UI

## License

MIT

