# User Role Storage Implementation

## Problem
The AppNavigator was getting `userRole` as undefined because it was calling `getMainComponent` before the user profile was fully loaded from Firebase. This caused navigation issues where users would see the wrong UI stack.

## Solution
Implemented a localStorage-based user role storage system with Firestore synchronization.

## Changes Made

### 1. Created User Role Storage Utility (`src/utils/userRoleStorage.ts`)
- **`saveUserRole(role)`**: Save user role to localStorage
- **`getUserRole()`**: Get user role from localStorage
- **`clearUserRole()`**: Clear user role from localStorage
- **`syncUserRole()`**: Synchronize role between localStorage and Firestore
- **`initializeUserRoleFromUserData()`**: Migrate existing users to new storage system

### 2. Updated Storage Constants (`src/constants/AppConstants.ts`)
- Added `USER_ROLE: '@krushimandi:user_role'` to StorageKeys

### 3. Updated Authentication Flow

#### RoleSelectionScreen (`src/components/auth/RoleSelectionScreen.jsx`)
- Save role to localStorage when user selects role
- Maintain backward compatibility with userData storage

#### IntroduceYourselfScreen (`src/components/auth/IntroduceYourselfScreen.jsx`)
- Save role to localStorage when profile is completed
- Ensures role is available immediately after registration

#### OTPVerificationScreen (`src/components/auth/OTPVerificationScreen.jsx`)
- Save role to localStorage when existing user is restored
- Handles returning users properly

### 4. Updated AppNavigator (`src/navigation/AppNavigator.tsx`)
- Load user role from localStorage on app launch
- Use localStorage role instead of waiting for profile load
- Sync role with Firestore in background
- Navigate based on localStorage role for immediate availability

### 5. Updated Logout Functions
- Clear user role from localStorage in all logout scenarios
- Updated SettingsScreen, authUtils, and authFlow

## Key Benefits

1. **Immediate Role Availability**: Role is available from localStorage immediately on app launch
2. **Firestore Synchronization**: Role is kept in sync between localStorage and Firestore
3. **Conflict Resolution**: If roles differ, localStorage takes precedence and updates Firestore
4. **Backward Compatibility**: Existing users are migrated to the new system automatically
5. **Better User Experience**: No more undefined role issues causing wrong navigation

## Usage Flow

1. **Login/Registration**: Role is saved to localStorage when selected or profile completed
2. **App Launch**: Role is loaded from localStorage immediately
3. **Background Sync**: Role synced with Firestore if needed
4. **Navigation**: Uses localStorage role for immediate navigation decisions
5. **Logout**: Role is cleared from both localStorage and other storage locations

## File Structure
```
src/
├── utils/
│   └── userRoleStorage.ts          # New role storage utility
├── constants/
│   └── AppConstants.ts             # Updated with USER_ROLE key
├── navigation/
│   └── AppNavigator.tsx            # Updated to use localStorage role
└── components/auth/
    ├── RoleSelectionScreen.jsx     # Saves role on selection
    ├── IntroduceYourselfScreen.jsx  # Saves role on completion
    └── OTPVerificationScreen.jsx   # Saves role for existing users
```

This implementation ensures that user roles are immediately available for navigation decisions while maintaining data consistency across all storage systems.
