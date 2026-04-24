import { useLocalSearchParams, useRouter } from 'expo-router';

import { GameErrorBoundary } from '@/shared/screens/game-error-boundary';
import { navigateHome } from '@/shared/ui/nav';
import { AnimalDetailScreen } from '@/zoo/animal-detail-screen';

export default function AnimalDetailRoute() {
  const { animalId } = useLocalSearchParams<{ animalId: string }>();
  const router = useRouter();
  return (
    <GameErrorBoundary onReset={() => navigateHome(router)}>
      <AnimalDetailScreen animalId={animalId ?? ''} />
    </GameErrorBoundary>
  );
}
