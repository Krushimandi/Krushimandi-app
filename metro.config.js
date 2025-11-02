const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    ...defaultConfig.resolver,
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
    ...defaultConfig.transformer,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};


module.exports = mergeConfig(getDefaultConfig(__dirname), config);
// module.exports = withNativeWind(config, {
//   input: "./global.css",
//   projectRoot: __dirname,
// });