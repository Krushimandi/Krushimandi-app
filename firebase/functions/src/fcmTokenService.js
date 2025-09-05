const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * Normalizes role + path according to requirement:
 *  - buyers/{uid}/fcmTokens (array field named fcmTokens on the doc)
 *  - farmer/{uid}/token/fcmTokens (doc containing an array field named fcmTokens)
 */
function getPaths(role, uid) {
  const r = (role || '').toString().toLowerCase();
  if (r === 'buyer' || r === 'buyers') {
    const docRef = db.collection('buyers').doc(uid);
    return { type: 'buyers', docRef, arrayField: 'fcmTokens' };
  }
  if (r === 'farmer' || r === 'farmers' || r === 'seller') {
    const docRef = db.collection('farmer').doc(uid).collection('token').doc('fcmTokens');
    return { type: 'farmer', docRef, arrayField: 'fcmTokens' };
  }
  throw new HttpsError('invalid-argument', 'role must be buyer or farmer');
}

exports.registerFcmToken = onCall(async (request) => {
  const data = request.data;
  const context = request;
  const { uid, role, token } = data || {};

  // Allow client to omit uid; when authenticated, use context
  const resolvedUid = uid || (context.auth && context.auth.uid);
  if (!resolvedUid) {
  throw new HttpsError('unauthenticated', 'uid missing and no auth context');
  }
  if (!role || !token || typeof token !== 'string' || token.length < 10) {
  throw new HttpsError('invalid-argument', 'role and a valid token are required');
  }

  const { docRef, arrayField } = getPaths(role, resolvedUid);

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
  const { uid, role, token } = data || {};
  const resolvedUid = uid || (context.auth && context.auth.uid);
  if (!resolvedUid) {
  throw new HttpsError('unauthenticated', 'uid missing and no auth context');
  }
  if (!role || !token) {
  throw new HttpsError('invalid-argument', 'role and token are required');
  }
  const { docRef, arrayField } = getPaths(role, resolvedUid);
  await docRef.set({ [arrayField]: admin.firestore.FieldValue.arrayRemove(token) }, { merge: true });
  return { ok: true };
});

exports.getFcmTokens = onCall(async (request) => {
  const data = request.data;
  const context = request;
  const { uid, role } = data || {};
  const resolvedUid = uid || (context.auth && context.auth.uid);
  if (!resolvedUid) {
  throw new HttpsError('unauthenticated', 'uid missing and no auth context');
  }
  if (!role) {
  throw new HttpsError('invalid-argument', 'role is required');
  }
  const { docRef, arrayField } = getPaths(role, resolvedUid);
  const snap = await docRef.get();
  const tokens = (snap.exists && Array.isArray(snap.get(arrayField))) ? snap.get(arrayField) : [];
  return { ok: true, tokens };
});
