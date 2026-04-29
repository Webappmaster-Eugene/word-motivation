// ESLint v9 flat-config. Старый `.eslintrc.js` (extends: 'expo') обёрнут
// через FlatCompat, потому что `eslint-config-expo@8` ещё legacy-формат.
// При апгрейде до eslint-config-expo c flat-экспортом — заменить compat
// на прямой `...require('eslint-config-expo/flat')`.
const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

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
  ...compat.extends('expo'),
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
];
