// Expo Go only loads updates whose runtime is `exposdk:<sdk>`. `npm run update:expo-go`
// sets LIFEOS_EXPO_GO=1 to publish one for Expo Go; installed builds keep the appVersion policy.
module.exports = ({ config }) =>
  process.env.LIFEOS_EXPO_GO === '1' ? { ...config, runtimeVersion: { policy: 'sdkVersion' } } : config;
