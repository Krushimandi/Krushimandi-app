/**
 * Requests Screen
 * Displays all pending buyer connection requests for farmers
 * Farmers can view, filter, and manage connection requests from various buyer types
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  TextInput,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTabBarControl } from '../../utils/navigationControls';
import { useNavigation, NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Layout } from '../../constants';

// Helper function to format category names for display
const formatCategoryName = (category: string): string => {
  switch (category) {
    case 'wholesaler': return 'Wholesaler';
    case 'exporter': return 'Exporter';
    case 'commission_agent': return 'Commission Agent';
    case 'retailer': return 'Retailer';
    case 'transporter': return 'Transporter';
    default: return category.charAt(0).toUpperCase() + category.slice(1);
  }
};

// Helper function to get the appropriate icon for each buyer category
const getBuyerCategoryIcon = (category: string): string => {
  switch (category) {
    case 'wholesaler': return 'business';
    case 'exporter': return 'airplane';
    case 'commission_agent': return 'people';
    case 'retailer': return 'storefront';
    case 'transporter': return 'car';
    default: return 'person';
  }
};

// Helper function to get the color scheme for each buyer category
const getCategoryColorScheme = (category: string): { bg: string; border: string; text: string } => {
  switch (category) {
    case 'wholesaler':
      return {
        bg: 'rgba(33, 150, 243, 0.1)', // Blue
        border: '#2196F3',
        text: '#1565C0'
      };
    case 'exporter':
      return {
        bg: 'rgba(156, 39, 176, 0.1)', // Purple
        border: '#9C27B0',
        text: '#7B1FA2'
      };
    case 'commission_agent':
      return {
        bg: 'rgba(0, 126, 47, 0.1)', // Green
        border: '#4CAF50',
        text: '#2E7D32'
      };
    case 'retailer':
      return {
        bg: 'rgba(255, 87, 34, 0.1)', // Orange-Red
        border: '#FF5722',
        text: '#D84315'
      };
    case 'transporter':
      return {
        bg: 'rgba(0, 150, 136, 0.1)', // Teal
        border: '#009688',
        text: '#00695C'
      };
    default:
      return {
        bg: 'rgba(158, 158, 158, 0.1)', // Grey
        border: '#9E9E9E',
        text: '#616161'
      };
  }
};

// Define interface for request item
interface RequestItem {
  id: string;
  name: string;
  location: string;
  username: string;
  image: any; // Using 'any' for image require statements
  userType?: 'farmer' | 'buyer';
  cropTypes?: string[];
  requestDate?: string;
  category?: 'wholesaler' | 'exporter' | 'commission_agent' | 'retailer' | 'transporter';
}

// Define type for ListRenderItem
interface RenderItemProps {
  item: RequestItem;
}

const dummyData: RequestItem[] = [
  {
    id: '1',
    name: 'Abhi Jadhav',
    location: 'Ahmednagar, MH',
    username: 'abhixjadhav',
    image: require('../../assets/student.jpeg'),
    userType: 'farmer',
    cropTypes: ['Tomatoes', 'Onions'],
    requestDate: '2025-06-20',
    category: 'wholesaler',
  },
  {
    id: '2',
    name: 'Kaveri Patil',
    location: 'Solapur, MH',
    username: '_kaveri_9272',
    image: require('../../assets/student.jpeg'),
    userType: 'buyer',
    requestDate: '2025-06-21',
    category: 'retailer',
  },
  {
    id: '3',
    name: 'Sejal Yadav',
    location: 'Pune, MH',
    username: 'sejalyadav0707',
    image: require('../../assets/student.jpeg'),
    userType: 'farmer',
    cropTypes: ['Wheat', 'Rice'],
    requestDate: '2025-06-22',
    category: 'exporter',
  },
  {
    id: '4',
    name: 'Hakcr34',
    location: 'Unknown',
    username: 'hakcr34',
    image: require('../../assets/student.jpeg'),
    userType: 'buyer',
    requestDate: '2025-06-23',
    category: 'commission_agent',
  },
  {
    id: '5',
    name: 'Rajesh Kumar',
    location: 'Mumbai, MH',
    username: 'rajesh_transport',
    image: require('../../assets/student.jpeg'),
    userType: 'buyer',
    requestDate: '2025-06-22',
    category: 'transporter',
  },
];

const RequestsScreen = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { showTabBar, hideTabBar } = useTabBarControl();
  const [searchText, setSearchText] = useState<string>('');
  const [manageMode, setManageMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [data, setData] = useState<RequestItem[]>(dummyData);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filter, setFilter] = useState<FilterCategory>('all');
  const filteredData = data.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.username.toLowerCase().includes(searchText.toLowerCase());

    // Return all results if filter is set to 'all'
    if (filter === 'all') return matchesSearch;

    // Otherwise filter by category
    return matchesSearch && item.category === filter;
  });

  useFocusEffect(
    useCallback(() => {
      // When screen is focused
      return () => {
        // When screen is unfocused / user navigates away
        console.log('Screen lost focus');
        setManageMode(false);
      };
    }, [])
  );

  useEffect(() => {
    // Explicitly show/hide based on manageMode state
    if (manageMode) {
      hideTabBar(); // Hide when in manage mode
    } else {
      showTabBar(); // Show when not in manage mode
    }
  }, [manageMode, hideTabBar, showTabBar]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      // In a real app, fetch data from Firebase or your backend
      // For now, using dummy data with a delay to simulate loading
      await new Promise(resolve => setTimeout(resolve, 800));
      setData(dummyData);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const toggleSelection = (id: string): void =>
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  const deleteSelected = (): void => {
    setData(prev => prev.filter(item => !selectedIds.includes(item.id)));
    setSelectedIds([]);
    setManageMode(false);
    showTabBar(); // Explicitly show tab bar when exiting manage mode
  };

  const confirmRequest = (id: string, name: string): void => {
    console.log(`Confirmed request for ${name}`);
    // In a real app, update the database
    // Remove the confirmed request from the list
    setData(prev => prev.filter(item => item.id !== id));
  };

  const deleteRequest = (id: string, name: string): void => {
    console.log(`Deleted request for ${name}`);
    // In a real app, update the database
    // Remove the deleted request from the list
    setData(prev => prev.filter(item => item.id !== id));
  };
  const renderItem = ({ item }: RenderItemProps) => {
    const isSelected = selectedIds.includes(item.id);
    const formattedDate = item.requestDate ? new Date(item.requestDate).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) : '';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image source={item.image} style={styles.avatar} />
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.name}</Text>
              {/* Show buyer category as a prominent badge with dynamic colors */}
              {item.category && !manageMode && (() => {
                const colors = getCategoryColorScheme(item.category);
                return (
                  <View style={[
                    styles.categoryBadgeProminent,
                    {
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                    }
                  ]}>
                    <Icon
                      name={getBuyerCategoryIcon(item.category)}
                      size={14}
                      color={colors.text}
                    />
                    <Text style={[
                      styles.categoryTextProminent,
                      { color: colors.text }
                    ]}>
                      {formatCategoryName(item.category)}
                    </Text>
                  </View>
                );
              })()}
            </View>

            <Text style={styles.username}>@{item.username}</Text>

            <View style={styles.locationRow}>
              <Icon name="location-outline" size={12} color={Colors.light.textTertiary} />
              <Text style={styles.location}>{item.location}</Text>
              {formattedDate && (
                <>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.date}>{formattedDate}</Text>
                </>
              )}
            </View>
          </View>

          {manageMode ? (
            <TouchableOpacity
              onPress={() => toggleSelection(item.id)}
              style={[styles.checkbox, isSelected && styles.checked]}
            >
              {isSelected && <Icon name="checkmark" size={16} color="#fff" />}
            </TouchableOpacity>
          ) : null}
        </View>

        {!manageMode && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => confirmRequest(item.id, item.name)}
              activeOpacity={0.7}
            >
              <Icon name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.actionText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteRequest(item.id, item.name)}
              activeOpacity={0.7}
            >
              <Icon name="close-circle" size={18} color="#fff" />
              <Text style={styles.actionText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const hasSelection = selectedIds.length > 0;
  // Filter buttons for switching between user categories  // Filter buttons for switching between user categories
  const FilterButton: React.FC<FilterButtonProps> = ({ label, value, isActive }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        isActive ? {
          backgroundColor: value !== 'all'
            ? getCategoryColorScheme(value).bg
            : 'rgba(0, 126, 47, 0.15)', // Default green for "All" button
          borderColor: value !== 'all'
            ? getCategoryColorScheme(value).border
            : Colors.light.primary
        } : {
          backgroundColor: 'rgba(245, 245, 245, 0.7)',
          borderColor: Colors.light.textTertiary
        }
      ]}
      onPress={() => setFilter(value)}
    >
      {value !== 'all' && (
        <Icon
          name={getBuyerCategoryIcon(value)}
          size={12}
          color={isActive ? getCategoryColorScheme(value).text : Colors.light.textSecondary}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[
        styles.filterButtonText,
        isActive && {
          color: value !== 'all'
            ? getCategoryColorScheme(value).text
            : Colors.light.primary,
          fontWeight: '600'
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
  // Get status bar height
  const statusBarHeight = StatusBar.currentHeight || 0;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={Colors.light.background} barStyle="dark-content" />

      {/* Header - positioned after status bar height */}
      <View style={[styles.header, { marginTop: statusBarHeight }]}>
        <TouchableOpacity style={styles.backButton}
          onPress={() => {
            navigation.goBack();
          }}>
          <Icon name="arrow-back" size={22} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connection Requests</Text>        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => {
            const newManageMode = !manageMode;
            setManageMode(newManageMode);
            setSelectedIds([]);

            // Explicitly control tab bar visibility when button is pressed
            if (newManageMode) {
              hideTabBar(); // Hide when entering manage mode
            } else {
              showTabBar(); // Show when exiting manage mode
            }
          }}
        >
          <Text style={[styles.manageText, manageMode && styles.cancelText]}>
            {manageMode ? 'Cancel' : 'Manage'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color={Colors.light.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests..."
            placeholderTextColor={Colors.light.textTertiary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
              <Icon name="close-circle" size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <FilterButton label="All" value="all" isActive={filter === 'all'} />
          <FilterButton label="Wholesaler" value="wholesaler" isActive={filter === 'wholesaler'} />
          <FilterButton label="Exporter" value="exporter" isActive={filter === 'exporter'} />
          <FilterButton label="Commission Agent" value="commission_agent" isActive={filter === 'commission_agent'} />
          <FilterButton label="Retailer" value="retailer" isActive={filter === 'retailer'} />
          <FilterButton label="Transporter" value="transporter" isActive={filter === 'transporter'} />
        </ScrollView>
      </View>

      {/* List with Refresh Control */}
      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loaderText}>Loading requests...</Text>
        </View>
      ) : (
        <FlatList<RequestItem>
          data={filteredData}
          keyExtractor={(item: RequestItem) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.light.primary]}
              tintColor={Colors.light.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>              <Icon name="people-outline" size={60} color={Colors.light.textTertiary} />
              <Text style={styles.emptyTitle}>No buyer requests found</Text>
              <Text style={styles.emptyMessage}>
                {searchText ? "Try a different search term" : "You don't have any buyer connection requests yet"}
              </Text>
            </View>
          }
        />
      )}      {/* Footer Action Buttons */}
      {manageMode && (
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={[styles.footerBtnAccept, !hasSelection && styles.footerBtnDisabled]}
            onPress={() => {              // Accept all selected requests
              data.forEach(item => {
                if (selectedIds.includes(item.id)) {
                  confirmRequest(item.id, item.name);
                }
              });
              setSelectedIds([]);
              setManageMode(false);
              showTabBar(); // Explicitly show tab bar when exiting manage mode
            }}
            disabled={!hasSelection}
          >
            <Icon name="checkmark-circle" size={18} color={hasSelection ? '#fff' : Colors.light.textTertiary} />
            <Text style={[styles.footerBtnText, !hasSelection && styles.footerBtnTextDisabled]}>
              Accept Selected ({selectedIds.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.footerBtnDelete, !hasSelection && styles.footerBtnDisabled]}
            onPress={deleteSelected}
            disabled={!hasSelection}
          >
            <Icon name="trash-outline" size={18} color={hasSelection ? '#fff' : Colors.light.textTertiary} />
            <Text style={[styles.footerBtnText, !hasSelection && styles.footerBtnTextDisabled]}>
              Delete Selected ({selectedIds.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Define filter categories
type FilterCategory = 'all' | 'wholesaler' | 'exporter' | 'commission_agent' | 'retailer' | 'transporter';

// Define interface for FilterButton props
interface FilterButtonProps {
  label: string;
  value: FilterCategory;
  isActive: boolean;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    padding: Layout.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Layout.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  manageButton: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.md,
    minWidth: 70, // Ensure consistent width
    alignItems: 'center',
  }, manageText: {
    color: Colors.light.primary,
    fontWeight: '600',
    fontSize: Typography.fontSize.sm,
  },
  cancelText: {
    color: Colors.light.error,
  },
  searchContainer: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    backgroundColor: Colors.light.background,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    height: 46,
    paddingHorizontal: Layout.spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: Layout.spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.light.text,
    height: '100%',
  },
  searchIcon: {
    marginLeft: 6,
  },
  clearButton: {
    padding: 4,
  }, filterContainer: {
    paddingBottom: Layout.spacing.sm,
    marginBottom: Layout.spacing.sm,
  },
  filterScrollContent: {
    paddingHorizontal: Layout.spacing.md,
    paddingRight: Layout.spacing.lg, // Extra padding at the end
  }, filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    marginRight: Layout.spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.textTertiary,
    backgroundColor: 'rgba(245, 245, 245, 0.7)', // Semi-transparent background
  },
  activeFilterButton: {
    backgroundColor: 'rgba(0, 126, 47, 0.15)', // Semi-transparent green
    borderColor: Colors.light.primary,
  },
  filterButtonText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  loaderText: {
    marginTop: Layout.spacing.md,
    color: Colors.light.textSecondary,
    fontSize: Typography.fontSize.sm,
  }, listContent: {
    paddingHorizontal: Layout.spacing.md,
    paddingBottom: 180, // Increased to make sure content is not hidden behind action buttons
    paddingTop: Layout.spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    color: Colors.light.textSecondary,
    fontWeight: 'bold',
    marginTop: Layout.spacing.lg,
    marginBottom: Layout.spacing.xs,
  },
  emptyMessage: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textTertiary,
    textAlign: 'center',
    marginHorizontal: Layout.spacing.lg,
  },
  // Card styles
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Layout.spacing.md,
    padding: Layout.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: Layout.spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  name: {
    fontSize: Typography.fontSize.base,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginRight: Layout.spacing.sm,
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  farmerBadge: {
    backgroundColor: Colors.light.primary,
  },
  buyerBadge: {
    backgroundColor: Colors.light.secondary,
  },
  userTypeText: {
    color: Colors.light.background,
    fontSize: Typography.fontSize.xs,
    marginLeft: 2,
    fontWeight: '500',
  }, username: {
    fontSize: Typography.fontSize.xs,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.light.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  location: {
    fontSize: Typography.fontSize.xs,
    color: Colors.light.textTertiary,
    marginLeft: 2,
  },
  dot: {
    marginHorizontal: 4,
    color: Colors.light.textTertiary,
  },
  date: {
    fontSize: Typography.fontSize.xs,
    color: Colors.light.textTertiary,
  },  // Crop styles removed as all requests are from buyers
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Layout.spacing.md,
    paddingTop: Layout.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primaryDark,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    flex: 1,
    marginRight: 8,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.error,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    flex: 1,
    marginLeft: 8,
  },
  actionText: {
    color: Colors.light.background,
    fontSize: Typography.fontSize.sm,
    marginLeft: 6,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checked: {
    backgroundColor: Colors.light.primary,
  }, footerActions: {
    position: 'absolute',
    bottom: 20, // Increased from 20 to 80 to position above bottom navigation
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Layout.spacing.sm,
    zIndex: 10, // Ensure it appears above other elements
  },
  footerBtnAccept: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.light.primary,
    borderRadius: Layout.borderRadius.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  footerBtnDelete: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.light.error,
    borderRadius: Layout.borderRadius.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  footerBtnDisabled: {
    backgroundColor: Colors.light.textTertiary,
  },
  footerBtnText: {
    fontWeight: '600',
    color: Colors.light.background,
    fontSize: Typography.fontSize.sm,
    marginLeft: Layout.spacing.xs,
  }, footerBtnTextDisabled: {
    color: Colors.light.background,
  },  // Category badge styles with semi-transparent backgrounds
  categoryBadgeProminent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  categoryTextProminent: {
    fontSize: Typography.fontSize.xs,
    marginLeft: 4,
    fontWeight: '600',
  },
});

export default RequestsScreen;
