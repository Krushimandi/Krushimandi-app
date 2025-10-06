/**
 * Phone Service
 * Handles fetching and caching of farmer phone numbers with security
 */

import { firestore, doc, getDoc } from '../config/firebaseModular';

interface PhoneCache {
  [farmerId: string]: string | null;
}

class PhoneService {
  private cache: PhoneCache = {};
  private fetchingSet: Set<string> = new Set();
  private cacheExpiry: { [key: string]: number } = {};
  private readonly CACHE_DURATION = 1000 * 60 * 15; // 15 minutes

  /**
   * Get farmer phone number with caching
   */
  async getPhoneNumber(farmerId: string): Promise<string | null> {
    if (!farmerId) return null;

    // Check cache and expiry
    const now = Date.now();
    if (this.cache[farmerId] && this.cacheExpiry[farmerId] > now) {
      return this.cache[farmerId];
    }

    // Prevent duplicate requests
    if (this.fetchingSet.has(farmerId)) {
      // Wait for ongoing request
      return this.waitForFetch(farmerId);
    }

    // Mark as fetching
    this.fetchingSet.add(farmerId);

    try {
      const profileRef = doc(firestore, 'profiles', farmerId);
      const snap = await getDoc(profileRef);

      if (snap.exists()) {
        const data = snap.data();
        const phone = data?.phoneNumber || data?.phone || data?.mobile || null;
        
        // Cache the result
        this.cache[farmerId] = phone;
        this.cacheExpiry[farmerId] = now + this.CACHE_DURATION;
        
        return phone;
      }

      // Cache null result to prevent repeated failed fetches
      this.cache[farmerId] = null;
      this.cacheExpiry[farmerId] = now + this.CACHE_DURATION;
      
      return null;
    } catch (error) {
      console.error('[PhoneService] Error fetching phone:', error);
      return null;
    } finally {
      this.fetchingSet.delete(farmerId);
    }
  }

  /**
   * Wait for ongoing fetch to complete
   */
  private async waitForFetch(farmerId: string): Promise<string | null> {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    while (this.fetchingSet.has(farmerId) && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    return this.cache[farmerId] || null;
  }

  /**
   * Prefetch phone numbers for multiple farmers
   */
  async prefetchPhoneNumbers(farmerIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(farmerIds)].filter(id => {
      const now = Date.now();
      return id && (!this.cache[id] || this.cacheExpiry[id] <= now);
    });

    if (uniqueIds.length === 0) return;

    // Fetch in parallel with limit
    const batchSize = 3;
    for (let i = 0; i < uniqueIds.length; i += batchSize) {
      const batch = uniqueIds.slice(i, i + batchSize);
      await Promise.all(batch.map(id => this.getPhoneNumber(id)));
      
      // Small delay between batches
      if (i + batchSize < uniqueIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Sanitize phone number (remove non-numeric except +)
   */
  sanitizePhone(phone: string | null): string {
    if (!phone) return '';
    return phone.replace(/[^\d+]/g, '');
  }

  /**
   * Mask phone number for display (security)
   */
  maskPhone(phone: string | null): string {
    if (!phone) return '';
    const sanitized = this.sanitizePhone(phone);
    if (sanitized.length < 7) return sanitized;
    return sanitized.replace(/(\+?\d{3})\d{4}(\d{2,})/, '$1****$2');
  }

  /**
   * Clear cache (e.g., on logout)
   */
  clearCache(): void {
    this.cache = {};
    this.cacheExpiry = {};
    this.fetchingSet.clear();
  }

  /**
   * Remove expired cache entries
   */
  pruneCache(): void {
    const now = Date.now();
    Object.keys(this.cacheExpiry).forEach(farmerId => {
      if (this.cacheExpiry[farmerId] <= now) {
        delete this.cache[farmerId];
        delete this.cacheExpiry[farmerId];
      }
    });
  }
}

// Singleton instance
export const phoneService = new PhoneService();
