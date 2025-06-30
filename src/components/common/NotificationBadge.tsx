/**
 * NotificationBadge Component
 * Displays unread notification count as a badge
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography } from '../../constants';
import { useUnreadCount } from '../../hooks/useNotifications';

interface NotificationBadgeProps {
    style?: ViewStyle;
    size?: 'small' | 'medium' | 'large';
    color?: string;
    textColor?: string;
    showZero?: boolean;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
    style,
    size = 'medium',
    color = Colors.light.error,
    textColor = Colors.light.background,
    showZero = false,
}) => {
    const { unreadCount, badgeText, shouldShowBadge } = useUnreadCount();

    if (!shouldShowBadge && !showZero) {
        return null;
    }

    const sizeStyles = {
        small: styles.badgeSmall,
        medium: styles.badgeMedium,
        large: styles.badgeLarge,
    };

    const textSizeStyles = {
        small: styles.textSmall,
        medium: styles.textMedium,
        large: styles.textLarge,
    };

    return (
        <View 
            style={[
                styles.badge,
                sizeStyles[size],
                { backgroundColor: color },
                style
            ]}
        >
            <Text 
                style={[
                    styles.badgeText,
                    textSizeStyles[size],
                    { color: textColor }
                ]}
                numberOfLines={1}
            >
                {badgeText}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: -6,
        right: -6,
        borderWidth: 2,
        borderColor: Colors.light.background,
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    badgeSmall: {
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        paddingHorizontal: 4,
    },
    badgeMedium: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        paddingHorizontal: 6,
    },
    badgeLarge: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        paddingHorizontal: 8,
    },
    badgeText: {
        fontWeight: 'bold',
        textAlign: 'center',
    },
    textSmall: {
        fontSize: 10,
        lineHeight: 12,
    },
    textMedium: {
        fontSize: 11,
        lineHeight: 13,
    },
    textLarge: {
        fontSize: 12,
        lineHeight: 14,
    },
});

export default NotificationBadge;
