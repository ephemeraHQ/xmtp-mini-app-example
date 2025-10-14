# XMTP Mini App - Monorepo

A full-stack XMTP application combining a Next.js frontend with an XMTP agent backend. This project demonstrates how to build a mini app that resolves mentions from XMTP messages into Ethereum addresses.

## 🏗️ Project Structure

```
xmtp-mini-app-monorepo/
├── frontend/          # Next.js mini app
├── backend/           # XMTP agent (long-running process)
├── railway.toml       # Railway deployment configuration
└── package.json       # Root workspace configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20
- Yarn (v4.9.1 or higher)
- Railway account (for deployment)

### Local Development

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Set up environment variables:**
   
   Create `.env` files in both `frontend/` and `backend/` directories. See each service's README for required variables.

3. **Run both services:**
   ```bash
   # Run both frontend and backend concurrently
   yarn dev
   
   # Or run individually:
   yarn dev:frontend
   yarn dev:backend
   ```

## 📦 Deployment to Railway

### One-Click Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

### Manual Deployment

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Initialize project:**
   ```bash
   railway init
   ```

4. **Link the project:**
   ```bash
   railway link
   ```

5. **Deploy both services:**
   
   Railway will automatically detect the `railway.toml` configuration and deploy both frontend and backend services.

   ```bash
   railway up
   ```

6. **Set environment variables:**
   
   Go to your Railway dashboard and set the required environment variables for each service:
   
   **Backend Service:**
   - `XMTP_ENV` - XMTP environment (production/dev/local)
   - `KEY` - Your XMTP agent private key
   - `FRONTEND_URL` - URL of your Railway frontend service (e.g., https://your-app.railway.app)
   
   **Frontend Service:**
   - `NEXT_PUBLIC_URL` - Your frontend URL
   - `NEXT_PUBLIC_APP_ENV` - Environment (development/production)
   - `NEXT_PUBLIC_FARCASTER_HEADER` - Farcaster manifest header
   - `NEXT_PUBLIC_FARCASTER_PAYLOAD` - Farcaster manifest payload
   - `NEXT_PUBLIC_FARCASTER_SIGNATURE` - Farcaster manifest signature
   - `NEYNAR_API_KEY` - Neynar API key for Farcaster integration

7. **Services will auto-deploy:**
   
   Railway will automatically deploy and start both services. You can monitor the deployment in the Railway dashboard.

### Getting Service URLs

After deployment, Railway will provide URLs for both services:
- Frontend: `https://your-frontend.railway.app`
- Backend: Running internally (no public URL needed)

Make sure to update the `FRONTEND_URL` environment variable in the backend service with your actual frontend URL.

## 🛠️ Available Commands

```bash
# Development
yarn dev                 # Run both services concurrently
yarn dev:frontend        # Run only frontend
yarn dev:backend         # Run only backend

# Build
yarn build              # Build both services
yarn build:frontend     # Build only frontend
yarn build:backend      # Build only backend

# Production
yarn start:frontend     # Start frontend in production mode
yarn start:backend      # Start backend in production mode
```

## 📖 Documentation

- [Frontend Documentation](./frontend/README.md)
- [Backend Documentation](./backend/README.md)

## 🔧 How It Works

1. **User sends a message** to the XMTP agent mentioning usernames (e.g., `@game @vitalik.eth`)
2. **Backend agent** extracts the mentions and constructs a mini app URL
3. **Agent responds** with a link to the frontend mini app
4. **Frontend resolves** each mention to an Ethereum address using web3.bio API
5. **Users can copy** the resolved addresses directly from the mini app

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Support

For issues and questions:
- Check individual service READMEs in `frontend/` and `backend/` directories
- Open an issue in the repository
- Consult the [XMTP Documentation](https://docs.xmtp.org)

