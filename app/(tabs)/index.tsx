import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { getCurrentTimeBlock, getVietnameseDate, formatDate, getWeekStart } from '@/lib/dateUtils';
import { CalendarDays, ShieldCheck, Zap, TrendingUp, ChevronRight, Award, Plus, Pencil } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const BAR_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function getPast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(formatDate(d));
  }
  return days;
}

export default function HomeScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [scheduleBlocks, setScheduleBlocks] = useState<any[]>([]);
  const [currentBlock, setCurrentBlock] = useState<any>(null);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [usageData, setUsageData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [usageLogs, setUsageLogs] = useState<Record<string, number>>({});
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [editingHours, setEditingHours] = useState('');
  const [savingUsage, setSavingUsage] = useState(false);
  const today = new Date();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadData();
      }
    }, [user])
  );

  async function loadData() {
    await Promise.all([loadSchedule(), loadDailyTasks(), loadUsageLogs()]);
    refreshProfile();
  }

  async function loadSchedule() {
    const { data } = await supabase
      .from('schedule_blocks')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .order('start_time');
    if (data) {
      setScheduleBlocks(data);
      setCurrentBlock(getCurrentTimeBlock(data));
    }
  }

  async function loadDailyTasks() {
    const today = formatDate(new Date());
    const { data } = await supabase
      .from('user_daily_tasks')
      .select('*, daily_task_pool(*)')
      .eq('user_id', user!.id)
      .eq('assigned_date', today);
    if (data) setDailyTasks(data);
  }

  async function loadUsageLogs() {
    const days = getPast7Days();
    const { data } = await supabase
      .from('phone_usage_logs')
      .select('log_date, hours_used')
      .eq('user_id', user!.id)
      .in('log_date', days);

    const logMap: Record<string, number> = {};
    if (data) {
      for (const row of data) {
        logMap[row.log_date] = Number(row.hours_used);
      }
    }
    setUsageLogs(logMap);
    setUsageData(days.map(d => logMap[d] ?? 0));
  }

  async function saveTodayUsage() {
    const hours = parseFloat(editingHours);
    if (isNaN(hours) || hours < 0 || hours > 24) return;
    setSavingUsage(true);
    const today = formatDate(new Date());
    await supabase
      .from('phone_usage_logs')
      .upsert({
        user_id: user!.id,
        log_date: today,
        hours_used: hours,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,log_date' });
    setSavingUsage(false);
    setShowUsageModal(false);
    setEditingHours('');
    await loadUsageLogs();
  }

  const completedCount = dailyTasks.filter(t => t.is_completed).length;
  const maxUsage = Math.max(...usageData, 1);
  const todayUsage = usageData[6];
  const avgUsage = usageData.filter(v => v > 0).length > 0
    ? (usageData.reduce((a, b) => a + b, 0) / usageData.filter(v => v > 0).length).toFixed(1)
    : '0.0';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  function openUsageModal() {
    const today = formatDate(new Date());
    const existing = usageLogs[today];
    setEditingHours(existing !== undefined ? String(existing) : '');
    setShowUsageModal(true);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#F3CEF2', '#EDD5F5', Colors.white]} style={styles.headerGradient}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName}>{profile?.full_name || 'Người dùng'} </Text>
          </View>
          <TouchableOpacity style={styles.tokenBadge}>
            <Zap size={16} color={Colors.warning} fill={Colors.warning} />
            <Text style={styles.tokenText}>{profile?.tokens ?? 0}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.dateText}>{getVietnameseDate(today)}</Text>
      </LinearGradient>

      <View style={styles.body}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/schedule')} activeOpacity={0.9}>
          <LinearGradient colors={['#1D4ED8', '#2563EB']} style={styles.scheduleCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.scheduleCardContent}>
              <View style={styles.scheduleCardLeft}>
                <Text style={styles.scheduleCardLabel}>Lịch trình hôm nay</Text>
                {currentBlock ? (
                  <Text style={styles.scheduleCardTitle}>{currentBlock.title}</Text>
                ) : (
                  <Text style={styles.scheduleCardTitle}>
                    {scheduleBlocks.length === 0 ? 'Chưa có lịch trình' : 'Không có lịch trình'}
                  </Text>
                )}
                <Text style={styles.scheduleCardSub}>Nhấn để xem & chỉnh sửa</Text>
              </View>
              <View style={styles.scheduleCardRight}>
                <CalendarDays size={48} color="rgba(255,255,255,0.25)" />
                <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(tabs)/block')} activeOpacity={0.9}>
          <LinearGradient colors={['#0F766E', '#0D9488']} style={styles.blockCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.scheduleCardContent}>
              <View style={styles.scheduleCardLeft}>
                <Text style={styles.scheduleCardLabel}>Bảo vệ tập trung</Text>
                <Text style={styles.scheduleCardTitle}>Block App</Text>
                <Text style={styles.scheduleCardSub}>Kiểm soát thời gian dùng điện thoại</Text>
              </View>
              <View style={styles.scheduleCardRight}>
                <ShieldCheck size={48} color="rgba(255,255,255,0.25)" />
                <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')} activeOpacity={0.9}>
          <View style={styles.tasksCard}>
            <View style={styles.tasksCardHeader}>
              <View style={styles.tasksCardTitleRow}>
                <Award size={20} color={Colors.primary} />
                <Text style={styles.tasksCardTitle}>Nhiệm vụ hôm nay</Text>
              </View>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${dailyTasks.length > 0 ? (completedCount / dailyTasks.length) * 100 : 0}%` }]} />
              </View>
              <Text style={styles.progressText}>{completedCount}/{dailyTasks.length || 3} hoàn thành</Text>
            </View>
            {dailyTasks.slice(0, 2).map(task => (
              <View key={task.id} style={styles.taskPreviewItem}>
                <View style={[styles.taskDot, task.is_completed && styles.taskDotDone]} />
                <Text style={[styles.taskPreviewText, task.is_completed && styles.taskPreviewDone]}>
                  {task.daily_task_pool?.title}
                </Text>
                {task.is_completed && <Text style={styles.taskTokenBadge}>+{task.daily_task_pool?.token_reward}</Text>}
              </View>
            ))}
          </View>
        </TouchableOpacity>

        <View style={styles.usageCard}>
          <View style={styles.usageCardHeader}>
            <TrendingUp size={20} color={Colors.info} />
            <Text style={styles.usageCardTitle}>Thời gian dùng điện thoại</Text>
            <TouchableOpacity style={styles.editUsageBtn} onPress={openUsageModal}>
              <Pencil size={14} color={Colors.info} />
              <Text style={styles.editUsageText}>{todayUsage > 0 ? 'Cập nhật' : 'Nhập hôm nay'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.usageAvg}>
            Hôm nay: <Text style={[styles.usageAvgBold, todayUsage > (profile?.phone_usage_goal_hours ?? 2) && { color: Colors.error }]}>
              {todayUsage > 0 ? `${todayUsage}h` : 'Chưa nhập'}
            </Text>
            {'  '}Trung bình: <Text style={styles.usageAvgBold}>{avgUsage}h/ngày</Text>
          </Text>
          <View style={styles.barChart}>
            {usageData.map((val, i) => (
              <View key={i} style={styles.barItem}>
                <View style={styles.barWrapper}>
                  {val > 0 ? (
                    <LinearGradient
                      colors={val > (profile?.phone_usage_goal_hours ?? 2) ? ['#EF4444', '#F87171'] : ['#3B82F6', '#60A5FA']}
                      style={[styles.bar, { height: (val / maxUsage) * 100 }]}
                    />
                  ) : (
                    <View style={[styles.barEmpty, { height: 6 }]} />
                  )}
                </View>
                <Text style={styles.barLabel}>{BAR_DAYS[i]}</Text>
                <Text style={styles.barVal}>{val > 0 ? `${val}h` : '-'}</Text>
              </View>
            ))}
          </View>
          <View style={styles.usageLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>Dưới mục tiêu</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
              <Text style={styles.legendText}>Vượt mục tiêu ({profile?.phone_usage_goal_hours ?? 2}h)</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.total_tokens_earned ?? 0}</Text>
            <Text style={styles.statLabel}>Token kiếm được</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{scheduleBlocks.length}</Text>
            <Text style={styles.statLabel}>Khung giờ</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.phone_usage_goal_hours ?? 2}h</Text>
            <Text style={styles.statLabel}>Mục tiêu</Text>
          </View>
        </View>
      </View>

      <Modal visible={showUsageModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nhập thời gian dùng điện thoại hôm nay</Text>
            <Text style={styles.modalSub}>
              Vào Settings &gt; Screen Time (iOS) hoặc Digital Wellbeing (Android) để xem thời gian thực tế của bạn.
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.hoursInput}
                value={editingHours}
                onChangeText={setEditingHours}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor={Colors.textLight}
                maxLength={4}
              />
              <Text style={styles.hoursUnit}>giờ</Text>
            </View>
            <Text style={styles.inputHint}>Ví dụ: 2.5 = 2 giờ 30 phút</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowUsageModal(false)}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (savingUsage || !editingHours) && styles.saveBtnDisabled]}
                onPress={saveTodayUsage}
                disabled={savingUsage || !editingHours}
              >
                <Text style={styles.saveBtnText}>{savingUsage ? 'Đang lưu...' : 'Lưu'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { paddingBottom: 100 },
  headerGradient: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  greeting: { ...Typography.small, color: Colors.textSecondary },
  userName: { ...Typography.h2, color: Colors.text },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 4,
    borderWidth: 1.5,
    borderColor: Colors.warning,
  },
  tokenText: { ...Typography.smallMedium, color: '#B45309', fontFamily: 'Quicksand-Bold' },
  dateText: { ...Typography.caption, color: Colors.textSecondary },
  body: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  scheduleCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  blockCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  scheduleCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scheduleCardLeft: { flex: 1 },
  scheduleCardLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  scheduleCardTitle: { ...Typography.h3, color: Colors.white, marginBottom: 4 },
  scheduleCardSub: { ...Typography.caption, color: 'rgba(255,255,255,0.6)' },
  scheduleCardRight: { alignItems: 'center', gap: 4 },
  tasksCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: Colors.primaryLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  tasksCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  tasksCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tasksCardTitle: { ...Typography.h4, color: Colors.text },
  progressContainer: { marginBottom: Spacing.md },
  progressTrack: { height: 8, backgroundColor: Colors.border, borderRadius: BorderRadius.full, marginBottom: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: BorderRadius.full },
  progressText: { ...Typography.caption, color: Colors.textSecondary },
  taskPreviewItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  taskDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border },
  taskDotDone: { backgroundColor: Colors.success },
  taskPreviewText: { ...Typography.small, color: Colors.text, flex: 1 },
  taskPreviewDone: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  taskTokenBadge: { ...Typography.caption, color: Colors.warning, fontFamily: 'Quicksand-Bold', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  usageCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  usageCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  usageCardTitle: { ...Typography.bodyMedium, color: Colors.text, flex: 1 },
  editUsageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  editUsageText: { ...Typography.caption, color: Colors.info, fontFamily: 'Quicksand-SemiBold' },
  usageAvg: { ...Typography.small, color: Colors.textSecondary, marginBottom: Spacing.md },
  usageAvgBold: { color: Colors.text, fontFamily: 'Quicksand-Bold' },
  barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 130 },
  barItem: { alignItems: 'center', flex: 1, gap: 2 },
  barWrapper: { flex: 1, justifyContent: 'flex-end', width: '100%', paddingHorizontal: 2 },
  bar: { borderRadius: 4, minHeight: 4 },
  barEmpty: { borderRadius: 4, backgroundColor: Colors.border },
  barLabel: { ...Typography.caption, color: Colors.textSecondary, fontSize: 10 },
  barVal: { fontSize: 9, fontFamily: 'Quicksand-Medium', color: Colors.textLight },
  usageLegend: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...Typography.caption, color: Colors.textSecondary, fontSize: 10 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { ...Typography.h3, color: Colors.primary, marginBottom: 4 },
  statLabel: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl },
  modalTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.sm },
  modalSub: { ...Typography.small, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.lg },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: 6 },
  hoursInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.info,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    fontSize: 28,
    fontFamily: 'Quicksand-Bold',
    color: Colors.text,
    textAlign: 'center',
  },
  hoursUnit: { ...Typography.h3, color: Colors.textSecondary },
  inputHint: { ...Typography.caption, color: Colors.textLight, marginBottom: Spacing.lg },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { ...Typography.bodyMedium, color: Colors.textSecondary },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.info, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { ...Typography.bodyMedium, color: Colors.white, fontFamily: 'Quicksand-Bold' },
});
