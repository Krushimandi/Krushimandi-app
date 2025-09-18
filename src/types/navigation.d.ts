// Global navigation parameter list augmentation for React Navigation
// Ensures ChatDetail screen params are strongly typed across the app.

import { } from '@react-navigation/native';

declare global {
  namespace ReactNavigation {
    interface RootParamList {
      ChatDetail: {
        chatId: string;
        otherUid: string;
        name?: string;
        avatarUri?: string | null;
      };
    }
  }
}

export {};
