# 🎯 Haptic Feedback Cheat Sheet

```javascript
import { HapticFeedback } from '../utils/haptics';
```

## 🔥 Most Used (Top 6)

```javascript
// 1. Button Press (Light tap)
HapticFeedback.buttonPress()

// 2. Toggle Switch (Medium tap)
HapticFeedback.toggleSwitch()

// 3. Item Selection (Selection feedback)
HapticFeedback.itemSelect()

// 4. Success (Success pattern)
HapticFeedback.success()

// 5. Error (Error pattern)
HapticFeedback.error()

// 6. Delete (Heavy tap)
HapticFeedback.delete()
```

## 📋 Copy-Paste Ready

### Button
```javascript
<TouchableOpacity onPress={() => {
  HapticFeedback.buttonPress();
  handleAction();
}}>
```

### Switch
```javascript
<Switch onValueChange={(value) => {
  HapticFeedback.toggleSwitch();
  setValue(value);
}} />
```

### Filter/Selection
```javascript
<TouchableOpacity onPress={() => {
  HapticFeedback.itemSelect();
  setFilter(filter);
}}>
```

### Success/Error
```javascript
try {
  await save();
  HapticFeedback.success();
} catch (error) {
  HapticFeedback.error();
}
```

### Delete
```javascript
Alert.alert('Delete?', 'Sure?', [
  { text: 'Cancel' },
  { text: 'Delete', onPress: () => {
    HapticFeedback.delete();
    deleteItem();
  }}
]);
```

### Navigation
```javascript
<TouchableOpacity onPress={() => {
  HapticFeedback.navigation();
  navigation.navigate('Screen');
}}>
```

## 🎨 All Functions (Alphabetical)

```javascript
HapticFeedback.alert()           // Show alert
HapticFeedback.buttonPress()     // Button tap
HapticFeedback.cardFlip()        // Card flip
HapticFeedback.checkboxToggle()  // Checkbox
HapticFeedback.contextMenu()     // Context menu
HapticFeedback.create()          // Create action
HapticFeedback.delete()          // Delete action
HapticFeedback.dragEnd()         // Drag end
HapticFeedback.dragStart()       // Drag start
HapticFeedback.error()           // Error
HapticFeedback.inputFocus()      // Input focus
HapticFeedback.itemSelect()      // Item select
HapticFeedback.longPress()       // Long press
HapticFeedback.modal()           // Modal open/close
HapticFeedback.navigation()      // Navigation
HapticFeedback.pickerChange()    // Picker change
HapticFeedback.refresh()         // Pull refresh
HapticFeedback.scrollBoundary()  // Scroll limit
HapticFeedback.sliderChange()    // Slider adjust
HapticFeedback.success()         // Success
HapticFeedback.swipeAction()     // Swipe
HapticFeedback.tabChange()       // Tab switch
HapticFeedback.toggleSwitch()    // Toggle switch
HapticFeedback.warning()         // Warning
```

## 🎯 Usage Map

| Action | Function |
|--------|----------|
| Button tap | `buttonPress()` |
| Switch toggle | `toggleSwitch()` |
| List select | `itemSelect()` |
| Save success | `success()` |
| Save failed | `error()` |
| Delete item | `delete()` |
| Add item | `create()` |
| Navigate | `navigation()` |
| Open modal | `modal()` |
| Show alert | `alert()` |
| Long press | `longPress()` |
| Swipe | `swipeAction()` |
| Refresh | `refresh()` |
| Tab change | `tabChange()` |
| Filter select | `itemSelect()` |
| Sort select | `itemSelect()` |
| Checkbox | `checkboxToggle()` |
| Slider | `sliderChange()` |
| Picker | `pickerChange()` |
| Warning | `warning()` |

## 💡 Quick Tips

✅ **DO:**
- Button press → `buttonPress()`
- Success/Error → `success()` / `error()`
- Selections → `itemSelect()`

❌ **DON'T:**
- In loops
- Every scroll event
- Animation frames

## 🔥 Installation

```bash
npm install react-native-haptic-feedback
cd ios && pod install && cd ..
npx react-native run-android
```

## 📱 Test It

```javascript
<TouchableOpacity onPress={() => {
  console.log('Testing haptic...');
  HapticFeedback.buttonPress();
}}>
  <Text>Test</Text>
</TouchableOpacity>
```

---

**That's it!** Keep this cheat sheet handy for quick reference 🎉
