import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Fruits } from '../../constants/Fruits';
import { authFlowManager } from '../../services/authFlowManager';
import { updateUserInFirestore, getUserFromAsyncStorage, saveUserToAsyncStorage, cleanupUnusedBuyerFields } from '../../services/firebaseService';
import { auth } from '../../config/firebaseModular';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

interface FruitsScreenProps {
  navigation?: any;
  route?: any;
}

const FruitsScreen: React.FC<FruitsScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();

  const categories = [
    { type: 'Banana', labelKey: 'fruits.banana' },
    { type: 'Orange', labelKey: 'fruits.orange' },
    { type: 'Grape', labelKey: 'fruits.grape' },
    { type: 'Pomegranate', labelKey: 'fruits.pomegranate' },
    { type: 'Sweet Lemon', labelKey: 'fruits.sweetLemon' },
    { type: 'Apple', labelKey: 'fruits.apple' },
    { type: 'Mango', labelKey: 'fruits.mango' },
  ];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFruits, setSelectedFruits] = useState<number[]>([]);
  // Treat as onboarding when explicitly requested via route OR when user has no saved preferences yet
  const [isOnboarding, setIsOnboarding] = useState<boolean>(!!(route?.params?.onboarding || route?.params?.mode === 'auth' || route?.params?.fromAuth));

  // Load user's current preferred fruits when screen loads
  React.useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const localUser = await getUserFromAsyncStorage();
        const preferredFruits = (localUser as any)?.PreferedFruits || [];

        // Convert fruit names to IDs
        const fruitIds = Fruits
          .filter(fruit => preferredFruits.includes(fruit.name))
          .map(fruit => fruit.id);

        setSelectedFruits(fruitIds);

        // If user has no preferred fruits stored, we are in onboarding flow
        setIsOnboarding(prev => prev || !(preferredFruits && preferredFruits.length > 0));
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    };

    loadUserPreferences();
  }, []);

  const filteredFruits = Fruits.filter(fruit =>
    fruit.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFruitSelection = (fruitId: number) => {
    setSelectedFruits(prev =>
      prev.includes(fruitId)
        ? prev.filter(id => id !== fruitId)
        : [...prev, fruitId]
    );
  };

  const handleContinue = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.warn('No authenticated user found while saving preferred fruits');
      }

      // Derive selected fruit names from ids
      const selectedFruitNames = Fruits.filter(f => selectedFruits.includes(f.id)).map(f => f.name);

      // Load local user data to know role and merge locally
      const localUser: any = await getUserFromAsyncStorage();
      const userRole = (localUser as any)?.userRole || 'buyer';

      if (user?.uid) {
        try {
          await updateUserInFirestore(user.uid, userRole, { PreferedFruits: selectedFruitNames });
          // Clean up old/unused fields for buyers
          if (userRole === 'buyer') {
            await cleanupUnusedBuyerFields(user.uid);
          }
        } catch (e) {
          console.warn('Failed to update Firestore for preferred fruits, will keep local only for now:', e);
        }
      }

      // Save into local cache immediately for offline-first UX
      await saveUserToAsyncStorage({
        ...(localUser || {}),
        uid: user?.uid || (localUser as any)?.uid,
        displayName: (localUser as any)?.displayName,
        firstName: (localUser as any)?.firstName,
        lastName: (localUser as any)?.lastName,
        phoneNumber: (localUser as any)?.phoneNumber,
        userRole,
        profileImage: (localUser as any)?.profileImage,
        isProfileComplete: true,
        PreferedFruits: selectedFruitNames,
      } as any);

      // Route after saving based on context
      if (isOnboarding) {
        // Completing onboarding: mark auth as complete and go to main buyer home
        await authFlowManager.updateFlowState('complete');
        try {
          const { useAuthStore } = await import('../../store/authStore');
          const uid = user?.uid || (localUser as any)?.uid;
          if (uid) {
            useAuthStore.setState((prev: any) => ({
              isAuthenticated: true,
              user: {
                ...(prev.user || {}),
                id: uid,
                userType: 'buyer',
              },
            }));
          }
        } catch { }

        // Navigate to main app
        navigation?.reset?.({ index: 0, routes: [{ name: 'Main' }] });
      } else if (navigation && navigation.canGoBack()) {
        // Editing from within the main app: just go back
        navigation.goBack();
      } else {
        // Default safety: try to go to main
        await authFlowManager.updateFlowState('complete');
        navigation?.reset?.({ index: 0, routes: [{ name: 'Main' }] });
      }
    } catch (error) {
      console.error('❌ Error completing auth flow:', error);
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header with Back Button */}
      <View style={styles.headerContainer}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.titleText}>Choose Your Favorite Fruits</Text>
        </View>
        {/* <Text style={styles.subtitleText}>Select fruits you're interested in buying</Text> */}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#B0B0B0" style={styles.icon} />
        <TextInput
          placeholder={t('buyerHome.searchPlaceholder')}
          placeholderTextColor="#B0B0B0"
          style={styles.input}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Fruit Grid */}
      {filteredFruits.length > 0 ? (
        <FlatList
          data={filteredFruits}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.gridContainer}
          renderItem={({ item }) => {
            const isSelected = selectedFruits.includes(item.id);
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  { backgroundColor: item.bgColor },
                  isSelected && styles.selectedCard
                ]}
                onPress={() => handleFruitSelection(item.id)}
              >
                <Image source={item.image} style={styles.image} />
                <Text style={styles.name}>{t(categories.find(c => c.type === item.name)?.labelKey)}</Text>

                {isSelected && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark" size={20} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <View style={styles.noResultsContainer}>
          <Ionicons name="search-outline" size={64} color="#B0B0B0" />
          <Text style={styles.noResultsTitle}>No fruits found</Text>
          <Text style={styles.noResultsSubtitle}>
            {searchQuery
              ? `No fruits match "${searchQuery}". Try a different search term.`
              : "No fruits available at the moment."
            }
          </Text>
          {searchQuery && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchText}>Clear search</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Continue Button */}
      <View style={styles.continueContainer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueText}>
            {navigation && navigation.canGoBack() ? t('profileEdit.saveButton') : 'Continue to Home'}
          </Text>
        </TouchableOpacity>
        {(!navigation || !navigation.canGoBack()) && (
          <TouchableOpacity style={styles.skipButton} onPress={handleContinue}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default FruitsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 40,
  },
  headerContainer: {
    paddingHorizontal: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 45,
    height: 45,
    borderRadius: 18,
    marginRight: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 46,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  icon: {
    marginHorizontal: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 8,
    color: '#000',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: '48%',
    height: 200,
  },
  image: {
    width: '100%',
    height: 100,
    borderRadius: 16,
    margin: 20,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },

  gridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 20,
    backgroundColor: '#F9F9F9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  continueText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    alignItems: 'center',
  },
  skipText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
    backgroundColor: '#F9F9F9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  clearSearchButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  clearSearchText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
