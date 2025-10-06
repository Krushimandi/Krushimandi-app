/**
 * PendingRequestsBadge Component
 * Displays pending requests count as a badge for farmers
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants';
import { usePendingRequestsCount } from '../../hooks/usePendingRequestsCount';

interface PendingRequestsBadgeProps {
    style?: ViewStyle;
    size?: 'small' | 'medium' | 'large';
    color?: string;
    textColor?: string;
    showZero?: boolean;
    borderWidth?: number;
}

const PendingRequestsBadge: React.FC<PendingRequestsBadgeProps> = ({
    style,
    size = 'small',
    color = Colors.light.error,
    textColor = Colors.light.background,
    showZero = false,
    borderWidth = 2,
}) => {
    const { pendingCount, badgeText, shouldShowBadge } = usePendingRequestsCount();

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
                {badgeText}
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
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
    },
    badgeMedium: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        paddingHorizontal: 5,
    },
    badgeLarge: {
        minWidth: 26,
        height: 26,
        borderRadius: 13,
        paddingHorizontal: 6,
    },
    badgeText: {
        fontWeight: '700',
        includeFontPadding: false,
        textAlign: 'center',
    },
    textSmall: {
        fontSize: 10,
        lineHeight: 12,
    },
    textMedium: {
        fontSize: 11,
        lineHeight: 14,
    },
    textLarge: {
        fontSize: 12,
        lineHeight: 16,
    },
});

export default PendingRequestsBadge;
