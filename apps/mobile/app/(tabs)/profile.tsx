// apps/mobile/app/(tabs)/profile.tsx — Phase 0 (shows logged-in user info)
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function Profile() {
  const { user, logout } = useAuthStore();
  return (
    <View style={s.container}>
      <Text style={s.emoji}>👤</Text>
      <Text style={s.name}>{user?.username ?? 'Explorer'}</Text>
      <Text style={s.email}>{user?.email}</Text>
      <Text style={s.level}>Lv.1 — 0 XP</Text>
      <Text style={s.sub}>Full profile — Phase 1</Text>
      <Text style={s.detail}>Achievements, stats, post grid — Phase 1</Text>

      <TouchableOpacity style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutTxt}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', padding: 24 },
  emoji: { fontSize: 64, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: '700', color: '#1E3A5F', marginBottom: 4 },
  email: { fontSize: 14, color: '#888', marginBottom: 8 },
  level: { fontSize: 13, color: '#FF6B35', fontWeight: '600', marginBottom: 16 },
  sub: { fontSize: 15, color: '#555', marginBottom: 4 },
  detail: { fontSize: 12, color: '#AAAAAA', marginBottom: 40 },
  logoutBtn: { backgroundColor: '#1E3A5F', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 },
  logoutTxt: { color: '#FFF', fontWeight: '600', fontSize: 15 },
});
