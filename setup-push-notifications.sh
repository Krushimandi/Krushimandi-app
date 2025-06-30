#!/bin/bash

# Firebase Push Notification Setup Script
# Run this script to complete the setup process

echo "🚀 Setting up Firebase Push Notifications with Notifee..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the root of your React Native project"
    exit 1
fi

echo "📦 Installing required packages..."
npm install @notifee/react-native @react-native-firebase/messaging

echo "🔧 Setting up iOS..."
if [ -d "ios" ]; then
    echo "Installing iOS dependencies..."
    cd ios && pod install && cd ..
    echo "✅ iOS setup complete"
else
    echo "⚠️  iOS directory not found, skipping iOS setup"
fi

echo "🤖 Setting up Android..."
if [ -d "android" ]; then
    echo "Android setup requires manual steps:"
    echo "1. Add google-services.json to android/app/"
    echo "2. Update android/build.gradle with google-services plugin"
    echo "3. Update android/app/build.gradle with dependencies"
    echo "📋 See PUSH_NOTIFICATION_SETUP.md for detailed instructions"
else
    echo "⚠️  Android directory not found, skipping Android setup"
fi

echo "🔧 Setup checklist:"
echo "✅ Packages installed"
echo "✅ iOS dependencies installed (if iOS directory exists)"
echo "📋 Manual Android setup required (see documentation)"
echo "📋 Add Firebase configuration files (google-services.json/GoogleService-Info.plist)"
echo "📋 Wrap your app with PushNotificationProvider"

echo ""
echo "🎉 Setup complete! Next steps:"
echo "1. Add Firebase configuration files"
echo "2. Wrap your app with PushNotificationProvider"
echo "3. Test with PushNotificationTestScreen"
echo "4. Read PUSH_NOTIFICATION_SETUP.md for detailed instructions"
echo ""
echo "Happy coding! 🚀"
