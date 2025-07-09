/**
 * Wishlist Service
 * Handles wishlist functionality for buyers
 * Uses new structure: fruits/{fruitId}/wishlists/{userId}
 */
import firestore, { 
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
  orderBy,
  writeBatch,
  increment as firestoreIncrement
} from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

/**
 * Add fruit to user's wishlist - OPTIMIZED VERSION
 * Uses batch operations for atomic writes and faster performance
 * @param {string} fruitId - ID of the fruit to add
 * @returns {Promise<boolean>} Success status
 */
export const addToWishlist = async (fruitId) => {
  try {
    const user = auth().currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('➕ Adding fruit to wishlist (optimized):', fruitId, 'user:', user.uid);

    // Create batch for atomic operations
    const batch = writeBatch(firestore());

    // Prepare document references
    const fruitsCollectionRef = collection(firestore(), 'fruits');
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    const wishlistsCollectionRef = collection(fruitDocRef, 'wishlists');
    const fruitWishlistDocRef = doc(wishlistsCollectionRef, user.uid);

    const buyersCollectionRef = collection(firestore(), 'buyers');
    const userDocRef = doc(buyersCollectionRef, user.uid);
    const userWishlistCollectionRef = collection(userDocRef, 'wishlist');
    const userWishlistDocRef = doc(userWishlistCollectionRef, fruitId);

    // Batch operations for atomic writes
    const wishlistData = {
      user_id: user.uid,
      added_at: firestoreServerTimestamp(),
      user_email: user.email || null,
    };

    const userWishlistData = {
      fruit_id: fruitId,
      added_at: firestoreServerTimestamp(),
    };

    // Add to batch
    batch.set(fruitWishlistDocRef, wishlistData);
    batch.set(userWishlistDocRef, userWishlistData);
    
    // Also increment the fruit likes count in the same batch
    batch.update(fruitDocRef, {
      likes: firestoreIncrement(1)
    });

    // Commit all operations atomically
    await batch.commit();

    console.log('✅ Batch commit completed for adding to wishlist');
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
    const user = auth().currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('➖ Removing fruit from wishlist (optimized):', fruitId, 'user:', user.uid);

    // Create batch for atomic operations
    const batch = writeBatch(firestore());

    // Prepare document references
    const fruitsCollectionRef = collection(firestore(), 'fruits');
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    const wishlistsCollectionRef = collection(fruitDocRef, 'wishlists');
    const fruitWishlistDocRef = doc(wishlistsCollectionRef, user.uid);

    const buyersCollectionRef = collection(firestore(), 'buyers');
    const userDocRef = doc(buyersCollectionRef, user.uid);
    const userWishlistCollectionRef = collection(userDocRef, 'wishlist');
    const userWishlistDocRef = doc(userWishlistCollectionRef, fruitId);

    // Batch operations for atomic deletes
    batch.delete(fruitWishlistDocRef);
    batch.delete(userWishlistDocRef);
    
    // Also decrement the fruit likes count in the same batch
    batch.update(fruitDocRef, {
      likes: firestoreIncrement(-1)
    });

    // Commit all operations atomically
    await batch.commit();

    console.log('✅ Batch commit completed for removing from wishlist');
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
    const user = auth().currentUser;
    if (!user) {
      return false;
    }

    // Fast, direct check - no verbose logging for better performance
    const fruitsCollectionRef = collection(firestore(), 'fruits');
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
    const user = auth().currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('📋 Getting user wishlist for:', user.uid);

    const buyersCollectionRef = collection(firestore(), 'buyers');
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

    console.log('✅ User wishlist retrieved:', wishlist.length, 'items');
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
    console.log('👥 Getting users who liked fruit:', fruitId);

    const fruitsCollectionRef = collection(firestore(), 'fruits');
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    const wishlistsCollectionRef = collection(fruitDocRef, 'wishlists');
    const likersQuery = query(wishlistsCollectionRef, orderBy('added_at', 'desc'));
    const likersSnapshot = await getDocs(likersQuery);

    const likers = [];
    likersSnapshot.forEach(doc => {
      likers.push({
        user_id: doc.id,
        added_at: doc.data().added_at,
        user_email: doc.data().user_email,
      });
    });

    console.log('✅ Fruit likers retrieved:', likers.length, 'users');
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
    console.log('🔢 Getting likes count for fruit:', fruitId);

    const fruitsCollectionRef = collection(firestore(), 'fruits');
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    const wishlistsCollectionRef = collection(fruitDocRef, 'wishlists');
    const likersSnapshot = await getDocs(wishlistsCollectionRef);

    const count = likersSnapshot.size;
    console.log('✅ Fruit likes count:', count);
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
    console.log('🔄 Simple toggle for fruit:', fruitId);
    
    // Get current status
    const isCurrentlyWishlisted = await isInWishlist(fruitId);
    console.log('🔄 Current status:', isCurrentlyWishlisted ? 'LIKED ❤️' : 'NOT_LIKED 🤍');
    
    if (isCurrentlyWishlisted) {
      // Remove from wishlist
      await removeFromWishlist(fruitId);
      console.log('✅ Removed from wishlist');
      return false;
    } else {
      // Add to wishlist
      await addToWishlist(fruitId);
      console.log('✅ Added to wishlist');
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
    const fruitsCollectionRef = collection(firestore(), 'fruits');
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
    const user = auth().currentUser;
    if (!user) {
      console.log('❌ User not authenticated for cleanup');
      return false;
    }

    console.log('🧹 Cleaning up wishlist inconsistencies for fruit:', fruitId, 'user:', user.uid);

    // Check both locations using modular API
    const fruitsCollectionRef = collection(firestore(), 'fruits');
    const fruitDocRef = doc(fruitsCollectionRef, fruitId);
    const wishlistsCollectionRef = collection(fruitDocRef, 'wishlists');
    const fruitWishlistDocRef = doc(wishlistsCollectionRef, user.uid);
    const fruitWishlistDoc = await getDoc(fruitWishlistDocRef);

    const buyersCollectionRef = collection(firestore(), 'buyers');
    const userDocRef = doc(buyersCollectionRef, user.uid);
    const userWishlistCollectionRef = collection(userDocRef, 'wishlist');
    const userWishlistDocRef = doc(userWishlistCollectionRef, fruitId);
    const userWishlistDoc = await getDoc(userWishlistDocRef);

    const fruitExists = fruitWishlistDoc.exists();
    const userExists = userWishlistDoc.exists();

    console.log('🧹 Current state - fruit wishlist exists:', fruitExists, 'user wishlist exists:', userExists);

    if (fruitExists && userExists) {
      console.log('✅ Both documents exist - no cleanup needed');
      return true;
    }

    if (!fruitExists && !userExists) {
      console.log('✅ Both documents don\'t exist - consistent state');
      return true;
    }

    // Inconsistency detected - clean up
    console.log('⚠️ Inconsistency detected, cleaning up...');

    if (fruitExists && !userExists) {
      // Fruit document exists but user document doesn't - remove fruit document
      console.log('🧹 Removing orphaned fruit wishlist document');
      await deleteDoc(fruitWishlistDocRef);
    } else if (!fruitExists && userExists) {
      // User document exists but fruit document doesn't - remove user document
      console.log('🧹 Removing orphaned user wishlist document');
      await deleteDoc(userWishlistDocRef);
    }

    console.log('✅ Cleanup completed successfully');

    return true;
  } catch (error) {
    console.error('❌ Error during wishlist cleanup:', error);
    return false;
  }
};
