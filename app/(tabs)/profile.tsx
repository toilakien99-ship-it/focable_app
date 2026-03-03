import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { Bell, LogOut, ChevronRight, CreditCard as Edit3, X, Zap, Award, Target, Clock, Check, Images, ChevronLeft, ChevronRight as NextIcon, Camera, KeyRound } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { formatDate } from '@/lib/dateUtils';

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name || '');
  const [goalHours, setGoalHours] = useState(String(profile?.phone_usage_goal_hours ?? 2));
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [weekPhotos, setWeekPhotos] = useState<any[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (user) loadWeekPhotos();
  }, [user]);

  async function loadWeekPhotos() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6);
    const { data } = await supabase
      .from('task_photos')
      .select('*')
      .eq('user_id', user!.id)
      .gte('photo_date', formatDate(startDate))
      .lte('photo_date', formatDate(endDate))
      .order('created_at', { ascending: true });
    setWeekPhotos(data ?? []);
  }

  function nextSlide() {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setSlideIndex(i => (i + 1) % weekPhotos.length);
  }

  function prevSlide() {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setSlideIndex(i => (i - 1 + weekPhotos.length) % weekPhotos.length);
  }

  async function saveProfile() {
    if (!editName) return;
    setSaving(true);
    await supabase.from('user_profiles').update({ full_name: editName, updated_at: new Date().toISOString() }).eq('id', user!.id);
    setSaving(false);
    setShowEditModal(false);
    refreshProfile();
  }

  async function saveGoal() {
    const hours = parseInt(goalHours) || 2;
    setSaving(true);
    await supabase.from('user_profiles').update({ phone_usage_goal_hours: hours, updated_at: new Date().toISOString() }).eq('id', user!.id);
    setSaving(false);
    setShowGoalModal(false);
    refreshProfile();
  }

  async function handleSignOut() {
    await signOut();
  }

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setUploadingAvatar(true);
      await supabase.from('user_profiles').update({
        avatar_url: result.assets[0].uri,
        updated_at: new Date().toISOString(),
      }).eq('id', user!.id);
      setUploadingAvatar(false);
      refreshProfile();
    }
  }

  async function changePassword() {
    setPasswordError('');
    setPasswordSuccess(false);
    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordError('Không thể đổi mật khẩu. Vui lòng thử lại.');
    } else {
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setShowPasswordModal(false), 1500);
    }
  }

  const menuItems = [
    { icon: <Bell size={20} color={Colors.primary} />, label: 'Thông báo', sub: 'Quản lý thông báo', action: () => {} },
    { icon: <Target size={20} color={Colors.primary} />, label: 'Mục tiêu sử dụng', sub: `${profile?.phone_usage_goal_hours ?? 2} giờ/ngày`, action: () => setShowGoalModal(true) },
    { icon: <Images size={20} color={Colors.primary} />, label: 'Slideshow tuần này', sub: weekPhotos.length > 0 ? `${weekPhotos.length} ảnh` : 'Chưa có ảnh nào', action: () => { loadWeekPhotos(); setSlideIndex(0); setShowSlideshow(true); } },
    { icon: <KeyRound size={20} color={Colors.primary} />, label: 'Đổi mật khẩu', sub: 'Cập nhật mật khẩu tài khoản', action: () => { setNewPassword(''); setConfirmPassword(''); setPasswordError(''); setPasswordSuccess(false); setShowPasswordModal(true); } },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F3CEF2', '#EDD5F5']} style={styles.header}>
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.8}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditOverlay}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Camera size={14} color={Colors.white} />
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile?.full_name || 'Người dùng'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => { setEditName(profile?.full_name || ''); setShowEditModal(true); }}>
            <Edit3 size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Zap size={18} color={Colors.warning} fill={Colors.warning} />
            <Text style={styles.statValue}>{profile?.tokens ?? 0}</Text>
            <Text style={styles.statLabel}>Token</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Award size={18} color={Colors.primary} />
            <Text style={styles.statValue}>{profile?.total_tokens_earned ?? 0}</Text>
            <Text style={styles.statLabel}>Tổng kiếm</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Clock size={18} color={Colors.info} />
            <Text style={styles.statValue}>{profile?.phone_usage_goal_hours ?? 2}h</Text>
            <Text style={styles.statLabel}>Mục tiêu</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPad}>
        <Text style={styles.sectionTitle}>Tài khoản</Text>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={item.action} activeOpacity={0.7}>
            <View style={styles.menuIcon}>{item.icon}</View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSub}>{item.sub}</Text>
            </View>
            <ChevronRight size={18} color={Colors.textLight} />
          </TouchableOpacity>
        ))}

        <View style={styles.achievementSection}>
          <Text style={styles.sectionTitle}>Thành tích</Text>
          <View style={styles.achievementGrid}>
            <View style={[styles.achievementCard, (profile?.total_tokens_earned ?? 0) >= 10 && styles.achievementUnlocked]}>
              <Text style={styles.achievementEmoji}>🌱</Text>
              <Text style={styles.achievementName}>Khởi đầu</Text>
              <Text style={styles.achievementDesc}>10 token</Text>
            </View>
            <View style={[styles.achievementCard, (profile?.total_tokens_earned ?? 0) >= 50 && styles.achievementUnlocked]}>
              <Text style={styles.achievementEmoji}>⚡</Text>
              <Text style={styles.achievementName}>Tích cực</Text>
              <Text style={styles.achievementDesc}>50 token</Text>
            </View>
            <View style={[styles.achievementCard, (profile?.total_tokens_earned ?? 0) >= 100 && styles.achievementUnlocked]}>
              <Text style={styles.achievementEmoji}>🏆</Text>
              <Text style={styles.achievementName}>Xuất sắc</Text>
              <Text style={styles.achievementDesc}>100 token</Text>
            </View>
            <View style={[styles.achievementCard, (profile?.total_tokens_earned ?? 0) >= 500 && styles.achievementUnlocked]}>
              <Text style={styles.achievementEmoji}>💎</Text>
              <Text style={styles.achievementName}>Huyền thoại</Text>
              <Text style={styles.achievementDesc}>500 token</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <LogOut size={20} color={Colors.error} />
          <Text style={styles.signOutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Focable v1.0.0</Text>
      </ScrollView>

      <Modal visible={showSlideshow} animationType="fade">
        <View style={styles.slideshowContainer}>
          <TouchableOpacity style={styles.slideshowClose} onPress={() => setShowSlideshow(false)}>
            <X size={24} color={Colors.white} />
          </TouchableOpacity>

          {weekPhotos.length === 0 ? (
            <View style={styles.slideshowEmpty}>
              <Images size={64} color="rgba(255,255,255,0.4)" />
              <Text style={styles.slideshowEmptyTitle}>Chưa có ảnh nào tuần này</Text>
              <Text style={styles.slideshowEmptyDesc}>Hoàn thành nhiệm vụ và chụp ảnh để tạo slideshow kỷ niệm cuối tuần!</Text>
            </View>
          ) : (
            <>
              <Animated.View style={[styles.slideWrapper, { opacity: slideAnim }]}>
                <Image
                  source={{ uri: weekPhotos[slideIndex]?.image_url }}
                  style={styles.slideImage}
                  resizeMode="cover"
                />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.slideOverlay}>
                  <Text style={styles.slideTaskName}>{weekPhotos[slideIndex]?.task_name}</Text>
                  <Text style={styles.slideDate}>{weekPhotos[slideIndex]?.photo_date}</Text>
                </LinearGradient>
              </Animated.View>

              <View style={styles.slideControls}>
                <TouchableOpacity style={styles.slideNavBtn} onPress={prevSlide} disabled={weekPhotos.length <= 1}>
                  <ChevronLeft size={28} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.slideCounter}>{slideIndex + 1} / {weekPhotos.length}</Text>
                <TouchableOpacity style={styles.slideNavBtn} onPress={nextSlide} disabled={weekPhotos.length <= 1}>
                  <NextIcon size={28} color={Colors.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.slideDots}>
                {weekPhotos.map((_, i) => (
                  <View key={i} style={[styles.slideDot, i === slideIndex && styles.slideDotActive]} />
                ))}
              </View>
            </>
          )}
        </View>
      </Modal>

      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <Input label="Họ và tên" placeholder="Nhập tên của bạn" value={editName} onChangeText={setEditName} autoCapitalize="words" />
            <Button title={saving ? 'Đang lưu...' : 'Lưu thay đổi'} onPress={saveProfile} loading={saving} style={styles.saveBtn} />
          </View>
        </View>
      </Modal>

      <Modal visible={showGoalModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mục tiêu sử dụng</Text>
              <TouchableOpacity onPress={() => setShowGoalModal(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.goalDesc}>Đặt mục tiêu số giờ tối đa dùng điện thoại mỗi ngày</Text>
            <View style={styles.goalOptions}>
              {[1, 2, 3, 4, 5].map(h => (
                <TouchableOpacity key={h} style={[styles.goalOption, goalHours === String(h) && styles.goalOptionActive]} onPress={() => setGoalHours(String(h))}>
                  <Text style={[styles.goalOptionText, goalHours === String(h) && styles.goalOptionTextActive]}>{h}h</Text>
                  {goalHours === String(h) && <Check size={14} color={Colors.white} />}
                </TouchableOpacity>
              ))}
            </View>
            <Button title={saving ? 'Đang lưu...' : 'Lưu mục tiêu'} onPress={saveGoal} loading={saving} style={styles.saveBtn} />
          </View>
        </View>
      </Modal>

      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            {passwordSuccess ? (
              <View style={styles.passwordSuccessBox}>
                <Check size={32} color={Colors.success} />
                <Text style={styles.passwordSuccessText}>Đổi mật khẩu thành công!</Text>
              </View>
            ) : (
              <>
                {passwordError ? (
                  <View style={styles.passwordErrorBox}>
                    <Text style={styles.passwordErrorText}>{passwordError}</Text>
                  </View>
                ) : null}
                <Input label="Mật khẩu mới" placeholder="Ít nhất 6 ký tự" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
                <Input label="Xác nhận mật khẩu" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
                <Button title={savingPassword ? 'Đang lưu...' : 'Cập nhật mật khẩu'} onPress={changePassword} loading={savingPassword} style={styles.saveBtn} />
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
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  avatarWrap: { position: 'relative' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarEditOverlay: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.white },
  avatarText: { fontSize: 28, fontFamily: 'Quicksand-Bold', color: Colors.white },
  userInfo: { flex: 1 },
  userName: { ...Typography.h3, color: Colors.text },
  userEmail: { ...Typography.small, color: Colors.textSecondary },
  editBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: BorderRadius.xl, padding: Spacing.md },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { ...Typography.h3, color: Colors.text },
  statLabel: { ...Typography.caption, color: Colors.textSecondary },
  statDivider: { width: 1, backgroundColor: Colors.border },
  content: { flex: 1 },
  contentPad: { padding: Spacing.lg, paddingBottom: 100 },
  sectionTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.md },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.backgroundLight, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  menuIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center' },
  menuContent: { flex: 1 },
  menuLabel: { ...Typography.bodyMedium, color: Colors.text },
  menuSub: { ...Typography.small, color: Colors.textSecondary },
  achievementSection: { marginTop: Spacing.md },
  achievementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achievementCard: { width: '47%', backgroundColor: Colors.backgroundLight, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.border, opacity: 0.5 },
  achievementUnlocked: { opacity: 1, borderColor: Colors.primary, backgroundColor: '#EDE9FE' },
  achievementEmoji: { fontSize: 32 },
  achievementName: { ...Typography.smallMedium, color: Colors.text },
  achievementDesc: { ...Typography.caption, color: Colors.textSecondary },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  signOutText: { ...Typography.bodyMedium, color: Colors.error },
  versionText: { ...Typography.caption, color: Colors.textLight, textAlign: 'center', marginTop: Spacing.lg },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { ...Typography.h3, color: Colors.text },
  goalDesc: { ...Typography.small, color: Colors.textSecondary, marginBottom: Spacing.lg },
  goalOptions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  goalOption: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border, gap: 4 },
  goalOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  goalOptionText: { ...Typography.bodyMedium, color: Colors.text },
  goalOptionTextActive: { color: Colors.white },
  saveBtn: { backgroundColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  slideshowContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  slideshowClose: { position: 'absolute', top: 56, right: Spacing.lg, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.2)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  slideshowEmpty: { alignItems: 'center', gap: Spacing.lg, paddingHorizontal: Spacing.xl },
  slideshowEmptyTitle: { ...Typography.h3, color: Colors.white, textAlign: 'center' },
  slideshowEmptyDesc: { ...Typography.small, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22 },
  slideWrapper: { width: '90%', height: '60%', borderRadius: BorderRadius.xl, overflow: 'hidden', position: 'relative' },
  slideImage: { width: '100%', height: '100%' },
  slideOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg },
  slideTaskName: { ...Typography.h4, color: Colors.white, marginBottom: 4 },
  slideDate: { ...Typography.small, color: 'rgba(255,255,255,0.7)' },
  slideControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl, marginTop: Spacing.xl },
  slideNavBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  slideCounter: { ...Typography.bodyMedium, color: Colors.white },
  slideDots: { flexDirection: 'row', gap: 6, marginTop: Spacing.md },
  slideDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  slideDotActive: { backgroundColor: Colors.white, width: 20 },
  passwordSuccessBox: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  passwordSuccessText: { ...Typography.h4, color: Colors.success },
  passwordErrorBox: { backgroundColor: '#FEE2E2', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  passwordErrorText: { ...Typography.small, color: Colors.error },
});
