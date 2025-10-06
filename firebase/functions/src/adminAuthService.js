/**
 * Admin Auth Service
 * - Manage dashboard roles via custom claims
 * - Sync roles from Firestore users/{uid}
exports.whoAmI = onCall(
  { region: 'asia-south1' },
  async (request) => {
    const context = request;
    return { uid: context?.auth?.uid || null, claims: context?.auth?.token || null };
  }
);from Firestore users/{uid}
 * - Provide helper to inspect caller claims
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// Role → claims mapping (customize as needed)
const ROLE_CLAIMS = {
  admin: { role: 'admin', isAdmin: true, canNotify: true, canManage: true },
  maintainer: { role: 'maintainer', isAdmin: false, canNotify: true, canManage: true },
  krushmitra: { role: 'krushmitra', isAdmin: false, canNotify: false, canManage: false },
  supervisor: { role: 'supervisor', isAdmin: false, canNotify: true, canManage: true },
};

function buildClaims(role, active = true) {
  const key = (role || '').toString().toLowerCase();
  const base = ROLE_CLAIMS[key] || { role: key || 'guest', isAdmin: false };
  return { ...base, active: Boolean(active) };
}

function assertCallerIsAdmin(context) {
  const claims = context?.auth?.token || {};
  if (!context?.auth?.uid || !(claims.isAdmin || claims.role === 'admin')) {
  throw new HttpsError('permission-denied', 'Admin privileges required');
  }
}

// Callable: set a dashboard role for a user (admin-only)
exports.setDashboardUserRole = onCall(
  { region: 'asia-south1' },
  async (request) => {
    const data = request.data;
    const context = request;
    assertCallerIsAdmin(context);

    const { uid, role, active = true, profile = {} } = data || {};
    if (!uid || !role) {
      throw new HttpsError('invalid-argument', 'uid and role are required');
    }

    const claims = buildClaims(role, active);

    await admin.auth().setCustomUserClaims(uid, claims);
    await db
      .collection('users')
      .doc(uid)
      .set(
        { role, active: Boolean(active), updatedAt: admin.firestore.FieldValue.serverTimestamp(), ...profile },
        { merge: true }
      );

    return { ok: true, uid, claims };
  }
);

// Firestore trigger: keep claims in sync with users/{uid}
exports.syncClaimsFromUsers = onDocumentWritten(
  {
    document: 'users/{uid}',
    region: 'asia-south1',
  },
  async (event) => {
    const after = event.data?.after?.data() || null;
    const ctx = { params: event.params };
    if (!after) return null;
    const role = (after.role || '').toString().toLowerCase();
    const active = after.active !== false;
    const claims = buildClaims(role, active);
    try {
      await admin.auth().setCustomUserClaims(ctx.params.uid, claims);
      return true;
    } catch (e) {
      console.error('syncClaimsFromUsers error:', e);
      return null;
    }
  }
);

// Helper: inspect caller’s claims
exports.whoAmI = onCall(async (request) => {
  const context = request;
  return { uid: context?.auth?.uid || null, claims: context?.auth?.token || null };
});
