import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { encrypt, decrypt } from '@/lib/crypto';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { Plus, X, Clock, Trash2, CreditCard as Edit3, Target } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TimePicker, DateTimePicker, type TimeValue, type DateTimeValue } from '@/components/ui/TimeScrollPicker';

const QUADRANTS = [
  { id: 1, label: 'Quan trọng & Khẩn cấp', sub: 'Làm ngay', color: Colors.eisenhower.q1, icon: '🔴' },
  { id: 2, label: 'Quan trọng & Không khẩn', sub: 'Lên kế hoạch', color: Colors.eisenhower.q2, icon: '🔵' },
  { id: 3, label: 'Không quan trọng & Khẩn', sub: 'Ủy thác', color: Colors.eisenhower.q3, icon: '🟡' },
  { id: 4, label: 'Không quan trọng & Không khẩn', sub: 'Loại bỏ', color: Colors.eisenhower.q4, icon: '⚫' },
];

const BLOCK_COLORS = ['#794DDA', '#5500FF', '#EF4444', '#3B82F6', '#22C55E', '#F59E0B'];

type ScheduleBlock = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  activities_encrypted: string;
  color: string;
  block_type: string;
};

type EisenhowerTask = {
  id: string;
  title_encrypted: string;
  description_encrypted: string;
  quadrant: number;
  is_completed: boolean;
  due_date?: string;
};

function timeToValue(t: string): TimeValue {
  const [h, m] = (t || '08:00').split(':');
  return { hour: parseInt(h) || 0, minute: parseInt(m) || 0 };
}

function valueToTime(v: TimeValue): string {
  return `${String(v.hour).padStart(2, '0')}:${String(v.minute).padStart(2, '0')}`;
}

const today = new Date();
function defaultDateTimeValue(): DateTimeValue {
  return { day: today.getDate(), month: today.getMonth() + 1, year: today.getFullYear(), hour: 8, minute: 0 };
}

function dateTimeToString(v: DateTimeValue): string {
  return `${v.year}-${String(v.month).padStart(2,'0')}-${String(v.day).padStart(2,'0')}`;
}

function dateTimeDisplay(v: DateTimeValue): string {
  return `${String(v.day).padStart(2,'0')}/${String(v.month).padStart(2,'0')}/${v.year}`;
}

