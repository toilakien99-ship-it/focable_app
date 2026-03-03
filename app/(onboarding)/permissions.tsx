import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Bell, MapPin, Shield, ChevronRight, CircleCheck as CheckCircle2, Circle } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface PermissionItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  reason: string;
  detail: string;
  granted: boolean;
  required: boolean;
}

export default function PermissionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<PermissionItem[]>([
    {
      id: 'notification',
      icon: <Bell size={28} color="#F59E0B" />,
      title: 'Thông báo',
      reason: 'Nhắc nhở lịch trình, nhiệm vụ và cảnh báo quan trọng',
      detail: 'Focable sẽ gửi thông báo nhắc nhở khi bạn có lịch sắp đến, nhiệm vụ chưa hoàn thành, hoặc khi bạn cần tập trung. Chúng tôi không gửi quảng cáo.',
      granted: false,
      required: true,
    },
    {
      id: 'location',
      icon: <MapPin size={28} color="#22C55E" />,
      title: 'Vị trí',
      reason: 'Theo dõi vị trí để hỗ trợ giám sát và tích hợp lịch trình',
      detail: 'Vị trí được dùng để xác định múi giờ, hỗ trợ Parent Mode và cá nhân hóa trải nghiệm. Dữ liệu chỉ được lưu trên Supabase của bạn và không bao giờ bán cho bên thứ ba.',
      granted: false,
      required: false,
    },
  ]);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [step, setStep] = useState<'explain' | 'request'>('explain');

  async function requestPermission(id: string) {
    setRequesting(id);
    let granted = false;

    if (id === 'notification') {
      if (Platform.OS === 'web') {
        if ('Notification' in window) {
          const result = await window.Notification.requestPermission();
          granted = result === 'granted';
        } else {
          granted = true;
        }
      } else {
        granted = true;
      }
    }

    if (id === 'location') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      granted = status === 'granted';
    }

    setPermissions(prev => prev.map(p => p.id === id ? { ...p, granted } : p));
    setRequesting(null);
  }

  async function continueToApp() {
    if (user) {
      await supabase.from('user_profiles').update({ notification_permission_asked: true }).eq('id', user.id);
    }
    router.replace('/(tabs)');
  }

  const allRequiredGranted = permissions.filter(p => p.required).every(p => p.granted);

  if (step === 'explain') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.explainBg}>
          <ScrollView contentContainerStyle={styles.explainContent} showsVerticalScrollIndicator={false}>
            <View style={styles.logoWrap}>
              <Shield size={56} color={Colors.primary} />
            </View>
            <Text style={styles.explainTitle}>Focable cần một số quyền</Text>
            <Text style={styles.explainSubtitle}>
              Để hoạt động đúng và bảo vệ bạn, ứng dụng cần các quyền bên dưới. Chúng tôi cam kết không lạm dụng dữ liệu.
            </Text>

            <View style={styles.permissionsList}>
              {permissions.map(p => (
                <View key={p.id} style={styles.permissionExplainCard}>
                  <View style={styles.permissionExplainIcon}>{p.icon}</View>
                  <View style={styles.permissionExplainText}>
                    <View style={styles.permissionExplainHeader}>
                      <Text style={styles.permissionExplainTitle}>{p.title}</Text>
                      {p.required ? (
                        <View style={styles.requiredBadge}><Text style={styles.requiredBadgeText}>Bắt buộc</Text></View>
                      ) : (
                        <View style={styles.optionalBadge}><Text style={styles.optionalBadgeText}>Tùy chọn</Text></View>
                      )}
                    </View>
                    <Text style={styles.permissionExplainDetail}>{p.detail}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.privacyNote}>
              <Text style={styles.privacyNoteText}>
                Dữ liệu của bạn được mã hóa và lưu trữ an toàn. Bạn có thể thu hồi quyền bất kỳ lúc nào trong Cài đặt.
              </Text>
            </View>

            <TouchableOpacity style={styles.continueBtn} onPress={() => setStep('request')}>
              <Text style={styles.continueBtnText}>Tiếp tục và cấp quyền</Text>
              <ChevronRight size={20} color={Colors.white} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={continueToApp}>
              <Text style={styles.skipBtnText}>Bỏ qua, cấp quyền sau</Text>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.explainBg}>
        <ScrollView contentContainerStyle={styles.requestContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.requestTitle}>Cấp quyền</Text>
          <Text style={styles.requestSubtitle}>Nhấn vào từng quyền để cấp phép</Text>

          {permissions.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.permissionRequestCard, p.granted && styles.permissionGranted]}
              onPress={() => !p.granted && requestPermission(p.id)}
              disabled={p.granted || requesting === p.id}
            >
              <View style={styles.permissionRequestLeft}>
                <View style={styles.permissionRequestIconWrap}>{p.icon}</View>
                <View>
                  <Text style={styles.permissionRequestTitle}>{p.title}</Text>
                  <Text style={styles.permissionRequestReason}>{p.reason}</Text>
                </View>
              </View>
              {p.granted ? (
                <CheckCircle2 size={24} color={Colors.success} fill={Colors.success} />
              ) : requesting === p.id ? (
                <View style={styles.loadingDot} />
              ) : (
                <View style={styles.grantBtn}>
                  <Text style={styles.grantBtnText}>Cấp</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.continueBtn, !allRequiredGranted && styles.continueBtnDisabled]}
            onPress={continueToApp}
          >
            <Text style={styles.continueBtnText}>
              {allRequiredGranted ? 'Vào ứng dụng' : 'Cấp quyền bắt buộc để tiếp tục'}
            </Text>
          </TouchableOpacity>

          {!allRequiredGranted && (
            <TouchableOpacity style={styles.skipBtn} onPress={continueToApp}>
              <Text style={styles.skipBtnText}>Bỏ qua (một số tính năng có thể không hoạt động)</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  explainBg: { flex: 1 },
  explainContent: { padding: Spacing.xl, paddingTop: 80, paddingBottom: 60 },
  requestContent: { padding: Spacing.xl, paddingTop: 80, paddingBottom: 60 },
  logoWrap: { width: 88, height: 88, borderRadius: 24, backgroundColor: 'rgba(85,0,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xl, alignSelf: 'center' },
  explainTitle: { ...Typography.h2, color: Colors.white, textAlign: 'center', marginBottom: Spacing.sm },
  explainSubtitle: { ...Typography.small, color: '#94A3B8', textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  permissionsList: { gap: Spacing.md, marginBottom: Spacing.xl },
  permissionExplainCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl, padding: Spacing.lg, flexDirection: 'row', gap: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  permissionExplainIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  permissionExplainText: { flex: 1 },
  permissionExplainHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  permissionExplainTitle: { ...Typography.bodyMedium, color: Colors.white },
  requiredBadge: { backgroundColor: '#DC262620', paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: '#DC262640' },
  requiredBadgeText: { fontSize: 10, fontFamily: 'Quicksand-SemiBold', color: '#F87171' },
  optionalBadge: { backgroundColor: '#22C55E20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: '#22C55E40' },
  optionalBadgeText: { fontSize: 10, fontFamily: 'Quicksand-SemiBold', color: '#4ADE80' },
  permissionExplainDetail: { ...Typography.small, color: '#94A3B8', lineHeight: 20 },
  privacyNote: { backgroundColor: 'rgba(85,0,255,0.1)', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.xl, borderWidth: 1, borderColor: 'rgba(85,0,255,0.3)' },
  privacyNoteText: { ...Typography.small, color: '#A78BFA', textAlign: 'center', lineHeight: 20 },
  continueBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: Spacing.md },
  continueBtnDisabled: { opacity: 0.5 },
  continueBtnText: { ...Typography.bodyMedium, color: Colors.white, fontFamily: 'Quicksand-Bold' },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipBtnText: { ...Typography.small, color: '#64748B', textDecorationLine: 'underline' },
  requestTitle: { ...Typography.h2, color: Colors.white, textAlign: 'center', marginBottom: Spacing.sm },
  requestSubtitle: { ...Typography.small, color: '#94A3B8', textAlign: 'center', marginBottom: Spacing.xl },
  permissionRequestCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  permissionGranted: { borderColor: Colors.success + '60', backgroundColor: 'rgba(34,197,94,0.08)' },
  permissionRequestLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  permissionRequestIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  permissionRequestTitle: { ...Typography.bodyMedium, color: Colors.white },
  permissionRequestReason: { ...Typography.small, color: '#94A3B8', marginTop: 2 },
  grantBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full },
  grantBtnText: { ...Typography.captionMedium, color: Colors.white, fontFamily: 'Quicksand-Bold' },
  loadingDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, opacity: 0.5 },
});
