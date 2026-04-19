import { StyleSheet, View } from 'react-native';

import { theme } from '@/shared/theme';

interface ProgressPipsProps {
  readonly total: number;
  readonly current: number;
}

export function ProgressPips({ total, current }: ProgressPipsProps) {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: current }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.pip,
            i < current && styles.pipDone,
            i === current && styles.pipActive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  pip: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.border,
  },
  pipDone: {
    backgroundColor: theme.colors.success,
  },
  pipActive: {
    backgroundColor: theme.colors.accent,
    transform: [{ scale: 1.4 }],
  },
});
