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
    name: `90games${nameSuffix}`,
    slug: 'ninegames',
    version: '0.0.1',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    scheme: 'ninegames',
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
      name: '90games',
      shortName: '90games',
      backgroundColor: '#FFF4E0',
      themeColor: '#FF7A59',
      lang: 'ru',
      description: 'Обучающие игры для детей 6–12 лет',
    },
    android: {
      package: `ru.ninegames.app${packageSuffix}`,
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
      [
        'expo-build-properties',
        {
          android: {
            kotlinVersion: '1.9.25',
          },
        },
      ],
      [
        'expo-speech-recognition',
        {
          microphonePermission:
            'Голосовой ввод нужен, чтобы ребёнок мог называть буквы и разговаривать с животными. Голос обрабатывается только на устройстве.',
          speechRecognitionPermission:
            'Для распознавания речи используется встроенный сервис Android — ничего не отправляется на сервер.',
          androidSpeechServicePackages: ['com.google.android.googlequicksearchbox'],
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
      apiBaseUrl:
        process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://10.0.2.2:3000',
      ttsMode: process.env.EXPO_PUBLIC_TTS_MODE ?? 'server',
      eas: {
        projectId,
      },
    },
  };
};
