# Feature: Mobile Navigation

## What It Does (Plain English)

The mobile app uses Expo Router (file-based routing, like Next.js but for React Native).
The root layout acts as an auth guard — unauthenticated users are redirected to the login
screen before they can see any tab. Authenticated users see a 5-tab bottom navigation bar.

[SCREENSHOT: Bottom tab bar with Map, Explore, Post, Reels, Profile icons]

---

## Router Structure

```
app/
├── _layout.tsx              ← Root layout (auth guard lives here)
├── auth/
│   ├── login.tsx            ← /auth/login
│   └── signup.tsx           ← /auth/signup
└── (tabs)/
    ├── _layout.tsx          ← Tab bar configuration
    ├── index.tsx            ← / (Map Home)
    ├── explore.tsx          ← /explore
    ├── post.tsx             ← /post
    ├── reels.tsx            ← /reels
    └── profile.tsx          ← /profile
```

`(tabs)` is a route group (parentheses = no URL segment). The tab bar appears on all
screens inside this group.

---

## Auth Guard (`app/_layout.tsx`)

The root layout determines where to route the user based on auth state:

```typescript
const { user, isLoading, hydrated } = useAuthStore();

useEffect(() => {
  if (!isLoading && hydrated) {
    if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/auth/login');
    }
  }
}, [user, isLoading, hydrated]);
```

**Critical:** The redirect only fires after `hydrated === true`. Without this guard,
the app flashes the login screen before the Keychain read completes (see ERR-003).

The root layout also provides:
- `QueryClientProvider` — React Query for all server state
- `GestureHandlerRootView` — required for `@gorhom/bottom-sheet` gestures

---

## Tab Bar (`app/(tabs)/_layout.tsx`)

5 tabs configured with Expo Router's `<Tabs>` component:

| Tab | Route | Phase | Icon |
|-----|-------|-------|------|
| Map | `(tabs)/index` | 0 (working) | map-outline |
| Explore | `(tabs)/explore` | stub | search-outline |
| Post | `(tabs)/post` | stub | add-circle-outline |
| Reels | `(tabs)/reels` | stub | play-outline |
| Profile | `(tabs)/profile` | 0 (basic) | person-outline |

Post tab uses a center-prominent style (larger icon, accent color) to encourage posting.

---

## Session Restore on App Launch

On every cold start, `_layout.tsx` calls `authStore.loadFromStorage()`:

```typescript
useEffect(() => {
  authStore.loadFromStorage(); // reads from iOS Keychain
}, []);
```

`loadFromStorage()` is idempotent (guarded by `hydrated` flag). The redirect effect waits
for `isLoading === false && hydrated === true` before deciding where to route.

Timeline:
```
App launch
    → _layout.tsx mounts
    → loadFromStorage() fires
        → reads Keychain (~50ms)
        → attempts /auth/refresh (~200ms network)
    → hydrated = true, isLoading = false
    → redirect effect fires
        → user set → navigate to /(tabs) (map)
        → user null → navigate to /auth/login
```

Total time from cold start to map screen: ~250ms (Keychain + one network round trip).

---

## Files Involved

| File | Role |
|------|------|
| `apps/mobile/app/_layout.tsx` | Auth guard, providers, session restore |
| `apps/mobile/app/(tabs)/_layout.tsx` | Tab bar with 5 tabs |
| `apps/mobile/store/authStore.ts` | `hydrated`, `isLoading`, `user` state that drives routing |

---

## Common Mistakes to Avoid

- **ERR-003:** Never redirect based on `user` alone — always check `hydrated === true` first
- **ERR-004:** `loadFromStorage()` must be idempotent — use the `hydrated` flag guard
- **ERR-005:** Create `QueryClient` with `useRef` inside the component, not at module scope
- Bottom sheet gestures fail silently without `GestureHandlerRootView` at the root

---

## What Phase 1 Changes

- Post tab (`post.tsx`) becomes a camera/gallery launch screen
- Explore tab (`explore.tsx`) becomes the Elasticsearch place search
- Reels tab (`reels.tsx`) becomes the HLS video feed
- Deep linking support added (tap notification → open specific post on map)
