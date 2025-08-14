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
   * Load notifications for current user ONLY (no shared/universal notifications)
   */
  async loadUserNotifications(userId: string): Promise<FirestoreNotification[]> {
    try {
      console.log('📬 Loading user-specific notifications for user:', userId);

      const notificationsRef = collection(firestore, 'notifications');
      
      // Query ONLY for user-specific notifications (removed 'all' to fix shared notifications)
      const userQuery = query(
        notificationsRef,
        where('to', '==', userId), // Only get notifications specifically for this user
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(userQuery);
      const notifications: FirestoreNotification[] = [];

      snapshot.forEach((doc: any) => {
        const data = doc.data();
        // Double-check: exclude any notifications with to="all" just in case
        if (data.to === userId && data.to !== 'all') {
          notifications.push({
            id: doc.id,
            ...data
          } as FirestoreNotification);
        }
      });

      console.log('✅ Loaded', notifications.length, 'user-specific notifications from Firestore');
      console.log('🔒 All notifications verified to belong to user:', userId);
      
      return notifications;

    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      return [];
    }
  }

  /**
   * Real-time listener for user-specific notifications ONLY
   */
  subscribeToNotifications(
    userId: string, 
    callback: (notifications: FirestoreNotification[]) => void
  ): () => void {
    try {
      console.log('🔔 Setting up real-time notification listener for user-specific notifications:', userId);

      const notificationsRef = collection(firestore, 'notifications');
      // Query ONLY for user-specific notifications (removed 'all' to fix shared notifications)
      const userQuery = query(
        notificationsRef,
        where('to', '==', userId), // Only get notifications specifically for this user
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      this.unsubscribe = onSnapshot(userQuery, (snapshot) => {
        const notifications: FirestoreNotification[] = [];
        
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          // Double-check: exclude any notifications with to="all" just in case
          if (data.to === userId && data.to !== 'all') {
            notifications.push({
              id: doc.id,
              ...data
            } as FirestoreNotification);
          }
        });

        console.log('🔄 Real-time update:', notifications.length, 'user-specific notifications');
        console.log('🔒 All notifications verified to belong to user:', userId);
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
   * Mark all notifications as read for current user ONLY
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      console.log('📝 Marking all notifications as read for user:', userId);
      
      // Load only user-specific notifications to mark as read
      const notifications = await this.loadUserNotifications(userId);
      const unreadNotifications = notifications.filter(n => !n.seen);

      if (unreadNotifications.length === 0) {
        console.log('ℹ️ No unread notifications to mark as read');
        return;
      }

      const promises = unreadNotifications.map(notification => 
        this.markAsRead(notification.id)
      );

      await Promise.all(promises);
      console.log(`✅ Marked ${unreadNotifications.length} user-specific notifications as read`);
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
