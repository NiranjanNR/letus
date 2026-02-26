// apps/mobile/app/(tabs)/index.tsx
// Phase 0: Map with blue dot + bottom sheet with filter chips.
// Post cards come in Phase 1.

import { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';

// Default to Bengaluru city centre; replaced by actual GPS on device
const DEFAULT_REGION = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const FILTER_CHIPS = ['🔥 Hot Now', '☕ Cafés', '🍔 Food', '🎉 Nightlife', '🌿 Parks'];

export default function MapHome() {
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [activeChip, setActiveChip] = useState('🔥 Hot Now');
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['30%', '80%'], []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationGranted(false);
        return;
      }
      setLocationGranted(true);
      const loc = await Location.getCurrentPositionAsync({});
      setRegion((r) => ({
        ...r,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      }));
    })();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {/* Full-screen map */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        showsUserLocation={true}       // Blue dot ✅
        followsUserLocation={true}
        initialRegion={region}
        region={region}
      />

      {/* Loading indicator while waiting for GPS */}
      {locationGranted === null && (
        <View style={s.gpsLoader}>
          <ActivityIndicator color="#1E3A5F" />
        </View>
      )}

      {/* Bottom sheet */}
      <BottomSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        index={0}
        backgroundStyle={s.sheetBackground}
        handleIndicatorStyle={s.handle}
      >
        <BottomSheetView style={s.sheetContent}>
          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
            contentContainerStyle={{ paddingRight: 8 }}
          >
            {FILTER_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip}
                style={[s.chip, activeChip === chip && s.chipOn]}
                onPress={() => setActiveChip(chip)}
                activeOpacity={0.8}
              >
                <Text style={[s.chipTxt, activeChip === chip && s.chipTxtOn]}>
                  {chip}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Phase 1: Friend story circles go here */}
          <View style={s.storiesPlaceholder}>
            <Text style={s.placeholderLabel}>👥 Friend stories — Phase 1</Text>
          </View>

          {/* Phase 1: Post / vibe cards go here */}
          <View style={s.cardPlaceholder}>
            <Text style={s.placeholderEmoji}>👀</Text>
            <Text style={s.placeholderTitle}>Vibe cards coming in Phase 1</Text>
            <Text style={s.placeholderSub}>
              Post creation, vibe scores, and feed fanout are next.
            </Text>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const s = StyleSheet.create({
  gpsLoader: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  sheetBackground: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
    elevation: 10,
  },
  handle: {
    backgroundColor: '#DDDDDD',
    width: 40,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    marginRight: 8,
    backgroundColor: '#F9F9F9',
  },
  chipOn: {
    backgroundColor: '#1E3A5F',
    borderColor: '#1E3A5F',
  },
  chipTxt: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '500',
  },
  chipTxtOn: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  storiesPlaceholder: {
    height: 60,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderLabel: {
    color: '#AAAAAA',
    fontSize: 13,
  },
  cardPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  placeholderEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
  },
  placeholderSub: {
    fontSize: 13,
    color: '#AAAAAA',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
