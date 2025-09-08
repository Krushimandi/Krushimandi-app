const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Unified structure for FCM tokens now: profiles/{uid} -> fcmTokens: []
function getProfileRef(uid) {
  return db.collection('profiles').doc(uid);
}

exports.registerFcmToken = onCall(async (request) => {
  const data = request.data;
  const context = request;
  const { uid, token } = data || {};

  // Allow client to omit uid; when authenticated, use context
  const resolvedUid = uid || (context.auth && context.auth.uid);
  if (!resolvedUid) {
    throw new HttpsError('unauthenticated', 'uid missing and no auth context');
  }
  if (!token || typeof token !== 'string' || token.length < 10) {
    throw new HttpsError('invalid-argument', 'a valid token is required');
  }
  const docRef = getProfileRef(resolvedUid);
  const arrayField = 'fcmTokens';

  // Read current tokens to enforce max 3 and ordering (oldest first)
  const snap = await docRef.get();
  const current = (snap.exists && Array.isArray(snap.get(arrayField))) ? [...snap.get(arrayField)] : [];

  // If already present, no-op
  if (current.includes(token)) {
    return { ok: true, unchanged: true, tokens: current };
  }

  // Append token, trimming to last 3 entries (keep newest at end)
  let updated = [...current, token];
  if (updated.length > 3) {
    // Remove oldest (index 0) until size is 3
    while (updated.length > 3) updated.shift();
  }

  await docRef.set({ [arrayField]: updated }, { merge: true });

  return { ok: true, tokens: updated };
});

exports.removeFcmToken = onCall(async (request) => {
  const data = request.data;
  const context = request;
  const { uid, token } = data || {};
  const resolvedUid = uid || (context.auth && context.auth.uid);
  if (!resolvedUid) {
    throw new HttpsError('unauthenticated', 'uid missing and no auth context');
  }
  if (!token) {
    throw new HttpsError('invalid-argument', 'token is required');
  }
  const docRef = getProfileRef(resolvedUid);
  const arrayField = 'fcmTokens';
  await docRef.set({ [arrayField]: admin.firestore.FieldValue.arrayRemove(token) }, { merge: true });

  return { ok: true };
});

exports.getFcmTokens = onCall(async (request) => {
  const data = request.data;
  const context = request;
  const { uid } = data || {};
  const resolvedUid = uid || (context.auth && context.auth.uid);
  if (!resolvedUid) {
    throw new HttpsError('unauthenticated', 'uid missing and no auth context');
  }
  const docRef = getProfileRef(resolvedUid);
  const arrayField = 'fcmTokens';
  const snap = await docRef.get();
  const tokens = (snap.exists && Array.isArray(snap.get(arrayField))) ? snap.get(arrayField) : [];
  return { ok: true, tokens };
});
