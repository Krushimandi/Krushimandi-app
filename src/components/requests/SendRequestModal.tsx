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
import { useTranslation } from 'react-i18next';



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
  const { t, i18n } = useTranslation();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageError, setMessageError] = useState<string>('');

  // Comprehensive validation function for message content
  const validateMessage = (text: string): { isValid: boolean; error: string } => {
    if (!text.trim()) {
      return { isValid: true, error: '' };
    }

    const trimmedText = text.trim().toLowerCase();

    // Pattern 1: Check for phone numbers (various formats)
    // Matches: 1234567890, +911234567890, 123-456-7890, (123) 456-7890, etc.
    const phonePatterns = [
      /\b\d{10,}\b/, // 10+ consecutive digits
      /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone format with separators
      /\+?\d{1,3}[-.\s]?\d{10}\b/, // International format
      /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/, // (123) 456-7890 format
      /\b\d{5}[-.\s]?\d{5}\b/, // Indian mobile format
      /\b[6-9]\d{9}\b/, // Indian mobile starting with 6-9
    ];

    for (const pattern of phonePatterns) {
      if (pattern.test(text)) {
        return { 
          isValid: false, 
          error: t('requests.errors.phoneNotAllowed', 'Phone numbers are not allowed in messages') 
        };
      }
    }

    // Pattern 2: Check for email addresses
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    if (emailPattern.test(text)) {
      return { 
        isValid: false, 
        error: t('requests.errors.emailNotAllowed', 'Email addresses are not allowed in messages') 
      };
    }

    // Pattern 3: Check for URLs and links
    const urlPatterns = [
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
      /www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/,
      /\b[a-zA-Z0-9-]+\.com\b/i,
      /\b[a-zA-Z0-9-]+\.in\b/i,
      /\b[a-zA-Z0-9-]+\.(org|net|co|io)\b/i,
    ];

    for (const pattern of urlPatterns) {
      if (pattern.test(text)) {
        return { 
          isValid: false, 
          error: t('requests.errors.linksNotAllowed', 'Links and websites are not allowed in messages') 
        };
      }
    }

    // Pattern 4: Check for @ mentions or social media handles
    if (/@\w+/.test(text)) {
      return { 
        isValid: false, 
        error: t('requests.errors.socialMediaNotAllowed', 'Social media handles are not allowed') 
      };
    }

    // Pattern 5: Check for contact-related keywords
    const contactKeywords = [
      'whatsapp', 'wa', 'telegram', 'call me', 'call', 'contact me', 
      'my number', 'my phone', 'reach me', 'dm me', 'direct message',
      'facebook', 'instagram', 'twitter', 'snapchat', 'messenger',
      'gmail', 'yahoo', 'hotmail', 'outlook', 'email me',
      'mob no', 'mobile no', 'phone no', 'contact no',
      'व्हाट्सएप', 'कॉल', 'नंबर', 'संपर्क', // Hindi
      'व्हाट्सअॅप', 'कॉल करा', 'नंबर', 'संपर्क', // Marathi
    ];

    for (const keyword of contactKeywords) {
      if (trimmedText.includes(keyword)) {
        return { 
          isValid: false, 
          error: t('requests.errors.contactInfoNotAllowed', 'Sharing contact information is not allowed') 
        };
      }
    }

    // Pattern 6: Check for excessive numbers (even if not a complete phone number)
    const numberCount = (text.match(/\d/g) || []).length;
    if (numberCount > 6) {
      return { 
        isValid: false, 
        error: t('requests.errors.tooManyNumbers', 'Too many numbers detected in message') 
      };
    }

    // Pattern 7: Check for identity disclosure attempts
    const identityKeywords = [
      'my name is', 'i am', 'call me', 'find me',
      'मेरा नाम', 'मैं हूं', // Hindi
      'माझे नाव', 'मी आहे', // Marathi
    ];

    for (const keyword of identityKeywords) {
      if (trimmedText.includes(keyword)) {
        return { 
          isValid: false, 
          error: t('requests.errors.identityDisclosureNotAllowed', 'Identity disclosure is not allowed') 
        };
      }
    }

    return { isValid: true, error: '' };
  };





  // const [selectedQuantity, setSelectedQuantity] = useState(product.quantity[0]);

  //   // useEffect(() => {
  //   //   setSelectedQuantity(product.quantity[0]);
  //   // }, [product]);




  // Format quantity range display
  const formatQuantityRange = (quantity: [number, number]) => {
    const formatQty = (n: number) => `${n} ${t('units.ton', { count: n })}`;
    if (quantity[0] === 0 && quantity[1] === 0) {
      return formatQty(0);
    }
    if (quantity[0] === quantity[1]) {
      return formatQty(quantity[0]);
    }
    return `${formatQty(quantity[0])} - ${formatQty(quantity[1])}`;
  };


  const handleSend = async () => {
    const quantityRange = product.quantity;

    if (quantityRange[0] <= 0 && quantityRange[1] <= 0) {
      Alert.alert(
        t('requests.noQuantityTitle', 'Invalid Product'),
        t('requests.noQuantityMessage', 'This product has no available quantity')
      );
      return;
    }

    // Validate message before sending
    if (message.trim()) {
      const validation = validateMessage(message);
      if (!validation.isValid) {
        Alert.alert(
          t('alerts.errorTitle', 'Invalid Message'),
          validation.error
        );
        return;
      }
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
      setMessageError('');
      onClose();
    } catch (error) {
      Alert.alert(t('alerts.errorTitle', 'Error'), t('requests.sendError', 'Failed to send request. Please try again.'));
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
              <Text style={styles.title}>{t('requests.sendRequestTitle', 'Send Request')}</Text>
              <Text style={styles.subtitle}>{t('requests.toFarmer', { name: product.farmerName, defaultValue: `to ${product.farmerName}` })}</Text>
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
                {t('requests.availableFrom', 'Available from:')} {new Date(product.availability_date).toLocaleDateString(i18n.language === 'hi' ? 'hi-IN' : i18n.language === 'mr' ? 'mr-IN' : 'en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
              <Text style={styles.farmerName}>
                {t('requests.farmerLabel', 'Farmer:')} {product.farmerName}
              </Text>
            </View>

            {/* Request Info  */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('requests.requestDetailsTitle', 'Request Details')}</Text>
              <View style={styles.requestInfo}>
                <Text style={styles.requestLabel}>{t('requests.quantityToRequest', 'Quantity to Request:')}</Text>
                <Text style={styles.requestValue}>{formatQuantityRange(product.quantity)}</Text>
                <Text style={styles.requestNote}>
                  {t('requests.requestingFull', 'You are requesting the full available quantity')}
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
              <Text style={styles.sectionTitle}>{t('requests.messageOptional', 'Message (Optional)')}</Text>
              <TextInput
                style={[
                  styles.messageInput,
                  messageError && styles.messageInputError
                ]}
                value={message}
                onChangeText={(text) => {
                  if (text.length <= 60) {
                    setMessage(text);
                    const validation = validateMessage(text);
                    setMessageError(validation.error);
                  }
                }}
                placeholder={t('requests.messagePlaceholder', 'Add any specific requirements or notes... (max 60 chars)')}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#9CA3AF"
                maxLength={60}
              />
              {messageError ? (
                <View style={styles.errorRow}>
                  <Icon name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{messageError}</Text>
                </View>
              ) : null}
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
                  <Text style={styles.sendButtonText}>{t('requests.sendRequestButton', 'Send Request')}</Text>
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
    marginBottom: 2,
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
  messageInputError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
    flex: 1,
  },
});

export default SendRequestModal;
