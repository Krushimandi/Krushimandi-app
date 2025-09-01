/**
 * Fruit Service for Firebase Operations
 * Handles fruit data operations with Firestore and Storage
 */

import firestore, { 
  increment as firestoreIncrement, 
  arrayUnion as firestoreArrayUnion, 
  arrayRemove as firestoreArrayRemove, 
  serverTimestamp as firestoreServerTimestamp,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  limit,
  orderBy
} from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fruit } from '../types/fruit';
import { SUPPORTED_FRUIT_TYPES, isValidFruitType } from '../constants/Fruits';
import firebase from '../config/firebase'; // adjust path if different


const FRUITS_COLLECTION = 'fruits';
const FARMERS_COLLECTION = 'farmers';
const BUYERS_COLLECTION = 'buyers';

/**
 * Retry function with exponential backoff for transient errors
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of the function or throws error
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if it's a transient error worth retrying
      const isTransientError = error.code === 'firestore/unavailable' || 
                              error.code === 'firestore/deadline-exceeded' ||
                              error.code === 'firestore/internal' ||
                              error.code === 'firestore/resource-exhausted';
      
      if (!isTransientError || attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`⏳ Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Validate fruit type against supported fruits
 * @param {string} fruitType - Fruit type to validate
 * @returns {boolean} Whether the fruit type is supported
 */
export const validateFruitType = (fruitType) => {
  if (!fruitType || typeof fruitType !== 'string') {
    return false;
  }
  return isValidFruitType(fruitType);
};

/**
 * Get list of supported fruit types
 * @returns {string[]} Array of supported fruit types
 */
export const getSupportedFruitTypes = () => {
  return [...SUPPORTED_FRUIT_TYPES];
};

/**
 * Upload images to Firebase Storage
 * @param {string[]} imageUris - Array of local image URIs
 * @param {string} fruitId - Fruit ID for storage path
 * @returns {Promise<string[]>} Array of download URLs
 */
export const uploadFruitImages = async (imageUris, fruitId) => {
  try {
    console.log('📸 Uploading fruit images...', imageUris.length);
    
    const uploadPromises = imageUris.map(async (uri, index) => {
      if (!uri) return null;
      
      const fileName = `fruit_${fruitId}_${index}_${Date.now()}.jpg`;
      const storageRef = storage().ref(`fruits/${fruitId}/${fileName}`);
      
      // Upload the image
      await storageRef.putFile(uri);
      
      // Get download URL
      const downloadURL = await storageRef.getDownloadURL();
      console.log(`✅ Image ${index + 1} uploaded:`, downloadURL);
      
      return downloadURL;
    });
    
    const downloadURLs = await Promise.all(uploadPromises);
    const validURLs = downloadURLs.filter(url => url !== null);
    
    console.log('📸 All images uploaded successfully:', validURLs.length);
    return validURLs;
  } catch (error) {
    console.error('❌ Error uploading fruit images:', error);
    throw new Error('Failed to upload images: ' + error.message);
  }
};

/**
 * Generate unique fruit ID
 * @returns {string} Unique fruit ID
 */
const generateFruitId = () => {
  const collectionRef = collection(firestore(), FRUITS_COLLECTION);
  const docRef = doc(collectionRef);
  return docRef.id;
};

/**
 * Create new fruit listing
 * @param {Object} fruitData - Fruit data object
 * @param {string[]} imageUris - Array of local image URIs (optional if image_urls already provided)
 * @returns {Promise<string>} Created fruit ID
 */
