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
    count?: number; // Allow custom count override
    useGlobalCount?: boolean; // Whether to use global notification count
    borderWidth?: number; // Custom border width
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
    style,
    size = 'medium',
    color = Colors.light.error,
    textColor = Colors.light.background,
    showZero = false,
    count,
    useGlobalCount = true,
    borderWidth = 2,
}) => {
    const { unreadCount, badgeText, shouldShowBadge } = useUnreadCount();

    // Use custom count if provided, otherwise use global count
    const displayCount = count !== undefined ? count : unreadCount;
    const displayText = count !== undefined ? (count > 99 ? '99+' : count.toString()) : badgeText;
    const shouldShow = count !== undefined ? (count > 0 || showZero) : (shouldShowBadge || showZero);

    if (!shouldShow) {
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
                { 
                    backgroundColor: color,
                    borderWidth: borderWidth,
                },
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
                {displayText}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: -8,
        right: -8,
        borderColor: Colors.light.background,
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 4,
    },
    badgeSmall: {
        minWidth: 19,
        height: 19,
        borderRadius: 9,
        // paddingHorizontal: 2,
    },
    badgeMedium: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        paddingHorizontal: 3,
    },
    badgeLarge: {
        minWidth: 26,
        height: 26,
        borderRadius: 13,
        paddingHorizontal: 4,
    },
    badgeText: {
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.2,
    },
    textSmall: {
        fontSize: 10,
        lineHeight: 12,
        fontWeight: '800',
    },
    textMedium: {
        fontSize: 11,
        lineHeight: 13,
        fontWeight: '800',
    },
    textLarge: {
        fontSize: 12,
        lineHeight: 14,
        fontWeight: '800',
    },
});

export default NotificationBadge;
