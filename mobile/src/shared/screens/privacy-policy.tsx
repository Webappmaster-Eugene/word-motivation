import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/shared/theme';

const SECTIONS: ReadonlyArray<{ readonly title: string; readonly body: string }> = [
  {
    title: 'Что мы делаем и чего не делаем',
    body:
      '90.games — детская образовательная игра. Мы не знаем имя ребёнка, не спрашиваем ' +
      'email, телефон, адрес или дату рождения. Единственный родительский выбор — ' +
      'возрастная полоса (6–8 или 9–12 лет) для подбора сложности.',
  },
  {
    title: 'Идентификатор устройства',
    body:
      'Чтобы сохранять прогресс между запусками, при первом открытии приложение генерирует ' +
      'случайный идентификатор (UUID). Он никогда не связан с Apple/Google ID, не передаётся ' +
      'рекламным сетям. На сервере хранится только SHA-256 хэш этого ID с секретным салтом.',
  },
  {
    title: 'Голос ребёнка',
    body:
      'Голос обрабатывается локально на устройстве (в браузере — через стандартный Web Speech ' +
      'API; на Android — через встроенное распознавание Google, офлайн-модель в более ' +
      'поздних версиях). Аудиозаписи никогда не покидают устройство и не сохраняются. ' +
      'На сервер передаётся только распознанный текст, если вы явно нажали «поговорить».',
  },
  {
    title: 'Диалоги с животными',
    body:
      'Ответы «животных» генерирует языковая модель через OpenRouter. Текст сообщения и ответ ' +
      'проходят двойную модерацию: перед отправкой и после получения. Запрещены: нецензурная ' +
      'лексика, взрослые темы, запросы персональных данных. Если модерация срабатывает, ' +
      'ребёнок получает заранее написанную безопасную реплику.',
  },
  {
    title: 'Контент и прогресс',
    body:
      'Сохраняются: статистика по буквам (верно/неверно, чтобы возвращаться к сложным), ' +
      'открытые животные, количество звёзд. Никаких геоданных, списков контактов, фото, ' +
      'буфера обмена. Всё анонимно привязано к идентификатору устройства.',
  },
  {
    title: 'Сброс данных',
    body:
      'В разделе «Настройки» → «Сбросить прогресс» можно удалить локальные данные о буквах ' +
      'и открытых животных. Идентификатор устройства также удаляется — при следующем запуске ' +
      'будет создан новый.',
  },
  {
    title: 'Кому мы передаём данные',
    body:
      'Никому из рекламных сетей или аналитики. Единственный внешний сервис — OpenRouter ' +
      '(для ответов ИИ) — и туда передаётся только текст сообщения и роль говорящего. ' +
      'Ключ API хранится только на нашем сервере, ни в коем случае не в мобильном бандле.',
  },
  {
    title: 'Контакт',
    body:
      'По любым вопросам пишите на support@90.games. Родительское согласие предполагается ' +
      'по факту установки приложения ребёнку. Возраст и тематика приложения — 6+, рейтинг ' +
      'IARC 3+.',
  },
];

export function PrivacyPolicyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Назад</Text>
        </Pressable>
        <Text style={styles.title}>Конфиденциальность</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Последнее обновление: 19 апреля 2026 г.</Text>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

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
    fontWeight: '600',
    color: theme.colors.accent,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  scroll: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  lastUpdated: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  section: {
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sectionBody: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
  },
});
