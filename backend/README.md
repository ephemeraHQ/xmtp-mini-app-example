# XMTP MiniApp Backend

A Node.js backend service for the XMTP MiniApp that handles XMTP operations.

## Getting started

> [!TIP] This backend works with any XMTP-compatible client including xmtp.chat.

### Requirements

- Node.js v20 or higher
- Yarn v4 or higher
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
git clone https://github.com/xmtp/xmtp-mini-app.git
# Navigate to backend directory
cd xmtp-mini-app/backend
# or
yarn install
# Create .env file
cp .env.example .env
# Run in development mode
yarn run dev
```

## API endpoints

The server runs on port `5001` by default (configurable in .env).

### Public endpoints

- `GET /health`: Health check endpoint

### Protected endpoints

All protected endpoints require the `API_SECRET_KEY` to be provided in the
request headers as `x-api-secret`.

- `POST /api/xmtp/add-inbox`: Add a user to the default group chat
- `GET /api/xmtp/get-group-id`: Get the default group chat ID

## Environment variables

- `PORT`: Server port (default: 5001)
- `API_SECRET_KEY`: Secret key for API authentication
- `XMTP_PRIVATE_KEY`: XMTP private key
- `XMTP_ENCRYPTION_KEY`: XMTP encryption key
- `XMTP_ENV`: XMTP environment (dev/local/production)
- `GROUP_ID`: Default XMTP conversation ID