export default function ScheduleScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'schedule' | 'eisenhower'>('schedule');
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [eisenhowerTasks, setEisenhowerTasks] = useState<EisenhowerTask[]>([]);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editBlock, setEditBlock] = useState<ScheduleBlock | null>(null);
  const [editTask, setEditTask] = useState<EisenhowerTask | null>(null);

  const [blockForm, setBlockForm] = useState({
    title: '',
    startTime: timeToValue('08:00'),
    endTime: timeToValue('10:00'),
    activities: '',
    color: BLOCK_COLORS[0],
    block_type: 'standard',
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    quadrant: 1,
    hasDueDate: false,
    dueDateTime: defaultDateTimeValue(),
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user) { loadBlocks(); loadEisenhower(); } }, [user]);

  async function loadBlocks() {
    const { data } = await supabase.from('schedule_blocks').select('*').eq('user_id', user!.id).order('start_time');
    if (data) setBlocks(data);
  }

  async function loadEisenhower() {
    const { data } = await supabase.from('eisenhower_tasks').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    if (data) setEisenhowerTasks(data);
  }

  function openAddBlock() {
    setEditBlock(null);
    setBlockForm({ title: '', startTime: timeToValue('08:00'), endTime: timeToValue('10:00'), activities: '', color: BLOCK_COLORS[0], block_type: 'standard' });
    setShowBlockModal(true);
  }

  function openEditBlock(block: ScheduleBlock) {
    setEditBlock(block);
    setBlockForm({
      title: block.title,
      startTime: timeToValue(block.start_time),
      endTime: timeToValue(block.end_time),
      activities: decrypt(block.activities_encrypted),
      color: block.color,
      block_type: block.block_type,
    });
    setShowBlockModal(true);
  }

  function openAddTask() {
    setEditTask(null);
    setTaskForm({ title: '', description: '', quadrant: 1, hasDueDate: false, dueDateTime: defaultDateTimeValue() });
    setShowTaskModal(true);
  }

  function openEditTask(task: EisenhowerTask) {
    setEditTask(task);
    let dueDateTime = defaultDateTimeValue();
    if (task.due_date) {
      const [y, m, d] = task.due_date.split('-');
      dueDateTime = { day: parseInt(d), month: parseInt(m), year: parseInt(y), hour: 8, minute: 0 };
    }
    setTaskForm({
      title: decrypt(task.title_encrypted),
      description: decrypt(task.description_encrypted),
      quadrant: task.quadrant,
      hasDueDate: !!task.due_date,
      dueDateTime,
    });
    setShowTaskModal(true);
  }

  async function saveBlock() {
    if (!blockForm.title.trim()) return;
    setSaving(true);
    const payload = {
      user_id: user!.id,
      title: blockForm.title,
      start_time: valueToTime(blockForm.startTime),
      end_time: valueToTime(blockForm.endTime),
      activities_encrypted: encrypt(blockForm.activities),
      color: blockForm.color,
      block_type: blockForm.block_type,
    };
    if (editBlock) {
      await supabase.from('schedule_blocks').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editBlock.id);
    } else {
      await supabase.from('schedule_blocks').insert(payload);
    }
    setSaving(false);
    setShowBlockModal(false);
    loadBlocks();
  }

  async function deleteBlock(id: string) {
    await supabase.from('schedule_blocks').delete().eq('id', id);
    setBlocks(prev => prev.filter(b => b.id !== id));
  }

  async function saveTask() {
    if (!taskForm.title.trim()) return;
    setSaving(true);
    const due_date = taskForm.hasDueDate ? dateTimeToString(taskForm.dueDateTime) : null;
    const payload = {
      user_id: user!.id,
      title_encrypted: encrypt(taskForm.title),
      description_encrypted: encrypt(taskForm.description),
      quadrant: taskForm.quadrant,
      due_date,
    };
    if (editTask) {
      await supabase.from('eisenhower_tasks').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editTask.id);
      setEisenhowerTasks(prev => prev.map(t => t.id === editTask.id ? { ...t, ...payload, due_date: payload.due_date ?? undefined } : t));
    } else {
      const { data } = await supabase.from('eisenhower_tasks').insert(payload).select().maybeSingle();
      if (data) setEisenhowerTasks(prev => [data, ...prev]);
    }
    setSaving(false);
    setShowTaskModal(false);
  }

  async function toggleTask(task: EisenhowerTask) {
    setEisenhowerTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t));
    await supabase.from('eisenhower_tasks').update({ is_completed: !task.is_completed }).eq('id', task.id);
  }

  async function deleteTask(id: string) {
    setEisenhowerTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('eisenhower_tasks').delete().eq('id', id);
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F3CEF2', '#EDD5F5']} style={styles.header}>
        <Text style={styles.headerTitle}>Lịch trình & Mục tiêu</Text>
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, activeTab === 'schedule' && styles.activeTab]} onPress={() => setActiveTab('schedule')}>
            <Text style={[styles.tabText, activeTab === 'schedule' && styles.activeTabText]}>Khung giờ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'eisenhower' && styles.activeTab]} onPress={() => setActiveTab('eisenhower')}>
            <Text style={[styles.tabText, activeTab === 'eisenhower' && styles.activeTabText]}>Ma trận Eisenhower</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {activeTab === 'schedule' ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentPad}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Khung giờ hôm nay</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openAddBlock}>
              <Plus size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
          {blocks.length === 0 ? (
            <View style={styles.emptyState}>
              <Clock size={48} color={Colors.border} />
              <Text style={styles.emptyText}>Chưa có khung giờ nào</Text>
              <Text style={styles.emptySubText}>Nhấn + để thêm lịch trình</Text>
            </View>
          ) : (
            blocks.map(block => (
              <View key={block.id} style={[styles.blockCard, { borderLeftColor: block.color }]}>
                <View style={[styles.blockColorDot, { backgroundColor: block.color }]} />
                <View style={styles.blockInfo}>
                  <Text style={styles.blockTitle}>{block.title}</Text>
                  <View style={styles.blockTimeRow}>
                    <Clock size={12} color={Colors.textSecondary} />
                    <Text style={styles.blockTime}>{block.start_time} - {block.end_time}</Text>
                  </View>
                  {block.activities_encrypted ? (
                    <Text style={styles.blockActivities} numberOfLines={1}>{decrypt(block.activities_encrypted)}</Text>
                  ) : null}
                </View>
                <View style={styles.blockActions}>
                  <TouchableOpacity onPress={() => openEditBlock(block)} style={styles.actionBtn}>
                    <Edit3 size={16} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteBlock(block.id)} style={styles.actionBtn}>
                    <Trash2 size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentPad}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mục tiêu dài hạn</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openAddTask}>
              <Plus size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.eisMatrix}>
            {QUADRANTS.map(q => {
              const qTasks = eisenhowerTasks.filter(t => t.quadrant === q.id);
              return (
                <View key={q.id} style={[styles.quadrant, { borderColor: q.color }]}>
                  <View style={[styles.quadrantHeader, { backgroundColor: q.color + '22' }]}>
                    <Text style={styles.quadrantIcon}>{q.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.quadrantTitle, { color: q.color }]}>{q.label}</Text>
                      <Text style={styles.quadrantSub}>{q.sub}</Text>
                    </View>
                    <Text style={[styles.quadrantCount, { color: q.color }]}>{qTasks.length}</Text>
                  </View>
                  {qTasks.length === 0 ? (
                    <Text style={styles.quadrantEmpty}>Chưa có nhiệm vụ</Text>
                  ) : (
                    qTasks.map(task => (
                      <View key={task.id} style={styles.eisTaskItem}>
                        <TouchableOpacity
                          onPress={() => toggleTask(task)}
                          style={[styles.eisTaskCheck, task.is_completed && { borderColor: Colors.success, backgroundColor: Colors.success }]}
                        >
                          {task.is_completed && <Text style={{ color: Colors.white, fontSize: 10 }}>✓</Text>}
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.eisTaskText, task.is_completed && styles.eisTaskDone]}>
                            {decrypt(task.title_encrypted)}
                          </Text>
                          {task.due_date ? (
                            <Text style={styles.eisTaskDue}>Hạn: {task.due_date.split('-').reverse().join('/')}</Text>
                          ) : null}
                        </View>
                        <View style={styles.eisTaskActions}>
                          <TouchableOpacity onPress={() => openEditTask(task)} style={styles.actionBtn}>
                            <Edit3 size={14} color={Colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => deleteTask(task.id)} style={styles.actionBtn}>
                            <Trash2 size={14} color={Colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <Modal visible={showBlockModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editBlock ? 'Sửa khung giờ' : 'Thêm khung giờ'}</Text>
              <TouchableOpacity onPress={() => setShowBlockModal(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Tên khung giờ"
                placeholder="VD: Sáng tập thể dục"
                value={blockForm.title}
                onChangeText={t => setBlockForm(f => ({ ...f, title: t }))}
              />

              <Text style={styles.fieldLabel}>Giờ bắt đầu</Text>
              <TimePicker
                value={blockForm.startTime}
                onChange={v => setBlockForm(f => ({ ...f, startTime: v }))}
              />

              <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>Giờ kết thúc</Text>
              <TimePicker
                value={blockForm.endTime}
                onChange={v => setBlockForm(f => ({ ...f, endTime: v }))}
              />

              <Input
                label="Hoạt động (sẽ được mã hóa)"
                placeholder="Tập thể dục, ăn sáng..."
                value={blockForm.activities}
                onChangeText={t => setBlockForm(f => ({ ...f, activities: t }))}
                multiline
                numberOfLines={2}
              />

              <Text style={styles.fieldLabel}>Màu sắc</Text>
              <View style={styles.colorRow}>
                {BLOCK_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorCircle, { backgroundColor: c }, blockForm.color === c && styles.colorSelected]}
                    onPress={() => setBlockForm(f => ({ ...f, color: c }))}
                  />
                ))}
              </View>

              <Text style={styles.fieldLabel}>Kiểu block</Text>
              <View style={styles.blockTypeRow}>
                {[{ v: 'standard', l: 'Tiêu chuẩn' }, { v: 'custom', l: 'Tùy chỉnh' }, { v: 'none', l: 'Không block' }].map(({ v, l }) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.blockTypePill, blockForm.block_type === v && styles.blockTypePillActive]}
                    onPress={() => setBlockForm(f => ({ ...f, block_type: v }))}
                  >
                    <Text style={[styles.blockTypePillText, blockForm.block_type === v && styles.blockTypePillTextActive]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button title={saving ? 'Đang lưu...' : 'Lưu'} onPress={saveBlock} loading={saving} style={{ marginTop: Spacing.md }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showTaskModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editTask ? 'Sửa mục tiêu' : 'Thêm mục tiêu'}</Text>
              <TouchableOpacity onPress={() => setShowTaskModal(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Tên mục tiêu (sẽ được mã hóa)"
                placeholder="Nhập mục tiêu của bạn"
                value={taskForm.title}
                onChangeText={t => setTaskForm(f => ({ ...f, title: t }))}
              />
              <Input
                label="Mô tả"
                placeholder="Chi tiết về mục tiêu"
                value={taskForm.description}
                onChangeText={t => setTaskForm(f => ({ ...f, description: t }))}
                multiline
                numberOfLines={2}
              />

              <Text style={styles.fieldLabel}>Ô ma trận</Text>
              {QUADRANTS.map(q => (
                <TouchableOpacity
                  key={q.id}
                  style={[styles.quadrantPill, taskForm.quadrant === q.id && { borderColor: q.color, backgroundColor: q.color + '15' }]}
                  onPress={() => setTaskForm(f => ({ ...f, quadrant: q.id }))}
                >
                  <Text style={{ fontSize: 18 }}>{q.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.quadrantPillText, taskForm.quadrant === q.id && { color: q.color }]}>{q.label}</Text>
                    <Text style={styles.quadrantPillSub}>{q.sub}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              <View style={styles.dueDateToggleRow}>
                <Text style={styles.fieldLabel}>Đặt hạn chót</Text>
                <TouchableOpacity
                  style={[styles.toggleBtn, taskForm.hasDueDate && styles.toggleBtnActive]}
                  onPress={() => setTaskForm(f => ({ ...f, hasDueDate: !f.hasDueDate }))}
                >
                  <View style={[styles.toggleDot, taskForm.hasDueDate && styles.toggleDotActive]} />
                </TouchableOpacity>
              </View>

              {taskForm.hasDueDate && (
                <>
                  <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>
                    Chọn ngày: <Text style={{ color: Colors.primary }}>{dateTimeDisplay(taskForm.dueDateTime)}</Text>
                  </Text>
                  <DateTimePicker
                    value={taskForm.dueDateTime}
                    onChange={v => setTaskForm(f => ({ ...f, dueDateTime: v }))}
                  />
                </>
              )}

              <Button title={saving ? 'Đang lưu...' : 'Lưu'} onPress={saveTask} loading={saving} style={{ marginTop: Spacing.lg }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerTitle: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.md },
  tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: BorderRadius.full, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.full },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { ...Typography.smallMedium, color: Colors.textSecondary },
  activeTabText: { color: Colors.white },
  content: { flex: 1 },
  contentPad: { padding: Spacing.lg, paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { ...Typography.h3, color: Colors.text },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyText: { ...Typography.bodyMedium, color: Colors.textSecondary },
  emptySubText: { ...Typography.small, color: Colors.textLight },
  blockCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderLeftWidth: 4, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  blockColorDot: { width: 10, height: 10, borderRadius: 5 },
  blockInfo: { flex: 1, gap: 3 },
  blockTitle: { ...Typography.bodyMedium, color: Colors.text },
  blockTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  blockTime: { ...Typography.caption, color: Colors.textSecondary },
  blockActivities: { ...Typography.small, color: Colors.textSecondary, fontStyle: 'italic' },
  blockActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  eisMatrix: { gap: Spacing.md },
  quadrant: { borderRadius: BorderRadius.lg, borderWidth: 1.5, overflow: 'hidden' },
  quadrantHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  quadrantIcon: { fontSize: 20 },
  quadrantTitle: { ...Typography.smallMedium, fontFamily: 'Quicksand-Bold' },
  quadrantSub: { ...Typography.caption, color: Colors.textSecondary },
  quadrantCount: { ...Typography.h4, fontFamily: 'Quicksand-Bold' },
  quadrantEmpty: { ...Typography.small, color: Colors.textLight, padding: Spacing.md, textAlign: 'center', fontStyle: 'italic' },
  eisTaskItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: 10 },
  eisTaskCheck: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  eisTaskText: { ...Typography.small, color: Colors.text },
  eisTaskDue: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  eisTaskDone: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  eisTaskActions: { flexDirection: 'row', gap: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { ...Typography.h3, color: Colors.text },
  fieldLabel: { ...Typography.smallMedium, color: Colors.text, marginBottom: Spacing.sm },
  colorRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  colorCircle: { width: 32, height: 32, borderRadius: 16 },
  colorSelected: { borderWidth: 3, borderColor: Colors.text },
  blockTypeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  blockTypePill: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border },
  blockTypePillActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  blockTypePillText: { ...Typography.caption, color: Colors.textSecondary },
  blockTypePillTextActive: { color: Colors.primary, fontFamily: 'Quicksand-SemiBold' },
  quadrantPill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 8 },
  quadrantPillText: { ...Typography.smallMedium, color: Colors.text },
  quadrantPillSub: { ...Typography.caption, color: Colors.textSecondary },
  dueDateToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  toggleBtn: { width: 48, height: 26, borderRadius: 13, backgroundColor: Colors.border, justifyContent: 'center', paddingHorizontal: 3 },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  toggleDotActive: { alignSelf: 'flex-end' },
});
