# PromptR — Setup & Deployment Guide

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│  React Frontend │────▶│  NestJS Backend API   │────▶│ PostgreSQL  │
│  (Vite + React) │     │  (JWT Auth + Prisma)  │     │  (Prisma)   │
└───────┬─────────┘     └──────────┬───────────┘     └─────────────┘
        │                          │
        │  Google Identity         │  Yoco Webhooks
        │  Services (GIS)          │  Google Play Verification
        ▼                          ▼
  ┌──────────────┐         ┌──────────────┐
  │ Google OAuth │         │ Yoco / Google│
  │   (Web)      │         │ Play Billing │
  └──────────────┘         └──────────────┘
```

## Tier System

| Tier     | Price | Videos     | Watermark | Features                    |
|----------|-------|------------|-----------|-----------------------------|
| Free     | $0    | 10         | Yes       | Basic teleprompter          |
| Creator  | $25   | 50         | No        | No watermark                |
| Pro      | $50   | Unlimited  | No        | No watermark                |
| Studio   | $100  | Unlimited  | No        | Custom content writing      |

## API Endpoints

| Method | Path                    | Auth | Description                        |
|--------|-------------------------|------|------------------------------------|
| POST   | `/auth/google`          | No   | Google OAuth login (returns JWT)   |
| GET    | `/user/me`              | JWT  | Get current user info              |
| POST   | `/user/increment-video` | JWT  | Increment video count              |
| GET    | `/user/tier`            | JWT  | Get tier info & entitlements       |
| POST   | `/purchase/yoco`        | JWT  | Create Yoco checkout session       |
| POST   | `/purchase/yoco/webhook`| No   | Yoco webhook handler               |
| POST   | `/purchase/google-play` | JWT  | Validate Google Play purchase      |
| GET    | `/health`               | No   | Health check                       |

## 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Google Cloud Console project (for OAuth)
- Yoco merchant account (for payments)
- Android Studio (for Android builds)

## 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Identity** API
4. Go to **Credentials** → Create **OAuth 2.0 Client ID**
   - For web: Add authorized origins (`http://localhost:5173`, your prod domain)
   - For Android: Add the SHA-1 fingerprint of your signing key
5. Copy the **Client ID** — you'll need this for both frontend and backend

## 3. Database Setup

```bash
# Install PostgreSQL (Ubuntu)
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres psql -c "CREATE USER promptr WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "CREATE DATABASE promptr_db OWNER promptr;"
sudo -u postgres psql -c "ALTER USER promptr CREATEDB;"
```

## 4. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values:
# - DATABASE_URL
# - JWT_SECRET (generate a random string)
# - GOOGLE_CLIENT_ID
# - YOCO_SECRET_KEY, YOCO_PUBLIC_KEY, YOCO_WEBHOOK_SECRET
# - FRONTEND_URL

# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Build
npx nest build

# Start server
node dist/main.js

# Or for development:
npm run start:dev
```

## 5. Frontend Setup

```bash
# Install dependencies (from project root)
npm install

# Configure environment
cp .env.example .env
# Edit .env:
# - VITE_GOOGLE_CLIENT_ID (same as backend)
# - VITE_API_URL (e.g., http://localhost:3001)

# Start dev server
npm run dev

# Build for production
npm run build
```

## 6. Yoco Payment Setup

1. Create a [Yoco](https://www.yoco.com/) merchant account
2. Get your API keys from the Yoco dashboard
3. Set up a webhook URL: `https://your-api-domain.com/purchase/yoco/webhook`
4. Copy Secret Key → `YOCO_SECRET_KEY`
5. Copy Public Key → `YOCO_PUBLIC_KEY`
6. Copy Webhook Secret → `YOCO_WEBHOOK_SECRET`

## 7. Google Play Billing Setup

1. In Google Play Console, create in-app products:
   - `promptr_creator` — $25
   - `promptr_pro` — $50
   - `promptr_studio` — $100
2. Enable license testing with test accounts
3. Build the Android APK/AAB with Capacitor:
   ```bash
   npm run build
   npx cap sync android
   # Open in Android Studio and build
   ```

## 8. Deployment

### Backend (Railway / Render / VPS)
```bash
cd server
npx prisma migrate deploy
npx nest build
node dist/main.js
```

### Frontend (Vercel / Netlify / Static hosting)
```bash
npm run build
# Deploy the `dist/` folder
```

### Android
```bash
npm run build
npx cap sync android
# Build signed AAB in Android Studio
# Upload to Google Play Console
```

## Environment Variables Summary

### Frontend (.env)
| Variable              | Description                    |
|-----------------------|--------------------------------|
| VITE_GOOGLE_CLIENT_ID | Google OAuth Client ID         |
| VITE_API_URL          | Backend API URL                |

### Backend (server/.env)
| Variable             | Description                     |
|----------------------|---------------------------------|
| DATABASE_URL         | PostgreSQL connection string    |
| JWT_SECRET           | JWT signing secret              |
| GOOGLE_CLIENT_ID     | Google OAuth Client ID          |
| YOCO_SECRET_KEY      | Yoco API secret key             |
| YOCO_PUBLIC_KEY      | Yoco API public key             |
| YOCO_WEBHOOK_SECRET  | Yoco webhook signing secret     |
| FRONTEND_URL         | Frontend URL for CORS/redirects |
| PORT                 | Server port (default: 3001)     |

## Security Checklist

- [ ] Change JWT_SECRET to a strong random value in production
- [ ] Use HTTPS in production
- [ ] Set correct CORS origins
- [ ] Enable Yoco webhook signature verification
- [ ] Set up Google Play Developer API for server-side purchase verification
- [ ] Never commit .env files to version control
