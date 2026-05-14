# PromptR — Setup & Deployment Instructions

Complete guide to configure Firebase Authentication, Google Play Billing, Yoco Payments, and deploy the PromptR backend + frontend.

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────┐
│  React App   │────▶│  Express Backend  │────▶│  PostgreSQL DB │
│  (Vite)      │     │  (Node.js)       │     │                │
└──────────────┘     └──────────────────┘     └────────────────┘
       │                      │
       │ Firebase Auth        │ Validates tokens
       ▼                      ▼
┌──────────────┐     ┌──────────────────┐
│  Firebase    │     │  Yoco / Google   │
│  (Google     │     │  Play Billing    │
│   Sign-In)   │     │                  │
└──────────────┘     └──────────────────┘
```

### Tier System
| Tier | Price | Videos | Watermark | Extras |
|------|-------|--------|-----------|--------|
| Free | R0 | 10 | Yes | — |
| Creator | R25 | 50 | No | — |
| Pro | R50 | Unlimited | No | — |
| Studio | R100 | Unlimited | No | Custom content, priority support |

---

## 1. Firebase Setup

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project** → name it `promptr` (or similar)
3. Enable Google Analytics if desired → **Create Project**

### 1.2 Enable Google Sign-In
1. In the Firebase console, go to **Authentication** → **Sign-in method**
2. Click **Google** → **Enable** → set a support email → **Save**

### 1.3 Add Web App
1. Go to **Project Settings** (gear icon) → **General**
2. Under **Your apps**, click the web icon (`</>`)
3. Register the app (name: `PromptR Web`)
4. Copy the Firebase config object — you'll need these values

### 1.4 Add Android App
1. Still in **Project Settings** → **Your apps**, click **Add app** → Android
2. Package name: `com.yourname.promptr`
3. Download `google-services.json` and place it at:
   ```
   android/app/google-services.json
   ```
4. Add your SHA-1 fingerprint:
   ```bash
   cd android && ./gradlew signingReport
   ```
   Copy the SHA-1 from the output and add it in Firebase Console

### 1.5 Generate Service Account Key (for Backend)
1. Go to **Project Settings** → **Service Accounts**
2. Click **Generate new private key**
3. Save the JSON file as:
   ```
   server/firebase-service-account.json
   ```
   ⚠️ **Never commit this file to git!**

### 1.6 Frontend Environment Variables
Create `.env` in the project root (copy from `.env.example`):

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=promptr-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=promptr-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=promptr-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
VITE_API_URL=http://localhost:3001
```

---

## 2. PostgreSQL Database Setup

### 2.1 Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql@16
```

### 2.2 Create Database and User
```bash
sudo -u postgres psql

CREATE USER promptr_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE promptr_db OWNER promptr_user;
GRANT ALL PRIVILEGES ON DATABASE promptr_db TO promptr_user;
\q
```

### 2.3 Initialize Schema
```bash
cd server
cp .env.example .env
# Edit .env with your DATABASE_URL
npm run db:init
```

---

## 3. Backend Server Setup

### 3.1 Install Dependencies
```bash
cd server
npm install
```

### 3.2 Configure Environment
Create `server/.env` (copy from `server/.env.example`):

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://promptr_user:your_secure_password@localhost:5432/promptr_db
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
GOOGLE_PLAY_PACKAGE_NAME=com.yourname.promptr
YOCO_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
YOCO_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxx
YOCO_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
FRONTEND_URL=http://localhost:5173
```

### 3.3 Run the Server
```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:3001`.

### 3.4 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Health check |
| GET | `/api/user/profile` | Yes | Get/create user profile |
| POST | `/api/user/increment-video` | Yes | Increment video count |
| POST | `/api/user/verify-purchase` | Yes | Verify Google Play purchase |
| POST | `/api/yoco/create-checkout` | Yes | Create Yoco checkout session |
| POST | `/api/yoco/webhook` | No* | Yoco payment webhook |

*Webhook is validated by signature

---

## 4. Yoco Payment Setup

