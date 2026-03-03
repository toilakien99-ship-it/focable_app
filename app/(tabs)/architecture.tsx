import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronRight, CircleCheck as CheckCircle2, Circle, TriangleAlert as AlertTriangle, Info, Smartphone, Database, Shield, Bot, MapPin, Users } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';

type Section = {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  items: { label: string; done: boolean; note?: string }[];
};

const ARCHITECTURE_SECTIONS: Section[] = [
  {
    id: 'auth',
    title: 'Authentication & Security',
    icon: <Shield size={18} color="#F59E0B" />,
    color: '#F59E0B',
    items: [
      { label: 'Email/Password auth via Supabase Auth', done: true },
      { label: 'OTP email verification on signup', done: true },
      { label: 'Email regex validation client-side', done: true },
      { label: 'JWT session management', done: true },
      { label: 'Row Level Security on all tables', done: true },
      { label: 'Google OAuth', done: false, note: 'Cần cấu hình Google Console + Supabase OAuth provider' },
      { label: 'Apple Sign In', done: false, note: 'Yêu cầu Apple Developer Program + expo-apple-authentication' },
      { label: 'Biometric unlock (FaceID/Fingerprint)', done: false, note: 'Cần expo-local-authentication + native build' },
    ],
  },
  {
    id: 'notifications',
    title: 'Notification System',
    icon: <Info size={18} color="#3B82F6" />,
    color: '#3B82F6',
    items: [
      { label: 'In-app notifications via Supabase realtime', done: true },
      { label: 'Permission onboarding screen', done: true },
      { label: 'Notification context & toast system', done: true },
      { label: 'Push notifications (foreground)', done: false, note: 'Cần expo-notifications + EAS build + APNs/FCM setup' },
      { label: 'Push notifications (background)', done: false, note: 'Yêu cầu background task + native build' },
      { label: 'Scheduled local notifications', done: false, note: 'Cần expo-notifications với scheduleNotificationAsync' },
    ],
  },
  {
    id: 'location',
    title: 'Location Tracking',
    icon: <MapPin size={18} color="#22C55E" />,
    color: '#22C55E',
    items: [
      { label: 'Foreground location permission request', done: true },
      { label: 'Current location fetch + reverse geocoding', done: true },
      { label: 'Location history stored in Supabase', done: true },
      { label: 'On/Off tracking toggle', done: true },
      { label: 'Background location tracking', done: false, note: 'Cần expo-location background + native permissions + EAS build' },
      { label: 'Geofencing alerts', done: false, note: 'Cần Location.startGeofencingAsync - chỉ native' },
    ],
  },
  {
    id: 'parent',
    title: 'Parent Mode',
    icon: <Users size={18} color="#EC4899" />,
    color: '#EC4899',
    items: [
      { label: 'Parent/Child account pairing via 6-digit code', done: true },
      { label: 'Two-way confirmation flow', done: true },
      { label: 'Parent can view child location history', done: true },
      { label: 'Bypass attempt logging', done: true },
      { label: 'Parent notified on bypass attempt', done: true },
      { label: 'Parent can configure block schedules remotely', done: false, note: 'UI cần thêm vào parent.tsx - DB schema đã sẵn sàng' },
      { label: 'Real-time location sharing (live)', done: false, note: 'Cần background location + Supabase realtime subscription' },
    ],
  },
  {
    id: 'appblock',
    title: 'App Blocking',
    icon: <Shield size={18} color="#EF4444" />,
    color: '#EF4444',
    items: [
      { label: 'Block settings UI (list app, modes)', done: true },
      { label: 'Block settings saved to Supabase', done: true },
      { label: 'Email-verified unblock flow', done: true },
      { label: 'Step-by-step device blocking guide', done: true },
      { label: 'Actual app blocking (Android Accessibility)', done: false, note: 'KHÔNG thể thực hiện trong Expo managed - cần eject + Accessibility Service native module' },
      { label: 'Screen Time API integration (iOS)', done: false, note: 'Chỉ khả dụng qua Screen Time framework - không thể trong Expo managed' },
      { label: 'MDM profile (Enterprise)', done: false, note: 'Yêu cầu Apple Business/School Manager' },
    ],
  },
  {
    id: 'ai',
    title: 'AI Assistant',
    icon: <Bot size={18} color={Colors.primary} />,
    color: Colors.primary,
    items: [
      { label: 'AI chat screen (Foca)', done: true },
      { label: 'Supabase Edge Function proxy cho OpenAI', done: true },
      { label: 'Conversation history persisted per user', done: true },
      { label: 'User context (tasks, focus) injected vào prompt', done: true },
      { label: 'Fallback replies khi không có OpenAI key', done: true },
      { label: 'OpenAI GPT-4o-mini integration', done: false, note: 'Thêm OPENAI_API_KEY vào Supabase Edge Function secrets' },
      { label: 'AI phân tích pattern dài hạn', done: false, note: 'Cần behavior_analytics data tích lũy theo thời gian' },
    ],
  },
  {
    id: 'database',
    title: 'Database Schema',
    icon: <Database size={18} color="#14B8A6" />,
    color: '#14B8A6',
    items: [
      { label: 'user_profiles', done: true },
      { label: 'tasks (pending/completed/overdue)', done: true },
      { label: 'schedule_blocks + eisenhower_tasks', done: true },
      { label: 'chat_messages (sent/delivered/seen)', done: true },
      { label: 'notifications', done: true },
      { label: 'parent_child_links', done: true },
      { label: 'pairing_codes', done: true },
      { label: 'location_history', done: true },
      { label: 'bypass_attempts', done: true },
      { label: 'behavior_analytics', done: true },
      { label: 'ai_conversations', done: true },
      { label: 'focus_sessions', done: true },
      { label: 'app_block_settings', done: true },
    ],
  },
  {
    id: 'publish_android',
    title: 'Google Play Checklist',
    icon: <Smartphone size={18} color="#22C55E" />,
    color: '#22C55E',
    items: [
      { label: 'Target API Level 34+ (Android 14)', done: false, note: 'Cấu hình trong app.json build.android.targetSdkVersion' },
      { label: 'Khai báo quyền nhạy cảm trong manifest', done: false, note: 'RECORD_AUDIO, ACCESS_FINE_LOCATION, FOREGROUND_SERVICE, v.v.' },
      { label: 'Privacy Policy URL bắt buộc', done: false, note: 'Phải có URL công khai trước khi submit' },
      { label: 'Data Safety Form điền đầy đủ', done: false, note: 'Khai báo dữ liệu thu thập: vị trí, tin nhắn, thông tin cá nhân' },
      { label: 'Accessibility Service declaration', done: false, note: 'Nếu dùng Accessibility - cần video demo sử dụng hợp lệ' },
      { label: 'App signing keystore (.jks)', done: false, note: 'Tạo bằng keytool hoặc EAS credentials' },
      { label: 'EAS Build production: eas build -p android', done: false },
      { label: 'Internal testing track → Closed → Production', done: false },
      { label: 'Parental controls feature tag khai báo', done: false, note: 'Nếu app dùng cho trẻ em / kiểm soát phụ huynh' },
    ],
  },
  {
    id: 'publish_ios',
    title: 'App Store Checklist',
    icon: <Smartphone size={18} color="#3B82F6" />,
    color: '#3B82F6',
    items: [
      { label: 'Apple Developer Program ($99/năm)', done: false },
      { label: 'App Store Connect tạo app record', done: false },
      { label: 'Privacy Policy + Terms of Service URL', done: false },
      { label: 'Privacy Nutrition Labels (App Privacy)', done: false, note: 'Khai báo: Location, Contact Info, Usage Data' },
      { label: 'Screen Time / Parental Controls disclosure', done: false, note: 'Nếu dùng Family Controls framework - cần entitlement đặc biệt' },
      { label: 'AI disclosure nếu tích hợp generative AI', done: false, note: 'App Store policy 2024 yêu cầu disclosure rõ ràng' },
      { label: 'App signing certificate (Distribution)', done: false },
      { label: 'EAS Build production: eas build -p ios', done: false },
      { label: 'TestFlight beta testing trước khi submit', done: false },
      { label: 'App Review screenshots (6.5" + 5.5" iPhone)', done: false },
    ],
  },
];

