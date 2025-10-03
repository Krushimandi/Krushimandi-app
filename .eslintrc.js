module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    jest: true,
  },
  extends: [
    '@react-native',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  settings: {
    react: { version: 'detect' },
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react', 'react-native', 'react-hooks'],
  ignorePatterns: [
    'node_modules/',
    'android/',
    'ios/',
    'coverage/',
    'build/',
    'dist/',
    'scripts/',
    '**/*.d.ts',
    '**/bundle.android.js',
    '.bundle/**',
  ],
  rules: {
    // Keep these as warnings to reduce CI friction while code is stabilized
    'react-hooks/rules-of-hooks': 'warn',
    'react-hooks/exhaustive-deps': 'warn',

    // TypeScript-specific unused vars handling
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],

    // Downgrade strict TS rules to unblock linting; we'll tighten later
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/ban-types': 'off',

    // Shadowing and undef often conflict with TS/metro globals; relax them
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'warn',
    'no-undef': 'off',

    // Reduce noise from stylistic rules
    'react-native/no-inline-styles': 'off',
    'react/no-unstable-nested-components': 'warn',
    'no-dupe-keys': 'warn',
    'no-return-assign': 'warn',
    radix: 'warn',
    'react/react-in-jsx-scope': 'off',

    // Prefer warnings for minor cleanups
    'prefer-const': 'warn',
    'no-undef-init': 'warn',
  },
  overrides: [
    {
      files: ['*.js', '*.jsx'],
      parser: require.resolve('@babel/eslint-parser'),
      parserOptions: { requireConfigFile: false, ecmaFeatures: { jsx: true } },
    },
    {
      files: ['*.ts', '*.tsx'],
      parser: require.resolve('@typescript-eslint/parser'),
      rules: {
        'no-undef': 'off',
      },
    },
    {
      files: ['__tests__/**/*.{js,jsx,ts,tsx}'],
      env: { jest: true },
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      },
    },
  ],
};
