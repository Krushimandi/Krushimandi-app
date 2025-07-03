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

const { width } = Dimensions.get('window');

const ProductDetailsFarmer = ({ route, navigation }) => {
  // Get product from route params (passed from FarmerHomeScreen)
  const product = route?.params?.product;
  
  // State for image carousel
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const imageScrollRef = useRef(null);

  // Mock multiple images - in real app, this would come from product data
  const productImages = product?.images || [
    product?.image,
    // You can add fallback images or use the same image multiple times for demo
    product?.image,
    product?.image,
    product?.image,
  ].filter(Boolean);

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
    const soldAmount = Math.round(quantityValue * parseFloat(product.available.replace(/[^\d.]/g, '')));
    const estimatedRevenue = soldAmount * parseFloat(product.price.replace(/[^\d.]/g, ''));
    
    const details = {
      productId: product.id,
      saleType,
      saleAmount,
      quantitySold: quantity,
      quantityValue,
      soldAmount: `${soldAmount} kg`,
      originalQuantity: product.available,
      estimatedRevenue: `₹${estimatedRevenue.toLocaleString()}`,
      saleDate: new Date().toISOString(),
      finalPrice: product.price
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
          
          {/* Status Badge */}
          {product.status === 'active' && (
            <View style={styles.statusBadge}>
              {/* <View style={styles.statusIndicator} /> */}
              <Text style={styles.statusText}>Active</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <View style={styles.productTitleContainer}>
              <Text style={styles.productName}>{product.name}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{product.category}</Text>
              </View>
            </View>
            
            <View style={styles.priceContainer}>
              <Text style={styles.currentPrice}>{product.price}</Text>
              {product.originalPrice && (
                <Text style={styles.originalPrice}>{product.originalPrice}</Text>
              )}
            </View>
          </View>

          {/* Enhanced Product Stats with better visuals */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="eye-outline" size={20} color="#1976D2" />
              </View>
              <Text style={styles.statNumber}>{product.views}</Text>
              <Text style={styles.statLabel}>Views Today</Text>
              <Text style={styles.statTrend}>+12% ↗️</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#E8F5E8' }]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="mail-outline" size={20} color="#388E3C" />
              </View>
              <Text style={styles.statNumber}>{product.inquiries}</Text>
              <Text style={styles.statLabel}>Inquiries</Text>
              <Text style={styles.statTrend}>
                {product.inquiries > 5 ? '🔥 Hot' : product.inquiries > 2 ? '📈 Good' : '🌱 Growing'}
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="time-outline" size={20} color="#F57C00" />
              </View>
              <Text style={styles.statNumber}>{product.listedDate}</Text>
              <Text style={styles.statLabel}>Days Active</Text>
              <Text style={styles.statTrend}>⭐ Fresh</Text>
            </View>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Product Details</Text>
          
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="location" size={20} color={Colors.light.success} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{product.location}</Text>
              </View>
            </View>
            
            <View style={styles.detailDivider} />
            
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="cube" size={20} color={Colors.light.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Available Quantity</Text>
                <Text style={styles.detailValue}>{product.available}</Text>
              </View>
            </View>

            {product.rating && (
              <>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="star" size={20} color="#FFD700" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Rating</Text>
                    <Text style={styles.detailValue}>{product.rating}/5.0</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {product.status === 'active' ? (
          <>
            <TouchableOpacity 
              style={styles.inquiriesButton}
              onPress={handleViewRequests}
            >
              {product.inquiries > 0 && (
                <View style={styles.inquiriesBadge}>
                  <Text style={styles.inquiriesBadgeText}>{product.inquiries}</Text>
                </View>
              )}
              <Ionicons name="mail-outline" size={20} color="#FFF" style={styles.buttonIcon} />
              <Text style={styles.inquiriesButtonText}>
                {product.inquiries > 0 ? 'View Inquiries' : 'No Inquiries'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={handleRemoveFromListing}
            >
              <Ionicons name="eye-off-outline" size={20} color="#FFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.soldButton}
              onPress={handleMarkSold}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={styles.buttonIcon} />
              <Text style={styles.soldButtonText}>Mark Sold</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            style={styles.relistButton}
            onPress={() => Alert.alert('Relist Product', 'This feature would allow you to make the product active again.')}
          >
            <Ionicons name="refresh-outline" size={20} color="#FFF" style={styles.buttonIcon} />
            <Text style={styles.relistButtonText}>Relist Product</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
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
    elevation: 2,
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
    backgroundColor: Colors.light.success ,
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
    backgroundColor: Colors.light.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
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
  originalPrice: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textDecorationLine: 'line-through',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  statTrend: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.success,
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
    flexDirection: 'row',
    padding: 20,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
    gap: 12,
  },
  inquiriesButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  inquiriesBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: Colors.light.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  inquiriesBadgeText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: '700',
  },
  inquiriesButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  removeButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  soldButton: {
    flex: 1,
    backgroundColor: Colors.light.success,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  soldButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  relistButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    borderRadius: 12,
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
