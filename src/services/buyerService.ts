/**
 * Buyer Service
 * Handles buyer data operations and caching
 */

import firestore from '@react-native-firebase/firestore';
import { Alert } from 'react-native';

// Types
export interface BuyerProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    location: string;
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
                .collection('buyers')
                .limit(1)
                .get();
            
            console.log('✅ Firestore connection successful. Found', testQuery.size, 'documents in buyers collection');
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

            console.log('🔍 Fetching buyer profile from Firestore:', buyerId);
            const doc = await firestore().collection('buyers').doc(buyerId).get();
            
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

            const profile: BuyerProfile = {
                id: doc.id,
                name: fullName,
                email: this.sanitizeString(data.email),
                phone: this.sanitizeString(data.phoneNumber),
                location: this.sanitizeString(data.location || data.address),
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

            // Get reviews from the dedicated reviews collection
            const reviewsSnapshot = await firestore()
                .collection('reviews')
                .where('buyerId', '==', buyerId)
                .get();

            let totalRating = 0;
            let totalRatings = 0;

            console.log('📝 Found', reviewsSnapshot.size, 'reviews in reviews collection');
            
            reviewsSnapshot.forEach(doc => {
                const review = doc.data();
                console.log('📄 Review data:', { id: doc.id, rating: review.rating, comment: review.comment?.substring(0, 50) });
                
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
     * Get buyer reviews
     */
    async getBuyerReviews(buyerId: string): Promise<BuyerReview[]> {
        try {
            // Check cache first
            const cached = buyerReviewsCache.get(buyerId);
            if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                console.log('📋 Using cached buyer reviews for:', buyerId);
                return cached.reviews;
            }

            console.log('🔍 Fetching buyer reviews from Firestore:', buyerId);
            
            // Try to get reviews from a dedicated reviews collection
            const reviewsSnapshot = await firestore()
                .collection('reviews')
                .where('buyerId', '==', buyerId)
                .orderBy('createdAt', 'desc')
                .get();

            const reviews: BuyerReview[] = [];
            
            console.log('📝 Found', reviewsSnapshot.size, 'reviews in reviews collection');
            
            reviewsSnapshot.forEach(doc => {
                const data = doc.data();
                console.log('📄 Review document:', { id: doc.id, data });
                
                reviews.push({
                    id: doc.id,
                    buyerId: data.buyerId,
                    farmerId: data.farmerId,
                    farmerName: data.farmerName || 'Anonymous Farmer',
                    farmerImage: data.farmerImage,
                    rating: data.rating || 5,
                    comment: data.comment || 'Great buyer to work with!',
                    orderId: data.orderId || 'N/A',
                    productName: data.productName || 'Product',
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                });
            });

            // If no reviews in reviews collection, fallback to requests collection
            if (reviews.length === 0) {
                console.log('📋 No reviews found in reviews collection, checking requests...');
                
                const requestsSnapshot = await firestore()
                    .collection('requests')
                    .where('buyerId', '==', buyerId)
                    .where('status', '==', 'accepted')
                    .get();

                console.log('📝 Found', requestsSnapshot.size, 'accepted requests');

                requestsSnapshot.forEach(doc => {
                    const data = doc.data();
                    console.log('📄 Request with farmer response:', { 
                        id: doc.id, 
                        farmerResponse: data.farmerResponse,
                        productName: data.productSnapshot?.name 
                    });
                    
                    if (data.farmerResponse?.rating || data.farmerResponse?.message) {
                        reviews.push({
                            id: doc.id,
                            buyerId: data.buyerId,
                            farmerId: data.farmerId,
                            farmerName: data.productSnapshot?.farmerName || 'Farmer',
                            farmerImage: undefined,
                            rating: data.farmerResponse?.rating || 5,
                            comment: data.farmerResponse?.message || 'Great buyer to work with!',
                            orderId: doc.id,
                            productName: data.productSnapshot?.name || 'Product',
                            createdAt: data.farmerResponse?.respondedAt || data.createdAt,
                            updatedAt: data.updatedAt,
                        });
                    }
                });
            }

            // If still no reviews, return empty array instead of dummy data
            if (reviews.length === 0) {
                console.log('📝 No reviews found for buyer:', buyerId);
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
     * Submit a review for a buyer
     */
    async submitBuyerReview(
        buyerId: string,
        farmerId: string,
        rating: number,
        comment: string,
        orderId: string,
        productName: string,
        farmerName: string,
        farmerImage?: string
    ): Promise<BuyerReview> {
        try {
            const now = firestore.Timestamp.now();
            
            // Create review document data
            const reviewData = {
                buyerId,
                farmerId,
                farmerName,
                farmerImage: farmerImage || null,
                rating,
                comment,
                orderId,
                productName,
                createdAt: now,
                updatedAt: now,
            };

            // Add review to Firestore
            console.log('📝 Adding review to Firestore for buyer:', buyerId);
            const reviewRef = await firestore()
                .collection('reviews')
                .add(reviewData);

            const review: BuyerReview = {
                id: reviewRef.id,
                buyerId,
                farmerId,
                farmerName,
                farmerImage: farmerImage || undefined,
                rating,
                comment,
                orderId,
                productName,
                createdAt: now,
                updatedAt: now,
            };

            // Invalidate cache to force refresh
            buyerReviewsCache.delete(buyerId);
            buyerProfileCache.delete(buyerId);

            console.log('✅ Review submitted successfully for buyer:', buyerId);
            return review;
        } catch (error) {
            console.error('Error submitting buyer review:', error);
            throw error;
        }
    }

    /**
     * Get database statistics for debugging
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
                firestore().collection('buyers').get(),
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
    }
};
