import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useService } from '@/services/di/provider';
import { navigateHome } from '@/shared/ui/nav';
import { theme } from '@/shared/theme';

function appVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

function webConfirm(message: string): boolean {
  if (Platform.OS !== 'web') return false;
  const g = globalThis as unknown as { confirm?: (m: string) => boolean };
  return g.confirm?.(message) ?? false;
}

function webAlert(message: string): void {
  if (Platform.OS !== 'web') return;
  const g = globalThis as unknown as { alert?: (m: string) => void };
  g.alert?.(message);
}

export default function SettingsScreen() {
  const router = useRouter();
  const mastery = useService('letterMastery');
  const localUnlocked = useService('localUnlocked');
  const progressApi = useService('progressApi');
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(false);

  const doReset = async () => {
    setResetting(true);
    try {
      // 1. Локальные данные — без сети, всегда успешно.
      await Promise.all([mastery.reset(), localUnlocked.reset()]);

      // 2. Серверный сброс — главный фикс: без него `listUnlocked()` продолжал
      // возвращать открытых животных из БД, и зоопарк снова наполнялся ими.
      // Ошибку съедаем: если сервер недоступен (оффлайн), хотя бы локально чисто.
      try {
        await progressApi.resetProgress();
      } catch (err) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('Серверный сброс прогресса недоступен:', err);
        }
      }

      // 3. Инвалидация cache — без неё react-query отдаст устаревший snapshot
      // зоопарка до следующего focus. `refetchType: 'active'` заставляет
      // активные экраны (zoo, hub) перезапросить немедленно.
      await queryClient.invalidateQueries({ refetchType: 'active' });

      if (Platform.OS === 'web') {
        webAlert('Готово: прогресс сброшен.');
      } else {
        Alert.alert('Готово', 'Прогресс сброшен.');
      }
    } finally {
      setResetting(false);
    }
  };

  const confirmReset = () => {
    const message =
      'Сбросить весь прогресс: открытые животные в зоопарке исчезнут, статистика по буквам обнулится, все сохранённые сессии будут удалены.';
    if (Platform.OS === 'web') {
      if (webConfirm(message)) void doReset();
      return;
    }
    Alert.alert('Сброс прогресса', message, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Сбросить', style: 'destructive', onPress: () => void doReset() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="На главную"
          onPress={() => navigateHome(router)}
          style={styles.back}
        >
          <Text style={styles.backText}>← Домой</Text>
        </Pressable>
        <Text style={styles.title}>Настройки</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Данные">
          <RowButton
            label={resetting ? 'Сбрасываем…' : 'Сбросить весь прогресс'}
            onPress={confirmReset}
            disabled={resetting}
            danger
          />
        </Section>

        <Section title="Правовая информация">
          <Link href="/privacy" asChild>
            <RowButton label="Политика конфиденциальности" chevron />
          </Link>
          <Link href="/terms" asChild>
            <RowButton label="Условия использования" chevron />
          </Link>
          <Link href="/offer" asChild>
            <RowButton label="Публичная оферта" chevron />
          </Link>
          <Link href="/contacts" asChild>
            <RowButton label="Контакты" chevron />
          </Link>
        </Section>

        <Section title="О проекте">
          <Link href="/about" asChild>
            <RowButton label="Об авторе и библиотеках" chevron />
          </Link>
        </Section>

        <Text style={styles.version}>Версия {appVersion()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

interface RowButtonProps {
  readonly label: string;
  readonly onPress?: () => void;
  readonly chevron?: boolean;
  readonly disabled?: boolean;
  readonly danger?: boolean;
}

const RowButton = ({ label, onPress, chevron, disabled, danger }: RowButtonProps) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.row,
      pressed && !disabled && styles.rowPressed,
      disabled && styles.rowDisabled,
    ]}
  >
    <Text style={[styles.rowLabel, danger && styles.danger]}>{label}</Text>
    {chevron ? <Text style={styles.chevron}>›</Text> : null}
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  back: {
    minWidth: 80,
    paddingVertical: theme.spacing.sm,
  },
  backText: {
    fontSize: 16,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  scroll: {
    padding: theme.spacing.lg,
    gap: theme.spacing.xl,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: theme.spacing.sm,
  },
  group: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowPressed: {
    backgroundColor: '#F5ECD9',
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  chevron: {
    fontSize: 22,
    color: theme.colors.textMuted,
  },
  danger: {
    color: theme.colors.error,
    fontWeight: '600',
  },
  version: {
    marginTop: theme.spacing.lg,
    textAlign: 'center',
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});
