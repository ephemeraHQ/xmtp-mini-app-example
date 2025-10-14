# Tagged Member Resolver

Resolve and display Farcaster user profiles with verified addresses using the Neynar API.

## Usage

```
https://your-domain.com?tags=dwr,fabrizioguespe,v
```

## Setup

**Install:**
```bash
yarn install
```

**Environment Variables** (`.env.local`):
```env
NEXT_PUBLIC_NEYNAR_API_KEY=your_api_key
```

Get your API key at [neynar.com](https://neynar.com)

**Run:**
```bash
yarn dev
```

## Deployment

Deploy to Vercel and add `NEXT_PUBLIC_NEYNAR_API_KEY` to environment variables.
