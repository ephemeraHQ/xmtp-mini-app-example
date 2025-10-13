# Group Member Renderer

A simple Next.js application that renders group member addresses passed via URL parameters.

## Overview

This app has been simplified from the original XMTP Mini App to focus on displaying group member information. It no longer includes XMTP Browser SDK or wallet authentication - instead, it simply renders a list of Ethereum addresses passed through URL query parameters.

## Usage

### URL Format

Visit the app with the following URL format:

```
https://your-domain.com?users=0x1234...,0x5678...,0xabcd...
```

### Example

```
https://mini-app.vercel.com?users=0xfb55CB623f2aB58Da17D8696501054a2ACeD1944,0x1234567890123456789012345678901234567890
```

## Features

- ✅ Parse multiple Ethereum addresses from URL parameters
- ✅ Display addresses in a clean, mobile-friendly interface
- ✅ Copy addresses to clipboard with one click
- ✅ Validate Ethereum address format (0x + 40 hex characters)
- ✅ Show member count
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

Visit `http://localhost:3000?users=0x...` to see the app in action.

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
1. Reads the `users` query parameter from the URL
2. Validates Ethereum addresses
3. Displays them in a styled list
4. Provides copy-to-clipboard functionality

### Header

Simple header with:
- App title
- Debug console toggle (development only)

### SafeAreaContainer

Handles safe area insets for mobile devices, especially important when running in Farcaster mini apps.

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

