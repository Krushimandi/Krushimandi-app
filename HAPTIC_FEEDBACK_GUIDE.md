# Haptic Feedback Utility Guide

## 📱 Installation

First, install the required dependency:

```bash
npm install react-native-haptic-feedback
# or
yarn add react-native-haptic-feedback
```

For iOS, install pods:
```bash
cd ios && pod install && cd ..
```

## 🎯 Usage Examples

### 1. Basic Usage - Import and Use

```javascript
import { HapticFeedback, lightHaptic, successHaptic } from '../utils/haptics';

// Simple button press
<TouchableOpacity 
  onPress={() => {
    lightHaptic(); // Trigger haptic
    handleSubmit();
  }}
>
  <Text>Submit</Text>
</TouchableOpacity>

// Success feedback
const handleSave = async () => {
  try {
    await saveData();
    successHaptic(); // Success vibration
    Toast.show({ type: 'success', text1: 'Saved!' });
  } catch (error) {
    errorHaptic(); // Error vibration
    Toast.show({ type: 'error', text1: 'Failed!' });
  }
};
```

### 2. Using Pre-defined Feedback Types

```javascript
import { HapticFeedback } from '../utils/haptics';

// Button press
<TouchableOpacity onPress={() => {
  HapticFeedback.buttonPress();
  navigation.navigate('Home');
}}>
  <Text>Go Home</Text>
</TouchableOpacity>

// Toggle switch
<Switch
  value={enabled}
  onValueChange={(value) => {
    HapticFeedback.toggleSwitch();
    setEnabled(value);
  }}
/>

// Item selection
<FlatList
  data={items}
  renderItem={({ item }) => (
    <TouchableOpacity
      onPress={() => {
        HapticFeedback.itemSelect();
        selectItem(item);
      }}
    >
      <Text>{item.name}</Text>
    </TouchableOpacity>
  )}
/>

// Long press
<TouchableOpacity
  onLongPress={() => {
    HapticFeedback.longPress();
    showOptions();
  }}
>
  <Text>Press and Hold</Text>
</TouchableOpacity>

// Delete action
<TouchableOpacity
  onPress={() => {
    HapticFeedback.delete();
    handleDelete();
  }}
>
  <Icon name="trash" />
</TouchableOpacity>
```

### 3. Advanced Usage - Custom Haptic Types

```javascript
import { triggerHaptic, HapticType } from '../utils/haptics';

// Custom haptic feedback
<TouchableOpacity
  onPress={() => {
    triggerHaptic(HapticType.HEAVY);
    confirmAction();
  }}
>
  <Text>Confirm</Text>
</TouchableOpacity>

// With options
<TouchableOpacity
  onPress={() => {
    triggerHaptic(HapticType.SUCCESS, {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
    handleSuccess();
  }}
>
  <Text>Complete</Text>
</TouchableOpacity>
```

### 4. Real-World Examples from Your App

#### A. Notification Switch (NotificationScreen.tsx)

```javascript
import { HapticFeedback } from '../../utils/haptics';

const handlePreferenceChange = useCallback((key, value) => {
  // Trigger haptic feedback
  HapticFeedback.toggleSwitch();
  
  // Update UI immediately
  const newSettings = { ...settings, [key]: value };
  setSettings(newSettings);
  
  // Save to network
  debouncedSave(newSettings);
}, [settings, debouncedSave]);
```

#### B. Sort Selection (FarmerHomeScreen.jsx)

```javascript
import { HapticFeedback } from '../../utils/haptics';

const handleSortSelection = useCallback((sortKey) => {
  // Haptic feedback for selection
  HapticFeedback.itemSelect();
  
  const isValidSortKey = sortOptions.some(option => option.key === sortKey);
  if (!isValidSortKey) return;
  
  setSortBy(sortKey);
  setShowSortModal(false);
}, []);
```

#### C. Category Selection

```javascript
import { HapticFeedback } from '../../utils/haptics';

<TouchableOpacity
  style={[styles.categoryCard]}
  onPress={() => {
    HapticFeedback.itemSelect();
    setSelectedCategory(item.type);
  }}
>
  <Text>{item.name}</Text>
</TouchableOpacity>
```

#### D. Mark as Sold/Delete Actions

```javascript
import { HapticFeedback } from '../../utils/haptics';

const markFruitAsSold = (fruit) => {
  HapticFeedback.warning(); // Warning before delete
  
  Alert.alert(
    'Mark as Sold',
    `Are you sure?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'destructive',
        onPress: () => {
          HapticFeedback.success(); // Success feedback
          handleFruitStatusUpdate(fruit.id, 'sold');
        }
      }
    ]
  );
};
```

#### E. Pull to Refresh

```javascript
import { HapticFeedback } from '../../utils/haptics';

const handleRefresh = async () => {
  HapticFeedback.refresh(); // Light haptic on refresh
  
  setRefreshing(true);
  await loadRequests();
  setRefreshing(false);
};

<FlatList
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
    />
  }
/>
```

#### F. Navigation

```javascript
import { HapticFeedback } from '../../utils/haptics';

<TouchableOpacity
  onPress={() => {
    HapticFeedback.navigation();
    navigation.navigate('ProductDetails', { productId });
  }}
>
  <Text>View Details</Text>
</TouchableOpacity>
```

#### G. Location Modal

```javascript
import { HapticFeedback } from '../../utils/haptics';

const onLocationPress = useCallback(() => {
  HapticFeedback.modal(); // Modal open haptic
  
  locationTapAnim.setValue(0);
  Animated.sequence([...]).start();
  setTimeout(() => setIsLocationModalVisible(true), 90);
}, [locationTapAnim]);
```

### 5. Form Validation Examples

```javascript
import { successHaptic, errorHaptic } from '../utils/haptics';

