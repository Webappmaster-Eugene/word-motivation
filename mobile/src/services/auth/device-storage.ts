import { Platform } from 'react-native';

/**
 * Персистентное хранилище deviceId.
 *
 *  - native: Expo SecureStore (Keychain / Keystore).
 *  - web: localStorage (с деградацией в in-memory при Private Mode / политиках).
 *
 * SecureStore импортируется только на native через require внутри функций,
 * чтобы Metro при web-сборке не тянул нативный модуль в бандл.
 */

export interface DeviceStorage {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
}

const DEVICE_ID_KEY = 'ninegames.device_id.v1';

let memoryFallback: string | null = null;

function hasLocalStorage(): boolean {
  try {
    return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

async function getFromSecureStore(): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
  try {
    return await SecureStore.getItemAsync(DEVICE_ID_KEY);
  } catch {
    return null;
  }
}

async function setToSecureStore(value: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
  await SecureStore.setItemAsync(DEVICE_ID_KEY, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

function getFromLocalStorage(): string | null {
  if (!hasLocalStorage()) return memoryFallback;
  try {
    return globalThis.localStorage.getItem(DEVICE_ID_KEY);
  } catch {
    return memoryFallback;
  }
}

function setToLocalStorage(value: string): void {
  memoryFallback = value;
  if (!hasLocalStorage()) return;
  try {
    globalThis.localStorage.setItem(DEVICE_ID_KEY, value);
  } catch {
    // Private Mode / квота — остаёмся на memoryFallback
  }
}

export const deviceStorage: DeviceStorage = {
  async get() {
    if (Platform.OS === 'web') return getFromLocalStorage();
    return getFromSecureStore();
  },
  async set(value) {
    if (Platform.OS === 'web') {
      setToLocalStorage(value);
      return;
    }
    await setToSecureStore(value);
  },
};

export const __testing = {
  DEVICE_ID_KEY,
  resetMemory: () => {
    memoryFallback = null;
  },
};
