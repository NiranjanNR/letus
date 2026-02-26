// apps/mobile/app/auth/login.tsx

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { API_URL } from '../../lib/apiClient';

export default function Login() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrimmed, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Login failed', data.error ?? 'Something went wrong.');
        return;
      }
      // login() stores tokens, syncs apiClient, updates Zustand state.
      // AuthGuard in _layout.tsx detects the state change and redirects to map.
      await login(data.user, data.accessToken, data.refreshToken);

    } catch {
      Alert.alert('Network error', 'Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.header}>
        <Text style={s.logo}>🗺️ Letus</Text>
        <Text style={s.tagline}>Your city. Your vibe.</Text>
      </View>

      <View style={s.form}>
        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input}
          placeholder="you@example.com"
          placeholderTextColor="#AAAAAA"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          returnKeyType="next"
        />

        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input}
          placeholder="••••••••"
          placeholderTextColor="#AAAAAA"
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={s.btnTxt}>Log In</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.switchLink} onPress={() => router.push('/auth/signup')}>
          <Text style={s.switchTxt}>
            Don't have an account?{' '}
            <Text style={s.switchAccent}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', paddingHorizontal: 28 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 36, fontWeight: '800', color: '#1E3A5F' },
  tagline: { fontSize: 15, color: '#888888', marginTop: 6 },
  form: { width: '100%' },
  label: { fontSize: 13, fontWeight: '600', color: '#333333', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 15,
    color: '#111111', backgroundColor: '#F9F9F9',
  },
  btn: { backgroundColor: '#1E3A5F', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  btnTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  switchLink: { alignItems: 'center', marginTop: 20 },
  switchTxt: { fontSize: 14, color: '#888888' },
  switchAccent: { color: '#1E3A5F', fontWeight: '700' },
});
