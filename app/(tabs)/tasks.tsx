import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { CircleCheck as CheckCircle2, Circle, Clock, CircleAlert as AlertCircle, Plus, X, Trophy, ListTodo } from 'lucide-react-native';
import { useToast } from '@/context/ToastContext';

type TaskStatus = 'pending' | 'completed' | 'overdue';

type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  reading: '#3B82F6',
  mindfulness: '#06B6D4',
  exercise: '#22C55E',
  health: '#10B981',
  lifestyle: '#F59E0B',
  social: '#EC4899',
  learning: '#6366F1',
  digital_detox: '#EF4444',
  creative: '#F97316',
  productivity: '#14B8A6',
  custom: '#6B7280',
};

const CATEGORY_LABELS: Record<string, string> = {
  reading: 'Đọc sách',
  mindfulness: 'Tâm trí',
  exercise: 'Vận động',
  health: 'Sức khỏe',
  lifestyle: 'Lối sống',
  social: 'Kết nối',
  learning: 'Học tập',
  digital_detox: 'Detox số',
  creative: 'Sáng tạo',
  productivity: 'Năng suất',
  custom: 'Tùy chỉnh',
};

type FilterType = 'all' | 'pending' | 'completed' | 'overdue';

function getEffectiveStatus(task: Task): TaskStatus {
  if (task.status === 'completed') return 'completed';
  if (task.due_date && new Date(task.due_date) < new Date() && task.status === 'pending') return 'overdue';
  return 'pending';
}

function StatusIcon({ status, size = 26 }: { status: TaskStatus; size?: number }) {
  if (status === 'completed') return <CheckCircle2 size={size} color={Colors.success} fill={Colors.success} />;
  if (status === 'overdue') return <AlertCircle size={size} color={Colors.error} />;
  return <Circle size={size} color={Colors.border} />;
}

