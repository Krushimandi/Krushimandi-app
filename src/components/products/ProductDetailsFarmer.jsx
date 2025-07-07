import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  FlatList,
  Animated,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';
import {
  formatPrice,
  formatFruitQuantity,
  formatLocation
} from '../../utils/formatters';

const { width } = Dimensions.get('window');

const ProductDetailsFarmer = ({ route, navigation }) => {
  // Get product from route params (passed from FarmerHomeScreen)
  const product = route?.params?.product;

  // State for image carousel
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const imageScrollRef = useRef(null);

  // Use image URLs from the new schema
  const productImages = product?.image_urls || [product?.image].filter(Boolean);

  const onImageScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onImageScrollEnd = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const imageIndex = Math.round(contentOffset / width);
    setCurrentImageIndex(imageIndex);
  };

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#E0E0E0" />
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleEdit = () => {
    // Navigate to edit product screen
    Alert.alert(
      'Edit Product',
      'Edit product functionality would be implemented here.',
      [{ text: 'OK' }]
    );
  };

  const handleShare = () => {
    // Handle share product
    Alert.alert(
      'Share Product',
      'Share functionality would be implemented here.',
      [{ text: 'OK' }]
    );
  };

  const handleViewRequests = () => {
    // Navigate to requests/inquiries screen
    Alert.alert(
      'View Inquiries',
      `You have ${product.inquiries} inquiries for this product.`,
      [{ text: 'OK' }]
    );
  };

  const handleRemoveFromListing = () => {
    Alert.alert(
      'Remove from Public Listing',
      'This will hide your product from public view and move it to history. You can relist it later if needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // Here you would update the product status to 'unlisted' in your backend
            Alert.alert(
              'Product Removed',
              'Your product has been removed from public listing and moved to history.',
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          }
        }
      ]
    );
  };

  const handleMarkSold = () => {
    Alert.alert(
      'Mark as Sold',
      'Please provide details about the sale to help us improve the platform.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Provide Details',
          onPress: () => showSoldDetailsModal()
        }
      ]
    );
  };

  const showSoldDetailsModal = () => {
    Alert.alert(
      '🎉 Sale Completed!',
      'Congratulations on your successful sale! Help us understand how this sale happened to improve our platform:',
      [
        {
          text: '📱 Sold via App Inquiry',
          onPress: () => handleSaleComplete('app_inquiry')
        },
        {
          text: '🤝 Sold Directly/Offline',
          onPress: () => handleSaleComplete('direct_sale')
        },
        {
          text: '🏪 Sold to Local Market',
          onPress: () => handleSaleComplete('local_market')
        },
        {
          text: '❌ Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleSaleComplete = (saleType) => {
    const saleTypeText = saleType === 'app_inquiry'
      ? '📱 through an app inquiry'
      : saleType === 'direct_sale'
        ? '🤝 through direct/offline channels'
        : '🏪 to local market';

    Alert.alert(
      '📊 Sale Details',
      `You mentioned this was sold ${saleTypeText}.\n\nWhat quantity was sold? This helps us provide better market insights.`,
      [
        {
          text: '📦 Partial Sale',
          onPress: () => showQuantitySelector(saleType, 'partial')
        },
        {
          text: '✅ Complete Sale',
          onPress: () => showQuantitySelector(saleType, 'complete')
        },
        {
          text: '← Back',
          style: 'cancel',
          onPress: () => showSoldDetailsModal()
        }
      ]
    );
  };

  const showQuantitySelector = (saleType, saleAmount) => {
    const quantities = [
      { label: '25%', value: 0.25, color: '#FF6B6B' },
      { label: '50%', value: 0.5, color: '#4ECDC4' },
      { label: '75%', value: 0.75, color: '#45B7D1' },
      { label: '100%', value: 1.0, color: '#96CEB4' }
    ];

    const quantityOptions = quantities.map(qty => ({
      text: `${qty.label} (${Math.round(qty.value * parseFloat(product.available.replace(/[^\d.]/g, '')))} kg)`,
      onPress: () => confirmSaleDetails(saleType, saleAmount, qty.label, qty.value)
    }));

    Alert.alert(
      '📊 Sale Quantity',
      `What percentage of your ${product.available} was sold?\n\n💡 This helps us provide better market insights.`,
      [
        ...quantityOptions,
        {
          text: '← Back',
          style: 'cancel',
          onPress: () => handleSaleComplete(saleType)
        }
      ]
    );
  };

  const confirmSaleDetails = (saleType, saleAmount, quantity, quantityValue) => {
    // Use new schema fields
    const availableQuantity = product.quantity ? product.quantity[1] : 0; // max quantity
    const soldAmount = Math.round(quantityValue * availableQuantity);
    const pricePerKg = product.price_per_kg || 0;
    const estimatedRevenue = soldAmount * pricePerKg;

    const details = {
      productId: product.id,
      saleType,
      saleAmount,
      quantitySold: quantity,
      quantityValue,
      soldAmount: `${soldAmount} kg`,
      originalQuantity: formatFruitQuantity(product.quantity || [0, 0]),
      estimatedRevenue: `₹${estimatedRevenue.toLocaleString()}`,
      saleDate: new Date().toISOString(),
      finalPrice: formatPrice(pricePerKg)
    };

    // Here you would send this data to your backend for analytics
    Alert.alert(
      '🎉 Sale Recorded Successfully!',
      `Thank you for the details!\n\n📈 ${quantity} of your ${product.name} (${soldAmount} kg) has been marked as sold.\n💰 Estimated revenue: ₹${estimatedRevenue.toLocaleString()}\n\n✨ This data helps improve our platform and provides better market insights for all farmers.`,
      [
        {
          text: '✅ Done',
          onPress: () => navigation.goBack()
        }
      ]
    );

    // Enhanced analytics data
    console.log('Enhanced Sale Data:', details);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor="transparent"
        translucent={true}
        barStyle="dark-content"
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Product Overview</Text>

        {/* Quick Actions Overlay */}
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
            <Ionicons name="create-outline" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Product Images Carousel */}
        <View style={styles.imageContainer}>
          <FlatList
            ref={imageScrollRef}
            data={productImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onImageScroll}
            onMomentumScrollEnd={onImageScrollEnd}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.imageSlide}>
                <Image
                  source={typeof item === 'string' ? { uri: item } : item}
                  style={styles.productImage}
                />
                {/* Image overlay with gradient */}
                <View style={styles.imageOverlay}>
                  <View style={styles.imageCounter}>
                    <Text style={styles.imageCounterText}>
                      {index + 1} / {productImages.length}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          />

          {/* Image Dots Indicator */}
          {productImages.length > 1 && (
            <View style={styles.dotsContainer}>
              {productImages.map((_, index) => {
                const opacity = scrollX.interpolate({
                  inputRange: [
                    (index - 1) * width,
                    index * width,
                    (index + 1) * width,
                  ],
                  outputRange: [0.3, 1, 0.3],
                  extrapolate: 'clamp',
                });

                const scale = scrollX.interpolate({
                  inputRange: [
                    (index - 1) * width,
                    index * width,
                    (index + 1) * width,
                  ],
                  outputRange: [0.8, 1.2, 0.8],
                  extrapolate: 'clamp',
                });

                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        opacity,
                        transform: [{ scale }],
                      },
                    ]}
                  />
                );
              })}
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <View style={styles.productTitleContainer}>
              <Text style={styles.productName}>{product.name}</Text>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>
                    {product.type ? product.type.charAt(0).toUpperCase() + product.type.slice(1) : (product.category || 'Fruit')}
                  </Text>
                </View>
                <View style={styles.categoryBadge}>
                  {/* Status Badge */}
                  <Text style={styles.statusText}>{product.status.charAt(0).toUpperCase() + product.status.slice(1)}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.priceContainer}>
              <Text style={styles.currentPrice}>{formatPrice(product.price_per_kg || 0)}</Text>
              <Text style={styles.gradeText}>Grade {product.grade || 'A'}</Text>
            </View>
          </View>

          {/* Modern Square Product Stats Cards */}
          <View style={styles.statsContainer}>
            {/* Views Card */}
            <TouchableOpacity
              style={[styles.statCard, styles.viewsCard]}
              activeOpacity={0.8}
              onPress={() => {
                console.log('Views analytics pressed');
              }}
            >
              <View style={[styles.statIconContainer, styles.viewsIconContainer]}>
                <Ionicons name="eye" size={24} color="#1976D2" />
              </View>
              <Text style={styles.statNumber}>{product.views}</Text>
              <Text style={styles.statLabel}>Views</Text>
            </TouchableOpacity>

            {/* Inquiries Card */}
            <TouchableOpacity
              style={[styles.statCard, styles.inquiriesCard]}
              activeOpacity={0.8}
              onPress={() => {
                console.log('Likes pressed');
              }}
            >
              <View style={[styles.statIconContainer, styles.inquiriesIconContainer]}>
                <Ionicons name="heart" size={24} color="#388E3C" />
              </View>
              <Text style={styles.statNumber}>{product.likes || 0}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </TouchableOpacity>

            {/* Days Active Card */}
            <TouchableOpacity
              style={[styles.statCard, styles.daysActiveCard]}
              activeOpacity={0.8}
              onPress={() => {
                console.log('Days active history pressed');
              }}
            >
              <View style={[styles.statIconContainer, styles.daysActiveIconContainer]}>
                <Ionicons name="calendar" size={24} color="#F57C00" />
              </View>
              <Text style={[styles.statNumber, styles.daysActiveStatNumber]}>
                {product.created_at ?
                  Math.ceil((new Date() - new Date(product.created_at)) / (1000 * 60 * 60 * 24)) :
                  (product.listedDate || '0')
                }
              </Text>
              <Text style={styles.statLabel}>Days ago</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Details Section */ }
  <View style={styles.detailsSection}>
    <Text style={styles.sectionTitle}>Product Details</Text>

    <View style={styles.detailCard}>
      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Ionicons name="location" size={20} color={Colors.light.success} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Location</Text>
          <Text style={styles.detailValue}>
            {product.location ? formatLocation(product.location) : 'Location not available'}
          </Text>
        </View>
      </View>

      <View style={styles.detailDivider} />

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Ionicons name="cube" size={20} color={Colors.light.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Available Quantity</Text>
          <Text style={styles.detailValue}>
            {product.quantity ? formatFruitQuantity(product.quantity) : (product.available || 'Not specified')}
          </Text>
        </View>
      </View>

      <View style={styles.detailDivider} />

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Ionicons name="ribbon" size={20} color="#9C27B0" />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Quality Grade</Text>
          <Text style={styles.detailValue}>Grade {product.grade || 'A'}</Text>
        </View>
      </View>

      <View style={styles.detailDivider} />

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Ionicons name="leaf" size={20} color="#4CAF50" />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Fruit Type</Text>
          <Text style={styles.detailValue}>
            {product.type ? product.type.charAt(0).toUpperCase() + product.type.slice(1) : (product.category || 'Not specified')}
          </Text>
        </View>
      </View>

      <View style={styles.detailDivider} />

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Ionicons name="calendar" size={20} color="#2196F3" />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Availability Date</Text>
          <Text style={styles.detailValue}>
            {product.availability_date ? new Date(product.availability_date).toLocaleDateString() : 'Available now'}
          </Text>
        </View>
      </View>

      <View style={styles.detailDivider} />

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Ionicons name="time" size={20} color="#607D8B" />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Listed Date</Text>
          <Text style={styles.detailValue}>
            {product.created_at ? 
              `${Math.ceil((new Date() - new Date(product.created_at)) / (1000 * 60 * 60 * 24))} days ago` : 
              'Unknown'
            }
          </Text>
        </View>
      </View>

      <View style={styles.detailDivider} />

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Ionicons name="checkmark-circle" size={20} color={
            product.status === 'active' ? '#4CAF50' :
              product.status === 'sold' ? '#2196F3' : '#FF9800'
          } />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={[styles.detailValue, {
            color: product.status === 'active' ? '#4CAF50' :
              product.status === 'sold' ? '#2196F3' : '#FF9800'
          }]}>
            {product.status ? product.status.charAt(0).toUpperCase() + product.status.slice(1) : 'Unknown'}
          </Text>
        </View>
      </View>
    </View>
  </View>

  {/* Description Section */ }
  {
    product.description && (
      <View style={styles.descriptionSection}>
        <Text style={styles.sectionTitle}>Description</Text>
        <View>
          <Text style={styles.descriptionText}>{product.description}</Text>
        </View>
      </View>
    )
  }

  <View style={styles.bottomSpacing} />
      </ScrollView >

  {/* Modern Bottom Actions */ }
  < View style = { styles.bottomActions } >
  {
    product.status === 'active' ? (
      <View style={styles.actionsRow}>
        {/* Main Inquiries Button (3x width) */}
        <TouchableOpacity
          style={styles.inquiriesButton}
          onPress={handleViewRequests}
          activeOpacity={0.8}
        >

          {/* Badge */}
          {/* {product.inquiries > 0 && (
                <View style={styles.inquiriesBadge}>
                  <Text style={styles.inquiriesBadgeText}>{product.inquiries}</Text>
                </View>
              )} */}

          <View style={styles.inquiriesButtonContent}>
            <View style={styles.inquiriesIcon}>
              <Ionicons name="mail-outline" size={20} color="#FFF" />
            </View>
            <View style={styles.inquiriesTextContainer}>
              <Text style={styles.inquiriesButtonTitle}>
                {(product.likes || 0) > 0 ? 'View Interest' : 'No Interest Yet'}
              </Text>
              <Text style={styles.inquiriesButtonSubtitle}>
                {(product.likes || 0) > 0
                  ? `${product.likes} buyer${(product.likes || 0) > 1 ? 's' : ''} interested`
                  : 'Buyers will show interest here'
                }
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Secondary Actions (1x width each) */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemoveFromListing}
          activeOpacity={0.8}
        >
          <Ionicons name="eye-off-outline" size={20} color="#FFF" />
          <Text style={styles.secondaryButtonText}>Hide</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.soldButton}
          onPress={handleMarkSold}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
          <Text style={styles.secondaryButtonText}>Sold</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <TouchableOpacity
        style={styles.relistButton}
        onPress={() => Alert.alert('Relist Product', 'This feature would allow you to make the product active again.')}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh-outline" size={22} color="#FFF" style={styles.buttonIcon} />
        <Text style={styles.relistButtonText}>Relist Product</Text>
      </TouchableOpacity>
    )
  }
      </View >
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginVertical: 16,
  },
  backButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  headerRight: {
    flexDirection: 'row',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: Colors.light.backgroundSecondary,
    height: width * 0.7,
  },
  imageSlide: {
    width: width,
    height: width * 0.7,
    position: 'relative',
  },
  productImage: {
    width: width,
    height: width * 0.7,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  imageCounter: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCounterText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: '600',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.background,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionsOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: Colors.light.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.background,
    marginRight: 8,
  },
  statusText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: '700',
  },
  productInfo: {
    padding: 20,
    backgroundColor: Colors.light.background,
  },
  productHeader: {
    marginBottom: 20,
  },
  productTitleContainer: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
    lineHeight: 32,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.background,
    letterSpacing: 0.5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.success,
    marginRight: 12,
  },
  gradeText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  originalPrice: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textDecorationLine: 'line-through',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginHorizontal: -12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    minHeight: 140,
    aspectRatio: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },

  viewsCard: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E3F2FD',
    borderWidth: 1,
  },
  inquiriesCard: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E3F2FD',
    borderWidth: 1,
  },
  daysActiveCard: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E3F2FD',
    borderWidth: 1,
  },
  viewsIconContainer: {
    backgroundColor: '#F8F9FA',
  },
  inquiriesIconContainer: {
    backgroundColor: '#F8F9FA',
  },
  daysActiveIconContainer: {
    backgroundColor: '#FFF3C4',
  },

  detailsSection: {
    padding: 20,
    backgroundColor: Colors.light.background,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 16,
  },
  detailCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '600',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: 8,
  },
  descriptionSection: {
    padding: 20,
    backgroundColor: Colors.light.background,
  },

  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.light.textSecondary,
  },
  analyticsSection: {
    padding: 20,
    backgroundColor: Colors.light.background,
  },
  analyticsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  analyticsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginLeft: 6,
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  insightsSection: {
    padding: 20,
    backgroundColor: Colors.light.background,
  },
  insightCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.success,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: 8,
  },
  insightText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  insightTip: {
    fontSize: 13,
    color: Colors.light.success,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  bottomSpacing: {
    height: 100,
  },
  bottomActions: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    paddingTop: 16,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  inquiriesButton: {
    flex: 3,
    backgroundColor: Colors.light.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    position: 'relative',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  inquiriesButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inquiriesIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inquiriesTextContainer: {
    flex: 1,
  },
  inquiriesButtonTitle: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 1,
  },
  inquiriesButtonSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
  },
  inquiriesBadge: {
    position: 'absolute',
    top: -6,
    right: 12,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.background,
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  inquiriesBadgeText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: '800',
  },
  removeButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  soldButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: Colors.light.success,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    shadowColor: Colors.light.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButtonText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  relistButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  relistButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 4,
  },
  recommendationsContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.primary,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
  recommendationItem: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
    paddingLeft: 8,
  },
  marketInsights: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.success,
  },
  marketTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
  marketText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
    paddingLeft: 8,
  },
});

export default ProductDetailsFarmer;
