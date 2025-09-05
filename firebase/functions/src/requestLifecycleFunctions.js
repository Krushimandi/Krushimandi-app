/**
 * Request Lifecycle Cloud Function
 * Handle request expiration and lifecycle events
 */

const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
// Centralized notification helper
const { createNotificationAndPush } = require('./notificationService');

/**
 * Cloud Function: Check and expire old requests
 * Runs every day at midnight
 */
exports.expireOldRequests = onSchedule({ schedule: '0 0 * * *', timeZone: 'Asia/Kolkata' }, async () => {
    console.log('🕒 Checking for pending requests older than 1 month...');

    try {
      const now = admin.firestore.Timestamp.now();
      const oneMonthAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );

      const pendingRef = db.collection('requests').where('status', '==', 'pending');

      // Try efficient queries first
      const candidates = new Map(); // id -> {ref, data}
      const tryQuery = async (field) => {
        try {
          const snap = await pendingRef.where(field, '<=', oneMonthAgo).get();
          snap.forEach((doc) => {
            candidates.set(doc.id, { ref: doc.ref, data: doc.data() });
          });
          console.log(`� Queried by ${field}: ${snap.size} docs`);
        } catch (e) {
          console.warn(`⚠️ Query by ${field} failed or requires index:`, e?.message || e);
        }
      };

      // Try querying by updatedAt first as it's more likely to change
      // await tryQuery('createdAt');
      await tryQuery('updatedAt');

      // Fallback: scan pending if no candidates found
      if (candidates.size === 0) {
        console.log('🔄 Fallback scan: fetching pending requests and filtering client-side');
        const snap = await pendingRef.limit(5000).get();
        snap.forEach((doc) => {
          const d = doc.data() || {};
          // Prefer createdAt/updatedAt Timestamp; else try created_at/dateCreated strings
          const ts = d.createdAt || d.updatedAt || null;
          let asDate = null;
          if (ts && ts.toDate) {
            asDate = ts.toDate();
          } else if (typeof ts === 'string') {
            asDate = new Date(ts);
          } else if (d.created_at) {
            asDate = new Date(d.created_at);
          } else if (d.dateCreated) {
            asDate = new Date(d.dateCreated);
          }
          if (asDate && asDate.getTime && asDate.getTime() <= oneMonthAgo.toDate().getTime()) {
            candidates.set(doc.id, { ref: doc.ref, data: d });
          }
        });
        console.log(`🧮 Fallback matched ${candidates.size} pending requests older than 1 month`);
      }

      if (candidates.size === 0) {
        console.log('✅ No pending requests older than 1 month found');
        return { success: true, expiredCount: 0, timestamp: now.toDate().toISOString() };
      }

      // Chunk updates to respect batch limits
      const chunks = Array.from(candidates.values());
      const expiredRequests = [];
      const BATCH_LIMIT = 450;
      for (let i = 0; i < chunks.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        const window = chunks.slice(i, i + BATCH_LIMIT);
        window.forEach(({ ref, data }) => {
          expiredRequests.push({ id: ref.id, ...data });
          batch.update(ref, { status: 'expired', updatedAt: now, expiredAt: now });
        });
        await batch.commit();
      }

      // Send notifications to buyers for expired requests
      await Promise.all(
        expiredRequests.map(async (request) => {
          try {
            const buyerId = request.buyerId || request.userId;
            const productName = request.productSnapshot?.name || request.productName || 'your request';
            const farmerName = request.productSnapshot?.farmerName || request.farmerName || '';
            await createNotificationAndPush({
              to: buyerId,
              type: 'action',
              category: 'request',
              payload: {
                title: 'Request Expired',
                description: farmerName
                  ? `Your request for ${productName} from ${farmerName} has expired. You can resend it.`
                  : `Your request for ${productName} has expired. You can resend it.`,
                actionUrl: `request/${request.id}`,
                requestData: {
                  requestId: request.id,
                  productName,
                  status: 'expired',
                  actionType: 'request_expired',
                },
                type: 'request',
              },
              metadata: {
                requestId: request.id,
                actionType: 'request_expired',
                fromUserId: 'system',
                toUserId: buyerId,
              },
              sendPush: true,
            });
            console.log(`✅ Expired notification queued for request ${request.id}`);
          } catch (error) {
            console.error(`❌ Error sending expiration notification for request ${request.id}:`, error);
          }
        })
      );

      console.log(`✅ Expired ${expiredRequests.length} pending requests (>1 month) and sent notifications`);

      return {
        success: true,
        expiredCount: expiredRequests.length,
        timestamp: now.toDate().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error in expireOldRequests function:', error);
      throw error;
    }
  });

