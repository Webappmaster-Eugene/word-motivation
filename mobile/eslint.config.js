// ESLint v9 flat-config. eslint-config-expo@10 экспортирует flat напрямую.
const expoFlat = require('eslint-config-expo/flat');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'dist-web/**',
      'ios/**',
      'android/**',
      'coverage/**',
      'public/**',
      'eslint.config.js',
      'babel.config.js',
      'metro.config.js',
      'jest.config.js',
      'app.config.ts',
    ],
  },
  ...expoFlat,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    // Asset-require и Platform-conditional require — идиоматичные паттерны RN
    // и обязательные web-fallback'и (см. .claude/rules/frontend.md). ESM-импорт
    // здесь сломал бы web-бандл: Metro попытался бы зарезолвить native-only
    // модули (expo-secure-store, expo-speech-recognition).
    files: [
      'src/games/alphabet/components/animal-scene.native.tsx',
      'src/services/auth/device-storage.ts',
      'src/services/di/container.ts',
      'src/services/speech-recognition/expo-speech-recognition-asr.ts',
      'src/services/storage/kv-storage.ts',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
