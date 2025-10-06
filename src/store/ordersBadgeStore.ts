/**
 * Orders Badge Store
 * Tracks locally which accepted requests are unseen by the buyer.
 * Persists offline using AsyncStorage to maintain state across app restarts.
 * No remote/Firebase reads; relies only on the app's current requests array.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RequestLike = { id: string; status?: string | null };

interface OrdersBadgeState {
  initialized: boolean;
  knownAcceptedIds: string[]; // snapshot of accepted request IDs from last sync
  unseenAcceptedIds: string[]; // newly accepted since last seen

  // Derived
  unseenCount: number;

  // Actions
  reconcileFromRequests: (requests: RequestLike[]) => void;
  markSeen: (ids: 'all' | string[]) => void;
  reset: () => void;
}

const toIdSet = (arr: string[]) => new Set(arr);

export const useOrdersBadgeStore = create<OrdersBadgeState>()(
  persist(
    (set, get) => ({
      initialized: false,
      knownAcceptedIds: [],
      unseenAcceptedIds: [],
      unseenCount: 0,

      reconcileFromRequests: (requests: RequestLike[]) => {
        try {
          const currentAccepted = (requests || [])
            .filter(r => (r?.status || '').toLowerCase() === 'accepted')
            .map(r => r.id)
            .filter(Boolean);

          const state = get();

          // First run: initialize known set from current without creating unseen
          if (!state.initialized) {
            console.log('🔵 [OrdersBadge] Initial sync - Known accepted:', currentAccepted.length);
            set({
              initialized: true,
              knownAcceptedIds: currentAccepted,
              // Leave unseen empty on initial hydration
              unseenAcceptedIds: [],
              unseenCount: 0,
            });
            return;
          }

          // Compute newly accepted since last snapshot
          const knownSet = toIdSet(state.knownAcceptedIds);
          const unseenSet = toIdSet(state.unseenAcceptedIds);

          const newlyAccepted = currentAccepted.filter(id => !knownSet.has(id));

          if (newlyAccepted.length > 0) {
            console.log('🟢 [OrdersBadge] New accepted orders detected:', newlyAccepted.length);
          }

          // Add newly accepted to unseen set
          for (const id of newlyAccepted) unseenSet.add(id);

          // Remove IDs that are no longer accepted (e.g., cancelled, rejected)
          const currentAcceptedSet = toIdSet(currentAccepted);
          const validUnseen = Array.from(unseenSet).filter(id => currentAcceptedSet.has(id));

          const updatedUnseen = validUnseen;
          
          console.log('📊 [OrdersBadge] State update - Unseen:', updatedUnseen.length, 'Known:', currentAccepted.length);
          
          set({
            knownAcceptedIds: currentAccepted,
            unseenAcceptedIds: updatedUnseen,
            unseenCount: updatedUnseen.length,
          });
        } catch (error) {
          console.error('❌ [OrdersBadge] Error in reconcileFromRequests:', error);
        }
      },

      markSeen: (ids: 'all' | string[]) => {
        try {
          const { unseenAcceptedIds } = get();
          if (ids === 'all') {
            console.log('✅ [OrdersBadge] Marking all as seen');
            set({ unseenAcceptedIds: [], unseenCount: 0 });
            return;
          }
          const removeSet = new Set(ids);
          const kept = unseenAcceptedIds.filter(id => !removeSet.has(id));
          console.log('✅ [OrdersBadge] Marked seen:', ids.length, 'Remaining unseen:', kept.length);
          set({ unseenAcceptedIds: kept, unseenCount: kept.length });
        } catch (error) {
          console.error('❌ [OrdersBadge] Error in markSeen:', error);
        }
      },

      reset: () => {
        console.log('🔄 [OrdersBadge] Resetting state');
        set({ initialized: false, knownAcceptedIds: [], unseenAcceptedIds: [], unseenCount: 0 });
      },
    }),
    {
      name: '@krushimandi:orders_badge_state',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the minimal state
      partialize: (state) => ({
        initialized: state.initialized,
        knownAcceptedIds: state.knownAcceptedIds,
        unseenAcceptedIds: state.unseenAcceptedIds,
      }),
      // Rehydrate the unseenCount on load
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.unseenCount = state.unseenAcceptedIds.length;
          console.log('💾 [OrdersBadge] Rehydrated from storage - Unseen:', state.unseenCount);
        }
      },
    }
  )
);
