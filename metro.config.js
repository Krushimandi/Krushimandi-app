const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require('path');
 
const config = mergeConfig(getDefaultConfig(__dirname), {
  resolver: {
    // Fix for React Native Firebase Storage web module issue
    resolverMainFields: ['react-native', 'browser', 'main'],
    platforms: ['ios', 'android', 'native'],
    alias: {
      // Prevent Metro from trying to resolve web-specific modules
      '@react-native-firebase/storage/lib/web': path.resolve(__dirname, 'node_modules/@react-native-firebase/storage/lib'),
    },
    blockList: [
      // Block web-specific modules that cause issues in React Native
      /.*\/node_modules\/@react-native-firebase\/storage\/lib\/web\/.*$/,
    ],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
});
 
module.exports = withNativeWind(config, { input: "./global.css" });