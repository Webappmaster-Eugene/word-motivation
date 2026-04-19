import { AlphabetGame } from './alphabet-game';
import { ContentLoader } from './components/content-loader';
import { useAlphabetContent } from './hooks/use-alphabet-content';

/**
 * Тонкая обёртка над игрой: подтягивает контент (backend/local fallback),
 * показывает лоадер пока идёт запрос, затем монтирует AlphabetGame с готовым контентом.
 * Ключ на `content.words.length` гарантирует, что FSM переинициализируется,
 * если контент заменился (например, backend вернул расширенный pack).
 */
export default function AlphabetScreen() {
  const query = useAlphabetContent();

  if (!query.data) {
    return <ContentLoader />;
  }

  return <AlphabetGame key={query.data.words.length} content={query.data} />;
}
