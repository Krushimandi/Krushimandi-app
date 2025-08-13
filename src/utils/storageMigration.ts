/**
 * Storage Migration Utility
 * Helps migrate sensitive data from AsyncStorage to SecureStorage
 * for existing users upgrading to the new security implementation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from './secureStorage';
import { StorageKeys } from '../constants/AppConstants';

export class StorageMigration {
  private static migrationKey = '@krushimandi:migration_v2_complete';

  /**
   * Check if migration is needed
   */
  static async isMigrationNeeded(): Promise<boolean> {
    try {
      const migrationComplete = await AsyncStorage.getItem(this.migrationKey);
      return migrationComplete !== 'true';
    } catch (error) {
      console.error('Failed to check migration status:', error);
      return true; // Assume migration needed if we can't check
    }
  }

  /**
   * Migrate sensitive data from AsyncStorage to SecureStorage
   */
  static async migrateSensitiveData(): Promise<boolean> {
    try {
      if (!(await this.isMigrationNeeded())) {
        if (__DEV__) {
          console.log('📦 Storage migration already completed');
        }
        return true;
      }

      if (__DEV__) {
        console.log('🔄 Starting storage migration...');
      }

      let migrationSuccess = true;

      // Migrate user token
      const userToken = await AsyncStorage.getItem(StorageKeys.USER_TOKEN);
      if (userToken) {
        const tokenStored = await secureStorage.setItem('legacy_auth_token', userToken);
        if (tokenStored) {
          await AsyncStorage.removeItem(StorageKeys.USER_TOKEN);
          if (__DEV__) {
            console.log('✅ User token migrated to secure storage');
          }
        } else {
          migrationSuccess = false;
          console.error('❌ Failed to migrate user token');
        }
      }

      // Migrate other sensitive data if exists
      const sensitiveKeys: string[] = [
        StorageKeys.USER_TOKEN,
        // Add other sensitive keys as needed
      ];

      for (const key of sensitiveKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value && key !== StorageKeys.USER_TOKEN) { // Skip token as it's already handled
            const secureKey = key.replace('@krushimandi:', '');
            const stored = await secureStorage.setItem(secureKey, value);
            if (stored) {
              await AsyncStorage.removeItem(key);
              if (__DEV__) {
                console.log(`✅ Migrated ${key} to secure storage`);
              }
            }
          }
        } catch (error) {
          console.error(`❌ Failed to migrate ${key}:`, error);
          migrationSuccess = false;
        }
      }

      if (migrationSuccess) {
        // Mark migration as complete
        await AsyncStorage.setItem(this.migrationKey, 'true');
        if (__DEV__) {
          console.log('✅ Storage migration completed successfully');
        }
      }

      return migrationSuccess;
    } catch (error) {
      console.error('❌ Storage migration failed:', error);
      return false;
    }
  }

  /**
   * Rollback migration (emergency use only)
   */
  static async rollbackMigration(): Promise<boolean> {
    try {
      if (__DEV__) {
        console.log('🔄 Rolling back storage migration...');
      }

      // This is a basic rollback - in production you might want more sophisticated rollback
      await AsyncStorage.removeItem(this.migrationKey);
      
      if (__DEV__) {
        console.log('✅ Migration rollback completed');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Migration rollback failed:', error);
      return false;
    }
  }

  /**
   * Get migration status
   */
  static async getMigrationStatus(): Promise<{
    isComplete: boolean;
    hasLegacyData: boolean;
    secureStorageAvailable: boolean;
  }> {
    try {
      const isComplete = !(await this.isMigrationNeeded());
      const secureStorageAvailable = await secureStorage.isAvailable();
      
      // Check if there's legacy data
      const userToken = await AsyncStorage.getItem(StorageKeys.USER_TOKEN);
      const hasLegacyData = !!userToken;

      return {
        isComplete,
        hasLegacyData,
        secureStorageAvailable,
      };
    } catch (error) {
      console.error('Failed to get migration status:', error);
      return {
        isComplete: false,
        hasLegacyData: false,
        secureStorageAvailable: false,
      };
    }
  }

  /**
   * Force migration reset (for testing/debugging)
   */
  static async resetMigrationStatus(): Promise<void> {
    if (__DEV__) {
      try {
        await AsyncStorage.removeItem(this.migrationKey);
        console.log('🔄 Migration status reset');
      } catch (error) {
        console.error('Failed to reset migration status:', error);
      }
    } else {
      console.warn('Migration reset is only available in development mode');
    }
  }
}

/**
 * React hook for migration status
 */
export const useMigration = () => {
  const React = require('react');
  
  interface MigrationStatus {
    isLoading: boolean;
    isComplete: boolean;
    hasLegacyData: boolean;
    secureStorageAvailable: boolean;
  }
  
  const [migrationStatus, setMigrationStatus] = React.useState({
    isLoading: true,
    isComplete: false,
    hasLegacyData: false,
    secureStorageAvailable: false,
  } as MigrationStatus);

  React.useEffect(() => {
    const checkMigrationStatus = async () => {
      const status = await StorageMigration.getMigrationStatus();
      setMigrationStatus({
        isLoading: false,
        ...status,
      });
    };

    checkMigrationStatus();
  }, []);

  const performMigration = async () => {
    setMigrationStatus((prev: MigrationStatus) => ({ ...prev, isLoading: true }));
    const success = await StorageMigration.migrateSensitiveData();
    
    if (success) {
      const status = await StorageMigration.getMigrationStatus();
      setMigrationStatus({
        isLoading: false,
        ...status,
      });
    } else {
      setMigrationStatus((prev: MigrationStatus) => ({ ...prev, isLoading: false }));
    }
    
    return success;
  };

  return {
    ...migrationStatus,
    performMigration,
  };
};
