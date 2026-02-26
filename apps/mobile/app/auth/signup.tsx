// apps/mobile/app/auth/signup.tsx

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { API_URL } from '../../lib/apiClient';

export default function Signup() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    const usernameTrimmed = username.trim().toLowerCase();
    const emailTrimmed = email.trim().toLowerCase();

    if (!usernameTrimmed || !emailTrimmed || !password) {
      Alert.alert('Missing fields', 'All fields are required.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameTrimmed, email: emailTrimmed, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Sign up failed', data.error ?? 'Something went wrong.');
        return;
      }
      await login(data.user, data.accessToken, data.refreshToken);

    } catch {
      Alert.alert('Network error', 'Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.logo}>🗺️ Letus</Text>
          <Text style={s.tagline}>Join your city's social map</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>Username</Text>
          <TextInput
            style={s.input}
            placeholder="cityexplorer42"
            placeholderTextColor="#AAAAAA"
            autoCapitalize="none"
            autoComplete="username-new"
            value={username}
            onChangeText={setUsername}
            returnKeyType="next"
          />

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
            placeholder="min 8 characters"
            placeholderTextColor="#AAAAAA"
            secureTextEntry
            autoComplete="password-new"
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={handleSignup}
          />

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={s.btnTxt}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={s.switchLink} onPress={() => router.push('/auth/login')}>
            <Text style={s.switchTxt}>
              Already have an account?{' '}
              <Text style={s.switchAccent}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 36 },
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
