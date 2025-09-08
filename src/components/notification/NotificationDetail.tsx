/**
 * NotificationDetail
 * Displays detailed notification content with enhanced UI
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  ViewStyle,
  TextStyle,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors, Typography, Layout } from '../../constants';
import { NavigationProp, ParamListBase, RouteProp } from '@react-navigation/native';

// Define types for notification detail props
interface NotificationDetailProps {
  navigation: NavigationProp<ParamListBase>;
  route: RouteProp<{
    params: {
      id: string;
      title: string;
      body: string; // Changed from message to body to match Firebase structure
      date: string;
      time?: string;
      type?: 'promotion' | 'update' | 'alert' | 'request' | 'transaction';
      offer?: any;
      actionUrl?: string;
      category?: string;
      createdAt?: string;
      // Add more fields as needed for transaction/request
      orderId?: string;
      requestId?: string;
      status?: string;
    }
  }, 'params'>;
}

// Get notification icon based on type
const getNotificationIcon = (type?: string): string => {
  switch (type) {
    case 'transaction':
      return 'cash-outline';
    case 'promotion':
      return 'gift-outline';
    case 'update':
      return 'refresh-outline';
    case 'alert':
      return 'alert-circle-outline';
    default:
      return 'notifications-outline';
  }
};

// Get notification color based on type
const getNotificationColor = (type?: string, theme: 'light' | 'dark' = 'light'): string => {
  const colors = Colors[theme];
  switch (type) {
    case 'transaction':
      return colors.info;
    case 'promotion':
      return colors.secondary;
    case 'update':
      return colors.primary;
    case 'alert':
      return colors.error;
    default:
      return colors.primary;
  }
};

const NotificationDetail: React.FC<NotificationDetailProps> = ({ navigation, route }) => {
  const { id, title, body, date, time, type, offer, actionUrl, category, createdAt } = route.params;
  const iconName = getNotificationIcon(type);
  const iconColor = getNotificationColor(type);

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(50)).current;  // Define type tag based on notification type
  const getTypeTag = () => {
    switch (type) {
      case 'transaction':
        return 'Transaction';
      case 'promotion':
        return 'Promotion';
      case 'update':
        return 'Update';
      case 'alert':
        return 'Alert';
      default:
        return 'Notification';
    }
  };

  // Start animations when component mounts
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.poly(4)),
      }),
    ]).start();
  }, [fadeAnim, translateY]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar
        backgroundColor="#FFFFFF"

        barStyle="dark-content"
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{getTypeTag()}</Text>

        {/* <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            // Mark as unread or other actions
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="ellipsis-vertical" size={20} color={Colors.light.text} />
        </TouchableOpacity>  */}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY }]
            }
          ]}>
          {/* Icon and Title Header */}
          <View style={styles.titleContainer}>
            <View style={[styles.iconCircle, { backgroundColor: iconColor + '20' }]}>
              <Icon name={iconName} size={28} color={iconColor} />
            </View>

            <View style={styles.titleTextContainer}>
              <Text style={styles.title}>{title}</Text>
              <View style={styles.dateContainer}>
                <Icon name="calendar-outline" size={12} color={Colors.light.textTertiary} style={styles.dateIcon} />
                <Text style={styles.date}>{date} {time && `• ${time}`}</Text>
              </View>
            </View>
          </View>

          {/* Content Card */}
          <View style={styles.messageCard}>
            {/* Message */}
            <Text style={styles.message}>{body}</Text>
            {/* Dynamic offer rendering for all notification types */}
            {type === 'promotion' && offer && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontWeight: 'bold', color: Colors.light.secondary }}>Coupon: {offer[0]?.text}</Text>
                <Text>Description: {offer[0]?.description}</Text>
                <Text>Validity: {offer[0]?.validity}</Text>
              </View>
            )}
            {type === 'update' && offer && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontWeight: 'bold', color: Colors.light.primary }}>Version: {offer[0]?.text}</Text>
                {offer[0]?.description?.map((desc: string, idx: number) => (
                  <Text key={idx}>• {desc}</Text>
                ))}
              </View>
            )}
            {type === 'alert' && offer && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontWeight: 'bold', color: Colors.light.error }}>{offer[0]?.text}</Text>
                {offer[0]?.description?.map((desc: string, idx: number) => (
                  <Text key={idx}>• {desc}</Text>
                ))}
                {offer[0]?.sub_description?.map((sub: string, idx: number) => (
                  <Text key={idx} style={{ fontStyle: 'italic' }}>Tip: {sub}</Text>
                ))}
              </View>
            )}
            {type === 'request' && offer && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontWeight: 'bold', color: Colors.light.info }}>Request ID: {offer[0]?.requestId}</Text>
                <Text>Date: {offer[0]?.date}</Text>
                <Text>Status: {offer[0]?.status}</Text>
              </View>
            )}
            {/* Date stamp */}
            <View style={styles.timestampContainer}>
              <Icon name="time-outline" size={12} color={Colors.light.textTertiary} style={{ marginRight: 4 }} />
              <Text style={styles.timestampText}>{time || '12:00 PM'}</Text>
            </View>
          </View>
          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryAction]}
              onPress={() => {
                // Handle primary action based on notification type
                if (type === 'transaction') {
                  // Navigate to order details if orderId is present
                  if (route.params.orderId) {
                    navigation.navigate('OrderDetail', { orderId: route.params.orderId });
                  } else {
                    // fallback: just go back or show a message
                    navigation.goBack();
                  }
                } else if (type === 'promotion' && actionUrl) {
                  // Open offer/action URL
                  if (actionUrl.startsWith('http')) {
                    // For React Native, use Linking
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const Linking = require('react-native').Linking;
                    Linking.openURL(actionUrl);
                  }
                } else if (type === 'update' && actionUrl) {
                  // Open update URL (e.g., app store)
                  // eslint-disable-next-line @typescript-eslint/no-var-requires
                  const Linking = require('react-native').Linking;
                  Linking.openURL(actionUrl);
                } else if (type === 'request' && route.params.requestId) {
                  // Navigate to request details
                  navigation.navigate('RequestDetail', { requestId: route.params.requestId });
                } else {
                  // Default: just go back
                  navigation.goBack();
                }
              }}
              activeOpacity={0.8}
            >
              <Icon
                name={
                  type === 'transaction' ? 'cart-outline' :
                    type === 'promotion' ? 'gift-outline' :
                      type === 'update' ? 'arrow-up-circle-outline' :
                        type === 'request' ? 'help-buoy-outline' : 'eye-outline'
                }
                size={18}
                color={Colors.light.textOnPrimary}
                style={{ marginRight: Layout.spacing.sm }}
              />
              <Text style={styles.actionButtonText}>
                {type === 'transaction' ? 'View Order' :
                  type === 'promotion' ? 'Claim Offer' :
                    type === 'update' ? 'Update Now' :
                      type === 'request' ? 'View Request' : 'View Details'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dismissButton}
              activeOpacity={0.8}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
          {/* Related Content based on type */}
          {type === 'transaction' && (
            <View style={styles.additionalInfo}>
              <View style={styles.additionalInfoHeader}>
                <Icon name="document-text-outline" size={18} color={Colors.light.text} style={{ marginRight: 8 }} />
                <Text style={styles.additionalInfoTitle}>Order Details</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Order ID</Text>
                <Text style={styles.infoValue}>KM2045</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{date}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusDot, { backgroundColor: Colors.light.success }]} />
                  <Text style={[styles.statusText, { color: Colors.light.success }]}>Confirmed</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.viewMoreButton}>
                <Text style={styles.viewMoreText}>View Complete Order</Text>
                <Icon name="chevron-forward-outline" size={16} color={Colors.light.primary} />
              </TouchableOpacity>
            </View>
          )}
          {type === 'promotion' && (
            <View style={styles.promotionContainer}>
              <View style={styles.couponCard}>
                <View style={styles.couponHeader}>
                  <Text style={styles.couponTitle}>15% OFF</Text>
                  <Text style={styles.couponSubtitle}>on all seeds and gardening tools</Text>
                </View>
                <View style={styles.couponDivider} />
                <View style={styles.couponFooter}>
                  <Text style={styles.couponCode}>KRUSHI15</Text>
                  <Text style={styles.couponExpiry}>Valid until June 30, 2025</Text>
                </View>
              </View>
            </View>
          )}
          {type === 'update' && (
            <View style={styles.updateContainer}>
              <View style={styles.versionContainer}>
                <View style={styles.versionBadge}>
                  <Text style={styles.versionText}>v2.5</Text>
                </View>
                <View style={styles.versionDetailsContainer}>
                  <Text style={styles.updateTitle}>What's new in this update:</Text>
                  <View style={styles.featureList}>
                    <View style={styles.featureItem}>
                      <Icon name="checkmark-circle" size={16} color={Colors.light.success} style={{ marginRight: 8 }} />
                      <Text style={styles.featureText}>Improved crop recommendation system</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Icon name="checkmark-circle" size={16} color={Colors.light.success} style={{ marginRight: 8 }} />
                      <Text style={styles.featureText}>Weather forecast integration</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Icon name="checkmark-circle" size={16} color={Colors.light.success} style={{ marginRight: 8 }} />
                      <Text style={styles.featureText}>Bug fixes and performance improvements</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {type === 'alert' && (
            <View style={styles.alertContainer}>
              <View style={styles.weatherAlertCard}>
                <View style={styles.weatherHeader}>
                  <Icon name="rainy" size={28} color={'#0077c2'} />
                  <Text style={styles.weatherTitle}>Heavy Rainfall Alert</Text>
                </View>

                <View style={styles.weatherInfo}>
                  <View style={styles.weatherDetail}>
                    <Icon name="time-outline" size={16} color={Colors.light.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.weatherDetailText}>Expected in next 24 hours</Text>
                  </View>
                  <View style={styles.weatherDetail}>
                    <Icon name="location-outline" size={16} color={Colors.light.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.weatherDetailText}>Your registered location</Text>
                  </View>
                  <View style={styles.weatherDetail}>
                    <Icon name="water-outline" size={16} color={Colors.light.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.weatherDetailText}>45-60mm expected</Text>
                  </View>
                </View>

                <View style={styles.safetyTipsContainer}>
                  <Text style={styles.safetyTipsTitle}>Safety Tips:</Text>
                  <Text style={styles.safetyTip}>• Move sensitive crops to sheltered areas</Text>
                  <Text style={styles.safetyTip}>• Ensure proper drainage in fields</Text>
                  <Text style={styles.safetyTip}>• Cover harvested produce</Text>
                </View>
              </View>
            </View>)}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  }, header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.md,
    paddingTop: Platform.OS === 'ios' ? Layout.spacing.md : Layout.spacing.md,
    paddingBottom: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
    backgroundColor: Colors.light.background,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as TextStyle['fontWeight'],
    color: Colors.light.text,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.full,
  },
  actionButton: {
    padding: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.full,
  }, scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: Layout.spacing.xl,
  },
  content: {
    padding: Layout.spacing.lg,
  },
  messageCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Layout.spacing.md,
    alignSelf: 'flex-end',
  },
  timestampText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.light.textTertiary,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Layout.spacing.xs,
  },
  dateIcon: {
    marginRight: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    marginBottom: Layout.spacing.lg,
  }, iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.md,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  titleTextContainer: {
    flex: 1,
    justifyContent: 'center',
  }, title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as TextStyle['fontWeight'],
    color: Colors.light.text,
    marginBottom: Layout.spacing.xs,
  },
  date: {
    fontSize: Typography.fontSize.xs,
    color: Colors.light.textTertiary,
  },
  message: {
    fontSize: Typography.fontSize.base,
    color: Colors.light.text,
  }, actionsContainer: {
    marginBottom: Layout.spacing.xl,
  },
  primaryAction: {
    backgroundColor: Colors.light.primary,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.sm,
    elevation: 2,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  actionButtonText: {
    color: Colors.light.textOnPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium as TextStyle['fontWeight'],
  },
  dismissButton: {
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  dismissButtonText: {
    color: Colors.light.textSecondary,
    fontSize: Typography.fontSize.base,
  }, additionalInfo: {
    padding: Layout.spacing.lg,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Layout.spacing.lg,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  additionalInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  additionalInfoTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as TextStyle['fontWeight'],
    color: Colors.light.text,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  infoLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textSecondary,
  },
  infoValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.text,
    fontWeight: Typography.fontWeight.medium as TextStyle['fontWeight'],
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as TextStyle['fontWeight'],
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  viewMoreText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.primary,
    fontWeight: Typography.fontWeight.medium as TextStyle['fontWeight'],
    marginRight: 4,
  },
  promotionContainer: {
    marginBottom: Layout.spacing.xl,
    alignItems: 'center',
  },
  couponCard: {
    width: '100%',
    backgroundColor: Colors.light.background,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.light.primary,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  couponHeader: {
    padding: Layout.spacing.lg,
    backgroundColor: Colors.light.primaryLight + '20',
    alignItems: 'center',
  },
  couponTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as TextStyle['fontWeight'],
    color: Colors.light.primary,
    marginBottom: Layout.spacing.xs,
  },
  couponSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  couponDivider: {
    height: 1,
    backgroundColor: Colors.light.borderLight,
  },
  couponFooter: {
    padding: Layout.spacing.lg,
    alignItems: 'center',
  },
  couponCode: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as TextStyle['fontWeight'],
    color: Colors.light.text,
    letterSpacing: 1,
    marginBottom: Layout.spacing.xs,
  },
  couponExpiry: {
    fontSize: Typography.fontSize.xs,
    color: Colors.light.textTertiary,
  },
  updateContainer: {
    marginBottom: Layout.spacing.xl,
  },
  versionContainer: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: Layout.borderRadius.lg,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  versionBadge: {
    backgroundColor: Colors.light.primary + '20',
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    alignItems: 'center',
  },
  versionText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as TextStyle['fontWeight'],
    color: Colors.light.primary,
  },
  versionDetailsContainer: {
    padding: Layout.spacing.lg,
  },
  updateTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as TextStyle['fontWeight'],
    color: Colors.light.text,
    marginBottom: Layout.spacing.md,
  },
  featureList: {
    marginLeft: Layout.spacing.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  featureText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.text,
    flex: 1,
  },
  alertContainer: {
    marginBottom: Layout.spacing.xl,
  },
  weatherAlertCard: {
    backgroundColor: Colors.light.background,
    borderRadius: Layout.borderRadius.lg,
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.error,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  weatherTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as TextStyle['fontWeight'],
    color: '#0077c2',
    marginLeft: Layout.spacing.sm,
  },
  weatherInfo: {
    padding: Layout.spacing.md,
  },
  weatherDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  weatherDetailText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.text,
  },
  safetyTipsContainer: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: Layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  safetyTipsTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as TextStyle['fontWeight'],
    color: Colors.light.text,
    marginBottom: Layout.spacing.sm,
  },
  safetyTip: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.text,
    marginBottom: Layout.spacing.xs,
    paddingLeft: Layout.spacing.xs,
  },
});

export default NotificationDetail;
