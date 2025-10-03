/**
 * Notification Initialization Service
 * Ensures notifications are properly loaded and persisted
 */

import auth from '@react-native-firebase/auth';
import { loadNotificationsFromFirestore, subscribeToNotificationUpdates } from './notificationService';

class NotificationInitializationService {
  private unsubscribeAuth: (() => void) | null = null;
  private unsubscribeNotifications: (() => void) | null = null;

  /**
   * Initialize notification system on app start
   */
  initialize(): () => void {
    

    // Listen for authentication state changes
    this.unsubscribeAuth = auth().onAuthStateChanged(async (user) => {
      if (user) {
        
        await this.setupNotificationsForUser(user.uid);
      } else {
        
        this.cleanup();
      }
    });

    // Return cleanup function
    return () => {
      this.cleanup();
      if (this.unsubscribeAuth) {
        this.unsubscribeAuth();
        this.unsubscribeAuth = null;
      }
    };
  }

  /**
   * Setup notifications for authenticated user
   */
  private async setupNotificationsForUser(userId: string) {
    try {
      // Cleanup any existing subscription
      if (this.unsubscribeNotifications) {
        this.unsubscribeNotifications();
      }

      // Load initial notifications from Firestore
      
      await loadNotificationsFromFirestore();

      // Set up real-time subscription
      
      this.unsubscribeNotifications = subscribeToNotificationUpdates();

      
    } catch (error) {
      console.error('❌ Error setting up notifications:', error);
    }
  }

  /**
   * Cleanup notification subscriptions
   */
  private cleanup() {
    if (this.unsubscribeNotifications) {
      this.unsubscribeNotifications();
      this.unsubscribeNotifications = null;
    }
  }

  /**
   * Manually refresh notifications (for pull-to-refresh, etc.)
   */
  async refreshNotifications(): Promise<void> {
    const currentUser = auth().currentUser;
    if (currentUser) {
      
      await loadNotificationsFromFirestore();
    }
  }

  /**
   * Check if notifications are properly initialized
   */
  isInitialized(): boolean {
    return this.unsubscribeNotifications !== null;
  }
}

// Export singleton instance
export const notificationInitService = new NotificationInitializationService();
export default notificationInitService;
