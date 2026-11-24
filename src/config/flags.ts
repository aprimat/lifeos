/**
 * Developer tools (sample data, design gallery): on in dev, and in preview OTA updates,
 * where EXPO_PUBLIC_DEV_TOOLS=1 is set in the EAS "preview" environment.
 */
export const DEV_TOOLS = __DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === '1';
