import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useToast } from '@/context/ToastContext';
import { registerWithEmail, validateEmail, validatePassword } from '@/lib/authService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { ArrowLeft, Mail, Lock, User } from 'lucide-react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ và tên';
    const emailErr = validateEmail(email);
    if (emailErr) newErrors.email = emailErr;
    const passErr = validatePassword(password);
    if (passErr) newErrors.password = passErr;
    if (password !== confirmPassword) newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    const { error } = await registerWithEmail(email, password, fullName);
    setLoading(false);
    if (error) {
      setErrors({ general: error });
    } else {
      showToast('Mã OTP đã được gửi đến email của bạn!', 'success');
      router.push({ pathname: '/(auth)/verify', params: { email: email.trim().toLowerCase() } });
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#F0E6FF', '#E8D5FF']} style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.primary} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Image source={require('@/assets/images/OMG_LOGO.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Tạo tài khoản</Text>
            <Text style={styles.subtitle}>Bắt đầu hành trình tập trung của bạn</Text>
          </View>

          <View style={styles.card}>
            {errors.general ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Input
                label="Họ và tên"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChangeText={v => { setFullName(v); setErrors(e => ({ ...e, fullName: '' })); }}
                autoCapitalize="words"
              />
              {errors.fullName ? <Text style={styles.fieldError}>{errors.fullName}</Text> : null}
            </View>

            <View style={styles.field}>
              <Input
                label="Email"
                placeholder="email@example.com"
                value={email}
                onChangeText={v => { setEmail(v); setErrors(e => ({ ...e, email: '' })); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
            </View>

            <View style={styles.field}>
              <Input
                label="Mật khẩu"
                placeholder="Ít nhất 6 ký tự"
                value={password}
                onChangeText={v => { setPassword(v); setErrors(e => ({ ...e, password: '' })); }}
                secureTextEntry
              />
              {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
            </View>

            <View style={styles.field}>
              <Input
                label="Xác nhận mật khẩu"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChangeText={v => { setConfirmPassword(v); setErrors(e => ({ ...e, confirmPassword: '' })); }}
                secureTextEntry
              />
              {errors.confirmPassword ? <Text style={styles.fieldError}>{errors.confirmPassword}</Text> : null}
            </View>

            <Button
              title="Gửi mã xác thực"
              onPress={handleRegister}
              loading={loading}
              style={styles.registerBtn}
              size="lg"
            />

            <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.loginLink}>
              <Text style={styles.loginText}>
                Đã có tài khoản? <Text style={styles.loginHighlight}>Đăng nhập</Text>
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
  content: { paddingHorizontal: Spacing.lg, paddingTop: 110, paddingBottom: 48 },
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
  field: { marginBottom: 4 },
  fieldError: { ...Typography.caption, color: Colors.error, marginTop: -8, marginBottom: 8, marginLeft: 4 },
  registerBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  loginLink: { marginTop: Spacing.lg, alignItems: 'center' },
  loginText: { ...Typography.small, color: Colors.textSecondary },
  loginHighlight: { color: Colors.primary, fontFamily: 'Quicksand-SemiBold' },
});
