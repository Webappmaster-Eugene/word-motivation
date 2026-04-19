import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/shared/theme';

interface Action {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: 'primary' | 'secondary' | 'ghost';
  readonly accessibilityLabel?: string;
}

interface ActionBarProps {
  readonly actions: readonly Action[];
}

export function ActionBar({ actions }: ActionBarProps) {
  return (
    <View style={styles.wrap}>
      {actions.map((action, i) => (
        <Pressable
          key={i}
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.button,
            action.variant === 'secondary' && styles.secondary,
            action.variant === 'ghost' && styles.ghost,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.label,
              action.variant === 'secondary' && styles.labelSecondary,
              action.variant === 'ghost' && styles.labelGhost,
            ]}
          >
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  label: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  labelSecondary: {
    color: theme.colors.accent,
  },
  labelGhost: {
    color: theme.colors.textMuted,
  },
});
