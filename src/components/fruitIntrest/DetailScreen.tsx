import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { Fruit } from '../../types';

type DetailScreenRouteProp = RouteProp<{ DetailScreen: { fruit: Fruit } }, 'DetailScreen'>;

interface Props {
  route: DetailScreenRouteProp;
}

const DetailScreen: React.FC<Props> = ({ route }) => {
  const { fruit } = route.params;

  return (
    <View style={{ flex: 1, backgroundColor: fruit.bgColor }}>
      <Image source={fruit.image} style={styles.image} />

      <View style={styles.detailCard}>
        <View style={styles.namePriceRow}>
          <Text style={styles.fruitName}>{fruit.name}</Text>
          <Text style={styles.fruitPrice}>{fruit.price}</Text>
        </View>

        <Text style={styles.quantity}>1 each × 12 nos.</Text>

        
        <View style={styles.counterRow}>
          <TouchableOpacity style={styles.counterButton}>
            <Text style={styles.counterText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.counterValue}>1</Text>
          <TouchableOpacity style={styles.counterButton}>
            <Text style={styles.counterText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.aboutTitle}>About {fruit.name}</Text>
        <Text style={styles.description}>{fruit.description}</Text>
      </View>
    </View>
  );
};

export default DetailScreen;

const styles = StyleSheet.create({
  image: {
    width: 220,
    height: 220,
    alignSelf: 'center',
    marginTop: 50,
    resizeMode: 'contain',
  },
  detailCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    marginTop: 32,
    flex: 1,
  },
  namePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fruitName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  fruitPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  quantity: {
    fontSize: 16,
    color: '#777',
    marginBottom: 16,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  counterValue: {
    fontSize: 18,
    marginHorizontal: 16,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});
