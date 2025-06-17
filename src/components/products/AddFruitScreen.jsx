// File: src/components/AddFruitScreen.jsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  SafeAreaView,
  StatusBar
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const AddFruitScreen = ({ navigation }) => {
  const [fruitName, setFruitName] = useState('');
  const [category, setCategory] = useState('mango');
  const [quantity, setQuantity] = useState('10-12 ton');
  const [description, setDescription] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [focusedInput, setFocusedInput] = useState('');
  const [progress] = useState(0.6); // 60% progress for Add Fruit screen

  const scrollViewRef = useRef(null);

  const categories = [
    'mango',
    'apple',
    'banana',
    'orange',
    'grapes',
    'pomegranate',
    'guava',
    'papaya'
  ];

  const quantities = [
    '1-2 ton',
    '3-5 ton',
    '6-9 ton',
    '10-12 ton',
    '13-15 ton',
    '16-20 ton',
    '20+ ton'
  ];

  // Validate form whenever inputs change
  React.useEffect(() => {
    const isValid = fruitName.trim() && category && quantity && description.trim();
    setIsFormValid(isValid);
  }, [fruitName, category, quantity, description]);

  const handleContinue = () => {
    if (isFormValid) {
      console.log('Fruit data:', { fruitName, category, quantity, description });
      Keyboard.dismiss();
      // Handle form submission
    }
  };

  const handleBack = () => {
    navigation.goBack();
  }; return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          bounces={true}
          scrollEventThrottle={16}        >
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
          </View>

          <View style={styles.content}>
            {/* Fruit Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Enter fruit name</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'fruitName' && styles.inputFocused
                ]}
                value={fruitName}
                onChangeText={setFruitName}
                onFocus={() => setFocusedInput('fruitName')}
                onBlur={() => setFocusedInput('')}
                placeholder="e.g mango amba , enter proper name"
                placeholderTextColor="#999999"
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* Category Dropdown */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={styles.dropdownInput}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text style={styles.dropdownText}>{category}</Text>
                <Ionicons name="chevron-down" size={20} color="#666666" />
              </TouchableOpacity>
            </View>

            {/* Available Quantity */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Available Quantity</Text>
              <TouchableOpacity
                style={styles.dropdownInput}
                onPress={() => setShowQuantityModal(true)}
              >
                <Text style={styles.dropdownText}>{quantity}</Text>
                <View style={styles.quantityIconContainer}>
                  <Text style={styles.quantityIcon}>⚖️</Text>
                </View>
              </TouchableOpacity>
            </View>          {/* Description */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description</Text>
              <View style={[
                styles.descriptionContainer,
                focusedInput === 'description' && styles.inputFocused
              ]}>
                <TextInput
                  style={styles.descriptionInput}
                  value={description}
                  onChangeText={setDescription}
                  onFocus={() => setFocusedInput('description')}
                  onBlur={() => setFocusedInput('')}
                  placeholder="Add description..."
                  placeholderTextColor="#999999"
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.infoIcon}>
                  <Ionicons name="information-circle-outline" size={20} color="#999999" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>      {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !isFormValid && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!isFormValid}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>

        {/* Category Modal */}
        <Modal
          transparent={true}
          animationType="slide"
          visible={showCategoryModal}
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Category</Text>
              {categories.map((cat, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.modalOption}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    category === cat && styles.selectedOption
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCategoryModal(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Quantity Modal */}
        <Modal
          transparent={true}
          animationType="slide"
          visible={showQuantityModal}
          onRequestClose={() => setShowQuantityModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Quantity</Text>
              {quantities.map((qty, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.modalOption}
                  onPress={() => {
                    setQuantity(qty);
                    setShowQuantityModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    quantity === qty && styles.selectedOption
                  ]}>
                    {qty}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowQuantityModal(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>            </TouchableOpacity>          </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },  progressContainer: {
    height: 3,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
    marginTop: 5,
    borderRadius: 1.5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00d4aa',
    borderRadius: 1.5,
  },
  scrollView: {
    flex: 1,  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  }, input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000000',
  },
  inputFocused: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  dropdownInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#000000',
  },
  quantityIconContainer: {
    marginLeft: 8,
  },
  quantityIcon: {
    fontSize: 16,
  },
  descriptionContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    minHeight: 100,
    position: 'relative',
  },
  descriptionInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000000',
    minHeight: 100,
  },
  infoIcon: {
    position: 'absolute',
    top: 14,
    right: 16,
  }, buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  continueButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    maxWidth: 300,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#000000',
    textTransform: 'capitalize',
  },
  selectedOption: {
    color: '#007AFF',
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: '#000000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default AddFruitScreen;
