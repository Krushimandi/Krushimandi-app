import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// TypeScript types for notification payloads
export type NotificationCategory = 'promotion' | 'update' | 'alert' | 'request';

export interface NotificationPayload {
  type: string; // e.g. "Promotion", "Update", "Alert", "Request"
  title: string;
  description: string;
  actionUrl?: string;
  createdAt: string;
  offer?: any[];
}

// Centralized Notification Service
export const sendNotification = functions.https.onCall(async (data, context) => {
  if (!data || typeof data !== 'object' || !('data' in data) || typeof data.data !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', 'No data provided.');
  }
  const { to, payload } = data.data as { to?: string; payload?: any };
  if (!payload || !payload.type || !payload.title || !payload.description || !payload.createdAt) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required notification fields.');
  }


  // Prepare Firestore record: store both string and server timestamp
  const notificationRecord = {
    ...payload,
    to: to || 'all',
    category: (payload.type || '').toLowerCase(),
    seen: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtString: payload.createdAt,
  };

  // Store in Firestore
  await admin.firestore().collection('notifications').add(notificationRecord);

  // Send FCM
  if (to === 'all') {
    // Universal notification via topic (use send with topic property)
    await admin.messaging().send({
      topic: 'all_users',
      data: { ...payload },
    });
  } else {
    // Action notification to specific user
    if (!to || typeof to !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'No user ID provided for user notification.');
    }
    const userDoc = await admin.firestore().collection('users').doc(to).get();
    const fcmToken = userDoc.get('fcmToken');
    if (!fcmToken) {
      throw new functions.https.HttpsError('not-found', 'No FCM token for user');
    }
    await admin.messaging().send({
      token: fcmToken,
      data: { ...payload },
    });
  }

  return { success: true };
});
