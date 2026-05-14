import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';

import userRoutes from './routes/user.js';
import yocoRoutes from './routes/yoco.js';

dotenv.config();

// --- Firebase Admin Setup ---
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

if (existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✅ Firebase Admin initialized');
} else {
  console.warn('⚠️  Firebase service account not found at', serviceAccountPath);
  console.warn('   Auth middleware will reject all requests until configured.');
  // Initialize with application default credentials as fallback
  try {
    admin.initializeApp();
  } catch (e) {
    console.warn('   Could not initialize Firebase with default credentials either.');
  }
}

// --- Express App ---
const app = express();

// Raw body for webhook signature verification
app.use('/api/yoco/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body.toString('utf8');
  req.body = JSON.parse(req.rawBody);
  next();
});

// Standard middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// --- Routes ---
app.use('/api/user', userRoutes);
app.use('/api/yoco', yocoRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Start Server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 PromptR API server running on port ${PORT}`);
});
