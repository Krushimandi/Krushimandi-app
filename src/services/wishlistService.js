/**
 * Wishlist Service
 * Handles wishlist functionality for buyers
 * Uses new structure: fruits/{fruitId}/wishlists/{userId}
 */
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

/**
 * Add fruit to user's wishlist
 * Stores user reference in fruit's wishlist collection
 * @param {string} fruitId - ID of the fruit to add
 * @returns {Promise<boolean>} Success status
 */
export const addToWishlist = async (fruitId) => {
  try {
    const user = auth().currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('➕ Adding fruit to wishlist:', fruitId, 'user:', user.uid);

    // Add user to fruit's wishlist collection
    const fruitWishlistRef = firestore()
      .collection('fruits')
      .doc(fruitId)
      .collection('wishlists')
      .doc(user.uid);

    await fruitWishlistRef.set({
      user_id: user.uid,
      added_at: firestore.FieldValue.serverTimestamp(),
      user_email: user.email || null, // Optional: store email for reference
    });

    // Also maintain user's wishlist for easy retrieval (optional)
    const userWishlistRef = firestore()
      .collection('buyers')
      .doc(user.uid)
      .collection('wishlist')
      .doc(fruitId);

    await userWishlistRef.set({
      fruit_id: fruitId,
      added_at: firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ Added fruit to wishlist successfully:', fruitId);
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

    console.log('➖ Removing fruit from wishlist:', fruitId, 'user:', user.uid);

    // Remove user from fruit's wishlist collection
    const fruitWishlistRef = firestore()
      .collection('fruits')
      .doc(fruitId)
      .collection('wishlists')
      .doc(user.uid);

    await fruitWishlistRef.delete();

    // Also remove from user's wishlist
    const userWishlistRef = firestore()
      .collection('buyers')
      .doc(user.uid)
      .collection('wishlist')
      .doc(fruitId);

    await userWishlistRef.delete();

    console.log('✅ Removed fruit from wishlist successfully:', fruitId);
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
      console.log('❌ User not authenticated for wishlist check');
      return false;
    }

    console.log('🔍 Checking if user liked fruit:', fruitId, 'user:', user.uid);
    
    // Check if current user UID exists in fruit's wishlists collection
    const fruitWishlistDoc = await firestore()
      .collection('fruits')
      .doc(fruitId)
      .collection('wishlists')
      .doc(user.uid)
      .get();

    const exists = fruitWishlistDoc.exists;
    console.log('✅ User like status for fruit:', exists ? 'LIKED ❤️' : 'NOT_LIKED 🤍');
    return exists;
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

    const wishlistSnapshot = await firestore()
      .collection('buyers')
      .doc(user.uid)
      .collection('wishlist')
      .orderBy('added_at', 'desc')
      .get();

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

    const likersSnapshot = await firestore()
      .collection('fruits')
      .doc(fruitId)
      .collection('wishlists')
      .orderBy('added_at', 'desc')
      .get();

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

    const likersSnapshot = await firestore()
      .collection('fruits')
      .doc(fruitId)
      .collection('wishlists')
      .get();

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
    console.log('🔄 Starting wishlist toggle for fruit:', fruitId);
    const isCurrentlyWishlisted = await isInWishlist(fruitId);
    console.log('🔄 Current wishlist status before toggle:', isCurrentlyWishlisted ? 'LIKED ❤️' : 'NOT_LIKED 🤍');
    
    let newStatus;
    
    if (isCurrentlyWishlisted === true) {
      // Currently liked -> Remove from wishlist
      await removeFromWishlist(fruitId);
      newStatus = false;
      console.log('🔄 TOGGLE: Was LIKED -> Now UNLIKED. Removed fruit from wishlist:', fruitId);
    } else {
      // Currently not liked -> Add to wishlist
      await addToWishlist(fruitId);
      newStatus = true;
      console.log('🔄 TOGGLE: Was UNLIKED -> Now LIKED. Added fruit to wishlist:', fruitId);
    }
    
    // Validation: Ensure toggle worked correctly
    const finalStatus = await isInWishlist(fruitId);
    if (finalStatus !== newStatus) {
      console.error('⚠️ TOGGLE VALIDATION FAILED: Expected', newStatus, 'but got', finalStatus);
      throw new Error(`Toggle validation failed: expected ${newStatus}, got ${finalStatus}`);
    }
    
    console.log('✅ TOGGLE SUCCESS: Previous status:', isCurrentlyWishlisted, '-> New status:', newStatus);
    return newStatus;
  } catch (error) {
    console.error('❌ Error toggling wishlist:', error);
    throw error;
  }
};
