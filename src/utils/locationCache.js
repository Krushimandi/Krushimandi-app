/**
 * Location Cache Manager
 * 
 * Provides intelligent location caching to avoid repeated API calls:
 * - Caches current location and address when app starts
 * - Returns cached data if user hasn't moved significantly (50-100m)
 * - Automatically refreshes when user moves to a new location
 * - Stores data in memory for fast access during app session
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentLocation, reverseGeocode } from './permissions';

const CACHE_KEY = 'locationCache';
const DISTANCE_THRESHOLD = 75; // meters - if moved less than this, use cached data
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds
const BACKGROUND_REFRESH_DELAY = 3000; // 3 seconds after app start

class LocationCacheManager {
  constructor() {
    this.cache = null;
    this.isInitializing = false;
    this.initPromise = null;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 
   * @param {number} lon1 
   * @param {number} lat2 
   * @param {number} lon2 
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Check if cached data is still valid
   * @param {object} cachedData 
   * @param {number} currentLat 
   * @param {number} currentLng 
   * @returns {boolean}
   */
  isCacheValid(cachedData, currentLat, currentLng) {
    if (!cachedData || !cachedData.location || !cachedData.address) {
      return false;
    }

    // Check if cache has expired
    const now = Date.now();
    if (now - cachedData.timestamp > CACHE_EXPIRY) {
      console.log('📅 Location cache expired');
      return false;
    }

    // Check distance from cached location
    const distance = this.calculateDistance(
      cachedData.location.latitude,
      cachedData.location.longitude,
      currentLat,
      currentLng
    );

    console.log(`📏 Distance from cached location: ${distance.toFixed(1)}m`);

    if (distance <= DISTANCE_THRESHOLD) {
      console.log('✅ Using cached location (within distance threshold)');
      return true;
    }

    console.log('🚶 User moved significantly, cache invalid');
    return false;
  }

  /**
   * Load cached data from AsyncStorage
   */
  async loadCacheFromStorage() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        this.cache = JSON.parse(cached);
        console.log('📱 Loaded location cache from storage');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load location cache:', error);
    }
  }

  /**
   * Save cache data to AsyncStorage
   * @param {object} cacheData 
   */
  async saveCacheToStorage(cacheData) {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('💾 Saved location cache to storage');
    } catch (error) {
      console.warn('⚠️ Failed to save location cache:', error);
    }
  }

  /**
   * Initialize location cache in background (called when app starts)
   */
  async initializeCache() {
    if (this.isInitializing) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._performInitialization();
    
    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
  }

  async _performInitialization() {
    try {
      console.log('🚀 Initializing location cache...');
      
      // Load existing cache first
      await this.loadCacheFromStorage();
      
      // Get current location in background
      const location = await getCurrentLocation();
      if (!location) {
        console.log('❌ Failed to get initial location');
        return;
      }

      console.log('📍 Got initial location:', location);

      // Check if we should update cache
      const shouldUpdate = !this.cache || 
        !this.isCacheValid(this.cache, location.latitude, location.longitude);

      if (shouldUpdate) {
        console.log('🔄 Updating location cache...');
        
        // Get address for the location
        const address = await reverseGeocode(location.latitude, location.longitude);
        
        if (address) {
          const newCache = {
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              source: location.source
            },
            address: address,
            timestamp: Date.now()
          };

          this.cache = newCache;
          await this.saveCacheToStorage(newCache);
          
          console.log('✅ Location cache updated successfully');
        } else {
          console.log('⚠️ Failed to get address for initial location');
        }
      } else {
        console.log('✅ Existing cache is still valid');
      }

    } catch (error) {
      console.error('❌ Location cache initialization failed:', error);
    }
  }

  /**
   * Get cached location and address if available and valid
   * @param {number} currentLat - Current latitude (optional, for validation)
   * @param {number} currentLng - Current longitude (optional, for validation)
   * @returns {object|null} Cached data or null
   */
  getCachedLocation(currentLat, currentLng) {
    if (!this.cache) {
      return null;
    }

    // If current coordinates provided, validate cache
    if (currentLat !== undefined && currentLng !== undefined) {
      if (!this.isCacheValid(this.cache, currentLat, currentLng)) {
        return null;
      }
    }

    console.log('⚡ Returning cached location data');
    return {
      location: this.cache.location,
      address: this.cache.address,
      source: 'cache',
      cacheAge: Date.now() - this.cache.timestamp
    };
  }

  /**
   * Update cache with new location and address
   * @param {object} location 
   * @param {object} address 
   */
  async updateCache(location, address) {
    const newCache = {
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        source: location.source
      },
      address: address,
      timestamp: Date.now()
    };

    this.cache = newCache;
    await this.saveCacheToStorage(newCache);
    console.log('🔄 Location cache updated');
  }

  /**
   * Clear the cache (useful for testing or when user manually requests refresh)
   */
  async clearCache() {
    this.cache = null;
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      console.log('🗑️ Location cache cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics (for debugging)
   */
  getCacheStats() {
    if (!this.cache) {
      return { hasCached: false };
    }

    const age = Date.now() - this.cache.timestamp;
    return {
      hasCached: true,
      age: age,
      ageMinutes: Math.floor(age / (1000 * 60)),
      location: this.cache.location,
      address: this.cache.address
    };
  }
}

// Create singleton instance
const locationCache = new LocationCacheManager();

/**
 * Initialize location cache in background when app starts
 * Call this from App.js or main component
 */
export const initializeLocationCache = () => {
  setTimeout(() => {
    locationCache.initializeCache().catch(error => {
      console.warn('Background location cache initialization failed:', error);
    });
  }, BACKGROUND_REFRESH_DELAY);
};

/**
 * Fast location getter - uses cache if available, otherwise gets fresh data
 * @param {object} options - Options for location request
 * @returns {Promise<object>} Location and address data
 */
export const getFastCachedLocation = async (options = {}) => {
  const { forceRefresh = false } = options;
  
  try {
    console.log('⚡ Getting fast cached location...');

    if (!forceRefresh) {
      // Try to get cached data first
      const cached = locationCache.getCachedLocation();
      if (cached) {
        console.log(`✅ Using cached location (${Math.floor(cached.cacheAge / 1000)}s old)`);
        return {
          location: cached.location,
          address: cached.address,
          source: 'cache',
          cacheAge: cached.cacheAge
        };
      }
    }

    console.log('🔄 Getting fresh location data...');

    // Get current location
    const location = await getCurrentLocation();
    if (!location) {
      throw new Error('Failed to get current location');
    }

    // Check if we can use cached address for this location
    if (!forceRefresh) {
      const cached = locationCache.getCachedLocation(location.latitude, location.longitude);
      if (cached) {
        console.log('✅ Using cached address for current location');
        return {
          location: location,
          address: cached.address,
          source: 'cache-address',
          cacheAge: cached.cacheAge
        };
      }
    }

    // Get fresh address
    console.log('🌐 Getting fresh address data...');
    const address = await reverseGeocode(location.latitude, location.longitude);
    
    if (address) {
      // Update cache
      await locationCache.updateCache(location, address);
      
      return {
        location: location,
        address: address,
        source: 'fresh'
      };
    } else {
      throw new Error('Failed to get address for location');
    }

  } catch (error) {
    console.error('❌ Fast cached location failed:', error);
    
    // Try to return any cached data as fallback
    const cached = locationCache.getCachedLocation();
    if (cached) {
      console.log('⚠️ Returning cached data as fallback');
      return {
        location: cached.location,
        address: cached.address,
        source: 'cache-fallback',
        cacheAge: cached.cacheAge,
        error: error.message
      };
    }
    
    throw error;
  }
};

/**
 * Clear location cache (for testing or manual refresh)
 */
export const clearLocationCache = () => {
  return locationCache.clearCache();
};

/**
 * Get cache statistics (for debugging)
 */
export const getLocationCacheStats = () => {
  return locationCache.getCacheStats();
};

export default locationCache;
