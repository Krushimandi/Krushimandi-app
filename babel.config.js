module.exports = {
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
  
  assets: ['./assets/fonts'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@ui': './src/ui',
          '@component': './src/component',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
  ],
};