export const createFruit = async (fruitData, imageUris = []) => {
  try {
    console.log('🍎 Creating new fruit listing...');
    
    // Validate fruit type first
    if (!validateFruitType(fruitData.type)) {
      throw new Error(`Unsupported fruit type: ${fruitData.type}. Supported types: ${getSupportedFruitTypes().join(', ')}`);
    }
    
    // Generate unique ID
    const fruitId = generateFruitId();
    
    // Handle images: use provided Firebase URLs or upload new images
    let imageUrls = [];
    if (fruitData.image_urls && fruitData.image_urls.length > 0) {
      // Images already uploaded to Firebase (from PhotoUploadScreen)
      imageUrls = fruitData.image_urls;
      console.log('📸 Using pre-uploaded Firebase URLs:', imageUrls.length);
    } else if (imageUris && imageUris.length > 0) {
      // Upload local images to Firebase
      imageUrls = await uploadFruitImages(imageUris, fruitId);
      console.log('📸 Uploaded new images to Firebase:', imageUrls.length);
    }
    
    // Prepare fruit document according to schema
    const now = new Date().toISOString();
    const fruitDoc = {
      id: fruitId,
      name: fruitData.name || '',
      type: fruitData.type || '',
      grade: fruitData.grade || 'A',
      description: fruitData.description || '',
      quantity: fruitData.quantity || [0, 0], // [min, max] array
      price_per_kg: fruitData.price_per_kg || 0,
      availability_date: fruitData.availability_date || now,
      image_urls: imageUrls,
      location: fruitData.location || {
        city: '',
        district: '',
        state: '',
        pincode: '',
        lat: 0,
        lng: 0
      },
      farmer_id: fruitData.farmer_id || '',
      status: fruitData.status || 'active',
      views: 0,
      likes: 0,
      created_at: now,
      updated_at: now
    };
    
    // Save to Firestore using modular API
    const fruitsCollectionRef = collection(firestore(), FRUITS_COLLECTION);
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    await setDoc(fruitDocRef, fruitDoc);
    
    // Add fruit ID to farmer's fruit list
    await addFruitToFarmer(fruitDoc.farmer_id, fruitId);
    
    console.log('✅ Fruit created successfully:', fruitId);
    return fruitId;
  } catch (error) {
    console.error('❌ Error creating fruit:', error);
    throw new Error('Failed to create fruit listing: ' + error.message);
  }
};

/**
 * Update existing fruit listing
 * @param {string} fruitId - Fruit ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<void>}
 */
// export const updateFruit = async (fruitId, updateData) => {
//   try {
//     console.log('📝 Updating fruit:', fruitId);
    
//     const updateDoc = {
//       ...updateData,
//       updated_at: new Date().toISOString()
//     };
    
//     const fruitsCollectionRef = collection(firestore(), FRUITS_COLLECTION);
//     const fruitDocRef = doc(fruitsCollectionRef, fruitId);
//     await updateDoc(fruitDocRef, updateDoc);
    
//     console.log('✅ Fruit updated successfully');
//   } catch (error) {
//     console.error('❌ Error updating fruit:', error);
//     throw new Error('Failed to update fruit: ' + error.message);
//   }
// };


export async function updateFruit(id, data = {}) {
  if (!id) throw new Error('Missing fruit id');

  try {
    // Sanitize payload: remove undefined by JSON round-trip
    const cleanPayload = JSON.parse(JSON.stringify(data));

    const docRef = firebase.firestore().collection('fruits').doc(id);

    // Use set with merge to avoid overwriting other fields and to avoid unsupported undefined
    await docRef.set(cleanPayload, { merge: true });

    // Optionally fetch the updated doc (if you want authoritative server values)
    const snapshot = await docRef.get();
    const serverData = snapshot.exists ? snapshot.data() : null;

    return serverData ? { id, ...serverData } : { id, ...cleanPayload };
  } catch (err) {
    console.error('fruitService.updateFruit error:', err);
    throw new Error('Failed to update fruit: ' + (err.message || err));
  }
}





















/**
 * Get fruit by ID
 * @param {string} fruitId - Fruit ID
 * @returns {Promise<Object|null>} Fruit data or null
 */
export const getFruitById = async (fruitId) => {
  try {
    return await retryWithBackoff(async () => {
      const fruitsCollectionRef = collection(firestore(), FRUITS_COLLECTION);
      const fruitDocRef = doc(fruitsCollectionRef, fruitId);
      const docSnapshot = await getDoc(fruitDocRef);
      
      if (docSnapshot.exists()) {
        return { id: docSnapshot.id, ...docSnapshot.data() };
      }
      
      return null;
    });
  } catch (error) {
    console.error('❌ Error getting fruit:', error);
    throw new Error('Failed to get fruit: ' + error.message);
  }
};

/**
 * Get fruits by farmer ID
 * @param {string} farmerId - Farmer ID
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<Object[]>} Array of fruit objects
 */
