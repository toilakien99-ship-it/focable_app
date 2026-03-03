import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { signInWithGoogle, signInWithFacebook } from '@/lib/oauth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { ArrowLeft } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email || !password) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setLoading(true);
    setError('');
    const { error: authError } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (authError) {
      setError('Email hoặc mật khẩu không đúng');
    } else {
      showToast('Đăng nhập thành công!', 'success');
      router.replace('/(tabs)');
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError('');
    const { error: oauthError } = await signInWithGoogle();
    setGoogleLoading(false);
    if (oauthError) {
      setError(oauthError);
    } else {
      showToast('Đăng nhập Google thành công!', 'success');
      router.replace('/(tabs)');
    }
  }

  async function handleFacebookLogin() {
    setFacebookLoading(true);
    setError('');
    const { error: oauthError } = await signInWithFacebook();
    setFacebookLoading(false);
    if (oauthError) {
      setError(oauthError);
    } else {
      showToast('Đăng nhập Facebook thành công!', 'success');
      router.replace('/(tabs)');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#F3CEF2', '#EDD5F5']} style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image source={require('@/assets/images/OMG_LOGO.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Chào mừng trở lại!</Text>
            <Text style={styles.subtitle}>Đăng nhập để tiếp tục hành trình của bạn</Text>
          </View>

          <View style={styles.card}>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="Email"
              placeholder="email@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button
              title="Đăng nhập"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginBtn}
              size="lg"
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc đăng nhập với</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialBtn, styles.googleBtn]}
                onPress={handleGoogleLogin}
                disabled={googleLoading || facebookLoading}
                activeOpacity={0.8}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color="#DB4437" />
                ) : (
                  <>
                    <Text style={styles.googleG}>G</Text>
                    <Text style={styles.socialBtnLabel}>Google</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.socialBtn, styles.facebookBtn]}
                onPress={handleFacebookLogin}
                disabled={googleLoading || facebookLoading}
                activeOpacity={0.8}
              >
                {facebookLoading ? (
                  <ActivityIndicator size="small" color="#1877F2" />
                ) : (
                  <>
                    <Text style={styles.facebookF}>f</Text>
                    <Text style={styles.socialBtnLabel}>Facebook</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.registerLink}>
              <Text style={styles.registerText}>
                Chưa có tài khoản? <Text style={styles.registerHighlight}>Đăng ký ngay</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: Spacing.lg,
    zIndex: 10,
    padding: 8,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 110,
    paddingBottom: 48,
  },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logo: { width: 70, height: 70, marginBottom: Spacing.md },
  title: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { ...Typography.small, color: Colors.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  errorText: { ...Typography.small, color: Colors.error, textAlign: 'center' },
  loginBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { ...Typography.small, color: Colors.textSecondary, marginHorizontal: Spacing.md },
  socialRow: { flexDirection: 'row', gap: Spacing.md },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundLight,
    minHeight: 50,
  },
  googleBtn: { borderColor: '#DB443740' },
  facebookBtn: { borderColor: '#1877F240' },
  googleG: { fontSize: 18, fontFamily: 'Quicksand-Bold', color: '#DB4437' },
  facebookF: { fontSize: 18, fontFamily: 'Quicksand-Bold', color: '#1877F2' },
  socialBtnLabel: { ...Typography.smallMedium, color: Colors.text },
  registerLink: { marginTop: Spacing.lg, alignItems: 'center' },
  registerText: { ...Typography.small, color: Colors.textSecondary },
  registerHighlight: { color: Colors.primary, fontFamily: 'Quicksand-SemiBold' },
});