const handleSubmit = async () => {
  // Validation
  if (!validateForm()) {
    errorHaptic(); // Error feedback
    Toast.show({ type: 'error', text1: 'Invalid input' });
    return;
  }
  
  try {
    await submitData();
    successHaptic(); // Success feedback
    Toast.show({ type: 'success', text1: 'Submitted!' });
  } catch (error) {
    errorHaptic(); // Error feedback
    Toast.show({ type: 'error', text1: 'Failed!' });
  }
};
```

### 6. Custom Vibration Patterns

```javascript
import { customVibration, cancelVibration } from '../utils/haptics';

// Custom pattern: [wait, vibrate, wait, vibrate]
const sosPattern = [0, 100, 100, 100, 100, 100, 100, 300, 100, 300, 100, 300, 100, 100, 100, 100, 100, 100];

<TouchableOpacity
  onPress={() => {
    customVibration(sosPattern);
  }}
>
  <Text>SOS</Text>
</TouchableOpacity>

// Cancel vibration
<TouchableOpacity
  onPress={() => {
    cancelVibration();
  }}
>
  <Text>Stop</Text>
</TouchableOpacity>
```

## 📋 Complete Haptic Types Reference

| Function | Use Case | Intensity |
|----------|----------|-----------|
| `lightHaptic()` | Button taps, subtle interactions | Light |
| `mediumHaptic()` | Standard selections, toggles | Medium |
| `heavyHaptic()` | Important confirmations, deletes | Heavy |
| `successHaptic()` | Success operations | Medium |
| `errorHaptic()` | Error alerts | Heavy |
| `warningHaptic()` | Warning messages | Medium |
| `selectionHaptic()` | List selections, picker changes | Light |
| `rigidHaptic()` | Precise UI interactions | Medium |
| `softHaptic()` | Very subtle interactions | Very Light |

## 🎯 Pre-defined UI Interactions

```javascript
import { HapticFeedback } from '../utils/haptics';

// All available interactions:
HapticFeedback.buttonPress()      // Button press
HapticFeedback.toggleSwitch()     // Toggle switch
HapticFeedback.itemSelect()       // Item selection
HapticFeedback.swipeAction()      // Swipe action
HapticFeedback.longPress()        // Long press
HapticFeedback.refresh()          // Pull to refresh
HapticFeedback.navigation()       // Navigation
HapticFeedback.modal()            // Modal open/close
HapticFeedback.alert()            // Alert/notification
HapticFeedback.success()          // Success action
HapticFeedback.error()            // Error action
HapticFeedback.delete()           // Delete action
HapticFeedback.create()           // Add/create action
HapticFeedback.scrollBoundary()   // Scroll to boundary
HapticFeedback.pickerChange()     // Picker change
HapticFeedback.sliderChange()     // Slider change
HapticFeedback.checkboxToggle()   // Checkbox/Radio
HapticFeedback.inputFocus()       // Input focus
HapticFeedback.tabChange()        // Tab change
HapticFeedback.cardFlip()         // Card flip/rotate
HapticFeedback.dragStart()        // Drag start
HapticFeedback.dragEnd()          // Drag end
HapticFeedback.contextMenu()      // Context menu
```

## ⚡ Performance Tips

1. **Don't overuse**: Only add haptics to meaningful interactions
2. **Async operations**: Haptics are non-blocking and optimized
3. **Fallback**: Automatically falls back to basic vibration if advanced haptics unavailable
4. **Platform support**: Works on both iOS and Android

## 🚫 Common Mistakes to Avoid

```javascript
// ❌ Don't call haptic in loops
items.forEach(item => {
  lightHaptic(); // Too many haptics!
});

// ✅ Call once for the action
lightHaptic();
items.forEach(item => processItem(item));

// ❌ Don't use heavy haptics for minor actions
<TouchableOpacity onPress={() => {
  heavyHaptic(); // Too intense for simple tap
  toggleFlag();
}}>

// ✅ Use appropriate intensity
<TouchableOpacity onPress={() => {
  lightHaptic(); // Better for simple tap
  toggleFlag();
}}>
```

## 🎨 Best Practices

1. **Button presses**: Use `lightHaptic()` or `HapticFeedback.buttonPress()`
2. **Switches/Toggles**: Use `mediumHaptic()` or `HapticFeedback.toggleSwitch()`
3. **Success**: Use `successHaptic()` or `HapticFeedback.success()`
4. **Errors**: Use `errorHaptic()` or `HapticFeedback.error()`
5. **Deletions**: Use `heavyHaptic()` or `HapticFeedback.delete()`
6. **Selections**: Use `selectionHaptic()` or `HapticFeedback.itemSelect()`
7. **Navigation**: Use `lightHaptic()` or `HapticFeedback.navigation()`

## 📱 Platform Compatibility

- ✅ iOS: Full haptic feedback support
- ✅ Android: Vibration fallback with pattern matching
- ✅ Automatic detection and graceful degradation

## 🔧 Configuration

Modify `HAPTIC_CONFIG` in `haptics.js` to customize behavior:

```javascript
const HAPTIC_CONFIG = {
  enableVibrateFallback: true,        // Enable vibration fallback
  ignoreAndroidSystemSettings: false, // Respect system settings
};
```

---

**Created**: October 4, 2025  
**Purpose**: Consistent haptic feedback across the app  
**Dependencies**: `react-native-haptic-feedback`
