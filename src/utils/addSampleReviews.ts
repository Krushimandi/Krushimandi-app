/**
 * Utility script to add sample reviews for testing
 * This can be called from the app to populate test data
 */

import { testBuyerService } from '../services/buyerService';

export const addSampleReviewsForBuyer = async (buyerId: string): Promise<void> => {
    try {
        console.log('🔄 Adding sample reviews for buyer:', buyerId);
        
        // Sample reviews data
        const sampleReviews = [
            {
                farmerId: 'testFarmer123',
                rating: 5,
                reviewText: 'Very good buyer, pays on time and is very professional to work with.'
            },
            {
                farmerId: 'farmer456',
                rating: 4,
                reviewText: 'Good buyer, clear communication and timely payments. Would recommend.'
            },
            {
                farmerId: 'organicFarmer789',
                rating: 5,
                reviewText: 'Excellent buyer! Very understanding about organic farming processes and fair pricing.'
            },
            {
                farmerId: 'localFarmer101',
                rating: 4,
                reviewText: 'Reliable buyer with consistent orders. Good business relationship.'
            }
        ];

        // Add each sample review
        for (const review of sampleReviews) {
            await testBuyerService.addSampleReview(
                buyerId,
                review.farmerId,
                review.rating,
                review.reviewText
            );
            
            // Small delay between reviews to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('✅ All sample reviews added successfully!');
        
    } catch (error) {
        console.error('❌ Error adding sample reviews:', error);
        throw error;
    }
};

// Helper function to test the review system
export const testReviewSystem = async (buyerId: string): Promise<void> => {
    try {
        console.log('🧪 Testing review system for buyer:', buyerId);
        
        // Add sample reviews
        await addSampleReviewsForBuyer(buyerId);
        
        // Fetch and display reviews
        const reviews = await testBuyerService.getBuyerReviews(buyerId);
        console.log('📊 Retrieved reviews:', reviews);
        
        // Get buyer stats
        const stats = await testBuyerService.getBuyerStats(buyerId);
        console.log('📈 Buyer stats:', stats);
        
        console.log('✅ Review system test completed!');
        
    } catch (error) {
        console.error('❌ Review system test failed:', error);
        throw error;
    }
};
