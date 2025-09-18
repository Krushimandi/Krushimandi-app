/**
 * Request Notification Service
 * Handles request-specific notifications with Firebase Cloud Functions
 */

import { addDoc, collection, Timestamp } from '@react-native-firebase/firestore';
import { firestore } from '../config/firebaseModular';
import auth from '@react-native-firebase/auth';
import { RequestStatus } from '../types/Request';

export interface RequestNotificationData {
  requestId: string;
  buyerId: string;
  farmerId: string;
  productName: string;
  farmerName: string;
  buyerName: string;
  status: RequestStatus;
  price?: number;
  quantity?: string | number[];
  rejectionReason?: string;
  actionType: 'request_sent' | 'request_accepted' | 'request_rejected' | 'request_cancelled' | 'request_expired' | 'request_resent';
}

class RequestNotificationService {
  /**
   * Send notification when request is created
   */
  async sendRequestCreatedNotification(data: Omit<RequestNotificationData, 'actionType' | 'status'>) {
    try {
      const notificationData: RequestNotificationData = {
        ...data,
        actionType: 'request_sent',
        status: RequestStatus.PENDING
      };

      await this.createRequestNotification(notificationData);
      console.log('✅ Request created notification sent');
    } catch (error) {
      console.error('❌ Error sending request created notification:', error);
    }
  }

  /**
   * Send notification when request is accepted
   */
  async sendRequestAcceptedNotification(data: Omit<RequestNotificationData, 'actionType'>) {
    try {
      const notificationData: RequestNotificationData = {
        ...data,
        actionType: 'request_accepted'
      };

      await this.createRequestNotification(notificationData);
      console.log('✅ Request accepted notification sent');
    } catch (error) {
      console.error('❌ Error sending request accepted notification:', error);
    }
  }

  /**
   * Send notification when request is rejected
   */
  async sendRequestRejectedNotification(data: Omit<RequestNotificationData, 'actionType'>) {
    try {
      const notificationData: RequestNotificationData = {
        ...data,
        actionType: 'request_rejected'
      };

      await this.createRequestNotification(notificationData);
      console.log('✅ Request rejected notification sent');
    } catch (error) {
      console.error('❌ Error sending request rejected notification:', error);
    }
  }

  /**
   * Send notification when request is cancelled
   */
  async sendRequestCancelledNotification(data: Omit<RequestNotificationData, 'actionType'>) {
    try {
      const notificationData: RequestNotificationData = {
        ...data,
        actionType: 'request_cancelled'
      };

      await this.createRequestNotification(notificationData);
      console.log('✅ Request cancelled notification sent');
    } catch (error) {
      console.error('❌ Error sending request cancelled notification:', error);
    }
  }

  /**
   * Send notification when request expires
   */
  async sendRequestExpiredNotification(data: Omit<RequestNotificationData, 'actionType'>) {
    try {
      const notificationData: RequestNotificationData = {
        ...data,
        actionType: 'request_expired'
      };

      await this.createRequestNotification(notificationData);
      console.log('✅ Request expired notification sent');
    } catch (error) {
      console.error('❌ Error sending request expired notification:', error);
    }
  }

  /**
   * Send notification when request is resent
   */
  async sendRequestResentNotification(data: Omit<RequestNotificationData, 'actionType' | 'status'>) {
    try {
      const notificationData: RequestNotificationData = {
        ...data,
        actionType: 'request_resent',
        status: RequestStatus.PENDING
      };

      await this.createRequestNotification(notificationData);
      console.log('✅ Request resent notification sent');
    } catch (error) {
      console.error('❌ Error sending request resent notification:', error);
    }
  }

  /**
   * Create notification document in Firestore
   */
  private async createRequestNotification(data: RequestNotificationData) {
    const { title, description, recipientId } = this.generateNotificationContent(data);

    const notificationDoc = {
      to: recipientId, // Buyer or Farmer ID
      type: 'action' as const,
      category: 'request' as const,
      payload: {
        title,
        description,
        actionUrl: `request/${data.requestId}`,
        requestData: {
          requestId: data.requestId,
          productName: data.productName,
          status: data.status,
          actionType: data.actionType,
          price: data.price,
          quantity: data.quantity,
          rejectionReason: data.rejectionReason
        },
        type: 'request',
        createdAt: new Date().toISOString(),
      },
      seen: false,
      createdAt: Timestamp.now(),
      // Additional metadata for request tracking
      metadata: {
        requestId: data.requestId,
        actionType: data.actionType,
        fromUserId: this.getFromUserId(data),
        toUserId: recipientId
      }
    };

    await addDoc(collection(firestore, 'notifications'), notificationDoc);
  }

  /**
   * Generate notification content based on action type
   */
  private generateNotificationContent(data: RequestNotificationData): {
    title: string;
    description: string;
    recipientId: string;
  } {
    const currentUser = auth().currentUser;
    const quantityText = Array.isArray(data.quantity) 
      ? `${data.quantity[0]}-${data.quantity[1]} tons` 
      : `${data.quantity} tons`;

    switch (data.actionType) {
      case 'request_sent':
        return {
          title: 'New Product Request',
          description: `${data.buyerName} wants to buy ${data.productName} (${quantityText})`,
          recipientId: data.farmerId
        };

      case 'request_accepted':
        return {
          title: 'Request Accepted! 🎉',
          description: `${data.farmerName} accepted your request for ${data.productName}. Contact them to proceed.`,
          recipientId: data.buyerId
        };

      case 'request_rejected':
        return {
          title: 'Request Declined',
          description: `${data.farmerName} declined your request for ${data.productName}${data.rejectionReason ? `: ${data.rejectionReason}` : ''}`,
          recipientId: data.buyerId
        };

      case 'request_cancelled':
        return {
          title: 'Request Cancelled',
          description: `${data.buyerName} cancelled their request for ${data.productName}`,
          recipientId: data.farmerId
        };

      case 'request_expired':
        return {
          title: 'Request Expired',
          description: `Your request for ${data.productName} from ${data.farmerName} has expired. You can resend it.`,
          recipientId: data.buyerId
        };

      case 'request_resent':
        return {
          title: 'Request Resent',
          description: `${data.buyerName} resent their request for ${data.productName} (${quantityText})`,
          recipientId: data.farmerId
        };

      default:
        return {
          title: 'Request Update',
          description: `Update on your request for ${data.productName}`,
          recipientId: currentUser?.uid === data.buyerId ? data.farmerId : data.buyerId
        };
    }
  }

  /**
   * Get the sender user ID based on action type
   */
  private getFromUserId(data: RequestNotificationData): string {
    switch (data.actionType) {
      case 'request_sent':
      case 'request_cancelled':
      case 'request_resent':
        return data.buyerId;
      case 'request_accepted':
      case 'request_rejected':
        return data.farmerId;
      default:
        return data.buyerId;
    }
  }

  /**
   * Mark request notification as processed
   */
  async markRequestNotificationAsProcessed(requestId: string, actionType: string) {
    try {
      // This could be used to track which notifications have been processed
      // to avoid sending duplicate notifications
      console.log(`✅ Request notification marked as processed: ${requestId} - ${actionType}`);
    } catch (error) {
      console.error('❌ Error marking request notification as processed:', error);
    }
  }
}

// Export singleton instance
export const requestNotificationService = new RequestNotificationService();
export default requestNotificationService;
