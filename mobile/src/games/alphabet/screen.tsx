import { AlphabetGame } from './alphabet-game';
import { ContentLoader } from './components/content-loader';
import { useAlphabetContent } from './hooks/use-alphabet-content';
import { useSessionProgress } from './hooks/use-session-progress';

/**
 * Тонкая обёртка над игрой: подтягивает контент (backend/local fallback),
 * сохранённый прогресс (wordIndex/звёзды), затем монтирует AlphabetGame.
 * Пока любой из двух источников грузится — показываем общий лоадер,
 * чтобы FSM стартовала уже с восстановленными значениями (а не сбрасывалась).
 * Ключ на `content.words.length` переинициализирует FSM при смене pack-а.
 */
export default function AlphabetScreen() {
  const query = useAlphabetContent();
  const progress = useSessionProgress(query.data?.words.length ?? 0);

  if (!query.data || !progress.loaded) {
    return <ContentLoader />;
  }

  return (
    <AlphabetGame
      key={query.data.words.length}
      content={query.data}
      initialWordIndex={progress.wordIndex}
      initialTotalStars={progress.totalStars}
      onProgressChange={progress.save}
    />
  );
}
