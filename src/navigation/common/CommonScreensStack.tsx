/**
 * Common Screens Stack
 * Screens that can be accessed from multiple stacks
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Common screens
import { NotificationScreen, NotificationDetail } from '../../components/notification';
import { SettingsScreen } from '../../components/settings';
import { ProfileScreen } from '../../components/ProfileScreen';

// Types
import { CommonScreensParamList } from '../../types';

const CommonStack = createStackNavigator<CommonScreensParamList>();

const CommonScreensStack = () => (
<CommonStack.Navigator screenOptions={{ headerShown: false }}>
    <CommonStack.Screen name="Notification" component={NotificationScreen} />
    <CommonStack.Screen name="NotificationDetail" component={NotificationDetail as React.ComponentType<any>} />
    <CommonStack.Screen name="ProfileScreen" component={ProfileScreen} />
    <CommonStack.Screen name="Settings" component={SettingsScreen} options={{ presentation: 'modal', headerShown: false }} />
</CommonStack.Navigator>
);

export default CommonScreensStack;
