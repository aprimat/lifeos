import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/** Biometric app lock (IMPLEMENTATION_PLAN.md §10.3). Falls back to the device passcode. */

export async function biometricAvailability(): Promise<{ available: boolean; reason?: string; label: string }> {
  if (Platform.OS === 'web') return { available: false, reason: 'Not available in the browser.', label: 'Biometric lock' };
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return { available: false, reason: "This device doesn't support biometric unlock.", label: 'Biometric lock' };
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const label = Platform.OS === 'ios' ? (face ? 'Face ID' : 'Touch ID') : face ? 'Face unlock' : 'Fingerprint';
  if (!enrolled) return { available: false, reason: `Set up ${label} in your device settings first.`, label };
  return { available: true, label };
}

export async function authenticate(reason = 'Unlock LifeOS'): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return res.success;
  } catch {
    return false;
  }
}
