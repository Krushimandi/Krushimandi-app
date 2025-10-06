/**
 * Badge Testing Helper
 * Use these utilities to test the unseen orders badge system
 * 
 * Add this to any screen to test badge functionality
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useOrdersBadgeStore } from '../store/ordersBadgeStore';

// Test utilities (call these from console or buttons)
export const BadgeTestUtils = {
  
  /**
   * Get current badge state
   */
  getState: () => {
    const state = useOrdersBadgeStore.getState();
    console.log('📊 Current Badge State:', {
      initialized: state.initialized,
      unseenCount: state.unseenCount,
      knownAccepted: state.knownAcceptedIds.length,
      unseenIds: state.unseenAcceptedIds,
    });
    return state;
  },

  /**
   * Simulate a new accepted order
   */
  simulateNewAccepted: (orderId: string = 'test-' + Date.now()) => {
    const state = useOrdersBadgeStore.getState();
    const mockRequests = [
      ...state.knownAcceptedIds.map(id => ({ id, status: 'accepted' })),
      { id: orderId, status: 'accepted' },
    ];
    state.reconcileFromRequests(mockRequests);
    console.log('✅ Simulated new accepted order:', orderId);
    console.log('Badge should now show:', state.unseenCount);
  },

  /**
   * Mark all as seen
   */
  markAllSeen: () => {
    const state = useOrdersBadgeStore.getState();
    state.markSeen('all');
    console.log('✅ Marked all as seen. Badge should be hidden.');
  },

  /**
   * Reset badge store
   */
  reset: () => {
    const state = useOrdersBadgeStore.getState();
    state.reset();
    console.log('🔄 Badge store reset.');
  },

  /**
   * Subscribe to badge changes
   */
  subscribeToChanges: () => {
    const unsubscribe = useOrdersBadgeStore.subscribe((state) => {
      console.log('🔔 Badge Update:', {
        unseenCount: state.unseenCount,
        unseenIds: state.unseenAcceptedIds,
      });
    });
    console.log('👂 Subscribed to badge changes. Call unsubscribe() to stop.');
    return unsubscribe;
  },

  /**
   * Verify offline persistence
   */
  testPersistence: async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const data = await AsyncStorage.getItem('@krushimandi:orders_badge_state');
    console.log('💾 Persisted Data:', JSON.parse(data || '{}'));
  },
};

/**
 * React Component for Testing Badge
 * Add this to your screen for testing buttons
 */
export const BadgeTestButtons = () => {
  const { unseenCount, reset, markSeen } = useOrdersBadgeStore();
  
  return (
    <View style={{ padding: 20, backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Badge Testing (Unseen: {unseenCount})
      </Text>
      
      <TouchableOpacity 
        style={styles.testButton}
        onPress={() => BadgeTestUtils.simulateNewAccepted()}
      >
        <Text>➕ Simulate New Accepted Order</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.testButton}
        onPress={() => markSeen('all')}
      >
        <Text>✅ Mark All As Seen</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.testButton}
        onPress={() => BadgeTestUtils.getState()}
      >
        <Text>📊 Log Current State</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.testButton}
        onPress={() => reset()}
      >
        <Text>🔄 Reset Badge Store</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.testButton}
        onPress={() => BadgeTestUtils.testPersistence()}
      >
        <Text>💾 Check Persistence</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = {
  testButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center' as const,
  },
};

/**
 * Usage Examples:
 * 
 * 1. In React DevTools Console:
 *    BadgeTestUtils.getState()
 *    BadgeTestUtils.simulateNewAccepted('order-123')
 *    BadgeTestUtils.markAllSeen()
 * 
 * 2. In Your Screen:
 *    import { BadgeTestButtons } from './utils/badgeTestUtils';
 *    // Add <BadgeTestButtons /> to your JSX
 * 
 * 3. Automated Testing:
 *    describe('Badge System', () => {
 *      it('should track new accepted orders', () => {
 *        const state = BadgeTestUtils.getState();
 *        expect(state.unseenCount).toBe(0);
 *        
 *        BadgeTestUtils.simulateNewAccepted('test-1');
 *        expect(state.unseenCount).toBe(1);
 *      });
 *    });
 */
