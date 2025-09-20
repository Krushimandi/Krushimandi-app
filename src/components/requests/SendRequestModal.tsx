/**
 * SendRequestModal Component
 * Modal for buyers to send requests to farmers
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';
import { CreateRequestInput } from '../../types/Request';



const { width } = Dimensions.get('window');

interface SendRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (request: CreateRequestInput) => Promise<void>;
  product: {
    id: string;
    name: string;
    price: number;
    priceUnit: string;
    availability_date: string; // ISO date string
    farmerName: string;
    quantity: [number, number];
  };
}

const SendRequestModal: React.FC<SendRequestModalProps> = ({
  visible,
  onClose,
  onSend,
  product,
}) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);





  // const [selectedQuantity, setSelectedQuantity] = useState(product.quantity[0]);

  //   // useEffect(() => {
  //   //   setSelectedQuantity(product.quantity[0]);
  //   // }, [product]);




  // Format quantity range display
  const formatQuantityRange = (quantity: [number, number]) => {
    if (quantity[0] === 0 && quantity[1] === 0) {
      return "0 tons";
    }
    if (quantity[0] === quantity[1]) {
      return `${quantity[0]} tons`;
    }
    return `${quantity[0]}-${quantity[1]} tons`;
  };


  const handleSend = async () => {
    const quantityRange = product.quantity;

    if (quantityRange[0] <= 0 && quantityRange[1] <= 0) {
      Alert.alert('Invalid Product', 'This product has no available quantity');
      return;
    }

    try {
      setLoading(true);

      const request: CreateRequestInput = {
        productId: product.id,
        quantity: quantityRange,
        quantityUnit: 'ton',
        message: message.trim(),
      };



      await onSend(request);

      // Reset form
      setMessage('');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to send request. Please try again.');
    } finally {
      setLoading(false);
    }
  };





  // const incrementQuantity = () => {
  //   if (selectedQuantity < product.quantity[1]) {
  //     setSelectedQuantity(selectedQuantity + 1);
  //   }
  // };
  // const decrementQuantity = () => {
  //   if (selectedQuantity > product.quantity[0]) {
  //     setSelectedQuantity(selectedQuantity - 1);
  //   }
  // };






  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Send Request</Text>
              <Text style={styles.subtitle}>to {product.farmerName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Product Info */}
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>
                ₹{product.price}/{product.priceUnit}
              </Text>
              <Text style={styles.productQuantity}>
                Available from: {new Date(product.availability_date).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
              <Text style={styles.farmerName}>
                Farmer: {product.farmerName}
              </Text>
            </View>

            {/* Request Info  */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Request Details</Text>
              <View style={styles.requestInfo}>
                <Text style={styles.requestLabel}>Quantity to Request:</Text>
                <Text style={styles.requestValue}>{formatQuantityRange(product.quantity)}</Text>
                <Text style={styles.requestNote}>
                  You are requesting the full available quantity
                </Text>
              </View>
            </View>


            {/* 


<View style={styles.section}>
              <Text style={styles.sectionTitle}>Request Details</Text>
              <View style={styles.requestInfo}>
                <Text style={styles.requestLabel}>Quantity to Request:</Text>
                <View style={styles.quantityRow}>
                  <TouchableOpacity
                    style={[
                      styles.quantityButton,
                      selectedQuantity <= product.quantity[0] && styles.quantityButtonDisabled,
                    ]}
                    onPress={decrementQuantity}
                    disabled={selectedQuantity <= product.quantity[0]}
                  >
                    <Icon name="remove-circle-outline" size={28} color={selectedQuantity <= product.quantity[0] ? "#D1D5DB" : Colors.light.primary} />
                  </TouchableOpacity>
                  <Text style={styles.quantityValue}>{selectedQuantity} ton{selectedQuantity > 1 ? 's' : ''}</Text>
                  <TouchableOpacity
                    style={[
                      styles.quantityButton,
                      selectedQuantity >= product.quantity[1] && styles.quantityButtonDisabled,
                    ]}
                    onPress={incrementQuantity}
                    disabled={selectedQuantity >= product.quantity[1]}
                  >
                    <Icon name="add-circle-outline" size={28} color={selectedQuantity >= product.quantity[1] ? "#D1D5DB" : Colors.light.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.requestNote}>
                  Select the quantity you want to request (between {product.quantity[0]} and {product.quantity[1]} tons)
                </Text>
              </View>
            </View> 

 */}




            {/* Message */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Message (Optional)</Text>
              <TextInput
                style={styles.messageInput}
                value={message}
                onChangeText={(t) => {
                  if (t.length <= 60) setMessage(t);
                }}
                placeholder="Add any specific requirements or notes... (max 60 chars)"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#9CA3AF"
                maxLength={60}
              />
              <View style={styles.charCounterRow}>
                <Text style={styles.charCounterText}>{message.length}/60</Text>
              </View>
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={[styles.sendButton, loading && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="paper-plane" size={20} color="#FFFFFF" />
                  <Text style={styles.sendButtonText}>Send Request</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  productInfo: {
    padding: 20,
    backgroundColor: '#F9FAFB',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  productPrice: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  productQuantity: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
  farmerName: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  requestInfo: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  requestLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  requestValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 8,
  },
  requestNote: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
  },
  charCounterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    marginBottom: 4,
  },
  charCounterText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },





  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    gap: 16,
  },
  quantityButton: {
    padding: 4,
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.primary,
    minWidth: 60,
    textAlign: 'center',
  },
});

export default SendRequestModal;
