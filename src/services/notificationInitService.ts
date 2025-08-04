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
    console.log('🔔 Initializing notification system...');

    // Listen for authentication state changes
    this.unsubscribeAuth = auth().onAuthStateChanged(async (user) => {
      if (user) {
        console.log('👤 User authenticated, setting up notifications for:', user.uid);
        await this.setupNotificationsForUser(user.uid);
      } else {
        console.log('👤 User logged out, cleaning up notifications');
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
      console.log('📬 Loading initial notifications...');
      await loadNotificationsFromFirestore();

      // Set up real-time subscription
      console.log('🔄 Setting up real-time notification updates...');
      this.unsubscribeNotifications = subscribeToNotificationUpdates();

      console.log('✅ Notifications initialized successfully');
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
      console.log('🔄 Manually refreshing notifications...');
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
