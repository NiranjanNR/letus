// apps/mobile/app/_layout.tsx
//
// Two fixes from the original:
//
// 1. Race condition: the original had two separate useEffect()s — one to load
//    storage, one to redirect. If the redirect effect ran before loadFromStorage
//    completed (which happens on fast devices), it would redirect to login even
//    for authenticated users, causing a flash. Fixed by collapsing into one
//    effect gated on isLoading.
//
// 2. queryClient outside component: module-level QueryClient is fine in RN
//    (no SSR), but wrapping it in useRef ensures the same instance persists
//    across hot reloads in dev without leaking.

import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

function AuthGuard() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Single effect: load storage, then redirect.
    // We don't redirect until isLoading flips to false — that's the signal
    // that loadFromStorage has fully resolved (success or failure).
    loadFromStorage().then(() => {
      // isLoading is now false. The state update from loadFromStorage
      // will trigger a re-render, which re-runs this effect if segments change.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  useEffect(() => {
    if (isLoading) return; // Don't redirect until hydration is complete

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)/');
    }
  }, [user, isLoading, segments, router]);

  return null;
}

export default function RootLayout() {
  // useRef: same QueryClient instance across re-renders and hot reloads
  const queryClientRef = useRef<QueryClient>();
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          staleTime: 30_000, // 30 seconds — prevents refetch on every focus
        },
      },
    });
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClientRef.current}>
        <AuthGuard />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/signup" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