export const getFruitsByFarmer = async (farmerId, status = null) => {
  try {
    const fruitsCollectionRef = collection(firestore(), FRUITS_COLLECTION);
    let fruitQuery = query(
      fruitsCollectionRef,
      where('farmer_id', '==', farmerId),
      orderBy('created_at', 'desc')
    );
    
    if (status) {
      fruitQuery = query(
        fruitsCollectionRef,
        where('farmer_id', '==', farmerId),
        where('status', '==', status),
        orderBy('created_at', 'desc')
      );
    }
    
    const snapshot = await getDocs(fruitQuery);
    
    const fruits = [];
    snapshot.forEach(doc => {
      fruits.push({ id: doc.id, ...doc.data() });
    });
    
    return fruits;
  } catch (error) {
    console.error('❌ Error getting farmer fruits:', error);
    throw new Error('Failed to get farmer fruits: ' + error.message);
  }
};

/**
 * Get all active fruits for marketplace
 * @param {number} limitCount - Number of fruits to fetch
 * @returns {Promise<Object[]>} Array of fruit objects
 */
export const getMarketplaceFruits = async (limitCount = 20) => {
  try {
    console.log('🔍 getMarketplaceFruits: Starting query...', { limitCount });
    
    const fruits = await retryWithBackoff(async () => {
      const fruitsCollectionRef = collection(firestore(), FRUITS_COLLECTION);
      const fruitsQuery = query(
        fruitsCollectionRef,
        where('status', '==', 'active'),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(fruitsQuery);
      
      console.log('📊 Firestore query result:', {
        size: snapshot.size,
        empty: snapshot.empty,
        collection: FRUITS_COLLECTION
      });
      
      const fruitsData = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const fruit = { id: doc.id, ...data };
        fruitsData.push(fruit);
        console.log('🍎 Found fruit:', {
          id: fruit.id,
          name: fruit.name,
          type: fruit.type,
          status: fruit.status,
          farmer_id: fruit.farmer_id,
          created_at: fruit.created_at
        });
      });
      
      return fruitsData;
    });
    
    console.log('✅ getMarketplaceFruits: Returning', fruits.length, 'fruits');
    return fruits;
  } catch (error) {
    console.error('❌ Error getting marketplace fruits:', error);
    console.error('❌ Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    throw new Error('Failed to get marketplace fruits: ' + error.message);
  }
};

/**
 * Delete fruit listing
 * @param {string} fruitId - Fruit ID
 * @returns {Promise<void>}
 */
export const deleteFruit = async (fruitId) => {
  try {
    console.log('🗑️ Deleting fruit:', fruitId);
    
    // Get fruit data first to delete images
    const fruitDoc = await getFruitById(fruitId);
    
    if (fruitDoc && fruitDoc.image_urls) {
      // Delete images from storage
      const deletePromises = fruitDoc.image_urls.map(async (url) => {
        try {
          const ref = storage().refFromURL(url);
          await ref.delete();
        } catch (error) {
          console.warn('⚠️ Could not delete image:', url, error);
        }
      });
      
      await Promise.all(deletePromises);
    }
    
    // Delete document
    const fruitsCollectionRef = collection(firestore(), FRUITS_COLLECTION);
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    await deleteDoc(fruitDocRef);
    
    // Remove fruit ID from farmer's fruit list
    await removeFruitFromFarmer(fruitDoc.farmer_id, fruitId);
    
    console.log('✅ Fruit deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting fruit:', error);
    throw new Error('Failed to delete fruit: ' + error.message);
  }
};

/**
 * Increment fruit views
 * @param {string} fruitId - Fruit ID
 * @returns {Promise<void>}
 */
