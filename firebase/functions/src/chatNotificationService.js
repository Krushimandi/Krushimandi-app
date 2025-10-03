/**
 * Chat Notification Service
 * Smart notification system for chat messages with batching and online status checking
 * - Only sends notifications when recipient is offline
 * - Batches multiple messages: sends only ONE notification for the last message
 * - Clears pending notification metadata after sending
 * 
 * Note: Uses Firestore triggers instead of RTDB triggers for better regional support
 */

const admin = require('firebase-admin');
const { onDocumentWritten, onDocumentCreated } = require('firebase-functions/v2/firestore');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const rtdb = admin.database();

// Import the notification helper
const { createNotificationAndPush } = require('./notificationService');

// Debounce/batch strategy: Wait 3 seconds after last message before sending notification
const NOTIFICATION_DELAY_MS = 3000;

// In-memory map to track pending notification timers per chat
const pendingNotificationTimers = new Map();

/**
 * Check if user is currently online
 */
async function isUserOnline(uid) {
  try {
    const statusSnap = await rtdb.ref(`status/${uid}`).once('value');
    const status = statusSnap.val();
    return status && status.state === 'online';
  } catch (e) {
    console.error('Error checking online status:', e);
    return false; // Fail-safe: assume offline if error
  }
}

/**
 * Get sender's profile information
 */
async function getSenderProfile(uid) {
  try {
    const snap = await db.collection('profiles').doc(uid).get();
    if (!snap.exists) return null;
    const data = snap.data();
    return {
      name: data.displayName || data.name || 'Someone',
      avatar: data.profileImage || null,
    };
  } catch (e) {
    console.error('Error fetching sender profile:', e);
    return { name: 'Someone', avatar: null };
  }
}

/**
 * Send chat notification to recipient
 */
async function sendChatNotification(chatId, recipientUid, senderUid, messageText) {
  try {
    console.log(`Preparing to send chat notification: chatId=${chatId}, to=${recipientUid}, from=${senderUid}`);
    
    // Check if recipient is online - if yes, skip notification
    const recipientOnline = await isUserOnline(recipientUid);
    if (recipientOnline) {
      console.log(`Recipient ${recipientUid} is online, skipping notification`);
      return { skipped: true, reason: 'recipient_online' };
    }

    // Get sender info
    const senderProfile = await getSenderProfile(senderUid);
    const senderName = senderProfile?.name || 'Someone';

    // Truncate message if too long
    const truncatedMessage = messageText.length > 100 
      ? messageText.substring(0, 97) + '...' 
      : messageText;

    // Send notification via FCM
    await createNotificationAndPush({
      to: recipientUid,
      type: 'action',
      category: 'message',
      payload: {
        title: `💬 ${senderName}`,
        description: truncatedMessage,
        actionUrl: `chat/${chatId}`,
        chatId,
        senderId: senderUid,
      },
      metadata: {
        chatId,
        senderId: senderUid,
        recipientId: recipientUid,
        actionType: 'new_message',
      },
      sendPush: true,
    });

    console.log(`Chat notification sent successfully to ${recipientUid}`);

    return { success: true };
  } catch (e) {
    console.error('Error sending chat notification:', e);
    throw e;
  }
}

/**
 * Trigger: Monitor chat messages for new activity
 * Strategy: Create a "chatNotifications" collection to track pending notifications
 * This gives us a Firestore trigger that works in any region
 */
exports.onChatNotificationCreated = onDocumentCreated(
  {
    document: 'chatNotifications/{notificationId}',
    region: 'asia-south1',
  },
  async (event) => {
    const notificationData = event.data?.data();
    if (!notificationData) return null;

    const { chatId, recipientUid, senderUid, messageText, timestamp } = notificationData;

    if (!chatId || !recipientUid || !senderUid) {
      console.error('Invalid notification data:', notificationData);
      return null;
    }

    console.log(`Chat notification created: chatId=${chatId}, recipient=${recipientUid}`);

    // Cancel any existing timer for this chat
    const timerKey = `${chatId}_${recipientUid}`;
    if (pendingNotificationTimers.has(timerKey)) {
      clearTimeout(pendingNotificationTimers.get(timerKey));
      pendingNotificationTimers.delete(timerKey);
      console.log(`Cancelled previous notification timer for ${timerKey}`);
    }

    // Set new timer: wait 3 seconds before sending notification
    const timer = setTimeout(async () => {
      pendingNotificationTimers.delete(timerKey);
      
      try {
        console.log(`Timer expired for ${timerKey}, sending notification now`);
        await sendChatNotification(chatId, recipientUid, senderUid, messageText);
        
        // Delete the notification document after processing
        await event.data.ref.delete();
      } catch (e) {
        console.error(`Failed to send notification for ${timerKey}:`, e);
      }
    }, NOTIFICATION_DELAY_MS);

    pendingNotificationTimers.set(timerKey, timer);
    console.log(`Set notification timer for ${timerKey}, will fire in ${NOTIFICATION_DELAY_MS}ms`);

    return null;
  }
);

/**
 * Trigger: When user profile updates (comes online), clear pending notifications
 */
exports.onUserOnlineStatusChange = onDocumentWritten(
  {
    document: 'profiles/{userId}',
    region: 'asia-south1',
  },
  async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    if (!afterData) return null;

    const userId = event.params.userId;
    const wasOnline = beforeData?.isOnline || false;
    const isNowOnline = afterData?.isOnline || false;

    // Check if user just came online
    if (!wasOnline && isNowOnline) {
      console.log(`User ${userId} came online, clearing pending notifications`);
      
      try {
        // Find all pending chat notifications for this user
        const notificationsSnapshot = await db.collection('chatNotifications')
          .where('recipientUid', '==', userId)
          .get();
        
        if (!notificationsSnapshot.empty) {
          const batch = db.batch();
          notificationsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
            
            // Also cancel any pending timers
            const data = doc.data();
            const timerKey = `${data.chatId}_${userId}`;
            if (pendingNotificationTimers.has(timerKey)) {
              clearTimeout(pendingNotificationTimers.get(timerKey));
              pendingNotificationTimers.delete(timerKey);
              console.log(`Cancelled notification timer for ${timerKey} (user came online)`);
            }
          });
          
          await batch.commit();
          console.log(`Cleared ${notificationsSnapshot.size} pending notifications for user ${userId}`);
        }
      } catch (e) {
        console.error('Error clearing pending notifications:', e);
      }
    }

    return null;
  }
);

// Export helper functions for testing
exports.isUserOnline = isUserOnline;
exports.sendChatNotification = sendChatNotification;
