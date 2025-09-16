const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure React is properly resolved
config.resolver.alias = {
  ...config.resolver.alias,
  react: require.resolve('react'),
  'react-native': require.resolve('react-native'),
};

module.exports = config;