export const incrementFruitViews = async (fruitId) => {
  try {
    const fruitsCollectionRef = collection(firestore(), FRUITS_COLLECTION);
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    await updateDoc(fruitDocRef, {
      views: firestoreIncrement(1),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error incrementing views:', error);
    // Don't throw error for views increment failure
  }
};

/**
 * Toggle fruit like
 * @param {string} fruitId - Fruit ID
 * @param {boolean} isLiked - Whether to like or unlike
 * @returns {Promise<void>}
 */
export const toggleFruitLike = async (fruitId, isLiked) => {
  try {
    const fruitsCollectionRef = collection(firestore(), FRUITS_COLLECTION);
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    await updateDoc(fruitDocRef, {
      likes: firestoreIncrement(isLiked ? 1 : -1),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error toggling like:', error);
    throw new Error('Failed to update like: ' + error.message);
  }
};

/**
 * Add fruit ID to farmer's fruit list
 * @param {string} farmerId - Farmer ID
 * @param {string} fruitId - Fruit ID
 * @returns {Promise<void>}
 */
export const addFruitToFarmer = async (farmerId, fruitId) => {
  try {
    console.log('🔗 Adding fruit to farmer\'s list...', { farmerId, fruitId });
    
    const farmersCollectionRef = collection(firestore(), FARMERS_COLLECTION);
    const farmerDocRef = doc(farmersCollectionRef, farmerId);
    await updateDoc(farmerDocRef, {
      fruit_ids: firestoreArrayUnion(fruitId),
      total_fruits: firestoreIncrement(1),
      updatedAt: firestoreServerTimestamp()
    });
    
    console.log('✅ Fruit added to farmer\'s list successfully');
  } catch (error) {
    console.error('❌ Error adding fruit to farmer:', error);
    // Don't throw error here as it's not critical for fruit creation
    console.warn('⚠️ Continuing without farmer update...');
  }
};

/**
 * Remove fruit ID from farmer's fruit list
 * @param {string} farmerId - Farmer ID
 * @param {string} fruitId - Fruit ID
 * @returns {Promise<void>}
 */
export const removeFruitFromFarmer = async (farmerId, fruitId) => {
  try {
    console.log('🔗 Removing fruit from farmer\'s list...', { farmerId, fruitId });
    
    const farmersCollectionRef = collection(firestore(), FARMERS_COLLECTION);
    const farmerDocRef = doc(farmersCollectionRef, farmerId);
    await updateDoc(farmerDocRef, {
      fruit_ids: firestoreArrayRemove(fruitId),
      total_fruits: firestoreIncrement(-1),
      updatedAt: firestoreServerTimestamp()
    });
    
    console.log('✅ Fruit removed from farmer\'s list successfully');
  } catch (error) {
    console.error('❌ Error removing fruit from farmer:', error);
    // Don't throw error here as it's not critical
    console.warn('⚠️ Continuing without farmer update...');
  }
};

/**
 * Get fruits by farmer ID using farmer's fruit_ids array
 * More efficient method that uses the farmer's stored fruit references
 * @param {string} farmerId - Farmer ID
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<Object[]>} Array of fruit objects
 */
export const getFruitsByFarmerOptimized = async (farmerId, status = null) => {
  try {
    console.log('🔍 Getting farmer fruits (optimized)...', { farmerId, status });
    
    // First get farmer's fruit IDs with retry
    const farmerData = await retryWithBackoff(async () => {
      const farmersCollectionRef = collection(firestore(), FARMERS_COLLECTION);
      const farmerDocRef = doc(farmersCollectionRef, farmerId);
      const farmerDoc = await getDoc(farmerDocRef);
      
      if (!farmerDoc.exists()) {
        console.warn('⚠️ Farmer document not found:', farmerId);
        return null;
      }
      
      const data = farmerDoc.data();
      if (!data) {
        console.warn('⚠️ Farmer data is empty:', farmerId);
        return null;
      }
      
      return data;
    });
    
    if (!farmerData) {
      return [];
    }
    
    const fruitIds = farmerData.fruit_ids || [];
    
    if (fruitIds.length === 0) {
      console.log('📝 No fruits found for farmer:', farmerId);
      return [];
    }
    
    // Batch get all fruits by ID with retry for each
    const fruitPromises = fruitIds.map(async (fruitId) => {
      try {
        return await retryWithBackoff(async () => {
          const fruitsCollectionRef = collection(firestore(), FRUITS_COLLECTION);
          const fruitDocRef = doc(fruitsCollectionRef, fruitId);
          const fruitDoc = await getDoc(fruitDocRef);
          
          if (fruitDoc.exists()) {
            const fruitData = { id: fruitDoc.id, ...fruitDoc.data() };
            
            // Filter by status if provided
            if (status && fruitData.status !== status) {
              return null;
            }
            
            return fruitData;
          }
          
          return null;
        });
      } catch (error) {
        console.error('❌ Error getting fruit:', fruitId, error);
        return null;
      }
    });
    
    const fruits = await Promise.all(fruitPromises);
    const validFruits = fruits.filter(fruit => fruit !== null);
    
    // Sort by created_at descending
    validFruits.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA;
    });
    
    console.log('✅ Retrieved farmer fruits:', validFruits.length);
    return validFruits;
  } catch (error) {
    console.error('❌ Error getting farmer fruits (optimized):', error);
    // Fallback to original method
    console.log('🔄 Falling back to original method...');
    return getFruitsByFarmer(farmerId, status);
  }
};

/**
 * Update fruit status (e.g., from 'active' to 'sold' or 'inactive')
 * @param {string} fruitId - Fruit ID
 * @param {string} newStatus - New status ('active', 'sold', 'inactive')
 * @returns {Promise<void>}
 */
export const updateFruitStatus = async (fruitId, newStatus) => {
  try {
    console.log('🔄 Updating fruit status...', { fruitId, newStatus });
    
    const fruitsCollectionRef = collection(firestore(), FRUITS_COLLECTION);
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    await updateDoc(fruitDocRef, {
      status: newStatus,
      updated_at: new Date().toISOString()
    });
    
    console.log('✅ Fruit status updated successfully');
  } catch (error) {
    console.error('❌ Error updating fruit status:', error);
    throw new Error('Failed to update fruit status: ' + error.message);
  }
};

/**
 * Get farmer's public profile and their active fruits (for buyers)
 * @param {string} farmerId - Farmer ID
 * @returns {Promise<Object>} Object containing farmer info and active fruits
 */
export const getFarmerPublicProfile = async (farmerId) => {
  try {
    console.log('👤 Getting farmer public profile...', farmerId);
    
    // Get farmer's basic info with retry
    const farmerData = await retryWithBackoff(async () => {
      const farmersCollectionRef = collection(firestore(), FARMERS_COLLECTION);
      const farmerDocRef = doc(farmersCollectionRef, farmerId);
      const farmerDoc = await getDoc(farmerDocRef);
      
      if (!farmerDoc.exists()) {
        throw new Error('Farmer not found');
      }
      
      return farmerDoc.data();
    });
    
    // Get farmer's active fruits only
    const activeFruits = await getFruitsByFarmerOptimized(farmerId, 'active');
    
    // Return public profile (exclude sensitive data)
    const publicProfile = {
      id: farmerId,
      displayName: farmerData.displayName || `${farmerData.firstName} ${farmerData.lastName}`,
      profileImage: farmerData.profileImage || null,
      location: farmerData.location || {},
      totalFruits: farmerData.total_fruits || 0,
      memberSince: farmerData.createdAt || null,
      activeFruits: activeFruits,
      activeListings: activeFruits.length
    };
    
    console.log('✅ Farmer public profile retrieved:', publicProfile.displayName);
    return publicProfile;
  } catch (error) {
    console.error('❌ Error getting farmer public profile:', error);
    throw new Error('Failed to get farmer profile: ' + error.message);
  }
};

/**
 * Get filtered marketplace fruits
 * @param {Object} filters - Filter options
 * @param {string} filters.type - Fruit type filter
 * @param {number} filters.limit - Number of fruits to fetch
 * @returns {Promise<Object[]>} Array of fruit objects
 */
export const getFilteredMarketplaceFruits = async (filters = {}) => {
  try {
    const { type, limit: queryLimit = 100 } = filters;
    
    const fruits = await retryWithBackoff(async () => {
      const fruitsCollectionRef = collection(firestore(), FRUITS_COLLECTION);
      let fruitQuery = query(
        fruitsCollectionRef,
        where('status', '==', 'active')
      );
      
      // Add type filter if specified
      if (type && type !== 'all') {
        fruitQuery = query(
          fruitsCollectionRef,
          where('status', '==', 'active'),
          where('type', '==', type)
        );
      }
      
      // Order by creation date and limit
      fruitQuery = query(
        fruitQuery,
        orderBy('created_at', 'desc'),
        limit(queryLimit)
      );
      
      const snapshot = await getDocs(fruitQuery);
      
      const fruitsData = [];
      snapshot.forEach(doc => {
        fruitsData.push({ id: doc.id, ...doc.data() });
      });
      
      return fruitsData;
    });
    
    console.log(`✅ Loaded ${fruits.length} filtered marketplace fruits (type: ${type || 'all'})`);
    return fruits;
  } catch (error) {
    console.error('❌ Error getting filtered marketplace fruits:', error);
    throw new Error('Failed to get filtered marketplace fruits: ' + error.message);
  }
};





/**
 * Add test fruits to Firebase for debugging
 * Call this function to populate the database with sample data
 * @returns {Promise<void>}
 */
export const addTestFruitsToFirebase = async () => {
  try {
    console.log('🌱 Adding test fruits to Firebase...');
    
    const testFruits = [
      {
        name: "Fresh Alphonso Mango",
        type: "mango",
        grade: "A",
        description: "Premium quality Alphonso mangoes from Ratnagiri",
        quantity: [10, 50],
        price_per_kg: 180,
        availability_date: new Date().toISOString(),
        image_urls: [
          "https://images.unsplash.com/photo-1553279768-865429fa0078?w=300",
          "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300"
        ],
        location: {
          village: "Ratnagiri",
          district: "Ratnagiri",
          state: "Maharashtra",
          pincode: "415612",
          lat: 16.9944,
          lng: 73.3000
        },
        farmer_id: "test_farmer_001",
        status: "active",
        views: 0,
        likes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        name: "Sweet Oranges",
        type: "orange", 
        grade: "A",
        description: "Fresh and juicy sweet oranges from Nagpur",
        quantity: [5, 25],
        price_per_kg: 60,
        availability_date: new Date().toISOString(),
        image_urls: [
          "https://images.unsplash.com/photo-1580052614034-c55d20bfee3b?w=300"
        ],
        location: {
          village: "Nagpur",
          district: "Nagpur", 
          state: "Maharashtra",
          pincode: "440001",
          lat: 21.1458,
          lng: 79.0882
        },
        farmer_id: "test_farmer_002",
        status: "active",
        views: 0,
        likes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        name: "Fresh Bananas",
        type: "banana",
        grade: "A",
        description: "Sweet and fresh bananas from Kerala",
        quantity: [20, 100],
        price_per_kg: 45,
        availability_date: new Date().toISOString(),
        image_urls: [
          "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300"
        ],
        location: {
          village: "Thrissur",
          district: "Thrissur",
          state: "Kerala", 
          pincode: "680001",
          lat: 10.5276,
          lng: 76.2144
        },
        farmer_id: "test_farmer_003",
        status: "active",
        views: 0,
        likes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        name: "Premium Grapes",
        type: "grape",
        grade: "A+",
        description: "Premium quality grapes from Nashik vineyards",
        quantity: [15, 75],
        price_per_kg: 120,
        availability_date: new Date().toISOString(),
        image_urls: [
          "https://images.unsplash.com/photo-1537640538966-79f369143919?w=300"
        ],
        location: {
          village: "Nashik",
          district: "Nashik",
          state: "Maharashtra",
          pincode: "422001",
          lat: 19.9975,
          lng: 73.7898
        },
        farmer_id: "test_farmer_004",
        status: "active",
        views: 0,
        likes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        name: "Fresh Red Apples",
        type: "apple",
        grade: "A",
        description: "Crisp and sweet red apples from Himachal Pradesh",
        quantity: [8, 40],
        price_per_kg: 150,
        availability_date: new Date().toISOString(),
        image_urls: [
          "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=300"
        ],
        location: {
          village: "Shimla",
          district: "Shimla",
          state: "Himachal Pradesh",
          pincode: "171001",
          lat: 31.1048,
          lng: 77.1734
        },
        farmer_id: "test_farmer_005",
        status: "active",
        views: 0,
        likes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Add each test fruit
    for (const fruitData of testFruits) {
      const fruitId = generateFruitId();
      const finalFruitData = {
        id: fruitId,
        ...fruitData
      };
      
      const fruitsCollectionRef = collection(firestore(), FRUITS_COLLECTION);
      const fruitDocRef = doc(fruitsCollectionRef, fruitId);
      await setDoc(fruitDocRef, finalFruitData);
      
      console.log('✅ Added test fruit:', fruitData.name, 'with ID:', fruitId);
    }
    
    console.log('🎉 Successfully added', testFruits.length, 'test fruits to Firebase');
    return testFruits.length;
  } catch (error) {
    console.error('❌ Error adding test fruits:', error);
    throw new Error('Failed to add test fruits: ' + error.message);
  }
};
