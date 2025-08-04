/**
 * FCM V1 API Notification Server
 * Server-side implementation for sending Firebase Cloud Messaging notifications
 * Compatible with your React Native app's notification structure
 */

const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin SDK
// Download serviceAccountKey.json from Firebase Console > Project Settings > Service Accounts
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'your-project-id' // Replace with your actual project ID
});

const app = express();
app.use(cors());
app.use(express.json());

// Helper function to get notification color based on category
function getNotificationColor(category) {
  const colors = {
    'promotion': '#FF9800',
    'transaction': '#4CAF50', 
    'alert': '#F44336',
    'update': '#2196F3',
    'request': '#9C27B0'
  };
  return colors[category] || '#2196F3';
}

// Main function to send notification
async function sendNotification(deviceToken, notificationData) {
  const message = {
    token: deviceToken,
    notification: {
      title: notificationData.title,
      body: notificationData.body,
      image: notificationData.imageUrl || undefined
    },
    data: {
      type: 'navigate',
      screen: notificationData.screen || 'HomeScreen',
      category: notificationData.category || 'update',
      description: notificationData.description || notificationData.body,
      actionUrl: notificationData.actionUrl || '',
      offer: notificationData.offer ? JSON.stringify(notificationData.offer) : 'null',
      createdAt: new Date().toISOString(),
      notificationId: notificationData.id || `notif_${Date.now()}`,
      // Add any additional data fields
      ...notificationData.extraData
    },
    android: {
      priority: 'high',
      notification: {
        icon: 'ic_notification',
        color: getNotificationColor(notificationData.category),
        sound: 'default',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        channelId: notificationData.category || 'default'
      }
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: notificationData.title,
            body: notificationData.body
          },
          sound: 'default',
          badge: 1,
          'mutable-content': 1
        }
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Successfully sent message:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
}

// API Routes

// 1. Send promotion notification
app.post('/send/promotion', async (req, res) => {
  try {
    const { deviceToken, title, body, offer, actionUrl } = req.body;
    
    const result = await sendNotification(deviceToken, {
      title: title || '🎉 Special Offer!',
      body: body || 'Check out our latest deals',
      category: 'promotion',
      screen: 'HomeScreen',
      description: body,
      actionUrl: actionUrl,
      offer: offer,
      id: `promo_${Date.now()}`
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Send request notification
app.post('/send/request', async (req, res) => {
  try {
    const { deviceToken, requestId, farmerName, productName, status } = req.body;
    
    const statusMessages = {
      'accepted': `Your request for ${productName} has been accepted by farmer ${farmerName}`,
      'rejected': `Your request for ${productName} was rejected by farmer ${farmerName}`,
      'completed': `Your request for ${productName} has been completed`,
      'pending': `Your request for ${productName} is being reviewed`
    };
    
    const result = await sendNotification(deviceToken, {
      title: `Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      body: statusMessages[status] || `Request status updated: ${status}`,
      category: 'request',
      screen: 'MyOrdersScreen',
      description: 'Navigate to orders',
      extraData: {
        requestId: requestId,
        farmerName: farmerName,
        productName: productName,
        status: status
      },
      id: `req_${requestId}_${Date.now()}`
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Send transaction notification
app.post('/send/transaction', async (req, res) => {
  try {
    const { deviceToken, amount, currency, orderId, transactionId, status } = req.body;
    
    const result = await sendNotification(deviceToken, {
      title: status === 'completed' ? 'Payment Received' : 'Transaction Update',
      body: `₹${amount} ${status === 'completed' ? 'received' : 'pending'} for order #${orderId}`,
      category: 'transaction',
      screen: 'MyOrdersScreen',
      description: 'Payment confirmation',
      extraData: {
        orderId: orderId,
        amount: amount,
        currency: currency || 'INR',
        transactionId: transactionId,
        status: status
      },
      id: `txn_${transactionId}_${Date.now()}`
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Send alert notification
app.post('/send/alert', async (req, res) => {
  try {
    const { deviceToken, alertType, message, severity, location } = req.body;
    
    const result = await sendNotification(deviceToken, {
      title: `${alertType.charAt(0).toUpperCase() + alertType.slice(1)} Alert`,
      body: message,
      category: 'alert',
      screen: 'HomeScreen',
      description: message,
      extraData: {
        alertType: alertType,
        severity: severity || 'medium',
        location: location
      },
      id: `alert_${alertType}_${Date.now()}`
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Send update notification
app.post('/send/update', async (req, res) => {
  try {
    const { deviceToken, version, features, updateType, downloadUrl } = req.body;
    
    const result = await sendNotification(deviceToken, {
      title: 'App Update Available',
      body: `Version ${version} is now available with new features`,
      category: 'update',
      screen: 'ProfileScreen',
      description: 'App update notification',
      actionUrl: downloadUrl,
      extraData: {
        version: version,
        updateType: updateType || 'optional',
        features: JSON.stringify(features || []),
        downloadUrl: downloadUrl
      },
      id: `update_${version}_${Date.now()}`
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Send to multiple devices
app.post('/send/multicast', async (req, res) => {
  try {
    const { deviceTokens, title, body, category, screen, extraData } = req.body;
    
    const message = {
      registration_ids: deviceTokens,
      notification: {
        title: title,
        body: body
      },
      data: {
        type: 'navigate',
        screen: screen || 'HomeScreen',
        category: category || 'update',
        description: body,
        createdAt: new Date().toISOString(),
        notificationId: `multi_${Date.now()}`,
        ...extraData
      }
    };
    
    const response = await admin.messaging().sendMulticast(message);
    
    res.json({ 
      success: true, 
      data: {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Send to topic
app.post('/send/topic', async (req, res) => {
  try {
    const { topic, title, body, category, screen, extraData } = req.body;
    
    const message = {
      topic: topic,
      notification: {
        title: title,
        body: body
      },
      data: {
        type: 'navigate',
        screen: screen || 'NotificationScreen',
        category: category || 'update',
        description: body,
        createdAt: new Date().toISOString(),
        notificationId: `topic_${topic}_${Date.now()}`,
        ...extraData
      }
    };
    
    const response = await admin.messaging().send(message);
    
    res.json({ success: true, data: { messageId: response } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'FCM Notification Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: error.message 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 FCM Notification Server running on port ${PORT}`);
  console.log(`📱 Ready to send notifications!`);
});

module.exports = app;
