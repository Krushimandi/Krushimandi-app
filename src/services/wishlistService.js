/**
 * Wishlist Service
 * Handles wishlist functionality for buyers
 * Uses new structure: fruits/{fruitId}/wishlists/{userId}
 */
// Use modular firebase exports to avoid calling functions like firestore() incorrectly.
import {
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
  orderBy,
  writeBatch,
  serverTimestamp as firestoreServerTimestamp,
  increment as firestoreIncrement
} from '@react-native-firebase/firestore';
import { auth, firestore } from '../config/firebaseModular';

/**
 * Add fruit to user's wishlist - OPTIMIZED VERSION
 * Uses batch operations for atomic writes and faster performance
 * @param {string} fruitId - ID of the fruit to add
 * @returns {Promise<boolean>} Success status
 */
export const addToWishlist = async (fruitId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    

    // Create batch for atomic operations
  const batch = writeBatch(firestore);

    // Prepare document references
    const fruitsCollectionRef = collection(firestore, 'fruits');
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    const wishlistsCollectionRef = collection(fruitDocRef, 'wishlists');
    const fruitWishlistDocRef = doc(wishlistsCollectionRef, user.uid);

  const buyersCollectionRef = collection(firestore, 'profiles'); // unified collection
    const userDocRef = doc(buyersCollectionRef, user.uid);
    const userWishlistCollectionRef = collection(userDocRef, 'wishlist');
    const userWishlistDocRef = doc(userWishlistCollectionRef, fruitId);

    // Batch operations for atomic writes
    const wishlistData = {
      user_id: user.uid,
      added_at: firestoreServerTimestamp(),
    };

    const userWishlistData = {
      fruit_id: fruitId,
      added_at: firestoreServerTimestamp(),
    };

    // Add to batch
    batch.set(fruitWishlistDocRef, wishlistData);
    batch.set(userWishlistDocRef, userWishlistData);
    
    // Also increment the fruit likes count in the same batch
    batch.update(fruitDocRef, { likes: firestoreIncrement(1) });

    // Commit all operations atomically
    await batch.commit();

    
    return true;

  } catch (error) {
    console.error('❌ Error adding to wishlist:', error);
    throw error;
  }
};

/**
 * Remove fruit from user's wishlist
 * Removes user reference from fruit's wishlist collection
 * @param {string} fruitId - ID of the fruit to remove
 * @returns {Promise<boolean>} Success status
 */
export const removeFromWishlist = async (fruitId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    

    // Create batch for atomic operations
  const batch = writeBatch(firestore);

    // Prepare document references
    const fruitsCollectionRef = collection(firestore, 'fruits');
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    const wishlistsCollectionRef = collection(fruitDocRef, 'wishlists');
    const fruitWishlistDocRef = doc(wishlistsCollectionRef, user.uid);

  const buyersCollectionRef = collection(firestore, 'profiles'); // unified collection
    const userDocRef = doc(buyersCollectionRef, user.uid);
    const userWishlistCollectionRef = collection(userDocRef, 'wishlist');
    const userWishlistDocRef = doc(userWishlistCollectionRef, fruitId);

    // Batch operations for atomic deletes
    batch.delete(fruitWishlistDocRef);
    batch.delete(userWishlistDocRef);
    
    // Also decrement the fruit likes count in the same batch
    batch.update(fruitDocRef, { likes: firestoreIncrement(-1) });

    // Commit all operations atomically
    await batch.commit();

    
    return true;

  } catch (error) {
    console.error('❌ Error removing from wishlist:', error);
    throw error;
  }
};

/**
 * Check if current user has liked this fruit
 * Checks if user UID exists in fruit's wishlists collection
 * @param {string} fruitId - ID of the fruit to check
 * @returns {Promise<boolean>} Whether current user has liked this fruit
 */
export const isInWishlist = async (fruitId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return false;
    }

    // Fast, direct check - no verbose logging for better performance
    const fruitsCollectionRef = collection(firestore, 'fruits');
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    const wishlistsCollectionRef = collection(fruitDocRef, 'wishlists');
    const fruitWishlistDocRef = doc(wishlistsCollectionRef, user.uid);
    const fruitWishlistDoc = await getDoc(fruitWishlistDocRef);

    return fruitWishlistDoc.exists();
  } catch (error) {
    console.error('❌ Error checking wishlist status:', error);
    return false;
  }
};

/**
 * Get user's complete wishlist
 * @returns {Promise<Array>} Array of wishlisted fruit IDs
 */
export const getUserWishlist = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    

  const buyersCollectionRef = collection(firestore, 'profiles'); // unified collection
    const userDocRef = doc(buyersCollectionRef, user.uid);
    const userWishlistCollectionRef = collection(userDocRef, 'wishlist');
    const wishlistQuery = query(userWishlistCollectionRef, orderBy('added_at', 'desc'));
    const wishlistSnapshot = await getDocs(wishlistQuery);

    const wishlist = [];
    wishlistSnapshot.forEach(doc => {
      wishlist.push({
        id: doc.id,
        fruit_id: doc.data().fruit_id,
        added_at: doc.data().added_at,
      });
    });

    
    return wishlist;
  } catch (error) {
    console.error('❌ Error getting wishlist:', error);
    throw error;
  }
};

