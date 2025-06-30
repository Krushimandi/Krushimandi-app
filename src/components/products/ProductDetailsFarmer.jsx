import React from 'react';
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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';

const { width } = Dimensions.get('window');

const ProductDetailsFarmer = ({ route, navigation }) => {
  // Sample product data - in real app this would come from props/API
  const defaultProduct = {
    id: 1,
    name: 'Kashmiri Apple',
    category: 'Apple',
    price: 50,
    unit: 'KG',
    rating: 4.6,
    reviewCount: 46,
    description: 'Kashmiri Apple from Alshpur, Jammu. Available quantity: 10-12 Tons',
    location: 'Alshpur, Jammu',
    availableQuantity: '10-12 Tons',
    image: require('../../assets/Apple.png'),
    isLive: true,
    daysAgo: 3,
    analytics: {
      totalViews: 245,
      viewsChange: 15,
      favorites: 18,
      favoritesChange: 3,
      buyerRequests: 5,
      requestsChange: 2,
      performance: 12,
    },
    availableSizes: ['1 kg', '500 gm', '2 kg']
  };

  const product = route?.params?.product || defaultProduct;
  
  // Ensure analytics exists with fallback values
  const analytics = product.analytics || {
    totalViews: 245,
    viewsChange: 15,
    favorites: 18,
    favoritesChange: 3,
    buyerRequests: 5,
    requestsChange: 2,
    performance: 12,
  };

  const handleViewRequests = () => {
    // Navigate to requests screen
    navigation.navigate('RequestsScreen', { productId: product.id });
  };

  const handleDelete = () => {
    // Handle delete product
    console.log('Delete product');
  };

  const handleEdit = () => {
    // Navigate to edit product screen
    navigation.navigate('EditProduct', { product });
  };

  const handleShare = () => {
    // Handle share product
    console.log('Share product');
  };

  const handleComplete = () => {
    // Handle complete/mark as sold
    console.log('Mark product as complete/sold');
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
        
        <Text style={styles.headerTitle}>My Product</Text>
        
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Ionicons name="share-outline" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
            <Ionicons name="create-outline" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image source={product.image} style={styles.productImage} />
          
          {/* Live Badge */}
          {product.isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveIndicator} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          )}
          
          {/* Days Ago Badge */}
          <View style={styles.daysBadge}>
            <Ionicons name="time-outline" size={12} color={Colors.light.textSecondary} />
            <Text style={styles.daysText}>{product.daysAgo} days ago</Text>
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productPrice}>₹{product.price}/{product.unit}</Text>
          </View>
          
          <Text style={styles.productCategory}>{product.category}</Text>
        </View>

        {/* Performance Analytics */}
        <View style={styles.analyticsSection}>
          <View style={styles.analyticsHeader}>
            <Text style={styles.analyticsTitle}>Performance Analytics</Text>
          </View>

          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCard}>
              <View style={styles.analyticsIcon}>
                <Ionicons name="eye-outline" size={24} color={Colors.light.success} />
              </View>
              <Text style={styles.analyticsNumber}>{analytics.totalViews}</Text>
              <Text style={styles.analyticsLabel}>Total Views</Text>
            </View>

            <View style={styles.analyticsCard}>
              <View style={styles.analyticsIcon}>
                <Ionicons name="heart-outline" size={24} color="#FF6B6B" />
              </View>
              <Text style={styles.analyticsNumber}>{analytics.favorites}</Text>
              <Text style={styles.analyticsLabel}>Favorites</Text>
            </View>

            <View style={styles.analyticsCard}>
              <View style={styles.analyticsIcon}>
                <Ionicons name="mail-outline" size={24} color="#FFA726" />
              </View>
              <Text style={styles.analyticsNumber}>{analytics.buyerRequests}</Text>
              <Text style={styles.analyticsLabel}>Buyer Requests</Text>
            </View>
          </View>

          {/* Performance Message */}
          <View style={styles.performanceMessage}>
            <Ionicons name="trending-up" size={16} color={Colors.light.success} />
            <Text style={styles.performanceMessageText}>
              Excellent performance! Your product is trending upward with increased buyer interest.
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        {/* Available Sizes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Sizes</Text>
          <View style={styles.sizesContainer}>
            {product.availableSizes.map((size, index) => (
              <View key={index} style={styles.sizeChip}>
                <Text style={styles.sizeText}>{size}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Location & Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location & Availability</Text>
          
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={20} color={Colors.light.success} />
            <Text style={styles.locationText}>{product.location}</Text>
          </View>
          
          <View style={styles.locationRow}>
            <Ionicons name="cube-outline" size={20} color={Colors.light.success} />
            <Text style={styles.locationText}>Available: {product.availableQuantity}</Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={styles.viewRequestsButton}
          onPress={handleViewRequests}
        >
          <View style={styles.requestsBadge}>
            <Text style={styles.requestsBadgeText}>{analytics.buyerRequests}</Text>
          </View>
          <Text style={styles.viewRequestsText}>View Requests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={24} color={Colors.light.background} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.completeButton}
          onPress={handleComplete}
        >
          <Ionicons name="checkmark-outline" size={24} color={Colors.light.background} />
        </TouchableOpacity>
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
    // elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 1000,
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
  },
  productImage: {
    width: width,
    height: width * 0.6,
    resizeMode: 'cover',
  },
  liveBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.background,
    marginRight: 6,
  },
  liveText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: '600',
  },
  daysBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  daysText: {
    color: Colors.light.background,
    fontSize: 12,
    marginLeft: 4,
  },
  productInfo: {
    padding: 16,
  },
  productHeader: {
    flexDirection: 'row',
    justifiContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.success,
  },
  productCategory: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: 12,
  },
  analyticsSection: {
    padding: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    marginTop: 8,
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  analyticsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  analyticsNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  performanceMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.success,
  },
  performanceMessageText: {
    fontSize: 14,
    color: Colors.light.success,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    lineHeight: 24,
  },
  sizesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sizeChip: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  sizeText: {
    fontSize: 14,
    color: Colors.light.success,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 100,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  viewRequestsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    marginRight: 12,
    position: 'relative',
  },
  requestsBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: Colors.light.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestsBadgeText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: '600',
  },
  viewRequestsText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  completeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProductDetailsFarmer;