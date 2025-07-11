# Offline Capability Implementation

This document explains the offline functionality added to the KrushiMandi app to handle network connectivity issues and keep users logged in when offline.

## Overview

The app now supports offline functionality that:
- Keeps users logged in when network is unavailable
- Queues operations for later execution when connection is restored
- Provides graceful fallbacks for network errors
- Shows network status to users
- Persists authentication state locally

## Key Components

### 1. Network Monitoring (`firebaseService.js`)

#### Functions Added:
- `initializeNetworkMonitoring()` - Sets up network state monitoring
- `isNetworkAvailable()` - Checks current network status
- `handleNetworkError()` - Handles network errors gracefully
- `saveOfflineAuthState()` - Saves auth state for offline access
- `getOfflineAuthState()` - Retrieves offline auth state
- `clearOfflineAuthState()` - Clears offline auth data

#### Offline Queue System:
- `addToOfflineQueue()` - Adds operations to queue for later execution
- `processOfflineQueue()` - Processes queued operations when online

### 2. Updated Core Functions

#### `syncUserProfile()` - Enhanced with offline support:
- Checks network status before operations
- Saves avatar uploads for later if offline
- Queues Firestore operations when offline
- Always saves to AsyncStorage for offline access
- Shows appropriate progress messages

#### `getCompleteUserProfile()` - Offline fallback:
- Uses cached data when offline
- Falls back to offline auth state if no cache
- Gracefully handles network errors

#### `validateCurrentUser()` - Offline tolerance:
- Allows continued access when offline
- Uses local data for validation when network unavailable
- Only clears auth data for confirmed account deletions

#### `updateLastLogin()` - Queued updates:
- Queues login updates when offline
- Processes when connection restored

### 3. Custom Hooks

#### `useOfflineCapability.js`
```javascript
const { isOnline, executeWithOfflineFallback } = useOfflineCapability();

// Execute with offline fallback
await executeWithOfflineFallback(
  // Online operation
  async () => await syncToFirestore(data),
  // Offline operation  
  async () => await saveToLocalStorage(data),
  'data_sync'
);
```

#### Enhanced `useAuthBootstrap.ts`
- Integrates offline capability with auth state
- Provides offline user data when network unavailable
- Enhanced logout with offline handling

### 4. UI Components

#### `NetworkStatusIndicator.jsx`
- Shows banner when app is offline
- Automatically hides when connection restored
- Smooth animations for status changes

## Usage Examples

### Basic Network Status Check
```javascript
import { useOfflineCapability } from '../hooks/useOfflineCapability';

const MyComponent = () => {
  const { isOnline, checkNetworkStatus } = useOfflineCapability();
  
  if (!isOnline) {
    return <Text>You're offline. Some features may be limited.</Text>;
  }
  
  return <NormalContent />;
};
```

### Operation with Offline Fallback
```javascript
import { useOfflineCapability } from '../hooks/useOfflineCapability';

const DataSyncComponent = () => {
  const { executeWithOfflineFallback } = useOfflineCapability();
  
  const saveData = async (data) => {
    await executeWithOfflineFallback(
      // Online: Save to Firebase
      async () => {
        await firestore().collection('data').add(data);
        console.log('Data saved to Firebase');
      },
      // Offline: Save locally
      async () => {
        await AsyncStorage.setItem('pendingData', JSON.stringify(data));
        console.log('Data saved locally, will sync when online');
      },
      'save_data'
    );
  };
  
  return <SaveButton onPress={() => saveData(myData)} />;
};
```

### Enhanced Auth with Offline Support
```javascript
import { useAuthBootstrap } from '../hooks/useAuthBootstrap';

const MyScreen = () => {
  const { 
    isAuthenticated, 
    isOnline, 
    usingOfflineAuth,
    executeWithOfflineFallback 
  } = useAuthBootstrap();
  
  if (usingOfflineAuth) {
    return (
      <View>
        <Text>You're offline, using cached authentication</Text>
        <MyOfflineContent />
      </View>
    );
  }
  
  return <MyOnlineContent />;
};
```

## Implementation Details

### Dependencies Added
```bash
npm install @react-native-community/netinfo
```

### App Integration

In `App.tsx`:
```javascript
import { initializeNetworkMonitoring } from './src/services/firebaseService';
import NetworkStatusIndicator from './src/components/common/NetworkStatusIndicator';

// Initialize network monitoring
useEffect(() => {
  initializeNetworkMonitoring();
}, []);

// Add status indicator to app
<NetworkStatusIndicator />
```

### Error Handling

The system automatically detects network errors by checking for:
- Error messages containing 'network', 'timeout', 'connection', 'offline'
- Firebase error codes: 'unavailable', 'deadline-exceeded'

When network errors are detected:
1. Operations are queued for later execution
2. Local fallbacks are used when available
3. User-friendly messages are shown
4. App continues functioning with cached data

### Data Persistence

#### AsyncStorage Keys Used:
- `userData` - User profile data
- `offlineAuthState` - Authentication state for offline access
- `offlineQueue` - Queued operations for when online
- `pendingAvatarUpload` - Avatar uploads waiting for connection

#### Automatic Sync:
- When network becomes available, queued operations are processed
- Failed operations remain in queue for retry
- Successfully processed operations are removed from queue

## Benefits

1. **Uninterrupted User Experience**: Users stay logged in and can access cached content when offline
2. **Data Integrity**: Operations are queued and executed when connection is restored
3. **Graceful Degradation**: App functions with limited capabilities rather than failing completely
4. **Transparent Recovery**: Automatic sync when connection is restored
5. **User Awareness**: Clear indication of offline status and queued operations

## Best Practices

1. Always use `executeWithOfflineFallback` for operations that modify data
2. Check `isOnline` before attempting network-dependent operations
3. Provide offline alternatives for critical app functions
4. Show appropriate UI states for offline mode
5. Handle queued operations gracefully - some may fail on retry

## Testing Offline Functionality

1. **Airplane Mode**: Test complete offline functionality
2. **Poor Connection**: Test with slow/intermittent connection
3. **Network Switching**: Test WiFi to cellular transitions
4. **Long Offline Periods**: Test extended offline usage
5. **Queue Processing**: Test operations queuing and processing when online

## Future Enhancements

1. **Conflict Resolution**: Handle data conflicts when syncing after offline period
2. **Selective Sync**: Allow users to choose what data to sync
3. **Storage Management**: Implement cache size limits and cleanup
4. **Advanced Queuing**: Priority-based operation queuing
5. **Background Sync**: Sync data when app is in background
