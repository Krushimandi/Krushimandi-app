const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// Get base config
const defaultConfig = getDefaultConfig(__dirname);

const config = mergeConfig(defaultConfig, {
  resolver: {
    resolverMainFields: ["react-native", "browser", "main"],
    platforms: ["ios", "android", "native"],
    alias: {
      "@react-native-firebase/storage/lib/web": path.resolve(
        __dirname,
        "node_modules/@react-native-firebase/storage/lib"
      ),
    },
    blockList: [
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