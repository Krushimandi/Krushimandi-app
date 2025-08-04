/**
 * Firestore Notification Service
 * Handles notification CRUD operations with Firestore
 */

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  Timestamp,
  addDoc
} from '@react-native-firebase/firestore';
import { firestore } from '../config/firebase';

export interface FirestoreNotification {
  id: string;
  to: string; // userId or "all"
  type: 'universal' | 'action';
  category: 'promotion' | 'update' | 'alert' | 'request' | 'transaction';
  payload: {
    title: string;
    description: string;
    actionUrl?: string;
    offer?: any;
    type: string;
    createdAt: string;
  };
  seen: boolean;
  createdAt: Timestamp | any;
}

class FirestoreNotificationService {
  private unsubscribe: (() => void) | null = null;

  /**
   * Load notifications for current user
   */
  async loadUserNotifications(userId: string): Promise<FirestoreNotification[]> {
    try {
      console.log('📬 Loading notifications for user:', userId);

      const notificationsRef = collection(firestore, 'notifications');
      
      // Query for user-specific and universal notifications
      const userQuery = query(
        notificationsRef,
        where('to', 'in', [userId, 'all']),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(userQuery);
      const notifications: FirestoreNotification[] = [];

      snapshot.forEach((doc: any) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          ...data
        } as FirestoreNotification);
      });

      console.log('✅ Loaded', notifications.length, 'notifications from Firestore');
      return notifications;

    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      return [];
    }
  }

  /**
   * Real-time listener for notifications
   */
  subscribeToNotifications(
    userId: string, 
    callback: (notifications: FirestoreNotification[]) => void
  ): () => void {
    try {
      console.log('🔔 Setting up real-time notification listener for:', userId);

      const notificationsRef = collection(firestore, 'notifications');
      const userQuery = query(
        notificationsRef,
        where('to', 'in', [userId, 'all']),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      this.unsubscribe = onSnapshot(userQuery, (snapshot) => {
        const notifications: FirestoreNotification[] = [];
        
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          notifications.push({
            id: doc.id,
            ...data
          } as FirestoreNotification);
        });

        console.log('🔄 Real-time update:', notifications.length, 'notifications');
        callback(notifications);
      }, (error) => {
        console.error('❌ Notification listener error:', error);
      });

      return this.unsubscribe;

    } catch (error) {
      console.error('❌ Error setting up notification listener:', error);
      return () => {};
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(firestore, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        seen: true
      });
      console.log('✅ Notification marked as read:', notificationId);
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(firestore, 'notifications', notificationId);
      await deleteDoc(notificationRef);
      console.log('✅ Notification deleted:', notificationId);
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const notifications = await this.loadUserNotifications(userId);
      const unreadNotifications = notifications.filter(n => !n.seen);

      const promises = unreadNotifications.map(notification => 
        this.markAsRead(notification.id)
      );

      await Promise.all(promises);
      console.log('✅ All notifications marked as read');
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
    }
  }

  /**
   * Save FCM notification to Firestore (when received via FCM)
   */
  async saveFCMNotificationToFirestore(
    notificationData: any,
    userId: string
  ): Promise<void> {
    try {
      // Check if notification already exists to avoid duplicates
      const existingQuery = query(
        collection(firestore, 'notifications'),
        where('payload.title', '==', notificationData.title),
        where('payload.description', '==', notificationData.body),
        where('to', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        console.log('📬 Notification already exists, skipping save');
        return;
      }

      // Save new notification
      const notificationDoc = {
        to: userId,
        type: 'action' as const,
        category: (notificationData.type || 'update') as 'promotion' | 'update' | 'alert' | 'request' | 'transaction',
        payload: {
          title: notificationData.title,
          description: notificationData.body,
          actionUrl: notificationData.data?.actionUrl || '',
          offer: notificationData.data?.offer || null,
          type: notificationData.type || 'update',
          createdAt: new Date().toISOString(),
        },
        seen: false,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(firestore, 'notifications'), notificationDoc);
      console.log('✅ FCM notification saved to Firestore');

    } catch (error) {
      console.error('❌ Error saving FCM notification to Firestore:', error);
    }
  }

  /**
   * Cleanup listener
   */
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

// Export singleton instance
export const firestoreNotificationService = new FirestoreNotificationService();
export default firestoreNotificationService;
