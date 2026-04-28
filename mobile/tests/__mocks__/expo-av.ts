/**
 * Mock для `expo-av` (deprecated в SDK 54): jest-expo preset больше не
 * подгружает native-модуль `ExponentAV` автоматически. Тесты не проигрывают
 * звук, поэтому мок возвращает заглушку с минимально нужным API
 * (`Audio.Sound`, `Audio.setAudioModeAsync`).
 */

class MockSound {
  static async createAsync(): Promise<{ sound: MockSound; status: { isLoaded: boolean } }> {
    return { sound: new MockSound(), status: { isLoaded: true } };
  }
  async playAsync(): Promise<void> {}
  async stopAsync(): Promise<void> {}
  async unloadAsync(): Promise<void> {}
  async setOnPlaybackStatusUpdate(): Promise<void> {}
  setOnPlaybackStatusUpdateSync(): void {}
}

export const Audio = {
  Sound: MockSound,
  setAudioModeAsync: async (): Promise<void> => {},
};

export const InterruptionModeAndroid = { DoNotMix: 1, DuckOthers: 2 } as const;
export const InterruptionModeIOS = { DoNotMix: 1, MixWithOthers: 2, DuckOthers: 3 } as const;
