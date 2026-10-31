import * as SecureStore from 'expo-secure-store';
import { createChunkedSecureStorage } from './ownerSecureStorage.ts';
export const ownerSessionStorage = createChunkedSecureStorage({
  getItem: key => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: key => SecureStore.deleteItemAsync(key),
});
