// =============================================================================
// NutriPulse — Secure Storage Wrapper
// =============================================================================
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'nutripulse_access_token',
  REFRESH_TOKEN: 'nutripulse_refresh_token',
  USER: 'nutripulse_user',
} as const;

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
}

export async function setAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, token);
}

export async function getUser(): Promise<any | null> {
  const raw = await SecureStore.getItemAsync(KEYS.USER);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

export async function setUser(user: any): Promise<void> {
  await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user));
}

export async function clearAll(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
    SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    SecureStore.deleteItemAsync(KEYS.USER),
  ]);
}
