import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { gameRegistry } from '@/games/registry';
import { theme } from '@/shared/theme';

export default function GameHost() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const plugin = gameId ? gameRegistry.resolve(gameId) : undefined;

  if (!plugin) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Игра не найдена' }} />
        <Text style={styles.title}>Игра не найдена</Text>
        <Text style={styles.message}>Попробуй вернуться на главную и выбрать другую игру.</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/')}>
          <Text style={styles.buttonText}>На главную</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const GameScreen = plugin.Screen;
  return <GameScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  message: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  button: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.accent,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
