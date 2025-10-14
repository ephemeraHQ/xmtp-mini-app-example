# Mini-app standalone example

This combines a backend agent and a frontend mini app to resolve mentions in a group chat.

<p align="center" >
  <img src="media/left.png" alt="Image 1" width="49%">
  <img src="media/right.png" alt="Image 2" width="49%">
</p>

## Usage

1. Send a message in a group chat to the agent tagging other users.

```bash
hey @game, lets challenge @vitalik.eth @humanagent.eth and @0x...
```

2. The agent will respond with a mini app link to the frontend.

```bash
http://mini-app-example.ngrok.io?tags=vitalik.eth,humanagent.eth,0x...
```

3. The frontend will resolve the mentions and display the user profiles.

```bash
✅ vitalik.eth → 0x...
✅ humanagent.eth → 0x...
✅ 0x... → 0x...
```

## Get started 

### Requirements

- Node.js v20 or higher
- Yarn v4 or higher
- Docker (optional, for local network)


### Run the agent

```bash
# git clone repo
git clone https://github.com/ephemeraHQ/xmtp-mini-app-example mini-app-example
# go to the folder
cd mini-app-example  
cd backend
# install packages
yarn
# run the agent
yarn start
```

#### Environment variables for the agent

To run your XMTP agent, you must create a `.env` file with the following variables:

```bash
XMTP_WALLET_KEY= # the private key of the wallet
XMTP_DB_ENCRYPTION_KEY= # encryption key for the local database
XMTP_ENV=dev # local, dev, production
```



### Run the frontend

```bash
# git clone repo
git clone https://github.com/ephemeraHQ/xmtp-mini-app-example mini-app-example
# go to the folder
cd mini-app-example  
cd frontend
# install packages
yarn
# run the frontend
yarn dev
```

#### Environment variables for the frontend

To run your frontend, you must create a `.env.local` file with the following variables:

```bash
# Farcaster.json manifest generate yours at https://warpcast.com/~/developers/mini-apps/manifest
NEXT_PUBLIC_URL="http://localhost:3000"
NEXT_PUBLIC_FARCASTER_HEADER=""
NEXT_PUBLIC_FARCASTER_PAYLOAD=""
NEXT_PUBLIC_FARCASTER_SIGNATURE=""

NEXT_PUBLIC_APP_ENV="" 


NGROK_DOMAIN=""
NGROK_AUTHTOKEN=""

# Neynar API Key for username resolution
NEXT_PUBLIC_NEYNAR_API_KEY=
```

This example uses the Neynar API to resolve [Farcaster usernames to Ethereum addresses](https://docs.neynar.com/reference/fetch-bulk-users).