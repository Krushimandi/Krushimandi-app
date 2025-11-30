# Keyboard Controller Implementation - Complete Guide

## Overview
Implemented `react-native-keyboard-controller` in **ChatDetailScreen** and **AddFruitScreen** to handle keyboard appearance smoothly using a fake animated view at the bottom that pushes content up when keyboard opens.

## ✅ Screens Implemented
1. **ChatDetailScreen** - Chat input with messages
2. **AddFruitScreen** - Form with multiple input fields

## Changes Made

### 1. Package Installation
```bash
npm install react-native-keyboard-controller --legacy-peer-deps
```

### 2. App.tsx Updates
- Added `KeyboardProvider` wrapper around the entire app
- Wraps `GestureHandlerRootView` for proper gesture handling

```typescript
import { KeyboardProvider } from 'react-native-keyboard-controller';

return (
  <ErrorBoundary>
    <KeyboardProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Your app content */}
      </GestureHandlerRootView>
    </KeyboardProvider>
  </ErrorBoundary>
);
```

### 3. Screen Implementation Pattern

#### A. Imports
```javascript
import ReAnimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
```

#### B. Setup Keyboard Handler
```javascript
// Create shared value for keyboard height
const keyboardHeight = useSharedValue(0);

// Keyboard event handler
useKeyboardHandler({
  onStart: (e) => {
    'worklet';
    keyboardHeight.value = e.height;
  },
  onMove: (e) => {
    'worklet';
    keyboardHeight.value = e.height;
  },
  onEnd: (e) => {
    'worklet';
    keyboardHeight.value = e.height;
  },
});
```

#### C. Create Animated Style
```javascript
const fakeViewAnimatedStyle = useAnimatedStyle(() => {
  'worklet';
  return {
    height: withTiming(keyboardHeight.value, { duration: 250 }),
  };
});
```

#### D. Layout Structure
```jsx
<View style={styles.container}>
  {/* Header - can be absolute positioned */}
  <View style={styles.header}>
    {/* Header content */}
  </View>
  
  {/* Content ScrollView */}
  <ScrollView
    ref={scrollViewRef}
    style={styles.scrollView}
    contentContainerStyle={styles.scrollContent}
    keyboardShouldPersistTaps="handled"
  >
    {/* Your form inputs or content */}
  </ScrollView>
  
  {/* Button Container - NO absolute positioning */}
  <View style={styles.buttonContainer}>
    <TouchableOpacity style={styles.button}>
      <Text>Continue</Text>
    </TouchableOpacity>
  </View>
  
  {/* Fake Animated View - pushes everything up */}
  <ReAnimated.View style={fakeViewAnimatedStyle} />
</View>
```

#### E. Style Updates
**IMPORTANT:** Remove absolute positioning from button container

```javascript
// ❌ BEFORE (Don't use this):
buttonContainer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: '#FFFFFF',
  // ...
}

// ✅ AFTER (Use this):
buttonContainer: {
  backgroundColor: '#FFFFFF',
  paddingHorizontal: 24,
  paddingTop: 10,
  paddingBottom: 10,
  borderTopWidth: 1,
  borderTopColor: '#E5E7EB',
  // No position/bottom/left/right properties
}
```

### 4. What to Remove

#### ❌ Remove KeyboardAvoidingView
```javascript
// DELETE THIS:
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  keyboardVerticalOffset={100}
>
  {/* content */}
</KeyboardAvoidingView>
```

#### ❌ Remove Keyboard Listeners
```javascript
// DELETE THIS:
useEffect(() => {
  const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
    // ...
  });
  const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
    // ...
  });
  
  return () => {
    keyboardDidShowListener?.remove();
    keyboardDidHideListener?.remove();
  };
}, []);
```

#### ❌ Remove Button Transform Animations
```javascript
// DELETE THIS:
<Animated.View style={[
  styles.buttonContainer,
  { transform: [{ translateY: buttonAnimY }] }
]}>
```

## How It Works

### Flow Diagram
```
┌─────────────────────┐
│     Container       │
├─────────────────────┤
│   Header (fixed)    │ ← Can be absolute positioned
├─────────────────────┤
│                     │
│  ScrollView         │ ← flex: 1, takes available space
│  (Content)          │
│                     │
├─────────────────────┤
│  Button Container   │ ← Normal flow (not absolute)
├─────────────────────┤
│  Fake Animated View │ ← height: 0 → keyboard height
└─────────────────────┘

When keyboard opens:
1. Fake view height: 0 → 297px (keyboard height)
2. This pushes button container up
3. Button container pushes ScrollView content up
4. Everything stays above keyboard ✨
```

