/**
 * Test utilities for notification Firebase integration
 */

// Sample Firebase notification data structure as shown in the uploaded image
export const sampleFirebaseNotificationData = {
  id: "rmQFh9oc41vU5hYcRtVZ",
  category: "update",
  createdAt: "5 August 2025 at 01:54:42 UTC+5:30",
  payload: {
    actionUrl: "",
    createdAt: "2025-08-04T20:24:42.563Z",
    description: "Get 10% off on oranges today!",
    offer: null,
    title: "🍊 New Offer",
    type: "update"
  },
  seen: true,
  to: "CZ8w70tUPkORMnUciE19xbyq5Du1",
  type: "action"
};

// Test function to verify notification mapping
export const testNotificationMapping = () => {
  
  // Simulate the mapNotification function logic
  const mockDoc = {
    id: sampleFirebaseNotificationData.id,
    data: () => sampleFirebaseNotificationData
  };
  
  // This would be called by the mapNotification function
  const mappedNotification = {
    id: mockDoc.id,
    title: sampleFirebaseNotificationData.payload.title,
    body: sampleFirebaseNotificationData.payload.description,
    message: sampleFirebaseNotificationData.payload.description, // Backward compatibility
    date: formatTestDate(sampleFirebaseNotificationData.payload.createdAt),
    time: formatTestTime(sampleFirebaseNotificationData.payload.createdAt),
    read: sampleFirebaseNotificationData.seen !== false,
    type: sampleFirebaseNotificationData.category.toLowerCase(),
    offer: sampleFirebaseNotificationData.payload.offer,
    actionUrl: sampleFirebaseNotificationData.payload.actionUrl,
    category: sampleFirebaseNotificationData.category,
    createdAt: sampleFirebaseNotificationData.payload.createdAt,
  };
  
  
  
  return mappedNotification;
};

// Helper functions for testing
const formatTestDate = (date: string): string => {
  try {
    if (date.includes('T')) {
      return date.split('T')[0];
    }
    return new Date(date).toISOString().split('T')[0];
  } catch (error) {
    console.warn('Error formatting test date:', error);
    return new Date().toISOString().split('T')[0];
  }
};

const formatTestTime = (date: string): string => {
  try {
    if (date.includes('T')) {
      return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    console.warn('Error formatting test time:', error);
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};

// Log Firebase data structure for debugging
export const logFirebaseStructure = () => {
  // logs removed per request
};
