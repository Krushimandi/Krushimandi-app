import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../constants';

interface FruitCardProps {
  item: {
    id: string;
    name: string;
    type: string;
    image_urls?: string[];
    price_per_kg: number;
    quantity: number;
    location: {
      city?: string;
      district?: string;
      state?: string;
    };
  };
  onPress: (item: any) => void;
  formatPrice: (price: number) => string;
  formatFruitQuantity: (quantity: number) => string;
  formatLocation: (location: any) => string;
}

// Optimized FruitCard component to prevent unnecessary re-renders
const FruitCard = memo<FruitCardProps>(({ 
  item, 
  onPress, 
  formatPrice, 
  formatFruitQuantity, 
  formatLocation 
}) => {
  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  return (
    <TouchableOpacity
      style={styles.fruitCard}
      activeOpacity={0.9}
      onPress={handlePress}
    >
      <Image
        source={{ uri: item.image_urls?.[0] || 'https://via.placeholder.com/150' }}
        style={styles.fruitImage}
        defaultSource={require('../assets/fruits.png')}
        resizeMode="cover"
      />
      <View style={styles.fruitDetailsSection}>
        <Text style={styles.fruitName} numberOfLines={1} ellipsizeMode="tail">
          {item.name}
        </Text>
        <Text style={styles.fruitCategory} numberOfLines={1} ellipsizeMode="tail">
          Category: {item.type}
        </Text>
        <View style={styles.locationRow}>
          <Icon name="location-outline" size={12} color="#505050" />
          <Text style={styles.fruitLocation} numberOfLines={1} ellipsizeMode="tail">
            {formatLocation(item.location)}
          </Text>
        </View>
      </View>
      <View style={styles.priceContainer}>
        <Text style={styles.fruitPrice} numberOfLines={1} ellipsizeMode="tail">
          {formatPrice(item.price_per_kg)}
        </Text>
        <Text style={styles.fruitTons} numberOfLines={1} ellipsizeMode="tail">
          {formatFruitQuantity(item.quantity)}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

FruitCard.displayName = 'FruitCard';

const styles = StyleSheet.create({
  fruitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  fruitImage: {
    height: 72,
    width: 72,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#F5F5F5',
  },
  fruitDetailsSection: {
    flex: 1,
    paddingRight: 8,
    justifyContent: 'space-between',
    minHeight: 72,
  },
  fruitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    lineHeight: 20,
  },
  fruitCategory: {
    fontSize: 12,
    color: '#939393',
    marginBottom: 3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginTop: 1,
  },
  fruitLocation: {
    fontSize: 11,
    color: '#505050',
    marginLeft: 3,
    flex: 1,
    marginRight: -40,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  priceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 85,
    paddingLeft: 8,
  },
  fruitPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primaryDark,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    lineHeight: 20,
  },
  fruitTons: {
    fontSize: 10,
    color: '#939393',
    marginTop: 2,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default FruitCard;
