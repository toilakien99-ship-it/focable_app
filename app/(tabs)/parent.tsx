import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { Shield, Users, MapPin, TriangleAlert as AlertTriangle, Link2, Link2Off, Plus, X, Copy, Clock, CircleCheck as CheckCircle2 } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  generatePairingCode,
  linkParentToChild,
  getLinkedChildren,
  getLinkedParents,
  revokeLink,
  getChildLocationHistory,
  getChildBypassAttempts,
} from '@/lib/parentService';

type Tab = 'children' | 'be_monitored' | 'activity';

type ChildLink = {
  id: string;
  status: string;
  linked_at: string;
  child: { id: string; full_name: string; avatar_url: string } | null;
};

type ParentLink = {
  id: string;
  status: string;
  linked_at: string;
  parent: { id: string; full_name: string; avatar_url: string } | null;
};

type LocationEntry = {
  id: string;
  city: string;
  district: string;
  country: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
};

type BypassAttempt = {
  id: string;
  attempt_type: string;
  detail: string;
  occurred_at: string;
};

export default function ParentScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('children');

  const [children, setChildren] = useState<ChildLink[]>([]);
  const [parents, setParents] = useState<ParentLink[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationEntry[]>([]);
  const [bypassAttempts, setBypassAttempts] = useState<BypassAttempt[]>([]);
  const [loading, setLoading] = useState(false);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  const [myPairingCode, setMyPairingCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null);

  useFocusEffect(useCallback(() => {
    if (user) loadData();
  }, [user]));

  async function loadData() {
    setLoading(true);
    const [ch, pa] = await Promise.all([
      getLinkedChildren(user!.id),
      getLinkedParents(user!.id),
    ]);
    setChildren(ch as ChildLink[]);
    setParents(pa as ParentLink[]);
    setLoading(false);
  }

  async function handleGenerateCode() {
    setGeneratingCode(true);
    const code = await generatePairingCode(user!.id);
    setMyPairingCode(code);
    setCodeExpiry(new Date(Date.now() + 15 * 60 * 1000));
    setGeneratingCode(false);
  }

  async function handleLinkParent() {
    if (!linkCode.trim() || linkCode.length !== 6) {
      setLinkError('Nhập mã 6 chữ số hợp lệ');
      return;
    }
    setLinking(true);
    setLinkError('');
    const result = await linkParentToChild(user!.id, linkCode.trim());
    if (result.success) {
      showToast('Đã liên kết thành công!', 'success');
      setShowLinkModal(false);
      setLinkCode('');
      loadData();
    } else {
      setLinkError(result.error ?? 'Liên kết thất bại');
    }
    setLinking(false);
  }

  async function handleRevoke(linkId: string) {
    const result = await revokeLink(linkId, user!.id);
    if (result.success) {
      showToast('Đã hủy liên kết', 'success');
      loadData();
    }
  }

  async function loadChildActivity(childId: string) {
    setSelectedChildId(childId);
    setTab('activity');
    const [loc, byp] = await Promise.all([
      getChildLocationHistory(childId, 10),
      getChildBypassAttempts(childId),
    ]);
    setLocationHistory(loc as LocationEntry[]);
    setBypassAttempts(byp as BypassAttempt[]);
  }

  const ATTEMPT_LABELS: Record<string, string> = {
    permission_revoke: 'Thu hồi quyền',
    force_stop: 'Tắt buộc app',
    location_disabled: 'Tắt vị trí',
    unlink_parent: 'Gỡ phụ huynh',
    manual_unblock: 'Tự mở block',
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
        <Text style={styles.headerTitle}>Chế độ Phụ huynh</Text>
        <Text style={styles.headerSub}>Giám sát & bảo vệ</Text>

        <View style={styles.tabRow}>
          {([
            { key: 'children', label: 'Trẻ em' },
            { key: 'be_monitored', label: 'Bị giám sát' },
            { key: 'activity', label: 'Hoạt động' },
          ] as const).map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingWrap}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentPad} showsVerticalScrollIndicator={false}>

          {tab === 'children' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tài khoản đang giám sát</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowLinkModal(true)}>
                  <Plus size={18} color={Colors.white} />
                  <Text style={styles.addBtnText}>Liên kết</Text>
                </TouchableOpacity>
              </View>

              {children.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Users size={40} color={Colors.border} />
                  <Text style={styles.emptyTitle}>Chưa có tài khoản nào</Text>
                  <Text style={styles.emptyDesc}>Nhấn "Liên kết" và nhập mã 6 số từ tài khoản trẻ để bắt đầu giám sát.</Text>
                </View>
              ) : (
                children.map(link => (
                  <View key={link.id} style={styles.childCard}>
                    <View style={styles.childAvatar}>
                      <Text style={styles.childAvatarText}>{(link.child?.full_name ?? 'U')[0].toUpperCase()}</Text>
                    </View>
                    <View style={styles.childInfo}>
                      <Text style={styles.childName}>{link.child?.full_name ?? 'Không rõ'}</Text>
                      <Text style={styles.childLinked}>Liên kết: {new Date(link.linked_at).toLocaleDateString('vi-VN')}</Text>
                    </View>
                    <View style={styles.childActions}>
                      <TouchableOpacity
                        style={styles.viewBtn}
                        onPress={() => link.child && loadChildActivity(link.child.id)}
                      >
                        <MapPin size={16} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.revokeBtn} onPress={() => handleRevoke(link.id)}>
                        <Link2Off size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              <View style={styles.infoBox}>
                <Shield size={16} color={Colors.info} />
                <Text style={styles.infoText}>Để liên kết, yêu cầu trẻ vào tab "Bị giám sát", tạo mã 6 số và đưa cho bạn.</Text>
              </View>
            </>
          )}

          {tab === 'be_monitored' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Phụ huynh giám sát bạn</Text>
              </View>

              <View style={styles.codeGeneratorCard}>
                <Text style={styles.codeGeneratorTitle}>Mã kết nối của bạn</Text>
                <Text style={styles.codeGeneratorDesc}>Tạo mã và chia sẻ với phụ huynh. Mã có hiệu lực 15 phút.</Text>

                {myPairingCode ? (
                  <View style={styles.codeDisplay}>
                    <Text style={styles.codeText}>{myPairingCode}</Text>
                    {codeExpiry && (
                      <View style={styles.codeExpiry}>
                        <Clock size={14} color={Colors.warning} />
                        <Text style={styles.codeExpiryText}>
                          Hết hạn lúc {codeExpiry.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.copyCodeBtn} onPress={() => { setMyPairingCode(null); setCodeExpiry(null); }}>
                      <Text style={styles.copyCodeBtnText}>Tạo mã mới</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.generateCodeBtn} onPress={handleGenerateCode} disabled={generatingCode}>
                    {generatingCode ? <ActivityIndicator color={Colors.white} size="small" /> : (
                      <>
                        <Link2 size={18} color={Colors.white} />
                        <Text style={styles.generateCodeBtnText}>Tạo mã kết nối</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {parents.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Đang được giám sát bởi:</Text>
                  {parents.map(link => (
                    <View key={link.id} style={styles.childCard}>
                      <View style={[styles.childAvatar, { backgroundColor: Colors.warning + '20' }]}>
                        <Text style={[styles.childAvatarText, { color: Colors.warning }]}>{(link.parent?.full_name ?? 'P')[0].toUpperCase()}</Text>
                      </View>
                      <View style={styles.childInfo}>
                        <Text style={styles.childName}>{link.parent?.full_name ?? 'Phụ huynh'}</Text>
                        <Text style={styles.childLinked}>Từ: {new Date(link.linked_at).toLocaleDateString('vi-VN')}</Text>
                      </View>
                      <TouchableOpacity style={styles.revokeBtn} onPress={() => handleRevoke(link.id)}>
                        <Link2Off size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              <View style={[styles.infoBox, { borderColor: Colors.warning + '40', backgroundColor: Colors.warning + '10' }]}>
                <AlertTriangle size={16} color={Colors.warning} />
                <Text style={[styles.infoText, { color: Colors.warning }]}>
                  Khi được giám sát, phụ huynh có thể xem vị trí và cảnh báo bypass của bạn.
                </Text>
              </View>
            </>
          )}

          {tab === 'activity' && (
            <>
              {!selectedChildId ? (
                <View style={styles.emptyCard}>
                  <MapPin size={40} color={Colors.border} />
                  <Text style={styles.emptyTitle}>Chọn tài khoản để xem</Text>
                  <Text style={styles.emptyDesc}>Vào tab "Trẻ em" và nhấn biểu tượng vị trí để xem hoạt động.</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Lịch sử vị trí gần đây</Text>
                  {locationHistory.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <MapPin size={32} color={Colors.border} />
                      <Text style={styles.emptyTitle}>Chưa có dữ liệu vị trí</Text>
                    </View>
                  ) : (
                    locationHistory.map(loc => (
                      <View key={loc.id} style={styles.locationCard}>
                        <View style={styles.locationIcon}>
                          <MapPin size={16} color={Colors.primary} />
                        </View>
                        <View style={styles.locationInfo}>
                          <Text style={styles.locationCity}>{[loc.district, loc.city, loc.country].filter(Boolean).join(', ')}</Text>
                          <Text style={styles.locationCoords}>{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</Text>
                        </View>
                        <Text style={styles.locationTime}>
                          {new Date(loc.recorded_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    ))
                  )}

                  <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Cảnh báo bypass</Text>
                  {bypassAttempts.length === 0 ? (
                    <View style={styles.cleanBadge}>
                      <CheckCircle2 size={24} color={Colors.success} fill={Colors.success} />
                      <Text style={styles.cleanText}>Không có hành vi đáng ngờ</Text>
                    </View>
                  ) : (
                    bypassAttempts.map(attempt => (
                      <View key={attempt.id} style={styles.bypassCard}>
                        <AlertTriangle size={18} color={Colors.error} />
                        <View style={styles.bypassInfo}>
                          <Text style={styles.bypassType}>{ATTEMPT_LABELS[attempt.attempt_type] ?? attempt.attempt_type}</Text>
                          {attempt.detail ? <Text style={styles.bypassDetail}>{attempt.detail}</Text> : null}
                        </View>
                        <Text style={styles.bypassTime}>
                          {new Date(attempt.occurred_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        </Text>
                      </View>
                    ))
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      <Modal visible={showLinkModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Liên kết tài khoản</Text>
              <TouchableOpacity onPress={() => { setShowLinkModal(false); setLinkCode(''); setLinkError(''); }}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>Nhập mã 6 số từ tài khoản trẻ (có trong tab "Bị giám sát" của họ)</Text>
            <TextInput
              style={[styles.codeInput, linkError ? styles.codeInputError : null]}
              value={linkCode}
              onChangeText={text => { setLinkCode(text.replace(/\D/g, '').slice(0, 6)); setLinkError(''); }}
              placeholder="123456"
              placeholderTextColor={Colors.textLight}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />
            {linkError ? <Text style={styles.errorText}>{linkError}</Text> : null}
            <TouchableOpacity
              style={[styles.linkBtn, (linking || linkCode.length !== 6) && styles.linkBtnDisabled]}
              onPress={handleLinkParent}
              disabled={linking || linkCode.length !== 6}
            >
              {linking ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.linkBtnText}>Liên kết ngay</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: 0 },
  headerTitle: { ...Typography.h2, color: Colors.white },
  headerSub: { ...Typography.small, color: '#94A3B8', marginTop: 2, marginBottom: Spacing.lg },
  tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.full, padding: 4 },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: BorderRadius.full },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { ...Typography.captionMedium, color: '#94A3B8' },
  tabTextActive: { color: Colors.white },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  content: { flex: 1, backgroundColor: '#0F172A' },
  contentPad: { padding: Spacing.lg, paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { ...Typography.h4, color: Colors.white },
  sectionLabel: { ...Typography.smallMedium, color: '#94A3B8', marginBottom: Spacing.sm, marginTop: Spacing.md },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full },
  addBtnText: { ...Typography.captionMedium, color: Colors.white, fontFamily: 'Quicksand-Bold' },
  emptyCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: Spacing.md },
  emptyTitle: { ...Typography.bodyMedium, color: '#94A3B8' },
  emptyDesc: { ...Typography.small, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  childCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  childAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '30', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  childAvatarText: { ...Typography.bodyMedium, color: Colors.primary, fontFamily: 'Quicksand-Bold' },
  childInfo: { flex: 1 },
  childName: { ...Typography.bodyMedium, color: Colors.white },
  childLinked: { ...Typography.caption, color: '#64748B' },
  childActions: { flexDirection: 'row', gap: 8 },
  viewBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  revokeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.error + '20', justifyContent: 'center', alignItems: 'center' },
  infoBox: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.info + '10', borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.info + '30', marginTop: Spacing.md },
  infoText: { ...Typography.small, color: Colors.info, flex: 1, lineHeight: 20 },
  codeGeneratorCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  codeGeneratorTitle: { ...Typography.h4, color: Colors.white, marginBottom: 6 },
  codeGeneratorDesc: { ...Typography.small, color: '#94A3B8', textAlign: 'center', marginBottom: Spacing.xl },
  codeDisplay: { alignItems: 'center', gap: Spacing.sm },
  codeText: { fontSize: 40, fontFamily: 'Quicksand-Bold', color: Colors.primary, letterSpacing: 8 },
  codeExpiry: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  codeExpiryText: { ...Typography.small, color: Colors.warning },
  copyCodeBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: BorderRadius.full, marginTop: Spacing.sm },
  copyCodeBtnText: { ...Typography.smallMedium, color: Colors.white },
  generateCodeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: BorderRadius.lg },
  generateCodeBtnText: { ...Typography.bodyMedium, color: Colors.white, fontFamily: 'Quicksand-Bold' },
  locationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  locationIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  locationInfo: { flex: 1 },
  locationCity: { ...Typography.smallMedium, color: Colors.white },
  locationCoords: { ...Typography.caption, color: '#64748B', marginTop: 2 },
  locationTime: { ...Typography.caption, color: '#94A3B8' },
  cleanBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.success + '10', borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.success + '30' },
  cleanText: { ...Typography.smallMedium, color: Colors.success },
  bypassCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.error + '10', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: 8, borderWidth: 1, borderColor: Colors.error + '30' },
  bypassInfo: { flex: 1 },
  bypassType: { ...Typography.smallMedium, color: Colors.error },
  bypassDetail: { ...Typography.caption, color: '#94A3B8', marginTop: 2 },
  bypassTime: { ...Typography.caption, color: '#64748B' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { ...Typography.h3, color: Colors.white },
  modalDesc: { ...Typography.small, color: '#94A3B8', lineHeight: 20, marginBottom: Spacing.xl },
  codeInput: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Typography.h2, color: Colors.white, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: Spacing.md, letterSpacing: 12 },
  codeInputError: { borderColor: Colors.error },
  errorText: { ...Typography.small, color: Colors.error, textAlign: 'center', marginBottom: Spacing.md },
  linkBtn: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: BorderRadius.lg, alignItems: 'center' },
  linkBtnDisabled: { opacity: 0.5 },
  linkBtnText: { ...Typography.bodyMedium, color: Colors.white, fontFamily: 'Quicksand-Bold' },
});
