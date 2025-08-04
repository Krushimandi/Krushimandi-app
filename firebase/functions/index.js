/**
 * Firebase Cloud Functions
 * Main entry point for all cloud functions
 */

const functions = require('firebase-functions');

// Import request lifecycle functions
const {
  expireOldRequests,
  onRequestStatusChange,
  cleanupOldNotifications
} = require('./src/requestLifecycleFunctions');

// Import notification service functions if they exist
// const notificationFunctions = require('./src/notificationService');

// Export all functions
exports.expireOldRequests = expireOldRequests;
exports.onRequestStatusChange = onRequestStatusChange;
exports.cleanupOldNotifications = cleanupOldNotifications;

// Export notification functions if available
// if (notificationFunctions) {
//   Object.assign(exports, notificationFunctions);
// }

// Health check function
exports.healthCheck = functions.https.onRequest((req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    functions: [
      'expireOldRequests',
      'onRequestStatusChange', 
      'cleanupOldNotifications',
      'healthCheck'
    ]
  });
});