export default function ArchitectureScreen() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
        <Text style={styles.headerTitle}>Kiến trúc & Roadmap</Text>
        <Text style={styles.headerSub}>Production checklist & publish guide</Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPad} showsVerticalScrollIndicator={false}>

        <View style={styles.architectureDiagram}>
          <Text style={styles.diagramTitle}>System Architecture</Text>
          <View style={styles.diagramCode}>
            <Text style={styles.diagramText}>{`┌─────────────────────────────┐
│      Focable Mobile App       │
│  (Expo Router + React Native) │
└──────────┬──────────────┬─────┘
           │              │
    ┌──────▼──────┐  ┌────▼────────┐
    │  Supabase   │  │  Edge       │
    │  Auth + DB  │  │  Functions  │
    │  Realtime   │  │  (AI proxy) │
    └──────┬──────┘  └────┬────────┘
           │              │
    ┌──────▼──────┐  ┌────▼────────┐
    │  PostgreSQL │  │  OpenAI     │
    │  + RLS      │  │  GPT-4o     │
    └─────────────┘  └─────────────┘

Native Layer (requires EAS build):
  Android: Accessibility Service → App Blocking
  iOS: Family Controls → Screen Time
  Both: expo-notifications → Push`}
            </Text>
          </View>
        </View>

        {ARCHITECTURE_SECTIONS.map(section => {
          const isOpen = expanded[section.id];
          const done = section.items.filter(i => i.done).length;
          const total = section.items.length;
          const pct = Math.round((done / total) * 100);

          return (
            <View key={section.id} style={styles.sectionCard}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggle(section.id)}>
                <View style={styles.sectionLeft}>
                  <View style={[styles.sectionIconWrap, { backgroundColor: section.color + '20' }]}>
                    {section.icon}
                  </View>
                  <View>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <Text style={styles.sectionProgress}>{done}/{total} hoàn thành ({pct}%)</Text>
                  </View>
                </View>
                {isOpen ? <ChevronDown size={18} color="#64748B" /> : <ChevronRight size={18} color="#64748B" />}
              </TouchableOpacity>

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: section.color }]} />
              </View>

              {isOpen && (
                <View style={styles.itemList}>
                  {section.items.map((item, i) => (
                    <View key={i} style={styles.item}>
                      <View style={styles.itemLeft}>
                        {item.done ? (
                          <CheckCircle2 size={16} color={Colors.success} fill={Colors.success} />
                        ) : (
                          <Circle size={16} color="#334155" />
                        )}
                        <View style={styles.itemTextWrap}>
                          <Text style={[styles.itemLabel, !item.done && styles.itemLabelPending]}>{item.label}</Text>
                          {item.note && (
                            <View style={styles.noteWrap}>
                              <AlertTriangle size={11} color="#F59E0B" />
                              <Text style={styles.noteText}>{item.note}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.nativeNote}>
          <AlertTriangle size={18} color={Colors.warning} />
          <View style={styles.nativeNoteText}>
            <Text style={styles.nativeNoteTitle}>Các tính năng yêu cầu Native Build</Text>
            <Text style={styles.nativeNoteDesc}>
              App Blocking thực sự, Background Location, Push Notifications và Biometric Auth đều yêu cầu EAS Build (không chạy được trên Expo Go). Dùng lệnh: eas build -p android hoặc eas build -p ios
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerTitle: { ...Typography.h2, color: Colors.white },
  headerSub: { ...Typography.small, color: '#94A3B8', marginTop: 2 },
  content: { flex: 1 },
  contentPad: { padding: Spacing.lg, paddingBottom: 100 },
  architectureDiagram: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  diagramTitle: { ...Typography.smallMedium, color: '#94A3B8', marginBottom: Spacing.md, fontFamily: 'Quicksand-SemiBold' },
  diagramCode: { backgroundColor: '#000', borderRadius: BorderRadius.lg, padding: Spacing.md },
  diagramText: { fontFamily: 'Quicksand-Regular', fontSize: 11, color: '#4ADE80', lineHeight: 18 },
  sectionCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: BorderRadius.xl, marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  sectionIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { ...Typography.smallMedium, color: Colors.white },
  sectionProgress: { ...Typography.caption, color: '#64748B', marginTop: 2 },
  progressBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: Spacing.lg, borderRadius: 2, marginBottom: Spacing.sm },
  progressFill: { height: '100%', borderRadius: 2 },
  itemList: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.sm },
  item: {},
  itemLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  itemTextWrap: { flex: 1 },
  itemLabel: { ...Typography.small, color: Colors.white, lineHeight: 20 },
  itemLabelPending: { color: '#64748B' },
  noteWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 3 },
  noteText: { ...Typography.caption, color: '#F59E0B', flex: 1, lineHeight: 16 },
  nativeNote: { flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.warning + '10', borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.warning + '30', marginTop: Spacing.md },
  nativeNoteText: { flex: 1 },
  nativeNoteTitle: { ...Typography.smallMedium, color: Colors.warning, marginBottom: 6 },
  nativeNoteDesc: { ...Typography.small, color: '#94A3B8', lineHeight: 20 },
});
