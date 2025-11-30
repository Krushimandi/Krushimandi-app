import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  TouchableWithoutFeedback
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';
import {
  formatPrice,
  formatFruitQuantity,
  formatLocation
} from '../../utils/formatters';
import { useRequests } from '../../hooks/useRequests';
import { updateFruitStatus } from '../../services/fruitService';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Modal, TextInput, Share } from 'react-native';

import { updateFruit } from '../../services/fruitService';
import { firestore } from '../../config/firebaseModular';
import { useTranslation } from 'react-i18next';
import { categories } from 'utils/fruitCategories';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const ProductDetailsFarmer = ({ route, navigation }) => {
  const { t, i18n } = useTranslation();
  // Get product from route params (passed from FarmerHomeScreen)
  // Use local state for product to enable UI updates
  const initialProduct = route?.params?.product;
  const [productState, setProductState] = useState(initialProduct);
  const product = productState;



  // Get request management functions
  const { getProductRequestCounts } = useRequests();

  // State for image carousel
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const imageScrollRef = useRef(null);

  // State for request count
  const [requestCount, setRequestCount] = useState(0);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  // Use image URLs from the new schema
  const productImages = productState?.image_urls || [product?.image].filter(Boolean);

  const insets = useSafeAreaInsets();

  const QUANTITY_OPTIONS = useMemo(() => {
    const ton = t('units.ton_other');
    return [
      `1-2 ${ton}`,
      `3-5 ${ton}`,
      `6-9 ${ton}`,
      `10-12 ${ton}`,
      `13-15 ${ton}`,
      `16-20 ${ton}`,
      `20+ ${ton}`,
    ];
  }, [t, i18n.language]);

  const [showQuantityOptions, setShowQuantityOptions] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Mounted flag to avoid setState after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // useEffect(() => {
  //   if (productState) {
  //     setEditFields({
  //       name: productState.name || '',
  //       availability_date: productState.availability_date || '',
  //       description: productState.description || '',
  //       quantity: productState.quantity ? productState.quantity[1].toString() : '',
  //       price: productState.price_per_kg ? productState.price_per_kg.toString() : '',
  //     });
  //   }
  // }, [productState]);

  // const getQuantityOptionFromRange = (quantity) => {
  //   if (!Array.isArray(quantity) || quantity.length !== 2) return '';

  //   const [min, max] = quantity;

  //   // Find matching option from QUANTITY_OPTIONS
  //   const matchingOption = QUANTITY_OPTIONS.find(opt => {
  //     const nums = opt.match(/\d+/g);
  //     if (!nums) return false;
  //     if (nums.length === 2) {
  //       // For ranges like "3-5 tons"
  //       return parseInt(nums[0]) === min && parseInt(nums[1]) === max;
  //     } else {
  //       // For "20+ tons"
  //       return parseInt(nums[0]) === max;
  //     }
  //   });

  //   return matchingOption || '';
  // };

  const getQuantityOptionFromRange = (quantity) => {
    if (!Array.isArray(quantity) || quantity.length !== 2) return '';

    const [min, max] = quantity;
    const ton = t('units.ton_other');

    // Match the range to a predefined option (localized unit)
    if (max <= 2) return `1-2 ${ton}`;
    if (max <= 5) return `3-5 ${ton}`;
    if (max <= 9) return `6-9 ${ton}`;
    if (max <= 12) return `10-12 ${ton}`;
    if (max <= 15) return `13-15 ${ton}`;
    if (max <= 20) return `16-20 ${ton}`;
    return `20+ ${ton}`;
  };

  useEffect(() => {
    if (productState) {
      setEditFields({
        name: productState.name || '',
        availability_date: productState.availability_date || '',
        description: productState.description || '',
        quantity: getQuantityOptionFromRange(productState.quantity),
        price: productState.price_per_kg ? productState.price_per_kg.toString() : '',
      });
    }
  }, [productState]);

  const [editFields, setEditFields] = useState({
    name: '',
    availability_date: '',
    description: '',
    quantity: '',
    price: '',
  });

  const [editModalVisible, setEditModalVisible] = useState(false);

  // Load request counts when component mounts
  useEffect(() => {
    const loadRequestCounts = async () => {
      if (productState?.id) {
        try {
          setIsLoadingRequests(true);
          const counts = await getProductRequestCounts([product.id]);
          const productCount = counts.find(c => c.productId === productState.id);
          // One-time fallback; will be overridden by live snapshot if available
          if (isMountedRef.current) setRequestCount(productCount?.count || 0);
        } catch (error) {
          console.error('Error loading request counts:', error);
          if (isMountedRef.current) setRequestCount(0);
        } finally {
          if (isMountedRef.current) setIsLoadingRequests(false);
        }
      } else {
        if (isMountedRef.current) setIsLoadingRequests(false);
      }
    };

    loadRequestCounts();
  }, [product?.id, getProductRequestCounts]);

  // Live sync views and requestCount from the fruit document (single source of truth)
  useEffect(() => {
    if (!product?.id) return;
    const unsub = firestore
      .collection('fruits')
      .doc(product.id)
      .onSnapshot(
        (doc) => {
          if (!doc?.exists) return;
          const data = doc.data() || {};
          // Sync views to local product state
          const newViews = typeof data.views === 'number' ? data.views : 0;
          if (isMountedRef.current && newViews !== (productState?.views ?? 0)) {
            setProductState(prev => ({ ...prev, views: newViews }));
          }
          // We will prefer live query of pending requests below; keep doc.requestCount as a soft fallback only
          if (typeof data.requestCount === 'number' && !isMountedRef.current) {
            // no-op: guarded; pending snapshot effect will set the visible value
          }
        },
        (error) => {
          console.error('❌ Product snapshot error:', error);
        }
      );
    return () => { unsub && unsub(); };
  }, [product?.id, productState?.views, isLoadingRequests]);

  // Live pending requests count (mirrors Buyer logic that counts PENDING only)
  useEffect(() => {
    if (!product?.id) return;
    const q = firestore
      .collection('requests')
      .where('productId', '==', product.id)
      .where('status', '==', 'pending');
    const unsub = q.onSnapshot(
      (snap) => {
        if (!isMountedRef.current) return;
        setRequestCount(snap.size || 0);
        if (isLoadingRequests) setIsLoadingRequests(false);
      },
      (error) => {
        console.error('❌ Pending requests snapshot error:', error);
      }
    );
    return () => { unsub && unsub(); };
  }, [product?.id, isLoadingRequests]);

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
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#E0E0E0" />
          <Text style={styles.errorText}>{t('product.farmerDetail.errors.notFound')}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
          </TouchableOpacity>
        </View>
        {renderEditModal()}
      </SafeAreaView>
    );
  }


  const handleFruitStatusUpdate = async (fruitId, newStatus) => {
    try {
      console.log('🔄 Updating fruit status...', { fruitId, newStatus });
      await updateFruitStatus(fruitId, newStatus);
      // Update local product state so UI reflects change immediately
      setProductState(prev => ({ ...prev, status: newStatus }));
      const msgKey = newStatus === 'sold'
        ? 'product.farmerDetail.toast.markedSold'
        : newStatus === 'inactive'
          ? 'product.farmerDetail.toast.deactivated'
          : 'product.farmerDetail.toast.updated';
      Alert.alert(t('common.success'), t(msgKey));
    } catch (error) {
      console.error('❌ Error updating fruit status:', error);
      Alert.alert(t('alerts.errorTitle'), error?.message || '');
    }
  };

  // const handleEdit = () => {
  //   // Navigate to edit product screen
  //   Alert.alert(
  //     'Edit Product',
  //     'Edit product functionality would be implemented here.',
  //     [{ text: 'OK' }]
  //   );
  // };

  const handleEdit = () => {
    setEditModalVisible(true);
  };



  // const handleSaveEdit = async () => {
  //   try {
  //     const updatedProduct = {
  //       ...productState,
  //       name: editFields.name,
  //       availability_date: editFields.availability_date,
  //       description: editFields.description,
  //       quantity: [0, parseFloat(editFields.quantity)],
  //       price_per_kg: parseFloat(editFields.price),
  //     };

  //     await updateFruitStatus(productState.id, undefined, updatedProduct);
  //     setProductState(updatedProduct);
  //     setEditModalVisible(false);
  //     Toast.show({
  //       type: 'success',
  //       text1: 'Product updated successfully!',
  //       position: 'bottom',
  //     });
  //   } catch (error) {
  //     console.error('Error updating product:', error);
  //     Alert.alert('Error', 'Failed to update product');
  //   }
  // };




  // const handleSaveEdit = async () => {
  //   try {
  //     // basic validation
  //     if (!editFields.name || !editFields.quantity) {
  //       Alert.alert('Validation', 'Please provide a name and quantity.');
  //       return;
  //     }

  //     // parse max quantity from label or number
  //     let maxQty = 0;
  //     const qtyLabel = String(editFields.quantity || '').trim();
  //     const nums = qtyLabel.match(/\d+/g);
  //     if (nums && nums.length) {
  //       maxQty = Math.max(...nums.map(n => parseFloat(n)));
  //     } else {
  //       maxQty = parseFloat(qtyLabel) || 0;
  //     }

  //     const price = parseFloat(String(editFields.price || '').replace(/[^0-9.]/g, '')) || 0;
  //     const minQty = Array.isArray(productState?.quantity) ? productState.quantity[0] : 0;

  //     // build payload (use null for empty strings, avoid undefined)
  //     const payload = {
  //       name: (editFields.name || '').trim(),
  //       availability_date: editFields.availability_date ? String(editFields.availability_date) : null,
  //       description: editFields.description ? editFields.description.trim() : null,
  //       quantity: [minQty, maxQty],
  //       price_per_kg: price,
  //     };

  //     // sanitize payload: remove undefined by JSON round-trip
  //     const cleanPayload = JSON.parse(JSON.stringify(payload));

  //     console.log('handleSaveEdit -> cleanPayload:', cleanPayload, 'productId:', productState?.id);

  //     let updatedFromServer = null;

  //     // Preferred: try updateFruit (if implemented)
  //     if (typeof updateFruit === 'function') {
  //       try {
  //         updatedFromServer = await updateFruit(productState.id, cleanPayload);
  //         console.log('updateFruit response:', updatedFromServer);
  //       } catch (err) {
  //         console.warn('updateFruit failed, will fallback to updateFruitStatus:', err);
  //       }
  //     }

  //     // Fallback: use updateFruitStatus but ensure we DO NOT pass undefined as the status parameter.
  //     // Pass current product status so update function doesn't write `status: undefined`
  //     if (!updatedFromServer) {
  //       try {
  //         const currentStatus = productState?.status ?? null; // keep existing status or null
  //         await updateFruitStatus(productState.id, currentStatus, cleanPayload);
  //         console.log('updateFruitStatus succeeded for id:', productState.id);
  //       } catch (err) {
  //         console.error('updateFruitStatus failed:', err);
  //         throw err;
  //       }
  //     }

  //     // Merge server response (if any) or apply local sanitized payload
  //     const updatedProduct = (updatedFromServer && typeof updatedFromServer === 'object')
  //       ? { ...productState, ...updatedFromServer }
  //       : { ...productState, ...cleanPayload };

  //     // Update UI and close modal
  //     setProductState(updatedProduct);
  //     setEditModalVisible(false);

  //     Toast.show({
  //       type: 'success',
  //       text1: 'Product updated successfully!',
  //       position: 'bottom',
  //       visibilityTime: 1500,
  //     });
  //   } catch (error) {
  //     console.error('Error updating product (handleSaveEdit):', error);
  //     Alert.alert('Error', 'Failed to update product. ' + (error?.message || 'Please try again.'));
  //   }
  // };




  const parseQuantityRange = (rangeString) => {
    const matches = rangeString.match(/(\d+)-?(\d+)?/);
    if (matches) {
      if (matches[2]) {
        // Range like "3-5 tons"
        return [parseInt(matches[1]), parseInt(matches[2])];
      } else {
        // Single number like "20+" tons
        return [parseInt(matches[1]), parseInt(matches[1])];
      }
    }
    return [0, 0]; // fallback
  };



  const handleSaveEdit = async () => {
    try {
      if (!editFields.name || !editFields.quantity) {
        Alert.alert(t('validation.title'), t('product.farmerDetail.validation.nameQuantityRequired'));
        return;
      }

      // Parse quantity range from selected option
      const [minQty, maxQty] = parseQuantityRange(editFields.quantity);

      // build payload with the quantity range
      const payload = {
        name: (editFields.name || '').trim(),
        availability_date: editFields.availability_date ? String(editFields.availability_date) : null,
        description: editFields.description ? editFields.description.trim() : null,
        quantity: [minQty, maxQty], // Now storing both min and max
        price_per_kg: parseFloat(String(editFields.price || '').replace(/[^0-9.]/g, '')) || 0,
      };

      // Clean payload and update in Firestore
      const cleanPayload = JSON.parse(JSON.stringify(payload));

      console.log('handleSaveEdit -> cleanPayload:', cleanPayload, 'productId:', productState?.id);

      let updatedFromServer = null;

      if (typeof updateFruit === 'function') {
        try {
          updatedFromServer = await updateFruit(productState.id, cleanPayload);
          console.log('updateFruit response:', updatedFromServer);
        } catch (err) {
          console.warn('updateFruit failed, will fallback to updateFruitStatus:', err);
        }
      }

      if (!updatedFromServer) {
        try {
          const currentStatus = productState?.status ?? null;
          await updateFruitStatus(productState.id, currentStatus, cleanPayload);
          console.log('updateFruitStatus succeeded for id:', productState.id);
        } catch (err) {
          console.error('updateFruitStatus failed:', err);
          throw err;
        }
      }

      const updatedProduct = (updatedFromServer && typeof updatedFromServer === 'object')
        ? { ...productState, ...updatedFromServer }
        : { ...productState, ...cleanPayload };

      setProductState(updatedProduct);
      setEditModalVisible(false);

      Toast.show({
        type: 'success',
        text1: t('product.farmerDetail.toast.updated'),
        position: 'bottom',
        visibilityTime: 1500,
      });
    } catch (error) {
      console.error('Error updating product (handleSaveEdit):', error);
      Alert.alert(
        t('alerts.errorTitle'),
        `${t('product.farmerDetail.errors.updateFailed')} ${error?.message ? `(${error.message})` : ''}`.trim()
      );
    }
  };


  const handleShare = async () => {
    try {
      // Localized share content
      const perKg = t('units.perKg');
      const productDescription = `🍎 ${t('product.farmerDetail.share.forSale', { name: product.name })}

📍 ${t('product.farmerDetail.share.location', { location: product.location ? formatLocation(product.location) : t('product.farmerDetail.placeholders.locationNA') })}
💰 ${t('product.farmerDetail.share.price', { price: formatPrice(product.price_per_kg || 0), perKg })}
📦 ${t('product.farmerDetail.share.quantity', { quantity: product.quantity ? formatFruitQuantity(product.quantity) : (product.available || t('product.farmerDetail.placeholders.notSpecified')) })}
🌱 ${t('product.farmerDetail.share.type', { type: product.type ? (product.type.charAt(0).toUpperCase() + product.type.slice(1)) : (product.category || t('fruits.generic')) })}

${product.description ? `📝 ${t('product.farmerDetail.share.description', { description: product.description })}\n` : ''}📅 ${t('product.farmerDetail.share.available', { date: product.availability_date ? new Date(product.availability_date).toLocaleDateString() : t('product.farmerDetail.share.availableNow') })}

${t('product.farmerDetail.share.contact')}

#FreshFruits #DirectFromFarmer #Krushimandi`;

      const shareOptions = {
        title: t('product.farmerDetail.share.title', { name: product.name, tagline: t('product.farmerDetail.share.tagline') }),
        message: productDescription,
        url: product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : undefined,
      };

      const result = await Share.share(shareOptions);

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared via specific activity type (iOS)
          console.log('Shared via:', result.activityType);
        } else {
          // Shared successfully (Android)
          console.log('Product shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        // Share dialog was dismissed
        console.log('Share dialog dismissed');
      }
    } catch (error) {
      console.error('Error sharing product:', error);
      Alert.alert(
        t('product.farmerDetail.share.errorTitle'),
        t('product.farmerDetail.share.errorMessage'),
        [{ text: t('common.ok') }]
      );
    }
  };

  const handleViewRequests = () => {
    // Navigate back to the tabs and then to the Requests tab with filter parameters
    navigation.navigate('FarmerTabs', {
      screen: 'Requests',
      params: {
        filterByProduct: product.id,
        productName: product.name
      }
    });
  };

  const handleRemoveFromListing = () => {
    Alert.alert(
      t('product.farmerDetail.alerts.markAsSoldTitle'),
      t('product.farmerDetail.alerts.markAsSoldMessage'),
      [
        { text: t('product.farmerDetail.alerts.cancel'), style: 'cancel' },
        {
          text: t('product.farmerDetail.alerts.markAsSold'),
          style: 'destructive',
          onPress: async () => {
            try {
              await updateFruitStatus(product.id, 'sold')
                .then(() => setProductState(prev => ({ ...prev, status: 'sold' })))
                .catch(error => Alert.alert(t('alerts.errorTitle'), error?.message || ''));

              Toast.show({
                type: 'success',
                text1: t('product.farmerDetail.alerts.saleRecordedTitle'),
                position: 'bottom',
                visibilityTime: 1000,
              });

            } catch (error) {
              Alert.alert(t('alerts.errorTitle'), error?.message || '');
            }
          }
        }
      ]
    );
  };

  const handleMarkSold = () => {
    Alert.alert(
      t('product.farmerDetail.alerts.markAsSoldTitle'),
      t('product.farmerDetail.alerts.provideDetails'),
      [
        { text: t('product.farmerDetail.alerts.cancel'), style: 'cancel' },
        {
          text: t('product.farmerDetail.alerts.provideDetails'),
          onPress: () => showSoldDetailsModal()
        }
      ]
    );
  };

  const showSoldDetailsModal = () => {
    Alert.alert(
      t('product.farmerDetail.alerts.saleCompletedTitle'),
      t('product.farmerDetail.alerts.saleCompletedMessage'),
      [
        {
          text: t('product.farmerDetail.alerts.soldViaApp'),
          onPress: () => handleSaleComplete('app_inquiry')
        },
        {
          text: t('product.farmerDetail.alerts.soldDirect'),
          onPress: () => handleSaleComplete('direct_sale')
        },
        {
          text: t('product.farmerDetail.alerts.soldLocalMarket'),
          onPress: () => handleSaleComplete('local_market')
        },
        {
          text: t('product.farmerDetail.alerts.cancel'),
          style: 'cancel',
          onPress: async () => {
            // Optionally, mark as sold if user cancels
            // await updateFruitStatus(product.id, 'sold');
            // setProductState(prev => ({ ...prev, status: 'sold' }));
          }
        }
      ]
    );
  };

  const handleSaleComplete = (saleType) => {
    const saleTypeText = saleType === 'app_inquiry'
      ? t('product.farmerDetail.alerts.soldViaApp')
      : saleType === 'direct_sale'
        ? t('product.farmerDetail.alerts.soldDirect')
        : t('product.farmerDetail.alerts.soldLocalMarket');

    Alert.alert(
      t('product.farmerDetail.alerts.saleDetailsTitle'),
      `${t('product.farmerDetail.alerts.saleDetailsTitle')}: ${saleTypeText}`,
      [
        {
          text: t('product.farmerDetail.alerts.partialSale', 'Partial Sale'),
          onPress: () => showQuantitySelector(saleType, 'partial')
        },
        {
          text: t('product.farmerDetail.alerts.completeSale', 'Complete Sale'),
          onPress: () => showQuantitySelector(saleType, 'complete')
        },
        {
          text: t('product.farmerDetail.alerts.back'),
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

    const availableQtyText = product.available || formatFruitQuantity(product.quantity || [0, 0]);
    Alert.alert(
      t('product.farmerDetail.alerts.saleQuantityTitle'),
      t('product.farmerDetail.alerts.saleQuantityMessage', { available: availableQtyText }),
      [
        ...quantityOptions,
        {
          text: t('product.farmerDetail.alerts.back'),
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
    updateFruitStatus(product.id, 'sold')
      .then(() => setProductState(prev => ({ ...prev, status: 'sold' })))
      .catch(error => Alert.alert('Error', 'Failed to mark as sold: ' + error.message));
    Alert.alert(
      t('product.farmerDetail.alerts.saleRecordedTitle'),
      t('product.farmerDetail.alerts.saleRecordedMessage'),
      [
        {
          text: t('product.farmerDetail.alerts.done'),
          onPress: () => navigation.goBack()
        }
      ]
    );
    // Enhanced analytics data
    console.log('Enhanced Sale Data:', details);
  };






  const renderEditModal = () => (
    <Modal
      visible={editModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setEditModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => {
        setShowQuantityOptions(false);
        setEditModalVisible(false);
      }}>
        <View style={editModalStyles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={editModalStyles.modalContent}>
              <View style={editModalStyles.handle} />

              <View style={editModalStyles.modalHeader}>
                <Text style={editModalStyles.modalTitle}>{t('product.farmerDetail.modals.editTitle')}</Text>
                <TouchableOpacity
                  onPress={() => setEditModalVisible(false)}
                  style={editModalStyles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={editModalStyles.formContainer} showsVerticalScrollIndicator={false}>
                <Text style={editModalStyles.label}>{t('product.farmerDetail.labels.name')}</Text>
                <TextInput
                  style={editModalStyles.input}
                  value={editFields.name}
                  onChangeText={(text) => setEditFields(prev => ({ ...prev, name: text }))}
                  placeholder={t('product.add.labels.fruitName')}
                />

                <Text style={editModalStyles.label}>{t('product.farmerDetail.labels.availabilityDate')}</Text>
                <TouchableOpacity
                  style={[editModalStyles.input, { justifyContent: 'center' }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: editFields.availability_date ? '#000' : '#9CA3AF' }}>
                    {editFields.availability_date
                      ? new Date(editFields.availability_date).toLocaleDateString()
                      : t('product.farmerDetail.placeholders.selectAvailability')}
                  </Text>
                </TouchableOpacity>

                <Text style={editModalStyles.label}>{t('product.farmerDetail.labels.description')}</Text>
                <TextInput
                  style={[editModalStyles.input, editModalStyles.textArea]}
                  value={editFields.description}
                  onChangeText={(text) => setEditFields(prev => ({ ...prev, description: text }))}
                  placeholder={t('product.farmerDetail.placeholders.productDescription')}
                  multiline
                  numberOfLines={4}
                />

                <Text style={editModalStyles.label}>{t('product.farmerDetail.labels.quantity')}</Text>
                <TouchableOpacity
                  style={[editModalStyles.input, {
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: 48
                  }]}
                  onPress={() => setShowQuantityOptions(!showQuantityOptions)}
                >
                  <Text style={{
                    color: editFields.quantity ? '#000' : '#9CA3AF',
                    fontSize: 16
                  }}>
                    {editFields.quantity || t('product.farmerDetail.placeholders.selectQuantity')}
                  </Text>
                  <Ionicons
                    name={showQuantityOptions ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>

                {showQuantityOptions && (
                  <View style={editModalStyles.dropdownContainer}>
                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                      {QUANTITY_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            editModalStyles.dropdownItem,
                            editFields.quantity === option && { backgroundColor: '#F3F4F6' }
                          ]}
                          onPress={() => {
                            setEditFields(prev => ({ ...prev, quantity: option }));
                            setShowQuantityOptions(false);
                          }}
                        >
                          <Text style={[
                            editModalStyles.dropdownItemText,
                            editFields.quantity === option && {
                              color: Colors.light.primary,
                              fontWeight: '600'
                            }
                          ]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Text style={editModalStyles.label}>{t('product.farmerDetail.labels.pricePerKg')}</Text>
                <View style={editModalStyles.priceInputContainer}>
                  <View style={editModalStyles.priceDisplayBox}>
                    <Text style={editModalStyles.rupeeSymbol}>₹</Text>
                    <TextInput
                      style={editModalStyles.priceInput}
                      value={editFields.price}
                      onChangeText={(text) => {
                        const sanitizedText = text.replace(/[^0-9]/g, '');
                        setEditFields(prev => ({ ...prev, price: sanitizedText }))
                      }}
                      placeholder={t('product.farmerDetail.placeholders.enterPrice')}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <Text style={editModalStyles.perKgText}>{t('units.perKg')}</Text>
                  </View>


                </View>


              </ScrollView>

              <TouchableOpacity
                style={editModalStyles.saveButton}
                onPress={handleSaveEdit}
              >
                <Text style={editModalStyles.saveButtonText}>{t('product.farmerDetail.actions.saveChanges')}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={editFields.availability_date ? new Date(editFields.availability_date) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setEditFields(prev => ({
                        ...prev,
                        availability_date: selectedDate.toISOString()
                      }));
                    }
                  }}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );







  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        backgroundColor="#FFFFFF"
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

        <Text style={styles.headerTitle}>{t('product.farmerDetail.headerTitle')}</Text>

        <View style={styles.headerRight}>
          {product.status === 'active' && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                // Get the quantity option string from current product's quantity array
                const quantityOption = getQuantityOptionFromRange(productState?.quantity);

                // Initialize edit fields with current product data
                setEditFields({
                  name: productState?.name || '',
                  availability_date: productState?.availability_date || '',
                  description: productState?.description || '',
                  quantity: quantityOption, // Use the matched quantity option string
                  price: productState?.price_per_kg ? productState.price_per_kg.toString() : '',
                });
                setEditModalVisible(true);
              }}
            >
              <Ionicons name="create-outline" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          )}
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
                {product.type && <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>
                    {t(categories.find(c => c.type === product.type)?.labelKey)}
                  </Text>
                </View>}
                <View style={[styles.categoryBadge, {
                  backgroundColor: product.status === 'active' ? '#4CAF50' :
                    product.status === 'pending' ? '#FFC107' :
                      product.status === 'sold' ? '#2196F3' :
                        product.status === 'rejected' ? '#F44336' :
                          product.status === 'expired' ? '#FF9800' : Colors.light.primary
                }]}>
                  {/* Status Badge */}
                  <Text style={styles.statusText}>
                    {product.status === 'active' ? 'Active' :
                      product.status === 'pending' ? 'Pending' :
                        product.status === 'sold' ? 'Sold' :
                          product.status === 'rejected' ? 'Rejected' :
                            product.status === 'expired' ? 'Expired' : 'Unknown'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.currentPrice}>{formatPrice(product.price_per_kg || 0)}</Text>
              {/* <Text style={styles.gradeText}>Grade {product.grade || 'A'}</Text> */}
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
              <Text style={styles.statLabel}>{t('product.farmerDetail.stats.views')}</Text>
            </TouchableOpacity>

            {/* Requests Card */}
            <TouchableOpacity
              style={[styles.statCard, styles.inquiriesCard]}
              activeOpacity={0.8}
              onPress={handleViewRequests}
            >
              <View style={[styles.statIconContainer, styles.inquiriesIconContainer]}>
                <Ionicons name="mail" size={24} color="#388E3C" />
              </View>
              <Text style={styles.statNumber}>
                {isLoadingRequests ? '...' : requestCount}
              </Text>
              <Text style={styles.statLabel}>{t('product.farmerDetail.stats.requests')}</Text>
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
              <Text style={styles.statLabel}>{t('product.farmerDetail.stats.daysAgo')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>{t('product.farmerDetail.section.details')}</Text>

          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="location" size={20} color={Colors.light.success} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{t('product.farmerDetail.labels.location')}</Text>
                <Text style={styles.detailValue}>
                  {product.location ? formatLocation(product.location) : t('product.farmerDetail.placeholders.locationNA')}
                </Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="cube" size={20} color={Colors.light.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{t('product.farmerDetail.labels.availableQuantity')}</Text>
                <Text style={styles.detailValue}>
                  {product.quantity ? formatFruitQuantity(product.quantity) : (product.available || t('product.farmerDetail.placeholders.notSpecified'))}
                </Text>
              </View>
            </View>

            {/* <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="ribbon" size={20} color="#9C27B0" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Quality Grade</Text>
                <Text style={styles.detailValue}>Grade {product.grade || 'A'}</Text>
              </View>
            </View> */}

            <View style={styles.detailDivider} />

            {product.type && <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="leaf" size={20} color="#4CAF50" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{t('product.farmerDetail.labels.fruitType')}</Text>
                <Text style={styles.detailValue}>
                  {t(categories.find(c => c.type === product.type)?.labelKey)}
                </Text>
              </View>
            </View>}

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="calendar" size={20} color="#2196F3" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{t('product.farmerDetail.labels.availabilityDate')}</Text>
                <Text style={styles.detailValue}>
                  {product.availability_date ? new Date(product.availability_date).toLocaleDateString() : t('product.detail.placeholders.availableNow')}
                </Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="time" size={20} color="#607D8B" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{t('product.farmerDetail.labels.listedDate')}</Text>
                <Text style={styles.detailValue}>
                  {product.created_at ?
                    t('time.daysAgo', { count: Math.ceil((new Date() - new Date(product.created_at)) / (1000 * 60 * 60 * 24)) }) :
                    t('product.detail.placeholders.unknown')
                  }
                </Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="checkmark-circle" size={20} color={
                  product.status === 'active' ? '#4CAF50' :
                    product.status === 'pending' ? '#FFC107' :
                      product.status === 'sold' ? '#2196F3' :
                        product.status === 'rejected' ? '#F44336' : '#FF9800'
                } />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{t('product.farmerDetail.labels.status')}</Text>
                <Text style={[styles.detailValue, {
                  color: product.status === 'active' ? '#4CAF50' :
                    product.status === 'pending' ? '#FFC107' :
                      product.status === 'sold' ? '#2196F3' :
                        product.status === 'rejected' ? '#F44336' : '#FF9800'
                }]}>
                  {product.status === 'active' ? 'Active' :
                    product.status === 'pending' ? 'Pending Approval' :
                      product.status === 'sold' ? 'Sold' :
                        product.status === 'rejected' ? 'Rejected' :
                          product.status === 'expired' ? 'Expired' : 'Unknown'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Description Section */}
        {
          product.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>{t('product.farmerDetail.section.description')}</Text>
              <View>
                <Text style={styles.descriptionText}>{product.description}</Text>
              </View>
            </View>
          )
        }

        <View style={styles.bottomSpacing} />
      </ScrollView >

      {/* Modern Bottom Actions */}
      <View style={styles.bottomActions}>
        {product.status === 'active' ? (
          <View style={styles.actionsRow}>
            {/* Main Inquiries Button (3x width) */}
            <TouchableOpacity
              style={styles.inquiriesButton}
              onPress={handleViewRequests}
              activeOpacity={0.8}
            >
              <View style={styles.inquiriesButtonContent}>
                <View style={styles.inquiriesIcon}>
                  <Ionicons name="mail-outline" size={20} color="#FFF" />
                </View>
                <View style={styles.inquiriesTextContainer}>
                  <Text style={styles.inquiriesButtonTitle}>
                    {isLoadingRequests
                      ? t('common.loading')
                      : t('product.farmerDetail.actions.viewRequests')
                    }
                  </Text>
                  <Text style={styles.inquiriesButtonSubtitle}>
                    {isLoadingRequests
                      ? t('requests.checkingStatus')
                      : `${requestCount} ${t('buyerProfile.stats.requests')}`
                    }
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Mark as Sold Button */}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={handleRemoveFromListing}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.secondaryButtonText}>{t('product.farmerDetail.actions.sold')}</Text>
            </TouchableOpacity>
          </View>
        ) : product.status === 'pending' ? (
          <View style={styles.actionsRow}>
            <View style={styles.pendingStatusCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="hourglass-outline" size={20} color="#FFC107" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusMessageTitle}>Waiting for Approval</Text>
                  <Text style={styles.statusMessageText}>
                    Your listing is under review.
                  </Text>
                </View>
              </View>
            </View>
            {/* Mark as Sold Button */}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={handleRemoveFromListing}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.secondaryButtonText}>{t('product.farmerDetail.actions.sold')}</Text>
            </TouchableOpacity>
          </View>
        ) : product.status === 'rejected' ? (
          <View style={styles.actionsRow}>
            <View style={styles.rejectedStatusCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="close-circle-outline" size={24} color="#F44336" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusMessageTitle}>Listing Not Approved</Text>
                  <Text style={styles.statusMessageText}>
                    Didn't pass our verification process
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : product.status === 'expired' ? (
          <View style={styles.actionsRow}>
            <View style={styles.expiredStatusCard}>
              <Ionicons name="time-outline" size={24} color="#FF9800" />
              <Text style={styles.statusMessageTitle}>Listing Expired</Text>
              <Text style={styles.statusMessageText}>
                This listing has expired. Create a new listing to continue selling your products.
              </Text>
              <TouchableOpacity
                style={styles.createNewListingButton}
                onPress={() => navigation.navigate('AddFruit')}
                activeOpacity={0.8}
              >
                <Ionicons name="add-outline" size={20} color="#FFF" />
                <Text style={styles.createNewListingButtonText}>Create New Listing</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : product.status === 'sold' ? (
          <View style={styles.actionsRow}>
            <View style={styles.soldStatusCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusMessageTitle}>Product Sold</Text>
                  <Text style={styles.statusMessageText}>
                    This product has been sold successfully.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.relistButton}
            onPress={() => handleFruitStatusUpdate(product?.id, 'active')}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={22} color="#FFF" style={styles.buttonIcon} />
            <Text style={styles.relistButtonText}>{t('product.farmerDetail.actions.relist')}</Text>
          </TouchableOpacity>
        )}
      </View>
      {renderEditModal()}
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
    paddingBottom: 12,
    paddingTop: 12,
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
  statusMessageContainer: {
    flex: 1,
  },
  pendingStatusCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 12,
    flex: 3,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  rejectedStatusCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    padding: 12,
    flex: 1,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  expiredStatusCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  soldStatusCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 16,
    padding: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  statusMessageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  statusMessageText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  createNewListingButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createNewListingButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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

const editModalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end', // push sheet to bottom
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  handle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 6,
  },
  formContainer: {
    maxHeight: '85%',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200, // Keep this height
    ...Platform.select({
      android: {
        elevation: 3,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
    }),
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#374151',
  },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    height: 48,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
    height: '100%',
  },
  perKgText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  recommendationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  recommendationText: {
    marginLeft: 6,
    fontSize: 12,
    color: Colors.light.primary,
    flex: 1,
  },
  priceInputContainer: {
    width: '100%',
  },
  priceDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  rupeeSymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    padding: 0,
    minWidth: 60,
  },
  perKgText: {
    fontSize: 18,
    color: '#6B7280',
    marginLeft: 8,
  },
  suggestedPrices: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  priceOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  selectedPriceOption: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  priceOptionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  selectedPriceOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
});


export default ProductDetailsFarmer;
