import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AnimalScene } from '@/games/alphabet/components/animal-scene';
import type { AnimalInfo } from '@/games/alphabet/content/types';
import { StaticAnimalModelRegistry } from '@/services/animal-model/static-registry';
import type { ModelInteraction } from '@/services/animal-model/types';
import type { AnimalSceneAsset, SceneAnimation } from '@/services/animal-scene/types';
import { useService } from '@/services/di/provider';
import { SPEECH_PRESETS } from '@/services/speech-synthesis/types';
import { theme } from '@/shared/theme';

interface AnimalInteractionPanelProps {
  readonly animal: AnimalInfo;
}

const INTERACTION_LABELS: Readonly<Record<string, string>> = {
  pet: 'Погладить',
  feed: 'Покормить',
  'throw-ball': 'Мячик',
  dance: 'Танцевать',
};

const INTERACTION_EMOJIS: Readonly<Record<string, string>> = {
  pet: '🤚',
  feed: '🍖',
  'throw-ball': '⚽',
  dance: '💃',
};

const ANIMATION_MAP: Readonly<Record<string, SceneAnimation>> = {
  pet: 'happy',
  feed: 'eat',
  'throw-ball': 'play',
  dance: 'dance',
};

const registry = new StaticAnimalModelRegistry();

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Панель взаимодействия с животным в зоопарке.
 *
 * Показывает Skia-сцену с анимацией + 4 кнопки взаимодействия.
 * Каждая кнопка имеет cooldown (берётся из AnimalModelDescriptor) — ребёнок
 * не может спамить одну и ту же реакцию.
 *
 * Архитектура готова к Filament M4.5: анимации через SceneAnimation →
 * AnimalScene переключает GLB-клипы автоматически.
 */
export function AnimalInteractionPanel({ animal }: AnimalInteractionPanelProps) {
  const tts = useService('speechSynthesis');
  const [animation, setAnimation] = useState<SceneAnimation>('idle');
  const [reaction, setReaction] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Readonly<Record<string, number>>>({});
  const reactionOpacity = useSharedValue(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Очищаем таймеры при unmount. Копируем `timersRef.current` в локальную
  // переменную внутри эффекта: к моменту запуска cleanup ref может уже
  // указывать на другой массив (если бы мы его пересоздавали), а мы хотим
  // погасить именно те таймеры, что были живы на момент монтирования.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, []);

  const descriptor = registry.get(animal.id);

  const interactions: readonly ModelInteraction[] = descriptor?.interactions ?? [
    { id: 'pet', animation: 'happy', reaction: 'Мне нравится!', cooldownMs: 1500 },
    { id: 'dance', animation: 'happy', reaction: 'Ла-ла-ла!', cooldownMs: 3000 },
  ];

  const handleInteraction = useCallback(
    (interaction: ModelInteraction) => {
      if (Date.now() < (cooldowns[interaction.id] ?? 0)) return;

      const sceneAnim: SceneAnimation = ANIMATION_MAP[interaction.id] ?? 'happy';
      setAnimation(sceneAnim);
      setReaction(interaction.reaction);

      reactionOpacity.value = withSequence(
        withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: interaction.cooldownMs - 600 }),
        withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) }),
      );

      void tts.speak(interaction.reaction, SPEECH_PRESETS.animalReply);

      setCooldowns((prev) => ({ ...prev, [interaction.id]: Date.now() + interaction.cooldownMs }));

      const t = setTimeout(() => {
        setAnimation('idle');
        setReaction(null);
      }, interaction.cooldownMs);
      timersRef.current.push(t);
    },
    [cooldowns, reactionOpacity, tts],
  );

  const reactionStyle = useAnimatedStyle(() => ({
    opacity: reactionOpacity.value,
    transform: [{ translateY: (1 - reactionOpacity.value) * 8 }],
  }));

  const asset: AnimalSceneAsset = {
    id: animal.id,
    title: animal.title,
    emoji: animal.emoji,
    color: animal.color,
  };

  const now = Date.now();

  return (
    <View style={styles.container}>
      <View style={styles.sceneWrapper}>
        <AnimalScene asset={asset} animation={animation} width={260} height={220} showTitle />
        {reaction !== null ? (
          <AnimatedView style={[styles.reactionBubble, reactionStyle]} pointerEvents="none">
            <Text style={styles.reactionText}>{reaction}</Text>
          </AnimatedView>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.buttonsScroll}
        contentContainerStyle={styles.buttonsContent}
      >
        {interactions.map((interaction) => {
          const onCooldown = now < (cooldowns[interaction.id] ?? 0);
          const label = INTERACTION_LABELS[interaction.id] ?? interaction.id;
          const emoji = INTERACTION_EMOJIS[interaction.id] ?? '✨';
          return (
            <Pressable
              key={interaction.id}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ disabled: onCooldown }}
              disabled={onCooldown}
              onPress={() => handleInteraction(interaction)}
              style={({ pressed }) => [
                styles.btn,
                onCooldown && styles.btnCooldown,
                pressed && !onCooldown && styles.btnPressed,
              ]}
            >
              <Text style={styles.btnEmoji}>{emoji}</Text>
              <Text style={[styles.btnLabel, onCooldown && styles.btnLabelCooldown]}>
                {onCooldown ? 'скоро…' : label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.hint}>Нажимай на кнопки, чтобы играть с {animal.title.toLowerCase()}!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  sceneWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  reactionBubble: {
    position: 'absolute',
    top: -16,
    left: '50%',
    // translateX не поддерживается в StyleSheet статически — смещаем через marginLeft
    marginLeft: -80,
    width: 160,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  reactionText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  buttonsScroll: {
    flexGrow: 0,
  },
  buttonsContent: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  btn: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    minWidth: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  btnCooldown: {
    opacity: 0.45,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  btnEmoji: {
    fontSize: 32,
  },
  btnLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  btnLabelCooldown: {
    color: theme.colors.textMuted,
  },
  hint: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
});
