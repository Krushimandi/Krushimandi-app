// Use a generic Timestamp type for cross-platform compatibility
export type Timestamp = {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
};
export interface BaseNotificationPayload {
  title: string;
  description: string;
  actionUrl: string;
  createdAt: string;
}

export interface PromotionOffer {
  text: string;
  description: string;
  validity: string;
}

export interface UpdateOffer {
  text: string;
  description: string[];
}

export interface AlertOffer {
  text: string;
  description: string[];
  sub_description: string[];
}

export interface ActionOffer {
  requestId: string;
  date: string;
  status: string;
}

export interface UniversalNotificationPayload extends BaseNotificationPayload {
  type: 'Promotion' | 'Update' | 'Alert';
  offer: PromotionOffer[] | UpdateOffer[] | AlertOffer[];
}

export interface ActionNotificationPayload extends BaseNotificationPayload {
  offer: ActionOffer[];
}

export type NotificationPayload = UniversalNotificationPayload | ActionNotificationPayload;

export interface StoredNotification {
  id: string;
  to: string; // UID or "all"
  type: 'universal' | 'action';
  category: 'promotion' | 'update' | 'alert' | 'request';
  payload: NotificationPayload;
  seen: boolean;
  createdAt: Timestamp;
}

export interface FCMMessage {
  notification: {
    title: string;
    body: string;
  };
  data: {
    payload: string;
    actionUrl: string;
    type: string;
    category: string;
  };
  android?: {
    priority: 'high' | 'normal';
    notification: {
      icon: string;
      color: string;
      sound: string;
    };
  };
  apns?: {
    payload: {
      aps: {
        alert: {
          title: string;
          body: string;
        };
        sound: string;
        badge: number;
      };
    };
  };
}
