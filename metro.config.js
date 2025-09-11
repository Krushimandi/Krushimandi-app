const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// Get base config
const defaultConfig = getDefaultConfig(__dirname);

// Remove `svg` from assetExts and add it to sourceExts
const assetExts = defaultConfig.resolver.assetExts.filter(ext => ext !== "svg");
const sourceExts = [...defaultConfig.resolver.sourceExts, "svg"];

const config = mergeConfig(defaultConfig, {
  resolver: {
    // Your existing custom resolver settings
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

    // Add SVG support
    assetExts,
    sourceExts,
  },
  transformer: {
    babelTransformerPath: require.resolve("react-native-svg-transformer"), // Add SVG transformer
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
});

module.exports = withNativeWind(config, { input: "./global.css" });