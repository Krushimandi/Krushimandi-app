/**
 * usePendingRequestsCount Hook
 * Custom hook to get the count of pending requests for farmers
 */

import { useState, useEffect } from 'react';
import { firestore, collection, query, where, onSnapshot } from '../config/firebaseModular';
import { useAuthState } from '../components/providers/AuthStateProvider';
import { RequestStatus } from '../types/Request';

export const usePendingRequestsCount = () => {
  const { user } = useAuthState();
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only run for farmers
    if (!user?.uid || user?.role !== 'farmer') {
      setPendingCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Real-time listener for pending requests
    const requestsRef = collection(firestore, 'requests');
    const q = query(
      requestsRef,
      where('farmerId', '==', user.uid),
      where('status', '==', RequestStatus.PENDING)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const count = snapshot.size;
        setPendingCount(count);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error listening to pending requests:', error);
        setPendingCount(0);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, user?.role]);

  return {
    pendingCount,
    loading,
    badgeText: pendingCount > 99 ? '99+' : pendingCount.toString(),
    shouldShowBadge: pendingCount > 0,
  };
};
