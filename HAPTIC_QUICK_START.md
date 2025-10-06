# 🎯 Haptic Feedback - Quick Start Guide

## ⚡ Installation (1 minute)

```bash
npm install react-native-haptic-feedback
cd ios && pod install && cd ..
```

## 🚀 Basic Usage (Copy & Paste Ready)

### 1️⃣ Import the utility

```javascript
import { HapticFeedback } from '../utils/haptics';
```

### 2️⃣ Add to buttons (Most Common)

```javascript
<TouchableOpacity
  onPress={() => {
    HapticFeedback.buttonPress(); // ← Add this line
    handleSubmit();
  }}
>
  <Text>Submit</Text>
</TouchableOpacity>
```

### 3️⃣ Add to switches

```javascript
<Switch
  value={enabled}
  onValueChange={(value) => {
    HapticFeedback.toggleSwitch(); // ← Add this line
    setEnabled(value);
  }}
/>
```

### 4️⃣ Add to success/error actions

```javascript
try {
  await saveData();
  HapticFeedback.success(); // ← Success vibration
  Toast.show({ type: 'success', text1: 'Saved!' });
} catch (error) {
  HapticFeedback.error(); // ← Error vibration
  Toast.show({ type: 'error', text1: 'Failed!' });
}
```

## 📋 Most Used Functions

```javascript
// Light tap - buttons, links
HapticFeedback.buttonPress()

// Medium tap - switches, toggles
HapticFeedback.toggleSwitch()

// Selection - list items, filters
HapticFeedback.itemSelect()

// Success - save, submit, complete
HapticFeedback.success()

// Error - validation, failures
HapticFeedback.error()

// Delete - remove, cancel
HapticFeedback.delete()

// Navigation - screen changes
HapticFeedback.navigation()

// Modal - open/close dialogs
HapticFeedback.modal()
```

## 🎨 Complete List (24 Functions)

| Function | When to Use |
|----------|-------------|
| `buttonPress()` | Button taps |
| `toggleSwitch()` | Switch on/off |
| `itemSelect()` | List item selection |
| `swipeAction()` | Swipe gestures |
| `longPress()` | Long press actions |
| `refresh()` | Pull to refresh |
| `navigation()` | Navigate to screen |
| `modal()` | Open/close modal |
| `alert()` | Show alert |
| `success()` | Success action |
| `error()` | Error action |
| `delete()` | Delete action |
| `create()` | Create/add action |
| `scrollBoundary()` | Scroll to top/bottom |
| `pickerChange()` | Picker selection |
| `sliderChange()` | Slider adjustment |
| `checkboxToggle()` | Checkbox on/off |
| `inputFocus()` | Input field focus |
| `tabChange()` | Tab navigation |
| `cardFlip()` | Card flip/rotate |
| `dragStart()` | Start dragging |
| `dragEnd()` | End dragging |
| `contextMenu()` | Long press menu |
| `warning()` | Warning message |

## 💡 Pro Tips

### ✅ DO:
- Add haptics to buttons, switches, selections
- Use success/error haptics for operations
- Match haptic intensity to action importance

### ❌ DON'T:
- Use haptics in loops or animations
- Overuse heavy haptics (use light/medium)
- Add haptics to every tiny interaction

## 🔥 Copy-Paste Examples

### Example 1: Filter Selection
```javascript
import { HapticFeedback } from '../utils/haptics';

<TouchableOpacity
  onPress={() => {
    HapticFeedback.itemSelect();
    setFilter('all');
  }}
>
  <Text>All Items</Text>
</TouchableOpacity>
```

### Example 2: Delete Confirmation
```javascript
const handleDelete = () => {
  HapticFeedback.warning();
  
  Alert.alert('Delete?', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      onPress: () => {
        HapticFeedback.delete();
        deleteItem();
      }
    }
  ]);
};
```

### Example 3: Form Submit
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    HapticFeedback.error();
    Toast.show({ type: 'error', text1: 'Invalid input' });
    return;
  }
  
  try {
    await submitData();
    HapticFeedback.success();
    Toast.show({ type: 'success', text1: 'Success!' });
  } catch (error) {
    HapticFeedback.error();
    Toast.show({ type: 'error', text1: 'Failed!' });
  }
};
```

### Example 4: Pull to Refresh
```javascript
const onRefresh = async () => {
  HapticFeedback.refresh();
  setRefreshing(true);
  await loadData();
  setRefreshing(false);
};

<FlatList
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
/>
```

## 🎯 Where to Add Haptics in Your App

### NotificationScreen
- ✅ Filter chip selection → `HapticFeedback.itemSelect()`
- ✅ Notification tap → `HapticFeedback.buttonPress()`
- ✅ Mark as read → `HapticFeedback.success()`
- ✅ Settings toggle → `HapticFeedback.toggleSwitch()`

### RequestsScreen
- ✅ Filter selection → `HapticFeedback.itemSelect()`
- ✅ Cancel request → `HapticFeedback.delete()`
- ✅ Call farmer → `HapticFeedback.buttonPress()`
- ✅ Message farmer → `HapticFeedback.navigation()`

### FarmerHomeScreen
- ✅ Category selection → `HapticFeedback.itemSelect()`
- ✅ Sort option → `HapticFeedback.itemSelect()`
- ✅ Mark as sold → `HapticFeedback.success()`
- ✅ Reactivate → `HapticFeedback.create()`
- ✅ Open location → `HapticFeedback.modal()`

## 📱 Testing

1. Run your app
2. Try different actions
3. Feel the vibrations
4. Adjust intensity if needed

## 🆘 Troubleshooting

**No vibration on Android?**
- Check phone vibration settings
- Enable vibration in system settings

**No haptic on iOS?**
- Works on iPhone 6s and later
- Check haptic feedback settings

**Still not working?**
- Check console for errors
- Verify package installation
- Rebuild the app

---

**That's it!** Start adding haptic feedback to make your app feel more premium and responsive! 🎉