export default function TasksScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('custom');
  const [newDueDate, setNewDueDate] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  useFocusEffect(useCallback(() => {
    if (user) loadTasks();
  }, [user]));

  async function loadTasks() {
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (data) setTasks(data);
    setLoading(false);
  }

  async function completeTask(taskId: string) {
    if (completing) return;
    setCompleting(taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', completed_at: new Date().toISOString() } : t));
    await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId);
    setCompleting(null);
    showToast('Nhiệm vụ hoàn thành!', 'success');
  }

  async function deleteTask(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await supabase.from('tasks').delete().eq('id', taskId);
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    setAddingTask(true);
    const { data } = await supabase.from('tasks').insert({
      user_id: user!.id,
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      category: newCategory,
      status: 'pending',
      due_date: newDueDate.trim() || null,
    }).select().maybeSingle();
    if (data) setTasks(prev => [data, ...prev]);
    setNewTitle('');
    setNewDesc('');
    setNewDueDate('');
    setNewCategory('custom');
    setShowAddModal(false);
    setAddingTask(false);
    showToast('Đã thêm nhiệm vụ!', 'success');
  }

  const displayedTasks = tasks.filter(t => {
    const status = getEffectiveStatus(t);
    if (filter === 'all') return true;
    return status === filter;
  });

  const completedCount = tasks.filter(t => getEffectiveStatus(t) === 'completed').length;
  const pendingCount = tasks.filter(t => getEffectiveStatus(t) === 'pending').length;
  const overdueCount = tasks.filter(t => getEffectiveStatus(t) === 'overdue').length;

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Đang chờ' },
    { key: 'completed', label: 'Hoàn thành' },
    { key: 'overdue', label: 'Quá hạn' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E8F4FD', '#D1E9FF']} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Nhiệm vụ</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <Plus size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Đang chờ</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: Colors.success }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Hoàn thành</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: overdueCount > 0 ? Colors.error : Colors.textSecondary }]}>{overdueCount}</Text>
            <Text style={styles.statLabel}>Quá hạn</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {filters.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentPad} showsVerticalScrollIndicator={false}>
          {displayedTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <ListTodo size={48} color={Colors.border} />
              <Text style={styles.emptyTitle}>
                {filter === 'all' ? 'Chưa có nhiệm vụ nào' : `Không có nhiệm vụ ${filter === 'completed' ? 'hoàn thành' : filter === 'overdue' ? 'quá hạn' : 'đang chờ'}`}
              </Text>
              {filter === 'all' && (
                <Text style={styles.emptySubtitle}>Nhấn + để thêm nhiệm vụ đầu tiên</Text>
              )}
            </View>
          ) : (
            displayedTasks.map(task => {
              const status = getEffectiveStatus(task);
              return (
                <View key={task.id} style={[styles.taskCard, status === 'completed' && styles.taskCardDone, status === 'overdue' && styles.taskCardOverdue]}>
                  <TouchableOpacity
                    style={styles.taskCheckArea}
                    onPress={() => status === 'pending' && completeTask(task.id)}
                    disabled={status !== 'pending' || completing === task.id}
                  >
                    {completing === task.id ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <StatusIcon status={status} />
                    )}
                  </TouchableOpacity>

                  <View style={styles.taskContent}>
                    <Text style={[styles.taskTitle, status === 'completed' && styles.taskTitleDone]}>{task.title}</Text>
                    {task.description ? (
                      <Text style={styles.taskDesc}>{task.description}</Text>
                    ) : null}
                    <View style={styles.taskMeta}>
                      <View style={[styles.categoryBadge, { backgroundColor: (CATEGORY_COLORS[task.category] || Colors.primary) + '18' }]}>
                        <Text style={[styles.categoryText, { color: CATEGORY_COLORS[task.category] || Colors.primary }]}>
                          {CATEGORY_LABELS[task.category] || task.category}
                        </Text>
                      </View>
                      {task.due_date && (
                        <View style={[styles.dueBadge, status === 'overdue' && styles.dueBadgeOverdue]}>
                          <Clock size={10} color={status === 'overdue' ? Colors.error : Colors.textSecondary} />
                          <Text style={[styles.dueText, status === 'overdue' && styles.dueTextOverdue]}>
                            {new Date(task.due_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </Text>
                        </View>
                      )}
                      {status === 'completed' && task.completed_at && (
                        <View style={styles.completedBadge}>
                          <Trophy size={10} color={Colors.success} />
                          <Text style={styles.completedBadgeText}>
                            {new Date(task.completed_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteTask(task.id)}>
                    <X size={16} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm nhiệm vụ</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setNewTitle(''); setNewDesc(''); setNewDueDate(''); }}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Tên nhiệm vụ *</Text>
            <TextInput
              style={styles.textInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Ví dụ: Đọc sách 20 phút"
              placeholderTextColor={Colors.textLight}
              maxLength={100}
            />

            <Text style={styles.inputLabel}>Mô tả (tùy chọn)</Text>
            <TextInput
              style={[styles.textInput, styles.textInputMulti]}
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Chi tiết nhiệm vụ..."
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={3}
              maxLength={300}
            />

            <Text style={styles.inputLabel}>Hạn chót (YYYY-MM-DD, tùy chọn)</Text>
            <TextInput
              style={styles.textInput}
              value={newDueDate}
              onChangeText={setNewDueDate}
              placeholder="2026-03-10"
              placeholderTextColor={Colors.textLight}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />

            <Text style={styles.inputLabel}>Danh mục</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.categoryChip, newCategory === key && { backgroundColor: (CATEGORY_COLORS[key] || Colors.primary) + '20', borderColor: CATEGORY_COLORS[key] || Colors.primary }]}
                  onPress={() => setNewCategory(key)}
                >
                  <Text style={[styles.categoryChipText, newCategory === key && { color: CATEGORY_COLORS[key] || Colors.primary }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.addTaskBtn, (!newTitle.trim() || addingTask) && styles.addTaskBtnDisabled]}
              onPress={addTask}
              disabled={!newTitle.trim() || addingTask}
            >
              {addingTask ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.addTaskBtnText}>Thêm nhiệm vụ</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  headerTitle: { ...Typography.h2, color: Colors.text },
  addBtn: { backgroundColor: Colors.primary, width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { ...Typography.h3, color: Colors.primary },
  statLabel: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border },
  filterRow: { marginBottom: 4 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.6)' },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { ...Typography.caption, color: Colors.textSecondary, fontFamily: 'Quicksand-SemiBold' },
  filterChipTextActive: { color: Colors.white },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  contentPad: { padding: Spacing.lg, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyTitle: { ...Typography.bodyMedium, color: Colors.textSecondary },
  emptySubtitle: { ...Typography.small, color: Colors.textLight },
  taskCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: Spacing.sm,
  },
  taskCardDone: { borderColor: Colors.success + '50', backgroundColor: '#F0FDF4' },
  taskCardOverdue: { borderColor: Colors.error + '50', backgroundColor: '#FFF5F5' },
  taskCheckArea: { paddingTop: 2, width: 30, alignItems: 'center' },
  taskContent: { flex: 1 },
  taskTitle: { ...Typography.bodyMedium, color: Colors.text, marginBottom: 4 },
  taskTitleDone: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  taskDesc: { ...Typography.small, color: Colors.textSecondary, marginBottom: 8, lineHeight: 20 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  categoryText: { ...Typography.caption, fontFamily: 'Quicksand-SemiBold' },
  dueBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.border + '40', paddingHorizontal: 7, paddingVertical: 3, borderRadius: BorderRadius.full },
  dueBadgeOverdue: { backgroundColor: Colors.error + '15' },
  dueText: { fontSize: 10, fontFamily: 'Quicksand-SemiBold', color: Colors.textSecondary },
  dueTextOverdue: { color: Colors.error },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.success + '15', paddingHorizontal: 7, paddingVertical: 3, borderRadius: BorderRadius.full },
  completedBadgeText: { fontSize: 10, fontFamily: 'Quicksand-SemiBold', color: Colors.success },
  deleteBtn: { padding: 4, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { ...Typography.h3, color: Colors.text },
  inputLabel: { ...Typography.smallMedium, color: Colors.text, marginBottom: 8 },
  textInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Typography.body, color: Colors.text, marginBottom: Spacing.md, backgroundColor: Colors.backgroundLight },
  textInputMulti: { height: 80, textAlignVertical: 'top' },
  categoryPicker: { marginBottom: Spacing.lg },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, marginRight: 8, backgroundColor: Colors.backgroundLight },
  categoryChipText: { ...Typography.caption, color: Colors.textSecondary, fontFamily: 'Quicksand-SemiBold' },
  addTaskBtn: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: BorderRadius.lg, alignItems: 'center' },
  addTaskBtnDisabled: { opacity: 0.5 },
  addTaskBtnText: { ...Typography.bodyMedium, color: Colors.white, fontFamily: 'Quicksand-Bold' },
});
