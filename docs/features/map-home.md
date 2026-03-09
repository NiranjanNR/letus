# Feature: Map Home Screen

## What It Does (Plain English)

The Map Home screen is the first thing users see after logging in. It shows a Google Maps
view of their current city with their location as a blue dot. A draggable panel slides up
from the bottom with filters for what to discover nearby (cafés, food, nightlife, parks).
In Phase 1, this panel will show posts from nearby users.

[SCREENSHOT: Map Home with GPS blue dot, bottom sheet partially open, filter chips visible]

---

## File

`apps/mobile/app/(tabs)/index.tsx`

This is the default tab (index) in the tab navigator — the first screen users land on.

---

## Key Components

### Google Maps
- **Library:** `react-native-maps` with `PROVIDER_GOOGLE`
- **API Key:** Set in `app.json` (`ios.config.googleMapsApiKey`) AND `apps/mobile/.env`
  (`EXPO_PUBLIC_GOOGLE_MAPS_KEY`). Both required — see `docs/errors/log.md` ERR-009.
- **User Location:** `showsUserLocation={true}` renders the native blue dot (uses the
  OS-level location permission, not expo-location directly)

[SCREENSHOT: Map showing blue GPS dot on current location]

### GPS Permission
```typescript
import * as Location from 'expo-location';

const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') {
  // Show message asking user to enable location
}
const coords = await Location.getCurrentPositionAsync({});
// Map camera animates to user's position
```

The permission request happens once on first load. iOS shows the system permission dialog.
After granting, the map centers on the user's coordinates.

### Bottom Sheet
- **Library:** `@gorhom/bottom-sheet`
- **Snap points:** `['30%', '80%']` — partially open at 30%, fully open at 80%
- **Behavior:** Draggable. Tap handle or filter chips to expand.
- **Required setup:** `GestureHandlerRootView` wraps the entire app in `_layout.tsx`
  (missing this causes the sheet to not respond to gestures)

[SCREENSHOT: Bottom sheet at 30% showing filter chips]
[SCREENSHOT: Bottom sheet at 80% showing content area]

### Filter Chips
Current Phase 0 chips (visual only, no filtering logic yet):
- Hot Now
- Cafés
- Food
- Nightlife
- Parks

Phase 1: Tapping a chip sends the selected category to the Place Service query.

### Phase 1 Placeholders (in the bottom sheet content area)
- **Friend story circles** — avatars of friends who posted nearby (needs Neo4j social graph)
- **Vibe cards** — post previews sorted by vibe score (needs Feed Service)

---

## State

The map screen maintains local state only (no server calls in Phase 0):

```typescript
const [location, setLocation] = useState<Location.LocationObject | null>(null);
const [errorMsg, setErrorMsg] = useState<string | null>(null);
```

Phase 1 will add React Query calls to fetch nearby posts from the Feed Service.

---

## How It Connects to Other Systems

| Dependency | Phase | Purpose |
|------------|-------|---------|
| `authStore` (Zustand) | 0 | User is authenticated before reaching this screen |
| Google Maps SDK | 0 | Render the map tiles |
| `expo-location` | 0 | Request GPS permission, get coordinates |
| `@gorhom/bottom-sheet` | 0 | Draggable panel |
| Place Service (Go) | 1 | Find places near user's coordinates |
| Feed Service (Node) | 1 | Get nearby posts for bottom sheet cards |
| Social graph (Neo4j) | 2 | Friend story avatars |

---

## Common Mistakes to Avoid

- **ERR-009:** Map shows grey tiles → API key must be in BOTH `.env` AND `app.json`
- `GestureHandlerRootView` must wrap the root layout — not just the map screen
- `showsUserLocation` requires iOS location permission — always request before rendering map

---

## What Phase 1 Adds

- Animated place pins on the map (pulse effect based on vibe score)
- Tapping a pin expands the bottom sheet with that place's posts
- Filter chips actually filter the Place Service API query
- Friend avatar overlays on pins where friends posted
- Pull-to-refresh on the bottom sheet
