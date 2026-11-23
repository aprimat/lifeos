import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Stores the signed-in user id. Secure storage on device, AsyncStorage on web. */

const KEY = 'lifeos.session.userId';

export async function getSessionUserId(): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(KEY);
  return SecureStore.getItemAsync(KEY);
}

export async function setSessionUserId(userId: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (userId) await AsyncStorage.setItem(KEY, userId);
    else await AsyncStorage.removeItem(KEY);
    return;
  }
  if (userId) await SecureStore.setItemAsync(KEY, userId);
  else await SecureStore.deleteItemAsync(KEY);
}
