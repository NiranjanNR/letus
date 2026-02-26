// apps/mobile/store/authStore.ts

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { API_URL, setTokens, apiFetch } from '../lib/apiClient';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;          // true only during initial storage hydration
  hydrated: boolean;           // flips to true once (prevents double-load)
  login: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  hydrated: false,

  login: async (user, accessToken, refreshToken) => {
    // Persist to device keychain/keystore
    await Promise.all([
      SecureStore.setItemAsync('refreshToken', refreshToken),
      SecureStore.setItemAsync('accessToken', accessToken),
      SecureStore.setItemAsync('user', JSON.stringify(user)),
    ]);
    // Sync to apiClient so all subsequent apiFetch calls are authenticated
    setTokens(accessToken, refreshToken);
    set({ user, accessToken });
  },

  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync('refreshToken').catch(() => null);

    // Tell the server to invalidate the refresh token.
    // Fire-and-forget: even if this fails, we still clear local state.
    // The server token expires naturally in 7 days — acceptable for Phase 0.
    if (refreshToken) {
      apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }

    await Promise.all([
      SecureStore.deleteItemAsync('refreshToken'),
      SecureStore.deleteItemAsync('accessToken'),
      SecureStore.deleteItemAsync('user'),
    ]).catch(() => {});

    setTokens(null, null);
    set({ user: null, accessToken: null });
  },

  loadFromStorage: async () => {
    // Guard: only run once per app session.
    // Without this, navigation events can trigger multiple loadFromStorage calls
    // which create a race condition where the second call overwrites the first.
    if (get().hydrated) return;
    set({ hydrated: true });

    try {
      const [storedUser, storedRefresh, storedAccess] = await Promise.all([
        SecureStore.getItemAsync('user'),
        SecureStore.getItemAsync('refreshToken'),
        SecureStore.getItemAsync('accessToken'),
      ]);

      if (!storedUser || !storedRefresh) {
        // No stored session — show login
        return;
      }

      // Sync to apiClient before attempting refresh
      setTokens(storedAccess, storedRefresh);

      // Try to refresh. This validates the refresh token is still alive
      // and gets a fresh access token regardless of stored expiry.
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      });

      if (res.ok) {
        const data = await res.json();
        await Promise.all([
          SecureStore.setItemAsync('accessToken', data.accessToken),
          SecureStore.setItemAsync('refreshToken', data.refreshToken),
        ]);
        setTokens(data.accessToken, data.refreshToken);
        set({ user: JSON.parse(storedUser), accessToken: data.accessToken });
      } else {
        // Refresh token is dead (7-day expiry passed, or server revoked it)
        await get().logout();
      }
    } catch {
      // Network offline at boot — trust stored user, retry on next apiFetch
      // The apiClient's auto-refresh will handle it when network returns.
      const storedUser = await SecureStore.getItemAsync('user').catch(() => null);
      if (storedUser) {
        set({ user: JSON.parse(storedUser) });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
