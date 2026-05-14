/**
 * Firebase configuration - DEPRECATED
 *
 * The app now uses Google Identity Services (GIS) directly for authentication
 * and a custom NestJS backend with JWT tokens instead of Firebase Auth.
 *
 * This file is kept for reference. Firebase is no longer required.
 */

// If you still need Firebase for other features (e.g., analytics, crashlytics),
// uncomment and configure below:
//
// import { initializeApp } from 'firebase/app';
// import { getAuth, GoogleAuthProvider } from 'firebase/auth';
//
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
// };
//
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// const googleProvider = new GoogleAuthProvider();
//
// export { auth, googleProvider };
// export default app;
