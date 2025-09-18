# 🌾 Krushimandi - Agricultural Marketplace

A modern React Native application connecting farmers directly with buyers, enabling fresh produce trading with real-time communication and smart logistics.

![React Native](https://img.shields.io/badge/React%20Native-0.72+-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)
![iOS](https://img.shields.io/badge/iOS-000000?style=for-the-badge&logo=ios&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)

## 📱 About

Krushimandi is an innovative agricultural marketplace that eliminates middlemen by connecting farmers directly with buyers. The platform enables fresh produce trading with features like real-time chat, order tracking, and intelligent market insights.

### 🎯 Key Features

#### 👨‍🌾 For Farmers
- **Product Listing Management** - Upload multiple product images with detailed descriptions
- **Real-time Order Management** - Track inquiries, sales, and delivery status
- **Smart Analytics** - AI-powered insights on product performance and pricing
- **Direct Communication** - Chat directly with potential buyers
- **Sales Tracking** - Comprehensive sales history and revenue analytics

#### 🛒 For Buyers
- **Product Discovery** - Browse fresh produce with detailed farmer profiles
- **Advanced Search & Filters** - Find products by location, price, variety, and quality
- **Order Management** - Track orders from placement to delivery
- **Review System** - Rate and review farmers and products
- **Secure Payments** - Multiple payment options with transaction security

#### 🚀 Smart Features
- **Role-based Navigation** - Adaptive UI based on user type (Farmer/Buyer)
- **Real-time Notifications** - Push notifications for orders, messages, and updates
- **Location-based Services** - Find nearby farmers and calculate delivery costs
- **Multi-language Support** - Accessible in local languages
- **Offline Capability** - Core features work without internet connection

## 🏗️ Tech Stack

### Frontend
- **React Native CLI** 0.72+ - Native mobile development
- **TypeScript** - Type-safe development
- **React Navigation 7** - Navigation and routing
- **React Native Vector Icons** - Icon library
- **@react-native-async-storage/async-storage** - Local data persistence
- **React Native Image Picker** - Camera and gallery integration
- **React Native Gesture Handler** - Touch and gesture system

### State Management
- **Zustand** - Global state management
- **React Context API** - For theming and authentication
- **Custom Hooks** - Reusable state logic
- **AsyncStorage** - Local data caching

### Backend & Native Features
- **Firebase** - Backend-as-a-Service (BaaS)
  - **Firestore** - NoSQL database
  - **Firebase Authentication** - User authentication
  - **Firebase Storage** - File storage
  - **Firebase Cloud Messaging (FCM)** - Push notifications
- **@notifee/react-native** - Local and remote notifications
- **React Native Permissions** - Handle device permissions
- **React Native Device Info** - Device information
- **React Native NetInfo** - Network connectivity
- **GPS Location Services** - Automatic location detection and auto-fill
- **Google Geocoding API** - Accurate address resolution for Indian locations

### UI/UX
- **NativeWind** - Tailwind CSS for React Native
- **TailwindCSS** - Utility-first CSS framework
- **Custom Design System** - Consistent theming and components
- **React Native Reanimated** - High-performance animations
- **React Native Safe Area Context** - Safe area handling
- **Responsive Design** - Optimized for different screen sizes

## 📂 Project Structure

```
src/
├── assets/               # Images, fonts, and static files
├── components/           # Reusable UI components
│   ├── auth/             # Authentication screens
│   ├── common/           # Shared components
│   ├── home/             # Home screen components
│   ├── notification/     # Notification components
│   ├── orders/           # Order management components
│   ├── products/         # Product-related components
│   ├── profile/          # User profile components
│   └── ...               # Other component groups
├── config/               # Firebase and other configurations
├── constants/            # App-wide constants (colors, styles)
├── contexts/             # React context providers
├── hooks/                # Custom hooks for reusable logic
├── navigation/           # Navigation setup and stacks
│   ├── auth/             # Auth navigation flow
│   ├── buyer/            # Buyer-specific navigation
│   ├── farmer/           # Farmer-specific navigation
│   └── ...               # Other navigation stacks
├── services/             # Services for API calls and backend logic
├── store/                # Zustand stores for state management
├── types/                # TypeScript type definitions
├── ui/                   # General UI elements
└── utils/                # Utility functions
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **React Native CLI** (`npm install -g @react-native-community/cli`)
- **Java Development Kit** (JDK 11 or newer)
- **Android Studio** (for Android development)
- **Xcode** (for iOS development - macOS only)
- **Watchman** (recommended for macOS)

### Development Environment Setup

#### Android Setup
1. **Install Android Studio**
2. **Configure Android SDK** (API level 31 or higher)
3. **Set up Android Virtual Device (AVD)**
4. **Add Android SDK to PATH**:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

#### iOS Setup (macOS only)
1. **Install Xcode** (from Mac App Store)
2. **Install Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```
3. **Install CocoaPods**:
   ```bash
   sudo gem install cocoapods
   ```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Krushimandi.git
   cd Krushimandi
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Install iOS dependencies** (iOS only)
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Then, edit the `.env` file with your configuration.

### Running the App

#### Start Metro Bundler
```bash
npx react-native start
# or
yarn start
```

#### Run on Android
```bash
# Make sure you have an Android emulator running or device connected
npx react-native run-android
# or
yarn android
```

#### Run on iOS (macOS only)
```bash
# Make sure you have an iOS simulator running or device connected
npx react-native run-ios
# or
yarn ios

# Run on specific iOS device
npx react-native run-ios --device "Device Name"
```

### Debugging

#### React Native Debugger
```bash
# Install React Native Debugger
brew install --cask react-native-debugger

# Enable debugging in app (Cmd+D on iOS, Cmd+M on Android)
# Select "Debug JS Remotely"
```

#### Flipper Integration
```bash
# Install Flipper
brew install --cask flipper

# Flipper plugins are already configured in the project
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
API_BASE_URL=https://your-api-endpoint.com
API_KEY=your-api-key

# Authentication
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
FACEBOOK_APP_ID=your-facebook-app-id

# Maps & Location
GOOGLE_MAPS_API_KEY=your-google-maps-key
GOOGLE_GEOCODING_API_KEY=your-google-geocoding-key  # For accurate address resolution

# Push Notifications
FCM_SERVER_KEY=your-fcm-server-key

# Payment Gateway
RAZORPAY_KEY_ID=your-razorpay-key
STRIPE_PUBLISHABLE_KEY=your-stripe-key
```

### Android Configuration

#### 1. Google Services Setup
```bash
# Add google-services.json to android/app/
# Get this file from Firebase Console
```

#### 2. Signing Configuration
```gradle
// android/app/build.gradle
android {
    ...
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('Krushimandi_UPLOAD_STORE_FILE')) {
                storeFile file(Krushimandi_UPLOAD_STORE_FILE)
                storePassword Krushimandi_UPLOAD_STORE_PASSWORD
                keyAlias Krushimandi_UPLOAD_KEY_ALIAS
                keyPassword Krushimandi_UPLOAD_KEY_PASSWORD
            }
        }
    }
}
```

#### 3. Permissions
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### iOS Configuration

#### 1. Bundle Identifier
```bash
# Update bundle identifier in ios/Krushimandi.xcodeproj
# Format: com.yourcompany.Krushimandi
```

#### 2. Info.plist Permissions
```xml
<!-- ios/Krushimandi/Info.plist -->
<key>NSCameraUsageDescription</key>
<string>This app needs access to camera to take product photos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs access to photo library to select product images</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs location access to auto-fill your farm location details when listing fruits. This helps buyers find your products and improves the accuracy of your listings.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app needs location access to auto-fill your farm location details when listing fruits. This helps buyers find your products and improves the accuracy of your listings.</string>
<key>NSLocationUsageDescription</key>
<string>This app needs location access to auto-fill your farm location details when listing fruits.</string>
```

## 🧪 Testing

### Running Tests
```bash
# Unit tests with Jest
npm test
# or
yarn test

# Run tests in watch mode
npm test -- --watch
# or
yarn test --watch
```

### E2E Testing with Detox
```bash
# Install Detox CLI
npm install -g detox-cli

# Build the app for testing
detox build --configuration ios.sim.debug

# Run E2E tests
detox test --configuration ios.sim.debug
```

### Code Quality
```bash
# ESLint
npm run lint
# or
yarn lint

# TypeScript type checking
npm run type-check
# or
yarn type-check
```

## 📦 Building for Production

### Android Release Build

#### 1. Generate Release APK
```bash
cd android
./gradlew assembleRelease
# APK will be generated at: android/app/build/outputs/apk/release/app-release.apk
```

#### 2. Generate Android App Bundle (AAB)
```bash
cd android
./gradlew bundleRelease
# AAB will be generated at: android/app/build/outputs/bundle/release/app-release.aab
```

### iOS Release Build

#### 1. Archive in Xcode
```bash
# Open iOS project in Xcode
open ios/Krushimandi.xcworkspace

# In Xcode:
# 1. Select "Any iOS Device" or your device
# 2. Product > Archive
# 3. Follow the wizard to upload to App Store Connect
```

#### 2. Command Line Build
```bash
# Build for release
npx react-native run-ios --configuration Release
```

## 🔧 Troubleshooting

### Common Issues

#### Metro Bundler Issues
```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear node modules and reinstall
rm -rf node_modules && npm install
```

#### Android Build Issues
```bash
# Clean Android build
cd android && ./gradlew clean && cd ..

# Reset Metro and Android
npx react-native start --reset-cache
npx react-native run-android
```

#### iOS Build Issues
```bash
# Clean iOS build
cd ios && xcodebuild clean && cd ..

# Reinstall iOS dependencies
cd ios && pod deintegrate && pod install && cd ..
```

#### Permission Issues
```bash
# Fix file permissions
chmod +x android/gradlew
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow **TypeScript** best practices
- Use **ESLint** and **Prettier** for code formatting
- Write **unit tests** for new features
- Test on both **iOS and Android**
- Update documentation for significant changes
- Follow **conventional commit** messages

## 📋 Roadmap

### Phase 1 (Current) ✅
- [x] User authentication and role management
- [x] Basic farmer and buyer interfaces
- [x] Product listing and browsing
- [x] Order management system
- [x] Role-based navigation

### Phase 2 (In Progress) 🚧
- [ ] Real-time chat functionality
- [ ] Payment gateway integration
- [ ] Push notification system
- [ ] Advanced search and filtering
- [ ] Delivery tracking with GPS

### Phase 3 (Planned) 📋
- [ ] AI-powered price recommendations
- [ ] Weather integration for farmers
- [ ] Multi-language support
- [ ] Bulk order management
- [ ] Analytics dashboard

### Phase 4 (Future) 🔮
- [ ] Web admin panel
- [ ] API for third-party integrations
- [ ] Machine learning for demand forecasting
- [ ] Blockchain for supply chain transparency
- [ ] IoT integration for smart farming

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Mobile Lead** - React Native & TypeScript
- **Backend Lead** - Node.js & Database
- **iOS Developer** - Native iOS features
- **Android Developer** - Native Android features
- **Product Manager** - Strategy & Roadmap

## 📞 Support

### Get Help
- 📧 **Email**: krushimandiofficial@gmail.com
- 📖 **Documentation**: [docs.krushimandi.com](https://docs.krushimandi.com)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Krushimandi/Krushimandi-app/issues)

### FAQ

**Q: Why React Native CLI instead of Expo?**
A: React Native CLI gives us full control over native code, custom native modules, and better performance for our agricultural marketplace features.

**Q: Do I need both Android Studio and Xcode?**
A: You only need the development environment for the platform you're targeting. However, for full development, both are recommended.

**Q: How do I run on a physical device?**
A: Enable developer options and USB debugging on Android, or register your device with Apple Developer Program for iOS.

**Q: The app crashes on startup, what should I do?**
A: Check Metro bundler logs, ensure all dependencies are installed, and try cleaning the build cache.

---

<div align="center">

**Built with ❤️ for farmers and buyers using React Native CLI**

[⭐ Star this repo](https://github.com/Krushimandi/Krushimandi-app) • [🍴 Fork it](https://github.com/Krushimandi/Krushimandi-app/fork) • [📄 Report Bug](https://github.com/Krushimandi/Krushimandi-app/issues)

</div>