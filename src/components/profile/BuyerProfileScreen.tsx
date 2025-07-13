import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    StatusBar,
    RefreshControl,
    Image,
    Dimensions,
    TextInput,
    Modal,
    FlatList,
    Animated,
    Pressable,
    Share,
    Linking,
} from 'react-native';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';
import { useAuthState } from '../providers/AuthStateProvider';
import { RootStackParamList } from '../../navigation/types';
import { useBuyerProfile } from '../../hooks/useBuyerProfile';
import { BuyerProfile, BuyerReview } from '../../services/buyerService';

const { width, height } = Dimensions.get('window');

interface BuyerProfileScreenProps {
    route: RouteProp<RootStackParamList, 'BuyerProfile'>;
    navigation: StackNavigationProp<RootStackParamList, 'BuyerProfile'>;
}

const BuyerProfileScreen: React.FC<BuyerProfileScreenProps> = ({ route }) => {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const { user } = useAuthState();
    const { buyerId, buyerName } = route.params;

    // Use the custom hook for buyer data
    const {
        profile,
        reviews,
        loading,
        error,
        refreshProfile,
        submitReview,
        submittingReview,
    } = useBuyerProfile(buyerId);

    // State for UI interactions
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [newReview, setNewReview] = useState({
        rating: 5,
        comment: '',
    });
    const [scrollY] = useState(new Animated.Value(0));
    const [bottomCardOpacity] = useState(new Animated.Value(1));
    const [selectedTab, setSelectedTab] = useState('about'); // 'about', 'reviews', 'stats'

    // Check if this is the current user's profile
    const isOwnProfile = user?.id === buyerId;

    const handleWriteReview = () => {
        if (isOwnProfile) {
            Alert.alert('Info', 'You cannot review your own profile');
            return;
        }
        setReviewModalVisible(true);
    };

    const handleSubmitReview = async () => {
        const success = await submitReview(
            newReview.rating,
            newReview.comment,
            'GENERAL',
            'General Review'
        );

        if (success) {
            setReviewModalVisible(false);
            setNewReview({ rating: 5, comment: '' });
            Alert.alert('Success', 'Review submitted successfully');
        }
    };

    const handleCall = () => {
        if (profile?.phone) {
            Linking.openURL(`tel:${profile.phone}`);
        }
    };

    const handleMessage = () => {
        if (profile?.phone) {
            Linking.openURL(`sms:${profile.phone}`);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out ${profile?.name}'s profile on KrushiMandi - ${profile?.rating}⭐ rated buyer with ${profile?.completedOrders} completed orders.`,
                title: `${profile?.name} - KrushiMandi`,
            });
        } catch (error) {
            console.error('Error sharing profile:', error);
        }
    };    // Animated bottom card opacity based on scroll
    const bottomCardAnimatedStyle = {
        opacity: bottomCardOpacity,
        transform: [
            {
                translateY: scrollY.interpolate({
                    inputRange: [0, 200],
                    outputRange: [0, -20],
                    extrapolate: 'clamp',
                })
            }
        ]
    };

    // Handle scroll and update bottom card opacity
    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        {
            useNativeDriver: false,
            listener: (event: any) => {
                const offsetY = event.nativeEvent.contentOffset.y;
                const bottomCardOpacityValue = Math.max(1 - (offsetY / 150), 0);

                bottomCardOpacity.setValue(bottomCardOpacityValue);
            },
        }
    );

    const renderStars = (rating: number, size: number = 16) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Icon
                    key={i}
                    name={i <= rating ? 'star' : 'star-outline'}
                    size={size}
                    color={i <= rating ? '#FFD700' : '#D1D5DB'}
                />
            );
        }
        return stars;
    };

    const renderReviewStars = (rating: number, onPress?: (rating: number) => void) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <TouchableOpacity
                    key={i}
                    onPress={() => onPress && onPress(i)}
                    disabled={!onPress}
                >
                    <Icon
                        name={i <= rating ? 'star' : 'star-outline'}
                        size={32}
                        color={i <= rating ? '#FFD700' : '#D1D5DB'}
                    />
                </TouchableOpacity>
            );
        }
        return stars;
    };

    const renderReviewItem = ({ item }: { item: BuyerReview }) => (
        <Animated.View style={[styles.reviewItem, { opacity: 1 }]}>
            <View style={styles.reviewHeader}>
                <View style={styles.farmerInfo}>
                    <View style={styles.farmerAvatar}>
                        {item.farmerImage ? (
                            <Image
                                source={{ uri: item.farmerImage }}
                                style={styles.farmerAvatarImage}
                            />
                        ) : (
                            <Text style={styles.farmerInitial}>
                                {item.farmerName.charAt(0)}
                            </Text>
                        )}
                    </View>
                    <View style={styles.farmerDetails}>
                        <Text style={styles.farmerName}>{item.farmerName}</Text>
                        <View style={styles.reviewRating}>
                            {renderStars(item.rating, 14)}
                        </View>
                    </View>
                </View>
                <Text style={styles.reviewDate}>
                    {item.createdAt?.toDate?.()?.toDateString() || 'Recent'}
                </Text>
            </View>
            <Text style={styles.reviewComment}>{item.comment}</Text>
            <View style={styles.reviewFooter}>
                <Text style={styles.orderInfo}>
                    Order: {item.orderId} • {item.productName}
                </Text>
            </View>
        </Animated.View>
    );

    const renderTabContent = () => {
        switch (selectedTab) {
            case 'about':
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.aboutSection}>
                            <Text style={styles.sectionTitle}>About</Text>
                            <Text style={styles.bioText}>
                                {profile?.bio || 'No bio available'}
                            </Text>
                        </View>

                        <View style={styles.contactSection}>
                            <Text style={styles.sectionTitle}>Contact Information</Text>
                            <View style={styles.contactItem}>
                                <Icon name="call" size={20} color="#6B7280" />
                                <Text style={styles.contactText}>{profile?.phone || 'Not provided'}</Text>
                            </View>
                            <View style={styles.contactItem}>
                                <Icon name="mail" size={20} color="#6B7280" />
                                <Text style={styles.contactText}>{profile?.email || 'Not provided'}</Text>
                            </View>
                            <View style={styles.contactItem}>
                                <Icon name="location" size={20} color="#6B7280" />
                                <Text style={styles.contactText}>{profile?.location || 'Not provided'}</Text>
                            </View>
                        </View>

                        <View style={styles.verificationSection}>
                            <Text style={styles.sectionTitle}>Verification</Text>
                            <View style={styles.verificationItem}>
                                <Icon
                                    name={profile?.isVerified ? "checkmark-circle" : "close-circle"}
                                    size={20}
                                    color={profile?.isVerified ? "#22C55E" : "#EF4444"}
                                />
                                <Text style={styles.verificationText}>
                                    {profile?.isVerified ? 'Verified Buyer' : 'Not Verified'}
                                </Text>
                            </View>
                        </View>
                    </View>
                );

            case 'reviews':
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.reviewsHeader}>
                            <Text style={styles.sectionTitle}>
                                Reviews ({reviews.length})
                            </Text>
                            {!isOwnProfile && (
                                <TouchableOpacity
                                    style={styles.writeReviewButton}
                                    onPress={handleWriteReview}
                                >
                                    <Icon name="create-outline" size={16} color="#6B7280" />
                                    <Text style={styles.writeReviewText}>Write Review</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {reviews.length === 0 ? (
                            <View style={styles.emptyReviews}>
                                <Icon name="star-outline" size={48} color="#D1D5DB" />
                                <Text style={styles.emptyReviewsText}>No reviews yet</Text>
                                <Text style={styles.emptyReviewsSubtext}>
                                    Be the first to review this buyer
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={visibleReviews}
                                renderItem={renderReviewItem}
                                keyExtractor={(item) => item.id}
                                scrollEnabled={false}
                                showsVerticalScrollIndicator={false}
                            />
                        )}

                        {reviews.length > 3 && (
                            <TouchableOpacity
                                style={styles.showMoreButton}
                                onPress={() => setShowAllReviews(!showAllReviews)}
                            >
                                <Text style={styles.showMoreText}>
                                    {showAllReviews ? 'Show Less' : `Show All ${reviews.length} Reviews`}
                                </Text>
                                <Icon
                                    name={showAllReviews ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color="#6B7280"
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                );

            case 'stats':
                return (
                    <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>Statistics</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statCard}>
                                <View style={styles.statIconContainer}>
                                    <Icon name="star" size={24} color="#FFD700" />
                                </View>
                                <Text style={styles.statValue}>
                                    {profile?.rating === 0 ? '0.0' : profile?.rating}
                                </Text>
                                <Text style={styles.statLabel}>Average Rating</Text>
                            </View>
                            <View style={styles.statCard}>
                                <View style={styles.statIconContainer}>
                                    <Icon name="checkmark-circle" size={24} color="#22C55E" />
                                </View>
                                <Text style={styles.statValue}>{profile?.completedOrders}</Text>
                                <Text style={styles.statLabel}>Completed Orders</Text>
                            </View>
                            <View style={styles.statCard}>
                                <View style={styles.statIconContainer}>
                                    <Icon name="document-text" size={24} color="#3B82F6" />
                                </View>
                                <Text style={styles.statValue}>{profile?.totalRequests}</Text>
                                <Text style={styles.statLabel}>Total Requests</Text>
                            </View>
                            <View style={styles.statCard}>
                                <View style={styles.statIconContainer}>
                                    <Icon name="people" size={24} color="#8B5CF6" />
                                </View>
                                <Text style={styles.statValue}>{profile?.totalRatings}</Text>
                                <Text style={styles.statLabel}>Reviews</Text>
                            </View>
                        </View>

                        <View style={styles.progressSection}>
                            <Text style={styles.sectionTitle}>Performance</Text>
                            <View style={styles.progressItem}>
                                <Text style={styles.progressLabel}>Order Completion Rate</Text>
                                <View style={styles.progressBar}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            { width: `${((profile?.completedOrders || 0) / Math.max(profile?.totalRequests || 1, 1)) * 100}%` }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.progressText}>
                                    {profile?.totalRequests === 0 
                                        ? '0%' 
                                        : Math.round(((profile?.completedOrders || 0) / Math.max(profile?.totalRequests || 1, 1)) * 100) + '%'
                                    }
                                </Text>
                            </View>
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    const visibleReviews = useMemo(() => {
        return showAllReviews ? reviews : reviews.slice(0, 3);
    }, [reviews, showAllReviews]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
        );
    }

    if (error || !profile) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="person-circle-outline" size={64} color="#D1D5DB" />
                <Text style={styles.errorText}>
                    {error || 'Profile not found'}
                </Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={refreshProfile}
                >
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            {/* Fixed Header - Outside ScrollView */}
            <View style={styles.fixedHeaderContainer}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {profile?.name || 'Unknown User'}
                </Text>
                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <Icon name="share-outline" size={20} color="#111827" />
                </TouchableOpacity>
            </View>
            <Animated.ScrollView
                contentInset={{ top: 80 }}      // iOS
                bounces={false}                 // iOS
                overScrollMode="never"
                style={styles.scrollView}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={submittingReview}
                        onRefresh={refreshProfile}
                        colors={[Colors.light.primary]}
                        tintColor={Colors.light.primary}
                        progressViewOffset={120} // for Android only
                    />
                }
            >
                {/* Hero Section with Modern Green Background */}
                <View style={styles.heroSection}>
                    {/* Modern Green Background with Gradient Effect */}
                    <Animated.View style={[styles.modernGreenBackground, bottomCardAnimatedStyle]}>
                        {/* Decorative overlay for depth */}
                        <View style={styles.greenBackgroundOverlay} />
                    </Animated.View>

                    {/* Profile Card */}
                    <View style={styles.profileCard}>
                        <View style={styles.profileImageContainer}>
                            <View style={styles.profileImage}>
                                {profile.profileImage ? (
                                    <Image
                                        source={{ uri: profile.profileImage }}
                                        style={styles.profileImageActual}
                                    />
                                ) : (
                                    <Text style={styles.profileInitial}>
                                        {profile.name.charAt(0)}
                                    </Text>
                                )}
                            </View>
                            {profile.isVerified && (
                                <View style={styles.verifiedBadge}>
                                    <Icon name="checkmark" size={12} color="#FFFFFF" />
                                </View>
                            )}
                        </View>

                        <Text style={styles.profileName}>{profile.name}</Text>
                        <View style={styles.ratingContainer}>
                            {profile.rating > 0 ? renderStars(profile.rating, 16) : (
                                <View style={styles.noRatingContainer}>
                                    <Icon name="star-outline" size={16} color="#D1D5DB" />
                                    <Icon name="star-outline" size={16} color="#D1D5DB" />
                                    <Icon name="star-outline" size={16} color="#D1D5DB" />
                                    <Icon name="star-outline" size={16} color="#D1D5DB" />
                                    <Icon name="star-outline" size={16} color="#D1D5DB" />
                                </View>
                            )}
                            <Text style={styles.ratingText}>
                                {profile.rating > 0 
                                    ? `${profile.rating} (${profile.totalRatings} reviews)` 
                                    : 'No ratings yet'
                                }
                            </Text>
                        </View>
                        <View style={styles.locationContainer}>
                            <Icon name="location-outline" size={16} color="#6B7280" />
                            <Text style={styles.locationText}>{profile.location || 'Location not available'}</Text>
                        </View>

                        {/* Action Buttons */}
                        {!isOwnProfile && (
                            <View style={styles.actionButtonsContainer}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={styles.callButton}
                                    onPress={handleCall}>
                                    <View style={styles.callButtonInner}>
                                        <Icon name="call" size={18} color="#FFFFFF" />
                                    </View>
                                    <Text style={styles.callButtonText}>Call</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={styles.messageButton}
                                    onPress={handleMessage}>
                                    <View style={styles.messageButtonInner}>
                                        <Icon name="chatbubble-ellipses" size={18} color="#FFFFFF" />
                                    </View>
                                    <Text style={styles.messageButtonText}>Message</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={styles.reviewButton}
                                    onPress={handleWriteReview}>
                                    <View style={styles.reviewButtonInner}>
                                        <Icon name="star" size={18} color="#FFFFFF" />
                                    </View>
                                    <Text style={styles.reviewButtonText}>Review</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Quick Stats */}
                        <View style={styles.quickStats}>
                            <View style={styles.quickStatItem}>
                                <Text style={styles.quickStatNumber}>{profile.completedOrders}</Text>
                                <Text style={styles.quickStatLabel}>Orders</Text>
                            </View>
                            <View style={styles.quickStatDivider} />
                            <View style={styles.quickStatItem}>
                                <Text style={styles.quickStatNumber}>{profile.totalRequests}</Text>
                                <Text style={styles.quickStatLabel}>Requests</Text>
                            </View>                        <View style={styles.quickStatDivider} />
                            <View style={styles.quickStatItem}>
                                <Text style={styles.quickStatNumber}>{profile.totalRatings}</Text>
                                <Text style={styles.quickStatLabel}>Reviews</Text>
                            </View>
                        </View>
                    </View>

                    {/* Bottom Green Card - Now part of hero section
                    <Animated.View style={[styles.bottomGreenCard, bottomCardAnimatedStyle]}>
                        <View style={styles.bottomGreenContent}>
                            <Text style={styles.bottomGreenText}>Trusted Buyer</Text>
                            <View style={styles.bottomGreenDot} />
                        </View>
                    </Animated.View> */}
                </View>

                {/* Tab Navigation */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, selectedTab === 'about' && styles.activeTab]}
                        onPress={() => setSelectedTab('about')}
                    >
                        <Text style={[styles.tabText, selectedTab === 'about' && styles.activeTabText]}>
                            About
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, selectedTab === 'reviews' && styles.activeTab]}
                        onPress={() => setSelectedTab('reviews')}
                    >
                        <Text style={[styles.tabText, selectedTab === 'reviews' && styles.activeTabText]}>
                            Reviews
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, selectedTab === 'stats' && styles.activeTab]}
                        onPress={() => setSelectedTab('stats')}
                    >
                        <Text style={[styles.tabText, selectedTab === 'stats' && styles.activeTabText]}>
                            Stats
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Content */}
                {renderTabContent()}
            </Animated.ScrollView>

            {/* Review Modal */}
            <Modal
                visible={reviewModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setReviewModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setReviewModalVisible(false)}
                        >
                            <Icon name="close" size={20} color="#6B7280" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Write Review</Text>
                        <TouchableOpacity
                            style={[
                                styles.modalSubmitButton,
                                submittingReview && styles.modalSubmitButtonDisabled
                            ]}
                            onPress={handleSubmitReview}
                            disabled={submittingReview}
                        >
                            {submittingReview ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.modalSubmitText}>Submit</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        {/* Profile Info */}
                        <View style={styles.modalProfileInfo}>
                            <View style={styles.modalProfileImage}>
                                {profile?.profileImage ? (
                                    <Image
                                        source={{ uri: profile.profileImage }}
                                        style={styles.modalProfileImageActual}
                                    />
                                ) : (
                                    <Text style={styles.modalProfileInitial}>
                                        {profile?.name?.charAt(0) || 'U'}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.modalProfileDetails}>
                                <Text style={styles.modalProfileName}>{profile?.name || 'Unknown User'}</Text>
                                <Text style={styles.modalProfileSubtitle}>You're reviewing this buyer</Text>
                            </View>
                        </View>

                        {/* Rating Section */}
                        <View style={styles.modalRatingSection}>
                            <Text style={styles.modalSectionTitle}>How was your experience?</Text>
                            <View style={styles.modalRatingContainer}>
                                <View style={styles.modalRatingStars}>
                                    {renderReviewStars(newReview.rating, (rating) =>
                                        setNewReview(prev => ({ ...prev, rating }))
                                    )}
                                </View>
                                <Text style={styles.modalRatingText}>
                                    {newReview.rating === 5 ? 'Excellent' :
                                        newReview.rating === 4 ? 'Good' :
                                            newReview.rating === 3 ? 'Average' :
                                                newReview.rating === 2 ? 'Poor' : 'Very Poor'}
                                </Text>
                            </View>
                        </View>

                        {/* Comment Section */}
                        <View style={styles.modalCommentSection}>
                            <Text style={styles.modalSectionTitle}>Share your thoughts</Text>
                            <Text style={styles.modalCommentSubtitle}>
                                Help other farmers by sharing your experience with this buyer
                            </Text>
                            <View style={styles.modalCommentInputContainer}>
                                <TextInput
                                    style={styles.modalCommentInput}
                                    placeholder="Write your review here..."
                                    placeholderTextColor="#9CA3AF"
                                    value={newReview.comment}
                                    onChangeText={(text) => setNewReview(prev => ({ ...prev, comment: text }))}
                                    multiline
                                    numberOfLines={6}
                                    textAlignVertical="top"
                                />
                                <View style={styles.modalCommentCounter}>
                                    <Text style={styles.modalCommentCounterText}>
                                        {newReview.comment.length}/500
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Guidelines */}
                        <View style={styles.modalGuidelines}>
                            <Text style={styles.modalGuidelinesTitle}>Review Guidelines</Text>
                            <View style={styles.modalGuidelineItem}>
                                <Icon name="checkmark-circle" size={16} color="#22C55E" />
                                <Text style={styles.modalGuidelineText}>Be honest and constructive</Text>
                            </View>
                            <View style={styles.modalGuidelineItem}>
                                <Icon name="checkmark-circle" size={16} color="#22C55E" />
                                <Text style={styles.modalGuidelineText}>Focus on your experience</Text>
                            </View>
                            <View style={styles.modalGuidelineItem}>
                                <Icon name="checkmark-circle" size={16} color="#22C55E" />
                                <Text style={styles.modalGuidelineText}>Keep it professional</Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 32,
    },
    errorText: {
        fontSize: 18,
        color: '#6B7280',
        fontWeight: '600',
        marginTop: 16,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: '#F8FAFC',
    },
    fixedHeaderContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        // backgroundColor: '#F8FAFC',
        backgroundColor: Colors.light.primary + 'F2',
        zIndex: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        textAlign: 'center',
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
    },
    shareButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    editButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    scrollView: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContent: {
        paddingTop: 90, // Add top padding to account for fixed header height
    },
    heroSection: {
        backgroundColor: '#F8FAFC',
        paddingBottom: 20,
        paddingTop: 20, // Add some top padding
        position: 'relative',
    },
    modernGreenBackground: {
        position: 'absolute',
        top: 16,
        left: 0,
        right: 0,
        height: 168,
        backgroundColor: Colors.light.primary + 'F2',
        // borderBottomLeftRadius: 16,
        // borderBottomRightRadius: 16,
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 6,
        // Gradient-like effect using multiple layers
        borderBottomWidth: 0,
    },
    greenBackgroundOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // backgroundColor: 'rgba(16, 185, 129, 0.1)', // Subtle overlay
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    profileCard: {
        position: 'relative',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginTop: 40, // Increased to overlap with green background
        paddingHorizontal: 24,
        paddingBottom: 24,
        paddingTop: 80, // Space for profile image that overlaps green background
        alignItems: 'center',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 8,
        zIndex: 2, // Above green background
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    profileImageContainer: {
        position: 'absolute',
        top: -40, // Position it to overlap the green background
        alignSelf: 'center',
        zIndex: 3,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 4,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    profileImageActual: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    profileInitial: {
        fontSize: 28,
        fontWeight: '600',
        color: Colors.light.primary,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 3,
        right: 3,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.light.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
        marginTop: 8, // Add spacing from image
        textAlign: 'center',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
        justifyContent: 'center',
    },
    noRatingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    ratingText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        justifyContent: 'center',
        marginBottom: 24,
    },
    locationText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
        width: '100%',
    },
    callButton: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    callButtonInner: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#22C55E',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    callButtonText: {
        color: '#111827',
        fontSize: 13,
        fontWeight: '600',
    },
    messageButton: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    messageButtonInner: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    messageButtonText: {
        color: '#111827',
        fontSize: 13,
        fontWeight: '600',
    },
    reviewButton: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    reviewButtonInner: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F59E0B',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    reviewButtonText: {
        color: '#111827',
        fontSize: 13,
        fontWeight: '600',
    },
    quickStats: {
        flexDirection: 'row',
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        width: '100%',
    },
    quickStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    quickStatNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    quickStatLabel: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
        textAlign: 'center',
    },
    quickStatDivider: {
        width: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 16,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 12,
        padding: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: Colors.light.primary,
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeTabText: {
        color: '#FFFFFF',
    },
    tabContent: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 16,
        padding: 20,
        marginBottom: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
    },
    aboutSection: {
        marginBottom: 24,
    },
    bioText: {
        fontSize: 15,
        color: '#6B7280',
        lineHeight: 22,
    },
    contactSection: {
        marginBottom: 24,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    contactText: {
        fontSize: 15,
        color: '#111827',
        fontWeight: '500',
    },
    verificationSection: {
        marginBottom: 24,
    },
    verificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    verificationText: {
        fontSize: 15,
        color: '#111827',
        fontWeight: '500',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 12,
    },
    statCard: {
        width: '47%',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        minHeight: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    statValue: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
        marginTop: 12,
        marginBottom: 6,
        textAlign: 'center',
    },
    statLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 18,
    },
    progressSection: {
        marginBottom: 24,
    },
    progressItem: {
        marginBottom: 16,
    },
    progressLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    progressBar: {
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.light.primary,
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    reviewsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    writeReviewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    writeReviewText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
    },
    emptyReviews: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyReviewsText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '600',
        marginTop: 16,
    },
    emptyReviewsSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 8,
    },
    reviewItem: {
        marginBottom: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    farmerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    farmerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    farmerAvatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    farmerInitial: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.primary,
    },
    farmerDetails: {
        flex: 1,
    },
    farmerName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    reviewRating: {
        flexDirection: 'row',
        gap: 2,
    },
    reviewDate: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    reviewComment: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 12,
    },
    reviewFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderInfo: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    reviewActions: {
        flexDirection: 'row',
        gap: 8,
    },
    reviewLikeButton: {
        padding: 6,
        borderRadius: 6,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    reviewReplyButton: {
        padding: 6,
        borderRadius: 6,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    showMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 4,
        marginTop: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    showMoreText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        backgroundColor: '#FFFFFF',
    },
    modalCloseButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    modalSubmitButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.light.primary,
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    modalSubmitButtonDisabled: {
        backgroundColor: '#D1D5DB',
        shadowOpacity: 0,
        elevation: 0,
    },
    modalSubmitText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    modalProfileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    modalProfileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    modalProfileImageActual: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    modalProfileInitial: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.light.primary,
    },
    modalProfileDetails: {
        flex: 1,
    },
    modalProfileName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    modalProfileSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    modalRatingSection: {
        marginBottom: 24,
    },
    modalSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 16,
    },
    modalRatingContainer: {
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    modalRatingStars: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    modalRatingText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    modalCommentSection: {
        marginBottom: 24,
    },
    modalCommentSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
        lineHeight: 20,
    },
    modalCommentInputContainer: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        position: 'relative',
    },
    modalCommentInput: {
        padding: 16,
        fontSize: 15,
        minHeight: 120,
        textAlignVertical: 'top',
        color: '#111827',
        lineHeight: 22,
    },
    modalCommentCounter: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    modalCommentCounterText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    modalGuidelines: {
        backgroundColor: '#F0FDF4',
        padding: 16,
        borderRadius: 12,
        marginBottom: 80,
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    modalGuidelinesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#166534',
        marginBottom: 12,
    },
    modalGuidelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    modalGuidelineText: {
        fontSize: 13,
        color: '#166534',
        fontWeight: '500',
    },
    bottomGreenCard: {
        marginHorizontal: 20,
        marginTop: 10,
        height: 50,
        backgroundColor: '#F0FDF4',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    bottomGreenContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bottomGreenText: {
        fontSize: 13,
        color: '#15803D',
        fontWeight: '600',
    },
    bottomGreenDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22C55E',
    },
});

export default BuyerProfileScreen;
