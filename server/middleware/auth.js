import admin from 'firebase-admin';

/**
 * Firebase Auth middleware.
 * Expects: Authorization: Bearer <firebase-id-token>
 * Sets req.user = { uid, email, name }
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || '',
      name: decoded.name || decoded.email || '',
    };
    next();
  } catch (err) {
    console.error('Auth token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
