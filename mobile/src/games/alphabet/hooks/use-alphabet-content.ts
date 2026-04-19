import { useQuery } from '@tanstack/react-query';

import { useService } from '@/services/di/provider';
import type { AlphabetContent } from '@/services/content-repo/types';

/**
 * React Query хук для загрузки контента игры.
 *
 *  - Пытается тянуть с backend через ResilientContentRepo.
 *  - При любой ошибке репо возвращает локальный fallback — UI никогда не видит error-state.
 *  - Кеш на 5 минут: игра не пересоздаёт FSM при возврате на экран.
 */
export function useAlphabetContent() {
  const repo = useService('contentRepo');
  return useQuery<AlphabetContent, Error>({
    queryKey: ['alphabet-content'],
    queryFn: () => repo.getAlphabetContent(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
