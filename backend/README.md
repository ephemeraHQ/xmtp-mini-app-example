# XMTP MiniApp Backend

A Node.js backend service for the XMTP MiniApp that handles XMTP operations.

## Getting started

> [!TIP]
> See XMTP's [xmtp-agents-examples](https://github.com/xmtp/xmtp-agents-examples) for vibe coding agents and best practices.

### Requirements

- Node.js v20 or higher
- Yarn v4 or higher
- Express.js
- Docker (optional, for local network)

### Environment variables

To run your XMTP backend, you must create a `.env` file with the following
variables:

```bash
PORT=5001 # Server port
API_SECRET_KEY= # Secret key for API authentication, generate with openssl rand -base64 32
XMTP_PRIVATE_KEY= # XMTP private key
XMTP_ENCRYPTION_KEY= # XMTP encryption key
XMTP_ENV=dev # XMTP environment (dev/local/production)
GROUP_ID= # Default XMTP conversation ID
```

### Run the backend

```bash
# Clone repository
git clone https://github.com/xmtp/xmtp-mini-app-examples.git
# Navigate to backend directory
cd xmtp-mini-app-examples/backend
# or
yarn install
# Create .env file
cp .env.example .env
# Run in development mode
yarn run dev
```

## API Endpoints

All protected endpoints require the `API_SECRET_KEY` to be provided in the request headers as `x-api-secret`.

- `GET /health`: Health check endpoint
- `POST /api/xmtp/add-inbox`: Add a user to the default group chat
- `POST /api/xmtp/remove-inbox`: Remove a user from the default group chat
- `POST /api/xmtp/add-inbox`: Add a user to the default group chat
- `GET /api/xmtp/get-group-id`: Get the default group chat ID