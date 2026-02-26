// apps/mobile/app/(tabs)/explore.tsx — Phase 1 stub
import { View, Text, StyleSheet } from 'react-native';
export default function Explore() {
  return (
    <View style={s.container}>
      <Text style={s.emoji}>🔍</Text>
      <Text style={s.title}>Explore</Text>
      <Text style={s.sub}>Search + trending places — Phase 1</Text>
      <Text style={s.detail}>Needs Elasticsearch + Place Service</Text>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#1E3A5F', marginBottom: 6 },
  sub: { fontSize: 15, color: '#555', marginBottom: 4 },
  detail: { fontSize: 12, color: '#AAAAAA' },
});
