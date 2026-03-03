import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { Shield, ShieldOff, ShieldCheck, Plus, X, Lock, Clock as Unlock, Mail, CircleAlert as AlertCircle, Check } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const COMMON_BLOCKED_APPS = [
  { id: 'facebook', name: 'Facebook', icon: 'f', color: '#1877F2' },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: '#E1306C' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: '#000000' },
  { id: 'youtube', name: 'YouTube', icon: '▶', color: '#FF0000' },
  { id: 'twitter', name: 'X (Twitter)', icon: '𝕏', color: '#000000' },
  { id: 'zalo', name: 'Zalo', icon: 'Z', color: '#0084FF' },
  { id: 'pubg', name: 'PUBG Mobile', icon: '🎮', color: '#F0831A' },
  { id: 'freefire', name: 'Free Fire', icon: '🔥', color: '#FF6B00' },
  { id: 'snapchat', name: 'Snapchat', icon: '👻', color: '#FFFC00' },
  { id: 'threads', name: 'Threads', icon: '@', color: '#101010' },
];

const UTILITY_APPS = ['Google Maps', 'Camera', 'Phone', 'Email', 'Messages', 'Calendar', 'Focable'];

export default function BlockScreen() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [blockEnabled, setBlockEnabled] = useState(false);
  const [blockMode, setBlockMode] = useState<'schedule' | 'always' | 'off'>('schedule');
  const [allowedApps, setAllowedApps] = useState<string[]>([]);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [unblockCode, setUnblockCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => { if (user) loadSettings(); }, [user]);

  async function loadSettings() {
    const { data } = await supabase
      .from('app_block_settings')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (data) {
      setSettings(data);
      setBlockEnabled(data.block_enabled);
      setBlockMode(data.block_mode);
      setAllowedApps(data.allowed_apps || []);
    }
  }

  async function saveSettings(newBlockEnabled?: boolean, newMode?: string, newAllowed?: string[]) {
    setSaving(true);
    const payload = {
      user_id: user!.id,
      block_enabled: newBlockEnabled ?? blockEnabled,
      block_mode: newMode ?? blockMode,
      allowed_apps: newAllowed ?? allowedApps,
      updated_at: new Date().toISOString(),
    };

    if (settings) {
      await supabase.from('app_block_settings').update(payload).eq('id', settings.id);
    } else {
      await supabase.from('app_block_settings').insert(payload);
    }
    setSaving(false);
    loadSettings();
  }

  function toggleApp(appId: string) {
    const current = [...allowedApps];
    if (current.includes(appId)) {
      const updated = current.filter(a => a !== appId);
      setAllowedApps(updated);
      saveSettings(undefined, undefined, updated);
    } else if (current.length < 5) {
      const updated = [...current, appId];
      setAllowedApps(updated);
      saveSettings(undefined, undefined, updated);
    }
  }

  async function sendUnblockCode() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);
    await supabase.from('block_unblock_requests').insert({
      user_id: user!.id,
      verification_code: code,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    setCodeSent(true);
    setVerifyError('');
  }

  async function verifyAndUnblock() {
    setVerifying(true);
    setVerifyError('');

    const { data } = await supabase
      .from('block_unblock_requests')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_used', false)
      .eq('verification_code', unblockCode)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (data) {
      await supabase.from('block_unblock_requests').update({ is_used: true }).eq('id', data.id);
      await saveSettings(false);
      setBlockEnabled(false);
      setShowUnblockModal(false);
      setCodeSent(false);
      setUnblockCode('');
      setSentCode('');
    } else {
      setVerifyError('Mã không đúng hoặc đã hết hạn');
    }
    setVerifying(false);
  }

  const blockedApps = COMMON_BLOCKED_APPS.filter(a => !allowedApps.includes(a.id));

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F3CEF2', '#EDD5F5']} style={styles.header}>
        <Text style={styles.headerTitle}>Block App</Text>
        <Text style={styles.headerSub}>Kiểm soát thời gian dùng điện thoại</Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPad}>
        <View style={[styles.statusCard, blockEnabled ? styles.statusCardActive : styles.statusCardInactive]}>
          <View style={styles.statusLeft}>
            {blockEnabled ? (
              <ShieldCheck size={36} color={Colors.success} />
            ) : (
              <ShieldOff size={36} color={Colors.textSecondary} />
            )}
            <View>
              <Text style={styles.statusTitle}>
                {blockEnabled ? 'Block đang hoạt động' : 'Block đang tắt'}
              </Text>
              <Text style={styles.statusSub}>
                {blockEnabled ? `Đang block ${blockedApps.length} ứng dụng` : 'Bật block để tập trung hơn'}
              </Text>
            </View>
          </View>
          <Switch
            value={blockEnabled}
            onValueChange={(val) => { setBlockEnabled(val); saveSettings(val); }}
            trackColor={{ false: Colors.border, true: Colors.success }}
            thumbColor={Colors.white}
          />
        </View>

        {blockEnabled && (
          <TouchableOpacity style={styles.unblockBtn} onPress={() => setShowUnblockModal(true)}>
            <Unlock size={18} color={Colors.error} />
            <Text style={styles.unblockBtnText}>Tạm thời mở khóa (cần xác nhận email)</Text>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chế độ block</Text>
          {(['schedule', 'always', 'off'] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.modeCard, blockMode === mode && styles.modeCardActive]}
              onPress={() => { setBlockMode(mode); saveSettings(undefined, mode); }}
            >
              <View style={styles.modeCardLeft}>
                {mode === 'schedule' && <Shield size={20} color={blockMode === mode ? Colors.primary : Colors.textSecondary} />}
                {mode === 'always' && <Lock size={20} color={blockMode === mode ? Colors.primary : Colors.textSecondary} />}
                {mode === 'off' && <ShieldOff size={20} color={blockMode === mode ? Colors.primary : Colors.textSecondary} />}
                <View>
                  <Text style={[styles.modeTitle, blockMode === mode && styles.modeTitleActive]}>
                    {mode === 'schedule' ? 'Theo lịch trình' : mode === 'always' ? 'Luôn block' : 'Tắt block'}
                  </Text>
                  <Text style={styles.modeSub}>
                    {mode === 'schedule' ? 'Block dựa theo khung giờ đã cài' : mode === 'always' ? 'Block mọi lúc khi bật' : 'Không block app nào'}
                  </Text>
                </View>
              </View>
              {blockMode === mode && <Check size={20} color={Colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>App được phép ({allowedApps.length}/5)</Text>
            <View style={[styles.limitBadge, allowedApps.length >= 5 && styles.limitBadgeFull]}>
              <Text style={styles.limitBadgeText}>{5 - allowedApps.length} chỗ trống</Text>
            </View>
          </View>
          <Text style={styles.sectionDesc}>Chọn tối đa 5 app không bị block. App tiện ích luôn được phép.</Text>

          <View style={styles.utilitySection}>
            <Text style={styles.utilityLabel}>App tiện ích (luôn mở)</Text>
            <View style={styles.utilityRow}>
              {UTILITY_APPS.map(app => (
                <View key={app} style={styles.utilityChip}>
                  <Text style={styles.utilityChipText}>{app}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.appGrid}>
            {COMMON_BLOCKED_APPS.map(app => {
              const isAllowed = allowedApps.includes(app.id);
              const canSelect = !isAllowed && allowedApps.length < 5;
              return (
                <TouchableOpacity
                  key={app.id}
                  style={[styles.appCard, isAllowed && styles.appCardAllowed, !canSelect && !isAllowed && styles.appCardDisabled]}
                  onPress={() => toggleApp(app.id)}
                  disabled={!canSelect && !isAllowed}
                >
                  <View style={[styles.appIcon, { backgroundColor: app.color + '20' }]}>
                    <Text style={[styles.appIconText, { color: app.color }]}>{app.icon}</Text>
                  </View>
                  <Text style={[styles.appName, isAllowed && styles.appNameAllowed]}>{app.name}</Text>
                  <View style={[styles.appStatus, isAllowed ? styles.appStatusAllowed : styles.appStatusBlocked]}>
                    <Text style={[styles.appStatusText, isAllowed ? styles.appStatusTextAllowed : styles.appStatusTextBlocked]}>
                      {isAllowed ? 'Cho phép' : 'Blocked'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.infoCard}>
          <AlertCircle size={18} color={Colors.info} />
          <Text style={styles.infoText}>
            Tính năng Block App hoạt động tốt nhất trên ứng dụng native (iOS/Android). Trên web, bạn có thể tự block trong Settings điện thoại theo hướng dẫn bên dưới.
          </Text>
        </View>

        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>Hướng dẫn tự block trên điện thoại</Text>

          <View style={styles.guideSection}>
            <View style={styles.guidePlatformBadge}>
              <Text style={styles.guidePlatformText}>iPhone (iOS)</Text>
            </View>
            <View style={styles.guideStep}>
              <Text style={styles.guideStepNum}>1</Text>
              <Text style={styles.guideStepText}>Vào <Text style={styles.bold}>Cài đặt</Text> → <Text style={styles.bold}>Thời gian sử dụng màn hình</Text></Text>
            </View>
            <View style={styles.guideStep}>
              <Text style={styles.guideStepNum}>2</Text>
              <Text style={styles.guideStepText}>Nhấn <Text style={styles.bold}>Giới hạn ứng dụng</Text> → <Text style={styles.bold}>Thêm giới hạn</Text></Text>
            </View>
            <View style={styles.guideStep}>
              <Text style={styles.guideStepNum}>3</Text>
              <Text style={styles.guideStepText}>Chọn ứng dụng muốn block (TikTok, Instagram,...) và đặt thời gian giới hạn mỗi ngày</Text>
            </View>
            <View style={styles.guideStep}>
              <Text style={styles.guideStepNum}>4</Text>
              <Text style={styles.guideStepText}>Đặt <Text style={styles.bold}>Screen Time Passcode</Text> để ngăn bản thân tự tắt giới hạn</Text>
            </View>
          </View>

          <View style={styles.guideSection}>
            <View style={[styles.guidePlatformBadge, { backgroundColor: '#4CAF5020' }]}>
              <Text style={[styles.guidePlatformText, { color: '#2E7D32' }]}>Android</Text>
            </View>
            <View style={styles.guideStep}>
              <Text style={styles.guideStepNum}>1</Text>
              <Text style={styles.guideStepText}>Vào <Text style={styles.bold}>Cài đặt</Text> → <Text style={styles.bold}>Sức khỏe kỹ thuật số & kiểm soát phụ huynh</Text></Text>
            </View>
            <View style={styles.guideStep}>
              <Text style={styles.guideStepNum}>2</Text>
              <Text style={styles.guideStepText}>Chọn <Text style={styles.bold}>Dashboard</Text>, nhấn vào app muốn giới hạn</Text>
            </View>
            <View style={styles.guideStep}>
              <Text style={styles.guideStepNum}>3</Text>
              <Text style={styles.guideStepText}>Đặt <Text style={styles.bold}>App Timer</Text> (ví dụ: TikTok 30 phút/ngày)</Text>
            </View>
            <View style={styles.guideStep}>
              <Text style={styles.guideStepNum}>4</Text>
              <Text style={styles.guideStepText}>Bật <Text style={styles.bold}>Kiểm soát phụ huynh</Text> và đặt mã PIN để khóa cài đặt</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showUnblockModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác nhận mở khóa</Text>
              <TouchableOpacity onPress={() => { setShowUnblockModal(false); setCodeSent(false); setUnblockCode(''); }}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.unblockInfo}>
              <Mail size={32} color={Colors.primary} />
              <Text style={styles.unblockInfoText}>
                Chúng tôi sẽ gửi mã xác nhận đến email của bạn để xác nhận tắt block tạm thời.
              </Text>
            </View>

            {verifyError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{verifyError}</Text>
              </View>
            ) : null}

            {!codeSent ? (
              <Button title="Gửi mã xác nhận qua Email" onPress={sendUnblockCode} style={styles.sendCodeBtn} />
            ) : (
              <>
                <Text style={styles.codeInputLabel}>Nhập mã 6 chữ số từ email</Text>
                <Input
                  placeholder="123456"
                  value={unblockCode}
                  onChangeText={setUnblockCode}
                  keyboardType="numeric"
                />
                <Button title={verifying ? 'Đang xác nhận...' : 'Xác nhận & Mở khóa'} onPress={verifyAndUnblock} loading={verifying} style={styles.sendCodeBtn} />
                <TouchableOpacity onPress={() => { setCodeSent(false); setUnblockCode(''); }} style={styles.resendBtn}>
                  <Text style={styles.resendText}>Gửi lại mã</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerTitle: { ...Typography.h2, color: Colors.text },
  headerSub: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  content: { flex: 1 },
  contentPad: { padding: Spacing.lg, paddingBottom: 100 },
  statusCard: { borderRadius: BorderRadius.xl, padding: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  statusCardActive: { backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: Colors.success },
  statusCardInactive: { backgroundColor: Colors.backgroundLight, borderWidth: 1.5, borderColor: Colors.border },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  statusTitle: { ...Typography.bodyMedium, color: Colors.text },
  statusSub: { ...Typography.small, color: Colors.textSecondary },
  unblockBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#FECACA' },
  unblockBtnText: { ...Typography.smallMedium, color: Colors.error },
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.sm },
  sectionDesc: { ...Typography.small, color: Colors.textSecondary, marginBottom: Spacing.md },
  limitBadge: { backgroundColor: '#EDE9FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  limitBadgeFull: { backgroundColor: '#FEE2E2' },
  limitBadgeText: { ...Typography.caption, color: Colors.primary, fontFamily: 'Quicksand-SemiBold' },
  modeCard: { backgroundColor: Colors.backgroundLight, borderRadius: BorderRadius.lg, padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderWidth: 1.5, borderColor: Colors.border },
  modeCardActive: { borderColor: Colors.primary, backgroundColor: '#EDE9FE' },
  modeCardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  modeTitle: { ...Typography.bodyMedium, color: Colors.text },
  modeTitleActive: { color: Colors.primary },
  modeSub: { ...Typography.small, color: Colors.textSecondary },
  utilitySection: { marginBottom: Spacing.md },
  utilityLabel: { ...Typography.smallMedium, color: Colors.textSecondary, marginBottom: 8 },
  utilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  utilityChip: { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.success },
  utilityChipText: { ...Typography.caption, color: Colors.success, fontFamily: 'Quicksand-SemiBold' },
  appGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  appCard: { width: '47%', backgroundColor: Colors.backgroundLight, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, gap: 6 },
  appCardAllowed: { borderColor: Colors.primary, backgroundColor: '#EDE9FE' },
  appCardDisabled: { opacity: 0.5 },
  appIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  appIconText: { fontSize: 20, fontFamily: 'Quicksand-Bold' },
  appName: { ...Typography.smallMedium, color: Colors.text, textAlign: 'center' },
  appNameAllowed: { color: Colors.primary },
  appStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  appStatusAllowed: { backgroundColor: '#EDE9FE' },
  appStatusBlocked: { backgroundColor: '#FEE2E2' },
  appStatusText: { ...Typography.caption, fontFamily: 'Quicksand-SemiBold' },
  appStatusTextAllowed: { color: Colors.primary },
  appStatusTextBlocked: { color: Colors.error },
  infoCard: { flexDirection: 'row', backgroundColor: '#EFF6FF', borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm, alignItems: 'flex-start' },
  infoText: { ...Typography.small, color: Colors.info, flex: 1, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { ...Typography.h3, color: Colors.text },
  unblockInfo: { alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl, backgroundColor: Colors.backgroundLight, padding: Spacing.lg, borderRadius: BorderRadius.lg },
  unblockInfoText: { ...Typography.small, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  errorBox: { backgroundColor: '#FEE2E2', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  errorText: { ...Typography.small, color: Colors.error, textAlign: 'center' },
  sendCodeBtn: { backgroundColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  codeInputLabel: { ...Typography.smallMedium, color: Colors.text, marginBottom: 8 },
  resendBtn: { marginTop: Spacing.md, alignItems: 'center' },
  resendText: { ...Typography.small, color: Colors.primary, textDecorationLine: 'underline' },
  guideCard: { backgroundColor: Colors.backgroundLight, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  guideTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.lg },
  guideSection: { marginBottom: Spacing.lg },
  guidePlatformBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.full, alignSelf: 'flex-start', marginBottom: Spacing.md },
  guidePlatformText: { ...Typography.captionMedium, color: Colors.info },
  guideStep: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm, alignItems: 'flex-start' },
  guideStepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, color: Colors.white, textAlign: 'center', lineHeight: 24, fontSize: 12, fontFamily: 'Quicksand-Bold', overflow: 'hidden' },
  guideStepText: { ...Typography.small, color: Colors.text, flex: 1, lineHeight: 20 },
  bold: { fontFamily: 'Quicksand-Bold', color: Colors.text },
});
