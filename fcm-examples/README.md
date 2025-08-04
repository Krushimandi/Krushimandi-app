# FCM V1 API Notification Examples

This directory contains complete examples for sending Firebase Cloud Messaging (FCM) V1 API notifications that are compatible with your React Native app's notification structure.

## 📁 Files Overview

- `fcm-v1-requests.json` - Complete FCM V1 API request examples
- `notification-server.js` - Node.js Express server for sending notifications
- `test-notifications.js` - Test script to validate notifications
- `package.json` - Dependencies for the notification server

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd fcm-examples
npm install
```

### 2. Firebase Setup

1. **Download Service Account Key:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json` in this directory

2. **Update Project ID:**
   - Open `notification-server.js`
   - Replace `'your-project-id'` with your actual Firebase project ID

### 3. Get Device Token

From your React Native app, get the FCM device token:
```javascript
import messaging from '@react-native-firebase/messaging';

const getToken = async () => {
  const token = await messaging().getToken();
  console.log('FCM Token:', token);
  return token;
};
```

### 4. Update Test Configuration

Open `test-notifications.js` and replace `YOUR_DEVICE_TOKEN_HERE` with your actual device token.

## 🎯 Usage Examples

### Start the Server
```bash
npm start
# or for development with auto-reload
npm run dev
```

### Test Notifications

**Run all tests:**
```bash
npm test
```

**Run specific notification type:**
```bash
node test-notifications.js promotion
node test-notifications.js request
node test-notifications.js transaction
node test-notifications.js alert
node test-notifications.js update
```

### Manual API Testing

**Promotion Notification:**
```bash
curl -X POST http://localhost:3000/send/promotion \\
  -H "Content-Type: application/json" \\
  -d '{
    "deviceToken": "YOUR_DEVICE_TOKEN",
    "title": "🍊 Special Offer!",
    "body": "Get 25% off on fresh oranges today!",
    "offer": {
      "text": "25% OFF",
      "validity": "Valid till midnight",
      "code": "ORANGE25"
    },
    "actionUrl": "https://app.example.com/offers"
  }'
```

**Request Notification:**
```bash
curl -X POST http://localhost:3000/send/request \\
  -H "Content-Type: application/json" \\
  -d '{
    "deviceToken": "YOUR_DEVICE_TOKEN",
    "requestId": "req_12345",
    "farmerName": "John Doe",
    "productName": "Bananas",
    "status": "accepted"
  }'
```

## 📱 Notification Types Supported

### 1. **Promotion Notifications**
- **Endpoint:** `POST /send/promotion`
- **Screen:** HomeScreen
- **Category:** promotion
- **Features:** Offers, discount codes, promotional images

### 2. **Request Notifications**
- **Endpoint:** `POST /send/request`
- **Screen:** MyOrdersScreen
- **Category:** request
- **Features:** Request status updates, farmer responses

### 3. **Transaction Notifications**
- **Endpoint:** `POST /send/transaction`
- **Screen:** MyOrdersScreen
- **Category:** transaction
- **Features:** Payment confirmations, order updates

### 4. **Alert Notifications**
- **Endpoint:** `POST /send/alert`
- **Screen:** HomeScreen
- **Category:** alert
- **Features:** Weather alerts, urgent notifications

### 5. **Update Notifications**
- **Endpoint:** `POST /send/update`
- **Screen:** ProfileScreen
- **Category:** update
- **Features:** App updates, new features, version info

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/test` | GET | Server health check |
| `/send/promotion` | POST | Send promotion notification |
| `/send/request` | POST | Send request status notification |
| `/send/transaction` | POST | Send payment/transaction notification |
| `/send/alert` | POST | Send alert notification |
| `/send/update` | POST | Send app update notification |
| `/send/multicast` | POST | Send to multiple devices |
| `/send/topic` | POST | Send to topic subscribers |

## 📋 Data Structure

All notifications sent through this server will create the following data structure in your app:

```javascript
{
  id: "unique_notification_id",
  title: "Notification Title",
  body: "Notification body text",
  date: "2025-08-05", // YYYY-MM-DD format
  time: "10:30", // HH:MM format
  read: false,
  type: "promotion|request|transaction|alert|update",
  offer: { /* offer object for promotions */ },
  actionUrl: "https://...", // optional action URL
  category: "notification_category",
  createdAt: "2025-08-05T10:30:00.000Z"
}
```

## 🔄 Firebase Integration

Your React Native app automatically:
1. **Receives FCM notifications** via `pushNotificationService.ts`
2. **Maps Firebase data** via `mapNotification()` function in `NotificationScreen.tsx`
3. **Stores to Firestore** via `notificationService.ts`
4. **Handles navigation** via `handleNotificationNavigation()` in `navigationService.tsx`

## ⚠️ Important Notes

1. **Device Token Management:**
   - FCM tokens can change (app reinstall, device reset, etc.)
   - Implement token refresh mechanism in your app
   - Handle invalid token errors gracefully

2. **Rate Limits:**
   - FCM has rate limits and quota restrictions
   - Batch notifications when possible
   - Implement retry logic for failed sends

3. **Payload Size:**
   - Maximum payload size is 4KB
   - Keep notification data concise
   - Use deep links for complex data

4. **Testing:**
   - Test on both Android and iOS
   - Test different app states (foreground, background, killed)
   - Verify notification persistence and navigation

## 🐛 Troubleshooting

**Common Issues:**

1. **"Request had invalid authentication credentials"**
   - Check service account key path
   - Verify project ID is correct
   - Ensure service account has FCM permissions

2. **"Requested entity was not found"**
   - Invalid device token
   - Token may have expired or been refreshed
   - Test with a fresh token from the app

3. **Notifications not appearing**
   - Check device notification permissions
   - Verify app is not in battery optimization
   - Test with different priority levels

4. **Navigation not working**
   - Check data payload structure
   - Verify screen names match navigation routes
   - Ensure `handleNotificationNavigation` is implemented

## 📞 Support

For issues specific to:
- **FCM setup:** Check Firebase Console documentation
- **React Native integration:** Review pushNotificationService.ts
- **Navigation:** Check navigationService.tsx implementation
- **Data persistence:** Review notificationService.ts

## 🔗 Useful Links

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [FCM V1 API Reference](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages)
- [React Native Firebase Documentation](https://rnfirebase.io/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
