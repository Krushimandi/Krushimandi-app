/**
 * Buyer Service
 * Handles buyer data operations and caching
 */

import firestore from '@react-native-firebase/firestore';
import { Alert } from 'react-native';

// Types
// Support both legacy string location and structured object location
export interface UserLocation {
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
    formattedAddress?: string;
    // Allow any additional keys coming from Firestore (e.g., country, landmark, geoPoint etc.)
    [key: string]: any;
}

export interface BuyerProfile {
    id: string;
    name: string;
    phone: string;
    // Previously always a string; now may be structured. UI should format with a helper.
    location?: string | UserLocation;
    profileImage?: string;
    rating: number;
    totalRatings: number;
    completedOrders: number;
    totalRequests: number;
    joinedDate: string;
    isVerified: boolean;
    bio?: string;
    createdAt: any;
    updatedAt: any;
}

export interface BuyerReview {
    id: string;
    buyerId: string;
    farmerId: string;
    farmerName: string;
    farmerImage?: string;
    rating: number;
    comment: string;
    orderId: string;
    productName: string;
    createdAt: any;
    updatedAt: any;
}

// Cache for buyer profiles
const buyerProfileCache = new Map<string, { profile: BuyerProfile; timestamp: number }>();
const buyerReviewsCache = new Map<string, { reviews: BuyerReview[]; timestamp: number }>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class BuyerService {
    /**
     * Validate buyer ID format
     */
    private validateBuyerId(buyerId: string): boolean {
        if (!buyerId || typeof buyerId !== 'string' || buyerId.trim().length === 0) {
            console.error('❌ Invalid buyer ID:', buyerId);
            return false;
        }
        return true;
    }

    /**
     * Sanitize string data
     */
    private sanitizeString(value: any, defaultValue: string = ''): string {
        if (value === null || value === undefined) return defaultValue;
        return String(value).trim();
    }

    /**
     * Sanitize number data
     */
    private sanitizeNumber(value: any, defaultValue: number = 0): number {
        if (value === null || value === undefined) return defaultValue;
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
    }

    /**
     * Test database connectivity
     */
    async testConnection(): Promise<boolean> {
        try {
            console.log('🔍 Testing Firestore connection...');
            
            // Try to read from a collection
            const testQuery = await firestore()
                .collection('profiles')
                .where('currentRole', 'in', ['buyer', 'farmer'])
                .limit(1)
                .get();
            
            console.log('✅ Firestore connection successful. Found', testQuery.size, 'documents in profiles collection');
            return true;
        } catch (error) {
            console.error('❌ Firestore connection failed:', error);
            return false;
        }
    }

    /**
     * Get buyer profile by ID
     */
    async getBuyerProfile(buyerId: string): Promise<BuyerProfile | null> {
        try {
            // Validate buyer ID
            if (!this.validateBuyerId(buyerId)) {
                return null;
            }

            // Check cache first
            const cached = buyerProfileCache.get(buyerId);
            if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                console.log('📋 Using cached buyer profile for:', buyerId);
                return cached.profile;
            }

            console.log('🔍 Fetching buyer profile (profiles collection) from Firestore:', buyerId);
            const doc = await firestore().collection('profiles').doc(buyerId).get();
            
            if (!doc.exists) {
                console.log('❌ Buyer profile not found:', buyerId);
                return null;
            }

            const data = doc.data();
            console.log('📊 Raw buyer data from Firestore:', JSON.stringify(data, null, 2));
            
            if (!data) {
                console.log('❌ No data in buyer profile:', buyerId);
                return null;
            }

            // Get buyer stats
            const stats = await this.getBuyerStats(buyerId);
            console.log('📈 Buyer stats:', stats);

            // Sanitize and construct profile with validation
            const firstName = this.sanitizeString(data.firstName);
            const lastName = this.sanitizeString(data.lastName);
            const displayName = this.sanitizeString(data.displayName);
            const fullName = displayName || `${firstName} ${lastName}`.trim() || 'Unknown User';

            // Preserve structured location objects instead of coercing to string ([object Object])
            let locationValue: string | UserLocation | undefined;
            if (data.location && typeof data.location === 'object') {
                // Clone to avoid accidental mutation
                const loc: UserLocation = { ...data.location };
                // Build a formattedAddress if missing
                if (!loc.formattedAddress) {
                    const parts = [loc.city, loc.district, loc.state, loc.pincode].filter(Boolean).join(', ');
                    if (parts) loc.formattedAddress = parts;
                }
                locationValue = loc;
            } else if (data.address && typeof data.address === 'object') {
                const addr: UserLocation = { ...data.address };
                if (!addr.formattedAddress) {
                    const parts = [addr.city, addr.district, addr.state, addr.pincode].filter(Boolean).join(', ');
                    if (parts) addr.formattedAddress = parts;
                }
                locationValue = addr;
            } else {
                const locString = this.sanitizeString(data.location || data.address);
                locationValue = locString || undefined;
            }

            const profile: BuyerProfile = {
                id: doc.id,
                name: fullName,
                phone: this.sanitizeString(data.phoneNumber),
                location: locationValue,
                profileImage: this.sanitizeString(data.profileImage || data.photoURL) || undefined,
                rating: stats.rating,
                totalRatings: stats.totalRatings,
                completedOrders: stats.completedOrders,
                totalRequests: stats.totalRequests,
                joinedDate: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                isVerified: Boolean(data.isPhoneVerified || data.isEmailVerified),
                bio: this.sanitizeString(data.bio || data.description),
                createdAt: data.createdAt,
                updatedAt: data.updatedAt || data.lastLoginAt,
            };

            console.log('👤 Constructed buyer profile:', JSON.stringify(profile, null, 2));

            // Cache the profile
            buyerProfileCache.set(buyerId, { profile, timestamp: Date.now() });

            return profile;
        } catch (error) {
            console.error('❌ Error fetching buyer profile:', error);
            
            // Check if it's a permission error
            if (error instanceof Error && 'code' in error && error.code === 'permission-denied') {
                console.error('🔒 Permission denied accessing buyer profile. Check Firestore rules.');
            }
            
            throw error;
        }
    }

    /**
     * Get buyer statistics
     */
    async getBuyerStats(buyerId: string): Promise<{
        rating: number;
        totalRatings: number;
        completedOrders: number;
        totalRequests: number;
    }> {
        try {
            // Validate buyer ID
            if (!this.validateBuyerId(buyerId)) {
                return {
                    rating: 0,
                    totalRatings: 0,
                    completedOrders: 0,
                    totalRequests: 0,
                };
            }

            console.log('📊 Calculating buyer stats for:', buyerId);

            // Get reviews from nested structure: profiles/{buyerId}/buyerReviews
            const reviewsSnapshot = await firestore()
                .collection('profiles')
                .doc(buyerId)
                .collection('buyerReviews')
                .get();

            let totalRating = 0;
            let totalRatings = 0;

            console.log('📝 Found', reviewsSnapshot.size, 'reviews in buyer subcollection');
            
            reviewsSnapshot.forEach(doc => {
                const review = doc.data();
                console.log('📄 Review data:', { id: doc.id, rating: review.rating, reviewText: review.reviewText?.substring(0, 50) });
                
                const rating = this.sanitizeNumber(review.rating);
                if (rating > 0 && rating <= 5) {
                    totalRating += rating;
                    totalRatings++;
                }
            });

            // Get requests to calculate order stats
            const requestsSnapshot = await firestore()
                .collection('requests')
                .where('buyerId', '==', buyerId)
                .get();

            let totalRequests = 0;
            let completedOrders = 0;
            let pendingRequests = 0;
            let rejectedRequests = 0;

            console.log('📋 Found', requestsSnapshot.size, 'requests in requests collection');

            requestsSnapshot.forEach(doc => {
                const request = doc.data();
                const status = this.sanitizeString(request.status, 'pending');
                
                console.log('📄 Request data:', { 
                    id: doc.id, 
                    status: status, 
                    productName: request.productSnapshot?.name || 'Unknown',
                    farmerName: request.productSnapshot?.farmerName || 'Unknown'
                });
                
                totalRequests++;
                
                // Count different statuses
                switch (status.toLowerCase()) {
                    case 'accepted':
                    case 'completed':
                    case 'delivered':
                        completedOrders++;
                        break;
                    case 'pending':
                        pendingRequests++;
                        break;
                    case 'rejected':
                        rejectedRequests++;
                        break;
                }

                // Also check for ratings in farmerResponse (fallback if no dedicated reviews)
                if (request.farmerResponse?.rating && totalRatings === 0) {
                    const fallbackRating = this.sanitizeNumber(request.farmerResponse.rating);
                    if (fallbackRating > 0 && fallbackRating <= 5) {
                        console.log('📊 Using fallback rating from request:', fallbackRating);
                        totalRating += fallbackRating;
                        totalRatings++;
                    }
                }
            });

            // Calculate average rating - show 0 if no ratings available
            const averageRating = totalRatings > 0 ? totalRating / totalRatings : 0;
            const roundedRating = averageRating > 0 ? Math.round(averageRating * 10) / 10 : 0;

            const stats = {
                rating: roundedRating,
                totalRatings,
                completedOrders,
                totalRequests,
            };

            console.log('📈 Final buyer stats:', {
                ...stats,
                breakdown: {
                    completed: completedOrders,
                    pending: pendingRequests,
                    rejected: rejectedRequests,
                    total: totalRequests
                }
            });

            return stats;
        } catch (error) {
            console.error('❌ Error fetching buyer stats:', error);
            
            // Check if it's a permission error
            if (error instanceof Error && 'code' in error && error.code === 'permission-denied') {
                console.error('🔒 Permission denied accessing buyer stats. Check Firestore rules.');
            }
            
            return {
                rating: 0, // Show 0 if no data available
                totalRatings: 0,
                completedOrders: 0,
                totalRequests: 0,
            };
        }
    }

    /**
    * Get buyer reviews from nested structure: profiles/{buyerId}/buyerReviews/{farmerId}
     */
    async getBuyerReviews(buyerId: string): Promise<BuyerReview[]> {
        try {
            // Validate buyer ID
            if (!this.validateBuyerId(buyerId)) {
                return [];
            }

            // Check cache first
            const cached = buyerReviewsCache.get(buyerId);
            if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                console.log('📋 Using cached buyer reviews for:', buyerId);
                return cached.reviews;
            }

            console.log('🔍 Fetching buyer reviews from nested structure:', buyerId);
            
            // Get reviews from the nested structure: profiles/{buyerId}/buyerReviews
            const reviewsSnapshot = await firestore()
                .collection('profiles')
                .doc(buyerId)
                .collection('buyerReviews')
                .orderBy('createdAt', 'desc')
                .get();

            const reviews: BuyerReview[] = [];
            
            console.log('📝 Found', reviewsSnapshot.size, 'reviews in buyer subcollection');
            
            for (const doc of reviewsSnapshot.docs) {
                const data = doc.data();
                console.log('📄 Review document:', { id: doc.id, data });
                
                // Get farmer details to enrich the review
                let farmerName = data.farmerName || 'Anonymous Farmer';
                let farmerImage = data.farmerImage;
                
                // If farmer details are not in the review, try to fetch from farmers collection
                if (data.farmerId && (!farmerName || farmerName === 'Anonymous Farmer')) {
                    try {
                        const farmerDoc = await firestore()
                            .collection('profiles')
                            .doc(data.farmerId)
                            .get();
                        
                        if (farmerDoc.exists()) {
                            const farmerData = farmerDoc.data();
                            farmerName = farmerData?.displayName || farmerData?.name || `${farmerData?.firstName || ''} ${farmerData?.lastName || ''}`.trim() || 'Farmer';
                            farmerImage = farmerData?.profileImage || farmerData?.photoURL;
                        }
                    } catch (error) {
                        console.log('⚠️ Could not fetch farmer details for:', data.farmerId);
                    }
                }
                
                reviews.push({
                    id: doc.id,
                    buyerId: buyerId,
                    farmerId: data.farmerId || doc.id, // Use document ID as farmerId if not present
                    farmerName: farmerName,
                    farmerImage: farmerImage,
                    rating: this.sanitizeNumber(data.rating, 5),
                    comment: this.sanitizeString(data.reviewText || data.comment, 'Great buyer to work with!'),
                    orderId: this.sanitizeString(data.orderId, 'N/A'),
                    productName: this.sanitizeString(data.productName, 'Product'),
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                });
            }

            console.log('📊 Final reviews count:', reviews.length);

            // Cache the reviews
            buyerReviewsCache.set(buyerId, { reviews, timestamp: Date.now() });

            return reviews;
        } catch (error) {
            console.error('❌ Error fetching buyer reviews:', error);
            return [];
        }
    }

    /**
    * Submit a review for a buyer using nested structure: profiles/{buyerId}/buyerReviews/{farmerId}
     */
    async submitBuyerReview(
        buyerId: string,
        farmerId: string,
        rating: number,
        reviewText: string,
        orderId?: string,
        productName?: string
    ): Promise<BuyerReview> {
        try {
            // Validate inputs
            if (!this.validateBuyerId(buyerId)) {
                throw new Error('Invalid buyer ID');
            }
            
            if (!farmerId || farmerId.trim().length === 0) {
                throw new Error('Invalid farmer ID');
            }
            
            if (rating < 1 || rating > 5) {
                throw new Error('Rating must be between 1 and 5');
            }

            const now = firestore.Timestamp.now();
            
            // Get farmer details for enriching the review
            let farmerName = 'Farmer';
            let farmerImage: string | undefined;
            
            try {
            const farmerDoc = await firestore()
                .collection('profiles')
                .doc(farmerId)
                .get();
                
                if (farmerDoc.exists()) {
                    const farmerData = farmerDoc.data();
                    farmerName = farmerData?.displayName || farmerData?.name || `${farmerData?.firstName || ''} ${farmerData?.lastName || ''}`.trim() || 'Farmer';
                    farmerImage = farmerData?.profileImage || farmerData?.photoURL;
                }
            } catch (error) {
                console.log('⚠️ Could not fetch farmer details for review submission:', farmerId);
            }
            
            // Create review document data
            const reviewData = {
                farmerId,
                rating,
                reviewText: reviewText.trim(),
                createdAt: now,
                ...(orderId && { orderId }),
                ...(productName && { productName }),
                ...(farmerName && { farmerName }),
                ...(farmerImage && { farmerImage }),
            };

            // Add review to the nested structure: profiles/{buyerId}/buyerReviews/{farmerId}
            console.log('📝 Adding review to buyer subcollection:', buyerId, '/', farmerId);
            await firestore()
                .collection('profiles')
                .doc(buyerId)
                .collection('buyerReviews')
                .doc(farmerId)
                .set(reviewData, { merge: true });

            const review: BuyerReview = {
                id: farmerId,
                buyerId,
                farmerId,
                farmerName,
                farmerImage,
                rating,
                comment: reviewText,
                orderId: orderId || 'N/A',
                productName: productName || 'Product',
                createdAt: now,
                updatedAt: now,
            };

            // Invalidate cache to force refresh
            buyerReviewsCache.delete(buyerId);
            buyerProfileCache.delete(buyerId);

            console.log('✅ Review submitted successfully for buyer:', buyerId);
            return review;
        } catch (error) {
            console.error('❌ Error submitting buyer review:', error);
            throw error;
        }
    }

    /**
     * Add a sample review for testing (to be used from Firebase console or test scripts)
     */
    async addSampleReview(
        buyerId: string,
        farmerId: string = 'testFarmer123',
        rating: number = 5,
        reviewText: string = 'Very good buyer, pays on time'
    ): Promise<void> {
        try {
            console.log('📝 Adding sample review to buyer:', buyerId);
            
            const now = firestore.Timestamp.now();
            
            const reviewData = {
                farmerId,
                rating,
                reviewText,
                createdAt: now,
            };

            await firestore()
                .collection('profiles')
                .doc(buyerId)
                .collection('buyerReviews')
                .doc(farmerId)
                .set(reviewData);
            
            console.log('✅ Sample review added successfully');
        } catch (error) {
            console.error('❌ Error adding sample review:', error);
            throw error;
        }
    }

    /**
     * Get database statistics for debugging (updated to include nested reviews count)
     */
    async getDbStats(): Promise<{
        buyersCount: number;
        reviewsCount: number;
        requestsCount: number;
        connectionStatus: boolean;
    }> {
        try {
            console.log('📊 Fetching database statistics...');
            
            const [buyersSnapshot, reviewsSnapshot, requestsSnapshot, connectionStatus] = await Promise.all([
                firestore().collection('profiles').get(),
                firestore().collection('reviews').get(),
                firestore().collection('requests').get(),
                this.testConnection()
            ]);

            const stats = {
                buyersCount: buyersSnapshot.size,
                reviewsCount: reviewsSnapshot.size,
                requestsCount: requestsSnapshot.size,
                connectionStatus,
            };

            console.log('📈 Database statistics:', stats);
            return stats;
        } catch (error) {
            console.error('❌ Error fetching database statistics:', error);
            return {
                buyersCount: 0,
                reviewsCount: 0,
                requestsCount: 0,
                connectionStatus: false,
            };
        }
    }

    /**
     * Clear cache for a specific buyer
     */
    clearBuyerCache(buyerId: string): void {
        buyerProfileCache.delete(buyerId);
        buyerReviewsCache.delete(buyerId);
    }

    /**
     * Clear all cache
     */
    clearAllCache(): void {
        buyerProfileCache.clear();
        buyerReviewsCache.clear();
    }
}

export const buyerService = new BuyerService();

// Export test functions for debugging
export const testBuyerService = {
    async testConnection() {
        return await buyerService.testConnection();
    },
    async getDbStats() {
        return await buyerService.getDbStats();
    },
    async getBuyerProfile(buyerId: string) {
        return await buyerService.getBuyerProfile(buyerId);
    },
    async getBuyerStats(buyerId: string) {
        return await buyerService.getBuyerStats(buyerId);
    },
    async getBuyerReviews(buyerId: string) {
        return await buyerService.getBuyerReviews(buyerId);
    },
    async addSampleReview(buyerId: string, farmerId?: string, rating?: number, reviewText?: string) {
        return await buyerService.addSampleReview(buyerId, farmerId, rating, reviewText);
    }
};
