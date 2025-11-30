# 📦 Haptic Feedback Package Installation

## Step 1: Install the Package

```bash
npm install react-native-haptic-feedback
```

Or with Yarn:
```bash
yarn add react-native-haptic-feedback
```

## Step 2: iOS Setup (Required for iOS)

```bash
cd ios
pod install
cd ..
```

## Step 3: Rebuild the App

### Android:
```bash
npx react-native run-android
```

### iOS:
```bash
npx react-native run-ios
```

## Step 4: Verify Installation

Create a test component:

```javascript
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { lightHaptic } from './src/utils/haptics';

const TestHaptic = () => (
  <TouchableOpacity
    onPress={() => {
      console.log('Triggering haptic...');
      lightHaptic();
      console.log('Haptic triggered!');
    }}
  >
    <Text>Test Haptic</Text>
  </TouchableOpacity>
);

export default TestHaptic;
```

Tap the button and you should feel a light vibration!

## ✅ Installation Complete!

Now you can use haptic feedback anywhere in your app:

```javascript
import { HapticFeedback } from './src/utils/haptics';

// In your component
<TouchableOpacity
  onPress={() => {
    HapticFeedback.buttonPress();
    handleAction();
  }}
>
  <Text>Click Me</Text>
</TouchableOpacity>
```

## 🚨 Common Issues

### Issue: Module not found
**Solution:** Make sure the package is installed and rebuild the app

### Issue: No vibration on Android
**Solution:** Check phone settings → Sound & vibration → Enable vibration

### Issue: No haptic on iOS
**Solution:** Only works on iPhone 6s and later. Check Settings → Sounds & Haptics

### Issue: TypeScript errors
**Solution:** The utility is JavaScript, but works with TypeScript. No additional types needed.

## 📚 Next Steps

- Read `HAPTIC_QUICK_START.md` for usage guide
- Read `HAPTIC_FEEDBACK_GUIDE.md` for detailed documentation
- Check `HAPTIC_INTEGRATION_EXAMPLES.js` for code examples

---

**Package Version:** Latest  
**React Native Compatibility:** ✅ 0.60+  
**Platform Support:** ✅ iOS, ✅ Android