### Step by Step
1. **KeyboardProvider** tracks keyboard globally
2. **useKeyboardHandler** receives keyboard events
3. **Shared value** updates on each keyboard event
4. **Fake view** animates its height based on shared value
5. **Layout reflows** naturally, pushing content up
6. **Animation** is smooth (250ms withTiming)

## Benefits

### ✅ Advantages
- Smooth, synchronized animation with keyboard
- No complex platform-specific configurations
- Button stays in normal document flow
- Consistent behavior on iOS and Android
- Better performance (uses reanimated UI thread)
- Cleaner, more maintainable code
- Works with any content (forms, chats, etc.)

### ❌ What We Removed
- KeyboardAvoidingView complexity
- Platform.OS conditional logic
- keyboardVerticalOffset calculations
- Keyboard.addListener boilerplate
- Transform animations for buttons
- Absolute positioning issues

## Native Setup

### Android ✅ (Already Done)
**File:** `android/app/src/main/java/com/krushimandi/app/MainActivity.kt`

```kotlin
import android.view.WindowManager
import com.reactnativekeyboardcontroller.KeyboardControllerModule

override fun onCreate(savedInstanceState: Bundle?) {
    // This tells the keyboard controller to handle keyboard behavior
    KeyboardControllerModule.setWindowSoftInputMode(
        window,
        WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING
    )
    RNBootSplash.init(this, R.style.BootTheme)
    super.onCreate(savedInstanceState)
}
```

### iOS
```bash
cd ios && pod install && cd ..
```

## Testing Checklist

### For Each Screen:
- [ ] Tap any input field
- [ ] Keyboard opens smoothly
- [ ] Content moves up (not hidden)
- [ ] All inputs remain accessible
- [ ] Button stays above keyboard
- [ ] Keyboard closes smoothly
- [ ] Content returns to original position
- [ ] No visual glitches or jumps
- [ ] Works on both iOS and Android

### Specific Tests:

#### ChatDetailScreen
- [ ] Type message
- [ ] Send button visible
- [ ] Messages scroll properly
- [ ] Input never hidden

#### AddFruitScreen
- [ ] Fill all form fields sequentially
- [ ] Navigate between inputs
- [ ] Continue button always visible
- [ ] Long description field works
- [ ] Location inputs accessible

## Troubleshooting

### Issue: Content still hidden behind keyboard
**Solution:** Ensure button container doesn't have `position: 'absolute'`

### Issue: Jerky animation
**Solution:** Check that you're using `withTiming` and duration is 250ms

### Issue: Not working on Android
**Solution:** Verify MainActivity.kt has the SOFT_INPUT_ADJUST_NOTHING setup

### Issue: Keyboard height is 0
**Solution:** Make sure KeyboardProvider wraps your app in App.tsx

## Code Comparison

### Before vs After

```javascript
// ❌ OLD WAY (Complex)
<KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={100}>
  <ScrollView contentContainerStyle={{ paddingBottom: keyboardHeight + 50 }}>
    {/* content */}
  </ScrollView>
  <Animated.View style={[
    styles.buttonContainer,
    { transform: [{ translateY: buttonAnimY }] }
  ]}>
    {/* button */}
  </Animated.View>
</KeyboardAvoidingView>

// ✅ NEW WAY (Simple)
<ScrollView>
  {/* content */}
</ScrollView>
<View style={styles.buttonContainer}>
  {/* button */}
</View>
<ReAnimated.View style={fakeViewAnimatedStyle} />
```

## Performance Notes

- Uses Reanimated's UI thread (60 FPS guaranteed)
- No bridge communication for animations
- Worklet functions run on UI thread
- Smooth even on low-end devices
- No unnecessary re-renders

## Future Screens

To implement on other screens:
1. Add imports (ReAnimated, useKeyboardHandler)
2. Create keyboardHeight shared value
3. Add useKeyboardHandler hook
4. Create fakeViewAnimatedStyle
5. Remove KeyboardAvoidingView
6. Remove absolute positioning from bottom elements
7. Add fake view at bottom of container

## Summary

This implementation provides a **clean, performant, and consistent** keyboard handling solution that:
- Works across all screens with forms/inputs
- Requires minimal code changes
- Eliminates platform-specific hacks
- Provides smooth 60 FPS animations
- Keeps all content accessible above keyboard

**No more fighting with KeyboardAvoidingView!** 🎉
