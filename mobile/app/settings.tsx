import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/shared/theme';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Настройки</Text>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Здесь будут настройки: громкость, голосовой ввод, сброс прогресса, благодарности авторам ассетов.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  placeholder: {
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
  },
  placeholderText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    lineHeight: 22,
  },
});
