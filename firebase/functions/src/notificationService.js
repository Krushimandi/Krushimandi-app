/**
 * Notification Service
 * Centralized helpers and triggers to create and deliver notifications
 * - Creates Firestore notifications with a consistent shape
 * - Looks up FCM tokens for a user and sends push notifications
 * - Exposes callables for promotional/update/custom notifications
 */

const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Helpers
const getNow = () => admin.firestore.Timestamp.now();

// Fetch FCM tokens from profiles/{uid}
async function fetchUserFcmTokens(uid) {
  try {
    const snap = await db.collection('profiles').doc(uid).get();
    if (snap.exists) {
      const list = snap.data().fcmTokens;
      if (Array.isArray(list)) return list.filter(t => !!t).map(t => String(t));
    }
  } catch (_) {}
  return [];
}

// Fetch user notification preferences
async function fetchUserPreferences(uid) {
  try {
    const snap = await db.collection('profiles').doc(uid).get();
    if (snap.exists) {
      const prefs = snap.data().notificationPreferences;
      if (prefs && typeof prefs === 'object') return prefs;
    }
  } catch (_) {}
  // Return defaults if not found
  return {
    pushNotifications: true,
    emailNotifications: false,
    transactionAlerts: true,
    promotions: true,
    updates: true,
    soundEnabled: true,
  };
}

// Check if user wants to receive this type of notification
function shouldSendNotification(preferences, category) {
  // Always send if pushNotifications is disabled completely
  if (!preferences.pushNotifications) return false;
  
  // Map categories to preference keys
  const categoryMap = {
    'request': 'transactionAlerts',
    'transaction': 'transactionAlerts',
    'promo': 'promotions',
    'promotion': 'promotions',
    'update': 'updates',
    'alert': 'transactionAlerts',
    'message': 'transactionAlerts', // Chat messages use transactionAlerts preference
  };
  
  const prefKey = categoryMap[category];
  if (prefKey && preferences[prefKey] !== undefined) {
    return preferences[prefKey];
  }
  
  // Default to true for unknown categories
  return true;
}

/**
 * Create a notification document with a consistent shape and optionally push FCM.
 */
async function createNotificationAndPush({
  to,
  type = 'action', // 'action' | 'promo' | 'update' | ...
  category = 'general', // e.g., 'request', 'promo', 'update'
  payload, // { title, description, actionUrl?, requestData?, type?, createdAt? }
  metadata = {},
  sendPush = true,
}) {
  const now = getNow();
  const doc = {
    to,
    type,
    category,
    payload: {
      ...payload,
      type: payload?.type || category,
      createdAt: new Date().toISOString(),
    },
    seen: false,
    createdAt: now,
    metadata,
  };

  const ref = await db.collection('notifications').add(doc);

  if (sendPush) {
    try {
      // Check user preferences before sending push
      const preferences = await fetchUserPreferences(to);
      const shouldSend = shouldSendNotification(preferences, category);
      
      if (!shouldSend) {
        console.log(`Skipping push for user ${to}, category ${category} - disabled in preferences`);
        return ref.id;
      }
      
      const tokens = await fetchUserFcmTokens(to);
      if (tokens.length) {
        // Chunk tokens to <= 500 per call
        const chunkSize = 500;
        for (let i = 0; i < tokens.length; i += chunkSize) {
          const chunk = tokens.slice(i, i + chunkSize);
          const message = {
            tokens: chunk,
            notification: {
              title: payload?.title || 'Notification',
              body: payload?.description || '',
            },
            data: {
              category,
              type,
              to,
              actionUrl: payload?.actionUrl || '',
              requestId: metadata?.requestId || '',
              actionType: metadata?.actionType || '',
            },
          };
          await admin.messaging().sendEachForMulticast(message);
        }
      }
    } catch (err) {
      console.warn('FCM push failed (non-fatal):', err?.message || err);
    }
  }

  return ref.id;
}

/**
 * Trigger: When a request is created, notify the farmer.
 */
exports.onRequestCreated = onDocumentCreated('requests/{requestId}', async (event) => {
  const data = event.data?.data() || {};
  const requestId = event.params.requestId;
  try {
    if (data.status !== 'pending') return null;
    const buyerName = data.buyerDetails?.name || 'A buyer';
    const productName = data.productSnapshot?.name || 'your product';
    const farmerId = data.farmerId;
    if (!farmerId) return null;

    await createNotificationAndPush({
      to: farmerId,
      type: 'action',
      category: 'request',
      payload: {
        title: 'New Request Received',
        description: `${buyerName} requested ${productName}.`,
        actionUrl: `request/${requestId}`,
        requestData: {
          requestId,
          productName,
          status: 'pending',
          actionType: 'request_created',
        },
      },
      metadata: {
        requestId,
        actionType: 'request_created',
        fromUserId: data.buyerId,
        toUserId: farmerId,
      },
    });
    return { success: true };
  } catch (e) {
    console.error('onRequestCreated error:', e);
    throw e;
  }
});

/**
 * Callables for promotional, update, and custom notifications.
 * Require authenticated user with admin privileges (custom claim isAdmin=true or role==='admin').
 */
function assertIsAdmin(context) {
  const uid = context?.auth?.uid;
  const claims = context?.auth?.token || {};
  if (!uid || !(claims.isAdmin || claims.role === 'admin')) {
    throw new HttpsError('permission-denied', 'Admin privileges required');
  }
}

exports.sendPromotionalNotification = onCall(async (request) => {
  const data = request.data;
  const context = request;
  assertIsAdmin(context);
  const { toUserIds = [], title, description, actionUrl = '', imageUrl } = data || {};
  if (!title || !description) {
  throw new HttpsError('invalid-argument', 'title and description are required');
  }
  if (!Array.isArray(toUserIds) || toUserIds.length === 0) {
  throw new HttpsError('invalid-argument', 'toUserIds must be a non-empty array');
  }
  const results = [];
  for (const to of toUserIds) {
    const id = await createNotificationAndPush({
      to,
      type: 'promo',
      category: 'promo',
      payload: { title, description, actionUrl, imageUrl, type: 'promo' },
      metadata: { actionType: 'promo_broadcast', fromUserId: context.auth.uid, toUserId: to },
    });
    results.push({ to, id });
  }
  return { success: true, count: results.length, results };
});

exports.sendUpdateNotification = onCall(async (request) => {
  const data = request.data;
  const context = request;
  assertIsAdmin(context);
  const { toUserIds = [], title, description, actionUrl = '' } = data || {};
  if (!title || !description) {
  throw new HttpsError('invalid-argument', 'title and description are required');
  }
  if (!Array.isArray(toUserIds) || toUserIds.length === 0) {
  throw new HttpsError('invalid-argument', 'toUserIds must be a non-empty array');
  }
  const results = [];
  for (const to of toUserIds) {
    const id = await createNotificationAndPush({
      to,
      type: 'update',
      category: 'update',
      payload: { title, description, actionUrl, type: 'update' },
      metadata: { actionType: 'app_update', fromUserId: context.auth.uid, toUserId: to },
    });
    results.push({ to, id });
  }
  return { success: true, count: results.length, results };
});

exports.sendCustomNotification = onCall(async (request) => {
  const context = request;
  const { to, type = 'action', category = 'general', payload = {}, metadata = {} } = request.data || {};
  assertIsAdmin(context);
  if (!to || !payload?.title) {
    throw new HttpsError('invalid-argument', 'to and payload.title are required');
  }
  const id = await createNotificationAndPush({ to, type, category, payload, metadata });
  return { success: true, id };
});

// Also export helper when importing as an object
exports.createNotificationAndPush = createNotificationAndPush;
