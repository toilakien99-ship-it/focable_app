import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) {
      router.replace('/(tabs)');
    }
  }, [session, loading]);

  if (loading) {
    return (
      <LinearGradient colors={['#F3CEF2', '#794DDA']} style={styles.loadingContainer}>
        <Image source={require('@/assets/images/OMG_LOGO.png')} style={styles.logo} resizeMode="contain" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#F3CEF2', '#E8C4F0', '#C89EE0']} style={styles.container}>
      <View style={styles.logoSection}>
        <Image source={require('@/assets/images/OMG_LOGO.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appName}>Focable</Text>
        <Text style={styles.tagline}>Giúp bạn sắp xếp{'\n'}và quản lí thời gian hợp lí</Text>
      </View>

      <View style={styles.featuresRow}>
        <View style={styles.featureItem}>
          <Image source={require('@/assets/images/timetable.png')} style={styles.featureIcon} resizeMode="contain" />
          <Text style={styles.featureText}>Lịch trình</Text>
        </View>
        <View style={styles.featureItem}>
          <Image source={require('@/assets/images/home.png')} style={styles.featureIcon} resizeMode="contain" />
          <Text style={styles.featureText}>Nhiệm vụ</Text>
        </View>
        <View style={styles.featureItem}>
          <Image source={require('@/assets/images/lock.png')} style={styles.featureIcon} resizeMode="contain" />
          <Text style={styles.featureText}>Block App</Text>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <Button
          title="Bắt đầu ngay"
          onPress={() => router.push('/(auth)/register')}
          style={styles.primaryBtn}
          size="lg"
        />
        <Button
          title="Đã có tài khoản? Đăng nhập"
          onPress={() => router.push('/(auth)/login')}
          variant="ghost"
          style={styles.ghostBtn}
          size="lg"
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 80,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: Spacing.md,
  },
  appName: {
    ...Typography.h1,
    color: Colors.primary,
    fontSize: 42,
    marginBottom: Spacing.sm,
  },
  tagline: {
    ...Typography.bodyMedium,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 26,
    opacity: 0.8,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: Spacing.xl,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    width: 56,
    height: 56,
  },
  featureText: {
    ...Typography.captionMedium,
    color: Colors.text,
    fontFamily: 'Quicksand-SemiBold',
  },
  bottomSection: {
    gap: Spacing.sm,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ghostBtn: {},
});