### 4.1 Get API Keys
1. Go to [Yoco Developer Portal](https://developer.yoco.com/)
2. Navigate to **API Keys**
3. Copy your **Secret Key** and **Public Key**
4. For testing, use the **Test** keys (prefix: `sk_test_` / `pk_test_`)

### 4.2 Configure Webhook
1. In Yoco dashboard, go to **Webhooks**
2. Add a new webhook endpoint:
   - URL: `https://your-domain.com/api/yoco/webhook`
   - Events: `payment.succeeded`
3. Copy the **Webhook Secret** and add it to `server/.env`

### 4.3 Test Payments
Yoco provides test card numbers:
- **Success**: `4111 1111 1111 1111` (any future expiry, any CVV)
- **Decline**: `4000 0000 0000 0002`

---

## 5. Google Play Billing Setup

### 5.1 Create In-App Products in Play Console
1. Go to [Google Play Console](https://play.google.com/console/)
2. Select your app → **Monetize** → **Products** → **In-app products**
3. Create three products:

| Product ID | Name | Price | Type |
|------------|------|-------|------|
| `promptr_creator` | Creator Tier | $25.00 (or ZAR equivalent) | One-time |
| `promptr_pro` | Pro Tier | $50.00 | One-time |
| `promptr_studio` | Studio Tier | $100.00 | One-time |

4. Set each product to **Active**

### 5.2 Set Up License Testing
1. Go to **Setup** → **License testing**
2. Add your test Gmail accounts
3. Set license response to **RESPOND_NORMALLY**

### 5.3 Enable Google Play Developer API (for backend verification)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Google Play Android Developer API**
3. Create a service account and link it in Play Console:
   - Play Console → **Setup** → **API access**
   - Link the Google Cloud project
   - Grant the service account **Financial data** access

### 5.4 Build and Deploy Android
```bash
# Build the web app
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

Then build a signed APK/AAB from Android Studio for testing.

---

## 6. Frontend Development

### 6.1 Install Dependencies
```bash
# From project root
npm install firebase
```

### 6.2 Run Development Server
```bash
npm run dev
```

The app will be at `http://localhost:5173`.

### 6.3 Build for Production
```bash
npm run build
```

Output goes to `dist/` which is served by Capacitor on Android.

---

## 7. Deployment

### 7.1 Backend Deployment (e.g., Railway, Render, DigitalOcean)

1. Push the `server/` directory to its own repo or use a monorepo deploy
2. Set all environment variables from `server/.env.example`
3. Run `npm run db:init` once to initialize the database
4. Start with `npm start`

Example with Railway:
```bash
cd server
railway init
railway up
```

### 7.2 Frontend Deployment

The frontend is a static Vite build:
```bash
npm run build
# Deploy dist/ to Netlify, Vercel, Firebase Hosting, etc.
```

Update `VITE_API_URL` in `.env` to point to your deployed backend URL.

### 7.3 Android Deployment

1. Build production web assets: `npm run build`
2. Sync: `npx cap sync android`
3. Open Android Studio: `npx cap open android`
4. Generate signed bundle (AAB)
5. Upload to Google Play Console

---

## 8. Environment Variables Summary

### Frontend (`.env`)
| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |
| `VITE_API_URL` | Backend API base URL |

### Backend (`server/.env`)
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3001) |
| `NODE_ENV` | Environment (development/production) |
| `DATABASE_URL` | PostgreSQL connection string |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to Firebase service account JSON |
| `GOOGLE_PLAY_PACKAGE_NAME` | Android package name |
| `YOCO_SECRET_KEY` | Yoco Secret API Key |
| `YOCO_PUBLIC_KEY` | Yoco Public API Key |
| `YOCO_WEBHOOK_SECRET` | Yoco Webhook verification secret |
| `FRONTEND_URL` | Frontend URL for CORS |

---

## 9. Security Checklist

- [ ] `firebase-service-account.json` is in `.gitignore`
- [ ] `.env` files are in `.gitignore`
- [ ] Yoco webhook signature verification is enabled
- [ ] CORS is restricted to your frontend domain in production
- [ ] PostgreSQL uses a strong password
- [ ] HTTPS is enabled in production
- [ ] Google Play purchase verification is enabled (uncomment in `routes/user.js`)
- [ ] Rate limiting is added to API endpoints (recommended: `express-rate-limit`)

---

## 10. Troubleshooting

### Firebase Auth not working
- Ensure `google-services.json` is in `android/app/`
- Check SHA-1 fingerprint is added in Firebase Console
- Verify the auth domain in `.env` matches your Firebase project

### Yoco webhook not receiving events
- Ensure the webhook URL is publicly accessible (not localhost)
- Use a tool like [ngrok](https://ngrok.com/) for local testing:
  ```bash
  ngrok http 3001
  ```
  Then use the ngrok URL as your webhook endpoint

### Google Play purchases failing
- Ensure test accounts are added in License Testing
- Products must be **Active** in Play Console
- The app must be uploaded to at least Internal Testing track

### Database connection issues
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Test connection: `psql -U promptr_user -d promptr_db -h localhost`
