/**
 * useBuyerProfile Hook
 * Manages buyer profile data fetching and caching
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { buyerService, BuyerProfile, BuyerReview } from '../services/buyerService';
import { useAuthState } from '../components/providers/AuthStateProvider';

interface UseBuyerProfileReturn {
    profile: BuyerProfile | null;
    reviews: BuyerReview[];
    loading: boolean;
    error: string | null;
    refreshProfile: () => Promise<void>;
    submitReview: (rating: number, reviewText: string, orderId?: string, productName?: string) => Promise<boolean>;
    submittingReview: boolean;
}

export const useBuyerProfile = (buyerId: string): UseBuyerProfileReturn => {
    const { user } = useAuthState();
    const [profile, setProfile] = useState<BuyerProfile | null>(null);
    const [reviews, setReviews] = useState<BuyerReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submittingReview, setSubmittingReview] = useState(false);

    const loadProfile = useCallback(async () => {
        if (!buyerId) {
            setError('No buyer ID provided');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Load profile and reviews in parallel
            const [profileData, reviewsData] = await Promise.all([
                buyerService.getBuyerProfile(buyerId),
                buyerService.getBuyerReviews(buyerId),
            ]);

            if (!profileData) {
                setError('Buyer profile not found');
                return;
            }
            // Debug logging to verify location structure
            try {
                console.log('[useBuyerProfile] Loaded profile location value:', profileData.location);
                if (profileData.location && typeof profileData.location === 'object') {
                    console.log('[useBuyerProfile] Location keys:', Object.keys(profileData.location as any));
                }
            } catch (e) { /* ignore */ }

            setProfile(profileData);
            setReviews(reviewsData);
        } catch (error) {
            console.error('Error loading buyer profile:', error);
            setError('Failed to load buyer profile');
        } finally {
            setLoading(false);
        }
    }, [buyerId]);

    const refreshProfile = useCallback(async () => {
        // Clear cache for this buyer
        buyerService.clearBuyerCache(buyerId);
        await loadProfile();
    }, [buyerId, loadProfile]);

    const submitReview = useCallback(async (
        rating: number,
        reviewText: string,
        orderId?: string,
        productName?: string
    ): Promise<boolean> => {
        if (!user) {
            Alert.alert('Error', 'You must be logged in to submit a review');
            return false;
        }

        if (!reviewText.trim()) {
            Alert.alert('Error', 'Please write a review comment');
            return false;
        }

        if (rating < 1 || rating > 5) {
            Alert.alert('Error', 'Please provide a valid rating between 1 and 5');
            return false;
        }

        try {
            setSubmittingReview(true);

            const newReview = await buyerService.submitBuyerReview(
                buyerId,
                user.id, // farmerId
                rating,
                reviewText,
                orderId,
                productName
            );

            // Update local state
            setReviews(prev => [newReview, ...prev]);

            // Refresh profile to update stats
            const updatedProfile = await buyerService.getBuyerProfile(buyerId);
            if (updatedProfile) {
                setProfile(updatedProfile);
            }

            return true;
        } catch (error) {
            console.error('Error submitting review:', error);
            Alert.alert('Error', 'Failed to submit review. Please try again.');
            return false;
        } finally {
            setSubmittingReview(false);
        }
    }, [user, buyerId]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    return {
        profile,
        reviews,
        loading,
        error,
        refreshProfile,
        submitReview,
        submittingReview,
    };
};
