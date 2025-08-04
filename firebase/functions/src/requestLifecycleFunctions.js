/**
 * Request Lifecycle Cloud Function
 * Handle request expiration and lifecycle events
 */

const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function: Check and expire old requests
 * Runs every day at midnight
 */
exports.expireOldRequests = functions.pubsub
  .schedule('0 0 * * *') // Every day at midnight
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    console.log('🕒 Checking for expired requests...');
    
    try {
      const now = admin.firestore.Timestamp.now();
      const batch = db.batch();
      
      // Find requests that have expired
      const expiredRequestsQuery = await db.collection('requests')
        .where('status', '==', 'pending')
        .where('expiresAt', '<=', now)
        .get();
      
      console.log(`📋 Found ${expiredRequestsQuery.size} expired requests`);
      
      const expiredRequests = [];
      
      expiredRequestsQuery.forEach((doc) => {
        const requestData = doc.data();
        expiredRequests.push({
          id: doc.id,
          ...requestData
        });
        
        // Update request status to expired
        batch.update(doc.ref, {
          status: 'expired',
          updatedAt: now
        });
      });
      
      // Commit the batch update
      await batch.commit();
      
      // Send notifications for expired requests
      const notificationPromises = expiredRequests.map(async (request) => {
        try {
          // Create notification for buyer
          await db.collection('notifications').add({
            to: request.buyerId,
            type: 'action',
            category: 'request',
            payload: {
              title: 'Request Expired',
              description: `Your request for ${request.productSnapshot.name} from ${request.productSnapshot.farmerName} has expired. You can resend it.`,
              actionUrl: `request/${request.id}`,
              requestData: {
                requestId: request.id,
                productName: request.productSnapshot.name,
                status: 'expired',
                actionType: 'request_expired'
              },
              type: 'request',
              createdAt: new Date().toISOString(),
            },
            seen: false,
            createdAt: now,
            metadata: {
              requestId: request.id,
              actionType: 'request_expired',
              fromUserId: 'system',
              toUserId: request.buyerId
            }
          });
          
          console.log(`✅ Expired notification sent for request ${request.id}`);
        } catch (error) {
          console.error(`❌ Error sending expiration notification for request ${request.id}:`, error);
        }
      });
      
      await Promise.all(notificationPromises);
      
      console.log(`✅ Successfully expired ${expiredRequests.length} requests and sent notifications`);
      
      return { 
        success: true, 
        expiredCount: expiredRequests.length,
        timestamp: now.toDate().toISOString()
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
exports.onRequestStatusChange = functions.firestore
  .document('requests/{requestId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const requestId = context.params.requestId;
    
    // Only proceed if status actually changed
    if (beforeData.status === afterData.status) {
      return null;
    }
    
    console.log(`📋 Request ${requestId} status changed: ${beforeData.status} → ${afterData.status}`);
    
    try {
      const now = admin.firestore.Timestamp.now();
      let notificationData = null;
      
      switch (afterData.status) {
        case 'accepted':
          // Notify buyer that their request was accepted
          notificationData = {
            to: afterData.buyerId,
            type: 'action',
            category: 'request',
            payload: {
              title: 'Request Accepted! 🎉',
              description: `${afterData.productSnapshot.farmerName} accepted your request for ${afterData.productSnapshot.name}. Contact them to proceed.`,
              actionUrl: `request/${requestId}`,
              requestData: {
                requestId,
                productName: afterData.productSnapshot.name,
                status: 'accepted',
                actionType: 'request_accepted',
                farmerPhone: afterData.farmerResponse?.phone || 'Contact via app'
              },
              type: 'request',
              createdAt: new Date().toISOString(),
            },
            seen: false,
            createdAt: now,
            metadata: {
              requestId,
              actionType: 'request_accepted',
              fromUserId: afterData.farmerId,
              toUserId: afterData.buyerId
            }
          };
          break;
          
        case 'rejected':
          // Notify buyer that their request was rejected
          notificationData = {
            to: afterData.buyerId,
            type: 'action',
            category: 'request',
            payload: {
              title: 'Request Declined',
              description: `${afterData.productSnapshot.farmerName} declined your request for ${afterData.productSnapshot.name}${afterData.farmerResponse?.message ? `: ${afterData.farmerResponse.message}` : ''}`,
              actionUrl: `request/${requestId}`,
              requestData: {
                requestId,
                productName: afterData.productSnapshot.name,
                status: 'rejected',
                actionType: 'request_rejected',
                rejectionReason: afterData.farmerResponse?.message
              },
              type: 'request',
              createdAt: new Date().toISOString(),
            },
            seen: false,
            createdAt: now,
            metadata: {
              requestId,
              actionType: 'request_rejected',
              fromUserId: afterData.farmerId,
              toUserId: afterData.buyerId
            }
          };
          break;
          
        case 'cancelled':
          // Notify farmer that the request was cancelled
          notificationData = {
            to: afterData.farmerId,
            type: 'action',
            category: 'request',
            payload: {
              title: 'Request Cancelled',
              description: `${afterData.buyerDetails.name} cancelled their request for ${afterData.productSnapshot.name}`,
              actionUrl: `request/${requestId}`,
              requestData: {
                requestId,
                productName: afterData.productSnapshot.name,
                status: 'cancelled',
                actionType: 'request_cancelled'
              },
              type: 'request',
              createdAt: new Date().toISOString(),
            },
            seen: false,
            createdAt: now,
            metadata: {
              requestId,
              actionType: 'request_cancelled',
              fromUserId: afterData.buyerId,
              toUserId: afterData.farmerId
            }
          };
          break;
          
        default:
          // No notification needed for other status changes
          return null;
      }
      
      if (notificationData) {
        await db.collection('notifications').add(notificationData);
        console.log(`✅ Status change notification sent for request ${requestId}`);
      }
      
      return { success: true, requestId, newStatus: afterData.status };
      
    } catch (error) {
      console.error(`❌ Error sending status change notification for request ${requestId}:`, error);
      throw error;
    }
  });

/**
 * Cloud Function: Clean up old notifications
 * Runs every week to remove notifications older than 30 days
 */
exports.cleanupOldNotifications = functions.pubsub
  .schedule('0 2 * * 0') // Every Sunday at 2 AM
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
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
