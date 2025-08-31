/**
 * Farmer Requests Screen
 * Displays all received buyer requests for farmers
 * Farmers can view, filter, and manage requests from buyers
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    StatusBar,
    RefreshControl,
    Alert,
    ScrollView,
    ActivityIndicator,
    Platform,
    Dimensions,
    Linking
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthState } from '../providers/AuthStateProvider';
import { useRequests } from '../../hooks/useRequests';
import { useTabBarControl } from '../../utils/navigationControls';
import { Request, RequestStatus } from '../../types/Request';
import { Colors, Layout, Typography } from '../../constants';
import { formatPrice, getRelativeTime } from '../../utils/formatters';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

// Helper function to format quantity range for requests
const formatRequestQuantity = (quantity: [number, number]): string => {
    if (!quantity || quantity.length !== 2) return 'N/A';
    const [min, max] = quantity;
    if (min === max) {
        return `${min}`;
    }
    return `${min} - ${max}`;
};

// Helper function to format timestamp
const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return '';

    // Handle Firebase Timestamp
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return getRelativeTime(timestamp.toDate().toISOString());
    }

    // Handle Date object
    if (timestamp instanceof Date) {
        return getRelativeTime(timestamp.toISOString());
    }

    // Handle string
    if (typeof timestamp === 'string') {
        return getRelativeTime(timestamp);
    }

    return '';
};

// Helper function to get the appropriate icon for each request status
const getStatusIcon = (status: string): string => {
    switch (status) {
        case 'pending':
            return 'time-outline';
        case 'accepted':
            return 'checkmark-circle-outline';
        case 'rejected':
            return 'close-circle-outline';
        case 'cancelled':
            return 'ban-outline';
        case 'expired':
            return 'hourglass-outline';
        default:
            return 'document-outline';
    }
};

// Helper function to get the color scheme for each request status
const getStatusColors = (status: string): { bg: string; border: string; text: string } => {
    switch (status) {
        case 'pending':
            return {
                bg: 'rgba(234, 179, 8, 0.1)',
                border: '#EAB308',
                text: '#A16207'
            };
        case 'accepted':
            return {
                bg: 'rgba(34, 197, 94, 0.1)',
                border: '#22C55E',
                text: '#15803D'
            };
        case 'rejected':
            return {
                bg: 'rgba(239, 68, 68, 0.1)',
                border: '#EF4444',
                text: '#DC2626'
            };
        case 'cancelled':
            return {
                bg: 'rgba(107, 114, 128, 0.1)',
                border: '#6B7280',
                text: '#4B5563'
            };
        case 'expired':
            return {
                bg: 'rgba(156, 163, 175, 0.1)',
                border: '#9CA3AF',
                text: '#6B7280'
            };
        default:
            return {
                bg: 'rgba(158, 158, 158, 0.1)',
                border: '#9E9E9E',
                text: '#616161'
            };
    }
};

// Define filter categories
type FilterCategory = 'all' | 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';

// Define interface for FilterButton props
interface FilterButtonProps {
    label: string;
    value: FilterCategory;
    isActive: boolean;
    onPress: (value: FilterCategory) => void;
}

const FarmerRequestsScreen = ({ route }: { route?: any }) => {
    const navigation = useNavigation<NavigationProp<ParamListBase>>();
    const { showTabBar } = useTabBarControl();
    const { user } = useAuthState();
    const {
        requests,
        loading,
        loadFarmerRequests,
        respondToRequest
    } = useRequests();

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('pending');
    const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
    const [isManageMode, setIsManageMode] = useState(false);

    // Get filter parameters from route
    const filterByProduct = route?.params?.filterByProduct;
    const productName = route?.params?.productName;

    // State to track if filter is manually cleared
    const [isFilterCleared, setIsFilterCleared] = useState(false);

    // Computed effective filter values
    const effectiveFilterByProduct = isFilterCleared ? null : filterByProduct;
    const effectiveProductName = isFilterCleared ? null : productName;

    const filters = [
        // { label: 'All', value: 'all' as FilterCategory },
        { label: 'Pending', value: 'pending' as FilterCategory },
        { label: 'Accepted', value: 'accepted' as FilterCategory },
        { label: 'Rejected', value: 'rejected' as FilterCategory },
        { label: 'Expired', value: 'expired' as FilterCategory }
    ];

    // Load requests when component mounts or user changes
    useEffect(() => {
        if (user?.uid && user?.role === 'farmer') {
            console.log('🔄 Loading farmer requests for user:', user.uid);
            loadRequests();
        } else {
            console.log('❌ User not ready or not a farmer:', { uid: user?.uid, role: user?.role });
        }
    }, [user?.uid, user?.role]);

    // Reload requests when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            console.log('🎯 Screen focused - reloading requests');
            if (user?.uid && user?.role === 'farmer') {
                loadRequests();
            }
            showTabBar();

            // Reset manage mode when screen comes into focus
            return () => {
                // This cleanup function runs when the screen loses focus
                setIsManageMode(false);
                setSelectedRequests([]);
            };
        }, [user?.uid, user?.role, showTabBar]) // Add proper dependencies
    );

    const loadRequests = useCallback(async () => {
        try {
            console.log('🔄 Starting to load farmer requests...');
            const result = await loadFarmerRequests();
            console.log('✅ Farmer requests loaded successfully:', result);
        } catch (error) {
            console.error('❌ Error loading farmer requests:', error);
            // Show user-friendly error message
            Toast.show({
                type: 'error',
                text1: 'Error Loading Requests',
                text2: 'Failed to load requests. Please try again.'
            });
        }
    }, [loadFarmerRequests]);

    const onRefresh = useCallback(async () => {
        console.log('🔄 Manual refresh triggered');
        setRefreshing(true);
        try {
            await loadRequests();
        } finally {
            setRefreshing(false);
        }
    }, [loadRequests]);

    // Clear product filter
    const clearProductFilter = () => {
        setIsFilterCleared(true);
    };

    // Bulk management functions
    const toggleManageMode = () => {
        setIsManageMode(!isManageMode);
        setSelectedRequests([]);
    };

    const toggleRequestSelection = (requestId: string) => {
        setSelectedRequests(prev =>
            prev.includes(requestId)
                ? prev.filter(id => id !== requestId)
                : [...prev, requestId]
        );
    };

    const handleBulkAccept = async () => {
        if (selectedRequests.length === 0) return;

        console.log('🟢 Bulk accepting requests:', selectedRequests);

        try {
            for (const requestId of selectedRequests) {
                console.log('🟢 Processing bulk accept for:', requestId);
                const success = await respondToRequest({
                    requestId,
                    status: 'accepted'
                });

                if (!success) {
                    throw new Error(`Failed to accept request ${requestId}`);
                }
            }

            setSelectedRequests([]);
            setIsManageMode(false);
            Toast.show({
                type: 'success',
                text1: 'Requests Accepted',
                text2: `${selectedRequests.length} requests accepted successfully`
            });
        } catch (error) {
            console.error('❌ Error in bulk accept:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to accept requests'
            });
        }
    };

    const handleBulkReject = async () => {
        if (selectedRequests.length === 0) return;

        console.log('🔴 Bulk rejecting requests:', selectedRequests);

        try {
            for (const requestId of selectedRequests) {
                console.log('🔴 Processing bulk reject for:', requestId);
                const success = await respondToRequest({
                    requestId,
                    status: 'rejected'
                });

                if (!success) {
                    throw new Error(`Failed to reject request ${requestId}`);
                }
            }

            setSelectedRequests([]);
            setIsManageMode(false);
            Toast.show({
                type: 'success',
                text1: 'Requests Rejected',
                text2: `${selectedRequests.length} requests rejected successfully`
            });
        } catch (error) {
            console.error('❌ Error in bulk reject:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to reject requests'
            });
        }
    };

    // Direct response functions
    const handleDirectAccept = async (requestId: string) => {
        try {
            console.log('🟢 Accepting request:', requestId);
            const success = await respondToRequest({
                requestId,
                status: 'accepted'
            });

            if (success) {
                console.log('✅ Request accepted successfully');
                Toast.show({
                    type: 'success',
                    text1: 'Request Accepted',
                    text2: 'Request accepted successfully'
                });
            } else {
                console.log('❌ Request acceptance failed');
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to accept request'
                });
            }
        } catch (error) {
            console.error('❌ Error accepting request:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to accept request'
            });
        }
    };

    const handleDirectReject = async (requestId: string) => {
        try {
            console.log('🔴 Rejecting request:', requestId);
            const success = await respondToRequest({
                requestId,
                status: 'rejected'
            });

            if (success) {
                console.log('✅ Request rejected successfully');
                Toast.show({
                    type: 'success',
                    text1: 'Request Rejected',
                    text2: 'Request rejected successfully'
                });
            } else {
                console.log('❌ Request rejection failed');
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to reject request'
                });
            }
        } catch (error) {
            console.error('❌ Error rejecting request:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to reject request'
            });
        }
    };

    // View functions
    const handleViewBuyerProfile = (request: Request) => {
        navigation.navigate('BuyerProfile', {
            buyerId: request.buyerId,
            buyerName: request.buyerDetails.name,
        });
    };

    const handleViewMessage = (message: string) => {
        Alert.alert(
            'Buyer Message',
            message,
            [{ text: 'OK' }]
        );
    };

    // Advanced filtering
    const filteredRequests = useMemo(() => {
        return requests.filter(item => {
            const matchesSearch =
                item.productSnapshot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.buyerDetails.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.buyerDetails.location.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesFilter = selectedFilter === 'all' || item.status === selectedFilter;

            // Filter by specific product if effectiveFilterByProduct is provided
            const matchesProduct = !effectiveFilterByProduct || item.productId === effectiveFilterByProduct;

            return matchesSearch && matchesFilter && matchesProduct;
        });
    }, [requests, searchQuery, selectedFilter, effectiveFilterByProduct]);

    // Get statistics
    const stats = useMemo(() => {
        const stats = {
            total: requests.length,
            pending: 0,
            accepted: 0,
            rejected: 0,
            cancelled: 0,
            expired: 0
        };

        requests.forEach(request => {
            switch (request.status) {
                case 'pending':
                    stats.pending++;
                    break;
                case 'accepted':
                    stats.accepted++;
                    break;
                case 'rejected':
                    stats.rejected++;
                    break;
                case 'cancelled':
                    stats.cancelled++;
                    break;
                case 'expired':
                    stats.expired++;
                    break;
            }
        });

        return stats;
    }, [requests]);

    // Handle response to request (removed - using direct actions now)
    const handleContactBuyer = (request: Request) => {
        if (request?.buyerDetails?.phone) {
            Linking.openURL(`tel:${request.buyerDetails.phone}`);
        }
    };

    // Enhanced request item rendering
    const renderRequestItem = ({ item }: { item: Request }) => {
        const statusColors = getStatusColors(item.status);
        const isExpired = item.status === 'expired';
        const isPending = item.status === 'pending';
        const isAccepted = item.status === 'accepted';

        return (
            <View style={styles.requestItemContainer}>
                {/* Selection button outside card for manage mode */}
                {isManageMode && (
                    <TouchableOpacity
                        style={[styles.externalSelectionButton, selectedRequests.includes(item.id) && styles.externalSelectedButton]}
                        onPress={() => toggleRequestSelection(item.id)}
                    >
                        <Icon
                            name={selectedRequests.includes(item.id) ? "checkbox" : "checkbox-outline"}
                            size={20}
                            color={selectedRequests.includes(item.id) ? "#FFFFFF" : "#6B7280"}
                        />
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.requestItem}
                    activeOpacity={0.8}
                    onPress={() => handleViewBuyerProfile(item)}>
                    <View style={styles.requestContent}>
                        {/* Header */}
                        <View style={styles.requestHeader}>
                            <View style={styles.titleSection}>
                                <Text style={styles.productName}>{item.productSnapshot.name}</Text>
                                <View style={styles.badgeRow}>
                                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
                                        <Icon name={getStatusIcon(item.status)} size={10} color={statusColors.text} />
                                        <Text style={[styles.statusText, { color: statusColors.text }]}>
                                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Buyer Info */}
                        <View style={styles.detailsRow}>
                            <View style={styles.buyerInfo}>
                                <Icon name="person-outline" size={14} color="#6B7280" />
                                <Text style={styles.buyerName}>{item.buyerDetails.name}</Text>
                            </View>
                        </View>

                        {/* Location */}
                        <View style={styles.locationRow}>
                            <Icon name="location-outline" size={14} color="#6B7280" />
                            <Text style={styles.location}>{item.buyerDetails.location}</Text>
                        </View>

                        {/* Quantity and Price */}
                        <View style={styles.quantityPriceRow}>
                            <View style={styles.quantitySection}>
                                <Text style={styles.quantityLabel}>Requested:</Text>
                                <Text style={styles.quantityValue}>
                                    {item.quantity ? formatRequestQuantity(item.quantity) : 'N/A'} {item.quantityUnit}
                                </Text>
                            </View>
                            <View style={styles.priceSection}>
                                <Text style={styles.priceLabel}>Your Price:</Text>
                                <Text style={styles.priceValue}>
                                    {formatPrice(item.productSnapshot.price)}
                                </Text>
                            </View>
                        </View>

                        {/* Buyer Message */}
                        {item.message && (
                            <View style={styles.responseSection}>
                                <Text style={styles.responseLabel}>Message :</Text>
                                {item.message ? (
                                    <View style={styles.messageRow}>
                                        <Icon name="mail-outline" size={14} color="#6B7280" />
                                        <Text style={styles.responseText}>{item.message}</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.responseText}>
                                        No message provided
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        {/* Direct action buttons for pending requests */}
                        {isPending && !isManageMode && (
                            <>
                                <TouchableOpacity
                                    style={styles.acceptButton}
                                    onPress={() => handleDirectAccept(item.id)}
                                >
                                    {/* hidden icon for better UI */}
                                    {/* <Icon name="checkmark" size={16} color="#FFFFFF" /> */}
                                    <Text style={styles.actionButtonText}>Accept</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.rejectButton}
                                    onPress={() => handleDirectReject(item.id)}
                                >
                                    {/* hidden icon for better UI */}
                                    {/* <Icon name="close" size={16} color="#FFFFFF" /> */}
                                    <Text style={styles.actionButtonText}>Reject</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {item.message && (
                            <TouchableOpacity
                                style={styles.messageButton}
                                onPress={() => handleViewMessage(item.message!)}
                            >
                                <Icon name="mail-outline" size={14} color="#6B7280" />
                            </TouchableOpacity>
                        )}

                        {/* Contact button for accepted requests */}
                        {isAccepted && (
                            <TouchableOpacity
                                style={styles.contactButton}
                                onPress={() => handleContactBuyer(item)}
                            >
                                <Icon name="call-outline" size={16} color="#FFFFFF" />
                                <Text style={styles.actionButtonText}>Contact</Text>
                            </TouchableOpacity>
                        )}

                        {/* Footer */}
                        <View style={styles.bottomRow}>
                            <Text style={styles.date}>
                                {formatTimestamp(item.createdAt)}
                            </Text>
                        </View>
                    </View>

                </TouchableOpacity>
            </View>
        );
    };

    // Filter Button Component
    const FilterButton: React.FC<FilterButtonProps> = ({ label, value, isActive, onPress }) => (
        <TouchableOpacity
            style={[
                styles.filterButton,
                isActive && styles.activeFilterButton
            ]}
            onPress={() => onPress(value)}
        >
            <Text style={[
                styles.filterButtonText,
                isActive && styles.activeFilterButtonText
            ]}>
                {label}
            </Text>
            {value !== 'all' && (
                <Text style={[
                    styles.filterCount,
                    isActive && styles.filterCountActive
                ]}>
                    {stats[value] || 0}
                </Text>
            )}
        </TouchableOpacity>
    );

    if (loading && requests.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
                <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerTitleSection}>
                        <Text style={styles.headerTitle}>Requests</Text>
                        <Text style={styles.headerSubtitle}>
                            {effectiveFilterByProduct
                                ? `${filteredRequests.length} requests for ${effectiveProductName}`
                                : `${filteredRequests.length} of ${stats.total} requests`
                            }
                        </Text>

                        {/* Show filter badge when filtering by product */}
                        {effectiveFilterByProduct && effectiveProductName && (
                            <View style={styles.filterBadge}>
                                <Icon name="filter" size={12} color={Colors.light.primary} />
                                <Text style={styles.filterBadgeText}>
                                    {effectiveProductName}
                                </Text>
                                <TouchableOpacity
                                    onPress={clearProductFilter}
                                    style={styles.filterBadgeClose}
                                >
                                    <Icon name="close" size={12} color={Colors.light.primary} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        style={[styles.manageButton]}
                        onPress={toggleManageMode}
                    >
                        <Text style={[styles.manageButtonText, isManageMode && styles.manageButtonTextActive]}>
                            {isManageMode ? 'Done' : 'Manage'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Bulk Actions - Show when in manage mode */}
                {isManageMode && requests.length > 0 && (
                    <View style={styles.bulkActionsHeader}>
                        <View style={styles.bulkActionsLeft}>
                            <Icon name="checkmark-circle" size={20} color={Colors.light.primary} />
                            <Text style={styles.bulkActionsLabel}>
                                {selectedRequests.length} selected
                            </Text>
                        </View>
                        <View style={styles.bulkActions}>
                            <TouchableOpacity
                                style={styles.bulkAcceptButton}
                                onPress={handleBulkAccept}
                            >
                                <Icon name="checkmark" size={16} color="#FFFFFF" />
                                <Text style={styles.bulkActionText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.bulkRejectButton}
                                onPress={handleBulkReject}
                            >
                                <Icon name="close" size={16} color="#FFFFFF" />
                                <Text style={styles.bulkActionText}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Icon name="search" size={20} color="#6B7280" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search buyers, products, locations..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#9CA3AF"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Icon name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Clear Product Filter Button */}
            {effectiveFilterByProduct && (
                <View style={styles.clearFilterContainer}>
                    <TouchableOpacity
                        style={styles.clearFilterButton}
                        onPress={clearProductFilter}
                    >
                        <Icon name="close-circle" size={16} color={Colors.light.primary} />
                        <View style={styles.clearFilterTextContainer}>
                            <Text style={styles.clearFilterText}>
                                Clear filter for "{effectiveProductName}"
                            </Text>
                            <Text style={styles.showAllText}>Show all requests</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* Filter Chips */}
            <View style={styles.filterContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ maxHeight: 50 }}
                    contentContainerStyle={styles.filterContent}
                >
                    {filters.map((filter) => (
                        <FilterButton
                            key={filter.value}
                            label={filter.label}
                            value={filter.value}
                            isActive={selectedFilter === filter.value}
                            onPress={setSelectedFilter}
                        />
                    ))}
                </ScrollView>
            </View>

            {/* Requests List */}
            <FlatList
                data={filteredRequests}
                keyExtractor={(item) => item.id}
                renderItem={renderRequestItem}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.light.primary]}
                        tintColor={Colors.light.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Icon name="document-text-outline" size={64} color="#D1D5DB" />
                        <Text style={styles.emptyText}>
                            {effectiveFilterByProduct
                                ? `No requests for ${effectiveProductName}`
                                : searchQuery || selectedFilter !== 'all'
                                    ? 'No matching requests'
                                    : 'No requests received'
                            }
                        </Text>
                        <Text style={styles.emptySubtext}>
                            {effectiveFilterByProduct
                                ? 'This product hasn\'t received any requests yet'
                                : searchQuery || selectedFilter !== 'all'
                                    ? 'Try adjusting your search or filters'
                                    : 'Buyers will send requests for your products'
                            }
                        </Text>
                        {effectiveFilterByProduct && (
                            <TouchableOpacity
                                style={styles.showAllButton}
                                onPress={clearProductFilter}
                            >
                                <Icon name="eye" size={16} color={Colors.light.primary} />
                                <Text style={styles.showAllButtonText}>Show all requests</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />

        </View>
    );
};

// Styles
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
        marginTop: 10,
        fontSize: 15,
        color: '#6B7280',
        fontWeight: '500',
        lineHeight: 20,
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingTop: 40,
        paddingBottom: 16,
        paddingLeft: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerTitleSection: {
        flex: 1,
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.7,
        lineHeight: 36,
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: 15,
        color: '#64748B',
        fontWeight: '600',
        lineHeight: 20,
        letterSpacing: -0.1,
    },

    bulkActionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    bulkActionsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bulkActionsLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 12,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        marginLeft: 10,
        color: '#111827',
        fontWeight: '500',
        lineHeight: 20,
    },
    filterContainer: {
        marginBottom: 10,
        marginHorizontal: 12,
    },
    filterContent: {
        padding: 6,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
        height: 36,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    activeFilterButton: {
        backgroundColor: Colors.light.primary,
        borderColor: Colors.light.primary,
        shadowColor: Colors.light.primary,
        shadowOpacity: 0.2,
    },
    filterButtonText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
        lineHeight: 18,
        letterSpacing: -0.1,
    },
    activeFilterButtonText: {
        color: '#FFFFFF',
    },
    filterCount: {
        fontSize: 10,
        color: '#9CA3AF',
        marginLeft: 6,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 18,
        textAlign: 'center',
        lineHeight: 14,
        fontWeight: '700',
    },
    filterCountActive: {
        color: Colors.light.primary,
        backgroundColor: '#FFFFFF',
    },
    list: {
        flex: 1,
        paddingHorizontal: 16,
    },
    listContent: {
        paddingBottom: 100,
        paddingTop: 2,
    },
    requestItemContainer: {
        flexDirection: 'row',
        marginBottom: 10,
        gap: 8,
    },
    externalSelectionButton: {
        padding: 6,
        height: 35,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    externalSelectedButton: {
        backgroundColor: Colors.light.primary,
        borderColor: Colors.light.primary,
    },
    requestItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        flex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
        overflow: 'hidden',
    },
    requestContent: {
        padding: 16,
    },
    requestHeader: {
        marginBottom: 10,
    },
    titleSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        flex: 1,
        marginRight: 10,
        lineHeight: 22,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 6,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
        gap: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'capitalize',
        lineHeight: 14,
    },
    detailsRow: {
        marginBottom: 6,
    },
    buyerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buyerName: {
        fontSize: 13,
        color: '#6B7280',
        marginLeft: 5,
        fontWeight: '500',
        lineHeight: 18,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    location: {
        fontSize: 12,
        color: '#6B7280',
        marginLeft: 5,
        flex: 1,
        lineHeight: 16,
    },
    quantityPriceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    quantitySection: {
        flex: 1,
    },
    quantityLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '500',
        marginBottom: 2,
    },
    quantityValue: {
        fontSize: 13,
        color: '#111827',
        fontWeight: '600',
    },
    priceSection: {
        flex: 1,
        alignItems: 'flex-end',
    },
    priceLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '500',
        marginBottom: 2,
    },
    priceValue: {
        fontSize: 13,
        color: Colors.light.primary,
        fontWeight: '600',
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 5,
    },
    messageText: {
        fontSize: 12,
        color: '#6B7280',
        marginLeft: 5,
        flex: 1,
        lineHeight: 16,
    },
    responseSection: {
        backgroundColor: '#F0F9FF',
        padding: 10,
        borderRadius: 8,
    },
    responseLabel: {
        fontSize: 12,
        color: '#0369A1',
        fontWeight: '600',
        marginBottom: 4,
    },
    responseText: {
        fontSize: 11,
        color: '#0369A1',
        lineHeight: 16,
        marginBottom: 2,
    },
    bottomRow: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    date: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
        marginTop: 8,
        flex: 1,
        textAlign: 'right',
        lineHeight: 16,
    },
    actionButtons: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 10,
    },
    respondButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#059669',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    actionButtonText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 22,
    },
    emptySubtext: {
        fontSize: 13,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 18,
    },
    // Bulk Management Styles
    bulkManagementContainer: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    bulkManagementHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    manageButton: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginTop: 10,
    },

    manageButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#475569',
        letterSpacing: -0.1,
    },
    manageButtonTextActive: {
        color: Colors.light.primary,
    },
    bulkActions: {
        flexDirection: 'row',
        gap: 12,
    },
    bulkAcceptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#22C55E',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    bulkRejectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    bulkActionText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: -0.1,
    },
    // Selection and Action Button Styles
    acceptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#22C55E',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    rejectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    profileButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    messageButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    filterBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        marginTop: 4,
        backgroundColor: `${Colors.light.primary}15`,
        borderWidth: 1,
        borderColor: `${Colors.light.primary}30`,
        gap: 6,
        alignSelf: 'flex-start',
        maxWidth: '80%',
    },
    filterBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        flexShrink: 1,
        color: Colors.light.primary,
        lineHeight: 16,
    },
    filterBadgeClose: {
        padding: 3,
        borderRadius: 8,
        backgroundColor: `${Colors.light.primary}20`,
    },
    clearFilterContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    clearFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${Colors.light.primary}15`,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: `${Colors.light.primary}30`,
        gap: 6,
        alignSelf: 'flex-start',
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,

    },
    clearFilterTextContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    clearFilterText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.light.primary,
        flexShrink: 1,
        backgroundColor: 'transparent',
    },
    showAllText: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
        backgroundColor: 'transparent',
    },
    showAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 16,
        gap: 6,
    },
    showAllButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default FarmerRequestsScreen;
