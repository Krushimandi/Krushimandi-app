import * as admin from 'firebase-admin';
import { 
  UniversalNotificationPayload, 
  ActionNotificationPayload, 
  StoredNotification 
} from '../types/notification';


export class NotificationService {
  private db: admin.firestore.Firestore;
  private messaging: admin.messaging.Messaging;

  constructor() {
    this.db = admin.firestore();
    this.messaging = admin.messaging();
  }

  // Send to all users (topic)
  async sendToAllUsers(payload: UniversalNotificationPayload) {
    const topic = 'all_users';
    const message = {
      notification: {
        title: payload.title,
        body: payload.description,
      },
      data: {
        type: 'universal',
        category: payload.type.toLowerCase(),
        offer: payload.offer ? JSON.stringify(payload.offer) : '',
        title: payload.title,
        description: payload.description,
        actionUrl: payload.actionUrl || '',
        createdAt: admin.firestore.Timestamp.now().toMillis().toString(),
      },
      topic,
    };
    await this.messaging.send(message);
    await this.saveNotification({
      id: '', // Firestore will auto-generate, or you can set if needed
      to: 'all',
      type: 'universal',
      category: payload.type.toLowerCase() as StoredNotification['category'],
      seen: false,
      createdAt: admin.firestore.Timestamp.now() as any,
      payload,
    });
  }

  // Send to a specific user by userId (looks up FCM token from Firestore)
  async sendToUser(userId: string, payload: ActionNotificationPayload) {
    // Assume FCM token is stored at /users/{userId}/fcmToken
    const userDoc = await this.db.collection('users').doc(userId).get();
    const fcmToken = userDoc.get('fcmToken');
    if (!fcmToken) {
      console.warn(`No FCM token for user ${userId}`);
      return;
    }
    const message = {
      notification: {
        title: payload.title,
        body: payload.description,
      },
      data: {
        type: 'action',
        category: 'request',
        offer: payload.offer ? JSON.stringify(payload.offer) : '',
        title: payload.title,
        description: payload.description,
        actionUrl: payload.actionUrl || '',
        createdAt: admin.firestore.Timestamp.now().toMillis().toString(),
      },
      token: fcmToken,
    };
    await this.messaging.send(message);
    await this.saveNotification({
      id: '',
      to: userId,
      type: 'action',
      category: 'request',
      seen: false,
      createdAt: admin.firestore.Timestamp.now() as any,
      payload,
    });
  }

  // Save notification to Firestore
  private async saveNotification(notification: StoredNotification) {
    await this.db.collection('notifications').add(notification);
  }
}

// Usage Example (in a Cloud Function):
// const service = new NotificationService();
// await service.sendToAllUsers({...});
// await service.sendToUser('userId', {...});
