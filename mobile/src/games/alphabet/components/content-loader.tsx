import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/shared/theme';

interface ContentLoaderProps {
  readonly message?: string;
}

export function ContentLoader({ message = 'Загружаем слова…' }: ContentLoaderProps) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  text: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
});
