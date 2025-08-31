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
import { setAuthStep } from '../../utils/authFlow';
import { updateUserInFirestore, getUserFromAsyncStorage, saveUserToAsyncStorage, cleanupUnusedBuyerFields } from '../../services/firebaseService';
import { auth } from '../../config/firebase';

interface FruitsScreenProps {
  navigation?: any;
}

const FruitsScreen: React.FC<FruitsScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFruits, setSelectedFruits] = useState<number[]>([]);

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

      // Complete the auth flow
      await setAuthStep('Complete');
      console.log('✅ Buyer fruits selection saved and auth completed');
    } catch (error) {
      console.error('❌ Error completing auth flow:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Choose Your Favorite Fruits</Text>
      <Text style={styles.subtitle}>Select fruits you're interested in buying</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#B0B0B0" style={styles.icon} />
        <TextInput
          placeholder="Search"
          placeholderTextColor="#B0B0B0"
          style={styles.input}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Fruit Grid */}
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
              <Text style={styles.name}>{item.name}</Text>
              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark" size={20} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Continue Button */}
      <View style={styles.continueContainer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueText}>Continue to Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleContinue}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
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
  greeting: {
    fontSize: 16,
    color: '#777',
  },
  greetingName: {
    fontWeight: 'bold',
    color: '#000',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    paddingHorizontal: 22,
    marginBottom: 8,
    marginTop: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 40,
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
    // backgroundColor: item.bgColor,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 16,
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
    padding: 20,
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
});
