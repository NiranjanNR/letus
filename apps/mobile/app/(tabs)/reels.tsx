// apps/mobile/app/(tabs)/reels.tsx — Phase 1 stub
import { View, Text, StyleSheet } from 'react-native';
export default function Reels() {
  return (
    <View style={s.container}>
      <Text style={s.emoji}>🎬</Text>
      <Text style={s.title}>Reels</Text>
      <Text style={s.sub}>Fullscreen video feed — Phase 1</Text>
      <Text style={s.detail}>Needs HLS video + Media Service</Text>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFF', marginBottom: 6 },
  sub: { fontSize: 15, color: '#AAA', marginBottom: 4 },
  detail: { fontSize: 12, color: '#666' },
});