/**
 * Cloud Function: Send notification when request status changes
 * Triggered on request document updates
 */
exports.onRequestStatusChange = onDocumentUpdated('requests/{requestId}', async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  const requestId = event.params.requestId;
    
    // Only proceed if status actually changed
    if (beforeData.status === afterData.status) {
      return null;
    }
    
    console.log(`📋 Request ${requestId} status changed: ${beforeData.status} → ${afterData.status}`);
    
    try {
      const status = afterData.status;
      let to = null;
      let payload = null;
      let metadata = null;

      if (status === 'accepted') {
        to = afterData.buyerId;
        payload = {
          title: 'Request Accepted! 🎉',
          description: `${afterData.productSnapshot.farmerName} accepted your request for ${afterData.productSnapshot.name}. Contact them to proceed.`,
          actionUrl: `request/${requestId}`,
          requestData: {
            requestId,
            productName: afterData.productSnapshot.name,
            status: 'accepted',
            actionType: 'request_accepted',
            farmerPhone: afterData.farmerResponse?.phone || 'Contact via app',
          },
          type: 'request',
        };
        metadata = {
          requestId,
          actionType: 'request_accepted',
          fromUserId: afterData.farmerId,
          toUserId: afterData.buyerId,
        };
      } else if (status === 'rejected') {
        to = afterData.buyerId;
        payload = {
          title: 'Request Declined',
          description: `${afterData.productSnapshot.farmerName} declined your request for ${afterData.productSnapshot.name}${afterData.farmerResponse?.message ? `: ${afterData.farmerResponse.message}` : ''}`,
          actionUrl: `request/${requestId}`,
          requestData: {
            requestId,
            productName: afterData.productSnapshot.name,
            status: 'rejected',
            actionType: 'request_rejected',
            rejectionReason: afterData.farmerResponse?.message,
          },
          type: 'request',
        };
        metadata = {
          requestId,
          actionType: 'request_rejected',
          fromUserId: afterData.farmerId,
          toUserId: afterData.buyerId,
        };
      } else if (status === 'cancelled') {
        to = afterData.farmerId;
        payload = {
          title: 'Request Cancelled',
          description: `${afterData.buyerDetails.name} cancelled their request for ${afterData.productSnapshot.name}`,
          actionUrl: `request/${requestId}`,
          requestData: {
            requestId,
            productName: afterData.productSnapshot.name,
            status: 'cancelled',
            actionType: 'request_cancelled',
          },
          type: 'request',
        };
        metadata = {
          requestId,
          actionType: 'request_cancelled',
          fromUserId: afterData.buyerId,
          toUserId: afterData.farmerId,
        };
      } else {
        return null; // no-op
      }

      await createNotificationAndPush({
        to,
        type: 'action',
        category: 'request',
        payload,
        metadata,
        sendPush: true,
      });

      console.log(`✅ Status change notification sent for request ${requestId}`);
      return { success: true, requestId, newStatus: status };
    } catch (error) {
      console.error(`❌ Error sending status change notification for request ${requestId}:`, error);
      throw error;
    }
  });

/**
 * Cloud Function: Clean up old notifications
 * Runs every week to remove notifications older than 30 days
 */
exports.cleanupOldNotifications = onSchedule({ schedule: '0 2 * * 0', timeZone: 'Asia/Kolkata' }, async () => {
    console.log('🧹 Cleaning up old notifications...');
    
    try {
      const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );
      
      const oldNotificationsQuery = await db.collection('notifications')
        .where('createdAt', '<=', thirtyDaysAgo)
        .get();
      
      console.log(`📋 Found ${oldNotificationsQuery.size} old notifications to delete`);
      
      const batch = db.batch();
      oldNotificationsQuery.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      console.log(`✅ Successfully deleted ${oldNotificationsQuery.size} old notifications`);
      
      return { 
        success: true, 
        deletedCount: oldNotificationsQuery.size,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error in cleanupOldNotifications function:', error);
      throw error;
    }
  });
