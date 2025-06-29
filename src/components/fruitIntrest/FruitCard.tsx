import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Fruit } from '../../types';

type Props = {
  fruit: Fruit;
  onPress: () => void;
};

const FruitCard: React.FC<Props> = ({ fruit, onPress }) => {
  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: fruit.bgColor }]} onPress={onPress}>
      <Image source={fruit.image} style={styles.image} />
      <Text style={styles.name}>{fruit.name}</Text>
      <Text style={styles.price}>{fruit.price}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    margin: 10,
    width: 160,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  price: {
    fontSize: 14,
    color: '#555',
  },
});

export default FruitCard;