import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ServicesProvider } from '@/services/di/provider';
import { GameErrorBoundary } from '@/shared/screens/game-error-boundary';
import { ConsentGate } from '@/shared/screens/consent-gate';
import { navigateHome } from '@/shared/ui/nav';

/**
 * Тонкая обёртка для использования useRouter внутри класс-компонента
 * GameErrorBoundary. Expo Router требует хук для получения router, но
 * Error Boundary обязан быть классом — поэтому разделяем на два уровня.
 */
function AppContent() {
  const router = useRouter();
  return (
    <GameErrorBoundary onReset={() => navigateHome(router)}>
      <ConsentGate>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: '#FFF4E0' },
          }}
        />
      </ConsentGate>
    </GameErrorBoundary>
  );
}

export default function RootLayout() {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            refetchOnWindowFocus: false,
            staleTime: 60_000,
          },
        },
      }),
    [],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ServicesProvider>
            <StatusBar style="dark" />
            <AppContent />
          </ServicesProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
