import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useToast } from '@/context/ToastContext';
import { verifyOtp, resendOtp } from '@/lib/authService';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react-native';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string }>();
  const { showToast } = useToast();
  const email = params.email || '';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  function handleOtpChange(val: string, index: number) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
    if (newOtp.every(d => d !== '') && digit) {
      handleVerify(newOtp.join(''));
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(code?: string) {
    const token = code ?? otp.join('');
    if (token.length < OTP_LENGTH) {
      setError('Vui lòng nhập đủ 6 chữ số');
      return;
    }
    setLoading(true);
    setError('');
    const { error: verifyError } = await verifyOtp(email, token);
    setLoading(false);
    if (verifyError) {
      setError(verifyError);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } else {
      showToast('Xác thực thành công!', 'success');
      router.replace('/(tabs)');
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    setResendLoading(true);
    const { error: resendError } = await resendOtp(email);
    setResendLoading(false);
    if (resendError) {
      showToast('Không thể gửi lại mã. Thử lại sau.', 'error');
    } else {
      setCountdown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
      showToast('Mã mới đã được gửi!', 'success');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#F0E6FF', '#E8D5FF']} style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.primary} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <View style={styles.iconBg}>
              <ShieldCheck size={40} color={Colors.primary} />
            </View>
          </View>

          <Text style={styles.title}>Xác thực email</Text>
          <Text style={styles.subtitle}>
            Mã OTP đã được gửi đến{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          <View style={styles.otpRow}>
            {otp.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={r => { inputs.current[idx] = r; }}
                style={[styles.otpInput, digit ? styles.otpInputFilled : null, error ? styles.otpInputError : null]}
                value={digit}
                onChangeText={v => handleOtpChange(v, idx)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, idx)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                textContentType="oneTimeCode"
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.verifyBtn, loading && styles.verifyBtnDisabled]}
            onPress={() => handleVerify()}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.verifyBtnText}>Xác thực</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Chưa nhận được mã? </Text>
            <TouchableOpacity onPress={handleResend} disabled={countdown > 0 || resendLoading}>
              {resendLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : countdown > 0 ? (
                <Text style={styles.resendCountdown}>Gửi lại ({countdown}s)</Text>
              ) : (
                <Text style={styles.resendLink}>Gửi lại ngay</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Mail size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>Kiểm tra hộp thư spam nếu không thấy email trong 2 phút.</Text>
          </View>
        </View>
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
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingTop: 80 },
  iconWrap: { alignItems: 'center', marginBottom: Spacing.lg },
  iconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  title: { ...Typography.h2, color: Colors.text, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { ...Typography.small, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  emailHighlight: { color: Colors.primary, fontFamily: 'Quicksand-SemiBold' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: Spacing.md },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: 'Quicksand-Bold',
    color: Colors.text,
  },
  otpInputFilled: { borderColor: Colors.primary, backgroundColor: '#F5F0FF' },
  otpInputError: { borderColor: Colors.error, backgroundColor: '#FFF5F5' },
  errorText: { ...Typography.small, color: Colors.error, textAlign: 'center', marginBottom: Spacing.md },
  verifyBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  verifyBtnDisabled: { opacity: 0.6 },
  verifyBtnText: { ...Typography.bodyMedium, color: Colors.white, fontFamily: 'Quicksand-Bold' },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xl },
  resendText: { ...Typography.small, color: Colors.textSecondary },
  resendLink: { ...Typography.smallMedium, color: Colors.primary, fontFamily: 'Quicksand-SemiBold' },
  resendCountdown: { ...Typography.smallMedium, color: Colors.textLight },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  infoText: { ...Typography.caption, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
});