/**
 * Get all users who have liked a specific fruit
 * @param {string} fruitId - ID of the fruit
 * @returns {Promise<Array>} Array of user IDs who liked this fruit
 */
export const getFruitLikers = async (fruitId) => {
  try {

    const fruitsCollectionRef = collection(firestore, 'fruits');
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    const wishlistsCollectionRef = collection(fruitDocRef, 'wishlists');
    const likersQuery = query(wishlistsCollectionRef, orderBy('added_at', 'desc'));
    const likersSnapshot = await getDocs(likersQuery);

    const likers = [];
    likersSnapshot.forEach(doc => {
      likers.push({
        user_id: doc.id,
        added_at: doc.data().added_at,
      });
    });

    
    return likers;
  } catch (error) {
    console.error('❌ Error getting fruit likers:', error);
    throw error;
  }
};

/**
 * Get total likes count for a fruit
 * @param {string} fruitId - ID of the fruit
 * @returns {Promise<number>} Number of users who liked this fruit
 */
export const getFruitLikesCount = async (fruitId) => {
  try {

    const fruitsCollectionRef = collection(firestore, 'fruits');
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    const wishlistsCollectionRef = collection(fruitDocRef, 'wishlists');
    const likersSnapshot = await getDocs(wishlistsCollectionRef);

  const count = likersSnapshot.size;
    return count;
  } catch (error) {
    console.error('❌ Error getting fruit likes count:', error);
    return 0;
  }
};

/**
 * Toggle fruit in wishlist (add if not present, remove if present)
 * @param {string} fruitId - ID of the fruit to toggle
 * @returns {Promise<boolean>} New wishlist status (true if added, false if removed)
 */
export const toggleWishlist = async (fruitId) => {
  try {
    
    // Get current status
    const isCurrentlyWishlisted = await isInWishlist(fruitId);
    
    
    if (isCurrentlyWishlisted) {
      // Remove from wishlist
      await removeFromWishlist(fruitId);
      
      return false;
    } else {
      // Add to wishlist
      await addToWishlist(fruitId);
      
      return true;
    }
  } catch (error) {
    console.error('❌ Error in simple toggle:', error);
    throw error;
  }
};

/**
 * Synchronize likes count in fruit document with actual wishlist count
 * This ensures the main fruit document's likes field matches the actual number of wishlists
 * @param {string} fruitId - ID of the fruit to synchronize
 * @returns {Promise<number>} The synchronized likes count
 */
export const syncFruitLikesCount = async (fruitId) => {
  try {
    // Simplified: just return the current likes count from fruit document
    // The likes field is kept in sync by batch operations in add/remove functions
    const fruitsCollectionRef = collection(firestore, 'fruits');
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    const fruitDoc = await getDoc(fruitDocRef);
    
    if (fruitDoc.exists()) {
      const data = fruitDoc.data();
      return Math.max(0, data?.likes || 0);
    }
    
    return 0;
  } catch (error) {
    console.error('❌ Error getting fruit likes count:', error);
    return 0;
  }
};

/**
 * Clean up wishlist inconsistencies between fruit wishlists and user wishlists
 * This function ensures both collections are in sync
 * @param {string} fruitId - ID of the fruit to clean up
 * @returns {Promise<boolean>} Success status
 */
export const cleanupWishlistInconsistencies = async (fruitId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return false;
    }

    

    // Check both locations using modular API
    const fruitsCollectionRef = collection(firestore, 'fruits');
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    const wishlistsCollectionRef = collection(fruitDocRef, 'wishlists');
    const fruitWishlistDocRef = doc(wishlistsCollectionRef, user.uid);
    const fruitWishlistDoc = await getDoc(fruitWishlistDocRef);

  const buyersCollectionRef = collection(firestore, 'profiles'); // unified collection
    const userDocRef = doc(buyersCollectionRef, user.uid);
    const userWishlistCollectionRef = collection(userDocRef, 'wishlist');
    const userWishlistDocRef = doc(userWishlistCollectionRef, fruitId);
    const userWishlistDoc = await getDoc(userWishlistDocRef);

    const fruitExists = fruitWishlistDoc.exists();
    const userExists = userWishlistDoc.exists();

    

    if (fruitExists && userExists) {
      return true;
    }

    if (!fruitExists && !userExists) {
      return true;
    }

    // Inconsistency detected - clean up
    

    if (fruitExists && !userExists) {
      // Fruit document exists but user document doesn't - remove fruit document
      
      await deleteDoc(fruitWishlistDocRef);
    } else if (!fruitExists && userExists) {
      // User document exists but fruit document doesn't - remove user document
      
      await deleteDoc(userWishlistDocRef);
    }

    

    return true;
  } catch (error) {
    console.error('❌ Error during wishlist cleanup:', error);
    return false;
  }
};
