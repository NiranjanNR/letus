// apps/mobile/lib/apiClient.ts
//
// Central API client used by every screen. Two problems this solves:
//
// 1. API_URL was duplicated across login.tsx, signup.tsx, authStore.ts —
//    three places to update when the URL changes.
//
// 2. No token expiry handling: accessToken is 15 minutes. After that,
//    every fetch returns 401. The user gets silently bounced to login
//    even though their session is still valid. This client auto-refreshes
//    the access token and retries the original request transparently.

import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// The token store is shared between apiClient and authStore.
// We keep a module-level reference to avoid circular imports.
// authStore calls setTokens() after login/refresh; apiClient reads from here.
let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _isRefreshing = false;
let _refreshQueue: Array<(token: string) => void> = [];

export function setTokens(access: string | null, refresh: string | null) {
  _accessToken = access;
  _refreshToken = refresh;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!_refreshToken) return null;

  // If a refresh is already in flight, queue this request instead of
  // sending duplicate refresh calls (race condition on multiple 401s).
  if (_isRefreshing) {
    return new Promise((resolve) => {
      _refreshQueue.push(resolve);
    });
  }

  _isRefreshing = true;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: _refreshToken }),
    });

    if (!res.ok) {
      // Refresh token is dead — user must log in again
      setTokens(null, null);
      await SecureStore.deleteItemAsync('accessToken').catch(() => {});
      await SecureStore.deleteItemAsync('refreshToken').catch(() => {});
      return null;
    }

    const data = await res.json();
    _accessToken = data.accessToken;
    _refreshToken = data.refreshToken;

    await SecureStore.setItemAsync('accessToken', data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);

    // Drain the queue — all waiting requests get the new token
    _refreshQueue.forEach((resolve) => resolve(data.accessToken));
    _refreshQueue = [];

    return data.accessToken;
  } catch {
    setTokens(null, null);
    return null;
  } finally {
    _isRefreshing = false;
  }
}

// Drop-in replacement for fetch() that handles auth transparently.
// Usage: import { apiFetch } from '@/lib/apiClient'; apiFetch('/auth/me')
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(url, { ...options, headers });

  // If 401, try refreshing once and retry the original request
  if (res.status === 401 && _refreshToken) {
    const newToken = await refreshAccessToken();
    if (!newToken) return res; // Can't refresh — caller gets the 401

    headers['Authorization'] = `Bearer ${newToken}`;
    return fetch(url, { ...options, headers });
  }

  return res;
}
