/**
 * FruitTypeSelector Component
 * A reusable component for selecting supported fruit types
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  FlatList,
  Modal,
  Pressable
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Fruits } from '../../constants/Fruits';

const FruitTypeSelector = ({ 
  selectedType, 
  onTypeSelect, 
  visible, 
  onClose,
  title = "Select Fruit Type" 
}) => {
  const renderFruitItem = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.fruitItem,
        selectedType === item.name.toLowerCase() && styles.selectedFruitItem
      ]}
      onPress={() => {
        onTypeSelect(item.name.toLowerCase());
        onClose();
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.fruitImageContainer, { backgroundColor: item.bgColor }]}>
        <Image source={item.image} style={styles.fruitImage} resizeMode="contain" />
      </View>
      <View style={styles.fruitInfo}>
        <Text style={styles.fruitName}>{item.name}</Text>
        <Text style={styles.fruitDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.fruitPrice}>{item.price}</Text>
      </View>
      {selectedType === item.name.toLowerCase() && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={24} color="#007E2F" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666666" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.subtitle}>
          Choose from our {Fruits.length} supported fruit categories
        </Text>
        
        <FlatList
          data={Fruits}
          renderItem={renderFruitItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  fruitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedFruitItem: {
    borderColor: '#007E2F',
    borderWidth: 2,
    backgroundColor: '#F8FFF8',
  },
  fruitImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  fruitImage: {
    width: 40,
    height: 40,
  },
  fruitInfo: {
    flex: 1,
  },
  fruitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  fruitDescription: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    marginBottom: 4,
  },
  fruitPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007E2F',
  },
  selectedIndicator: {
    marginLeft: 8,
  },
});

export default FruitTypeSelector;
