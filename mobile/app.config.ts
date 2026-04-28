import type { ConfigContext, ExpoConfig } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const packageSuffix = IS_DEV ? '.dev' : IS_PREVIEW ? '.preview' : '';
const nameSuffix = IS_DEV ? ' (Dev)' : IS_PREVIEW ? ' (Preview)' : '';

/**
 * Expo читает app.json автоматически (если он есть) и передаёт его в `config`.
 * `eas init` создаёт app.json и записывает туда `extra.eas.projectId` —
 * мы его прокидываем ниже, чтобы не пришлось вручную копировать ID.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const existingProjectId =
    (config.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  const projectId = process.env.EAS_PROJECT_ID ?? existingProjectId ?? '';

  return {
    ...config,
    name: `Baby-funner${nameSuffix}`,
    slug: 'baby-funner',
    version: '0.0.1',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    scheme: 'babyfunner',
    icon: './assets/images/icon.png',
    splash: {
      image: './assets/images/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#FFF4E0',
    },
    assetBundlePatterns: ['**/*'],
    platforms: ['android', 'web'],
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './assets/images/favicon.png',
      name: 'Baby-funner',
      shortName: 'Baby-funner',
      backgroundColor: '#FFF4E0',
      themeColor: '#FF7A59',
      lang: 'ru',
      description: 'Baby-funner — обучающие игры для детей 6–12 лет',
    },
    android: {
      package: `ru.babyfunner.app${packageSuffix}`,
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#FFF4E0',
      },
      permissions: ['android.permission.RECORD_AUDIO', 'android.permission.INTERNET'],
      blockedPermissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.READ_CONTACTS',
      ],
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-sqlite',
      [
        'expo-speech-recognition',
        {
          microphonePermission:
            'Голосовой ввод нужен, чтобы ребёнок мог называть буквы и разговаривать с животными. Голос обрабатывается только на устройстве.',
          speechRecognitionPermission:
            'Для распознавания речи используется встроенный сервис Android — ничего не отправляется на сервер.',
          // <queries>-декларации в AndroidManifest для package-visibility (Android 11+).
          // Расширенный список покрывает не только Pixel/Google-устройства, но и MIUI/HyperOS
          // (Xiaomi/POCO) и Samsung Bixby — без явной декларации Android не разрешит
          // приложению даже видеть, что соответствующий recognition-сервис установлен,
          // и `getSpeechRecognitionServices()` вернёт пустой массив.
          androidSpeechServicePackages: [
            'com.google.android.googlequicksearchbox',
            'com.google.android.as',
            'com.samsung.android.bixby.agent',
            'com.miui.voiceassist',
          ],
        },
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#FFF4E0',
          image: './assets/images/splash.png',
          imageWidth: 200,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      // apiBaseUrl берётся из env; если не задан — дефолт выбирается в
      // `src/config/env.ts` по `Platform.OS` (на android — 10.0.2.2, на web —
      // localhost). Здесь нельзя сделать Platform-specific, т.к. конфиг
      // исполняется один раз в Node и уезжает в extra для обеих платформ.
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL,
      ttsMode: process.env.EXPO_PUBLIC_TTS_MODE ?? 'server',
      eas: {
        projectId,
      },
    },
  };
};
