import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ServicesProvider } from '@/services/di/provider';
import { ConsentGate } from '@/shared/screens/consent-gate';
import { SkiaInit } from '@/shared/screens/skia-init';

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
            <SkiaInit>
              <ConsentGate>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'fade',
                    contentStyle: { backgroundColor: '#FFF4E0' },
                  }}
                />
              </ConsentGate>
            </SkiaInit>
          </ServicesProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
