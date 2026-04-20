import { Platform } from 'react-native';

/**
 * Generic key-value storage для mobile и web.
 *  - native: Expo SecureStore (Keychain/Keystore).
 *  - web: localStorage с in-memory fallback на Private Mode.
 *
 * Значения — произвольные JSON-сериализуемые объекты.
 */

export interface KvStorage {
  getJson<T>(key: string): Promise<T | null>;
  setJson<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

const memoryFallback = new Map<string, string>();

function hasLocalStorage(): boolean {
  try {
    return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

async function rawGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (hasLocalStorage()) {
      try {
        return globalThis.localStorage.getItem(key);
      } catch {
        return memoryFallback.get(key) ?? null;
      }
    }
    return memoryFallback.get(key) ?? null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function rawSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    memoryFallback.set(key, value);
    if (hasLocalStorage()) {
      try {
        globalThis.localStorage.setItem(key, value);
      } catch {
        /* Private Mode / quota — остаёмся на in-memory */
      }
    }
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

async function rawDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    memoryFallback.delete(key);
    if (hasLocalStorage()) {
      try {
        globalThis.localStorage.removeItem(key);
      } catch {
        /* noop */
      }
    }
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* noop */
  }
}

export const kvStorage: KvStorage = {
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await rawGet(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async setJson<T>(key: string, value: T): Promise<void> {
    await rawSet(key, JSON.stringify(value));
  },
  async delete(key: string): Promise<void> {
    await rawDelete(key);
  },
};

export const __testing = {
  resetMemory: () => memoryFallback.clear(),
};
