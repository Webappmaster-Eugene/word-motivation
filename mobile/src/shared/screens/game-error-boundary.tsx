import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/shared/theme';

interface Props {
  readonly children: React.ReactNode;
  readonly onReset?: () => void;
}

interface State {
  readonly hasError: boolean;
  readonly message: string;
}

/**
 * Error Boundary для игровых экранов и зоопарка.
 *
 * Перехватывает ошибки рендера React-дерева (Skia Canvas, хуки, сервисы),
 * показывает дружественный экран вместо белого экрана и позволяет сбросить
 * состояние через `onReset` (обычно — navigateHome).
 */
export class GameErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('GameErrorBoundary поймал ошибку:', error, info.componentStack);
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, message: '' });
    this.props.onReset?.();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.emoji} accessibilityRole="image">
          😕
        </Text>
        <Text style={styles.title}>Что-то пошло не так</Text>
        <Text style={styles.hint}>Попробуй ещё раз — обычно это помогает!</Text>
        {__DEV__ ? <Text style={styles.debug}>{this.state.message}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Попробовать снова"
          onPress={this.handleReset}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnText}>Попробовать снова</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  hint: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  debug: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
    fontFamily: 'monospace',
    marginTop: theme.spacing.sm,
  },
  btn: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.accent,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
