import { useLocalSearchParams } from 'expo-router';

import { AnimalDetailScreen } from '@/zoo/animal-detail-screen';

export default function AnimalDetailRoute() {
  const { animalId } = useLocalSearchParams<{ animalId: string }>();
  return <AnimalDetailScreen animalId={animalId ?? ''} />;
}
