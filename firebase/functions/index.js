/**
 * Firebase Cloud Functions
 * Main entry point for all cloud functions
 */

const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2/options');
setGlobalOptions({ region: 'asia-south1' });

// Import request lifecycle functions
const {
  expireOldRequests,
  onRequestStatusChange,
  cleanupOldNotifications
} = require('./src/requestLifecycleFunctions');

// FCM token registration/removal
const {
  registerFcmToken,
  removeFcmToken,
  getFcmTokens,
} = require('./src/fcmTokenService');

// Import notification service functions
const notificationFunctions = require('./src/notificationService');
const adminAuth = require('./src/adminAuthService');

// Export all functions
exports.expireOldRequests = expireOldRequests;
exports.onRequestStatusChange = onRequestStatusChange;
exports.cleanupOldNotifications = cleanupOldNotifications;

// Export FCM token helpers
exports.registerFcmToken = registerFcmToken;
exports.removeFcmToken = removeFcmToken;
exports.getFcmTokens = getFcmTokens;

// Export notification functions
Object.assign(exports, notificationFunctions);
Object.assign(exports, adminAuth);

// Health check function
exports.healthCheck = onRequest((req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    functions: [
      'expireOldRequests',
      'onRequestStatusChange',
      'cleanupOldNotifications',
      'registerFcmToken',
      'removeFcmToken',
  'getFcmTokens',
  'onRequestCreated',
  'sendPromotionalNotification',
  'sendUpdateNotification',
  'sendCustomNotification',
  'setDashboardUserRole',
  'syncClaimsFromUsers',
  'whoAmI',
      'healthCheck'
    ]
  });
});
