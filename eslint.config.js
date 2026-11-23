// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', 'stitch_lifeos_habit_tracker_ios/*', '.playwright-mcp/*'],
  },
  {
    rules: {
      // React Native <Text> renders apostrophes literally; HTML escaping doesn't apply.
      'react/no-unescaped-entities': 'off',
      // Used deliberately to reset local form state when the edited item changes.
      'react-hooks/set-state-in-effect': 'warn',
      // False positive for re-exported enums (e.g. expo-notifications AndroidImportance).
      'import/namespace': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
