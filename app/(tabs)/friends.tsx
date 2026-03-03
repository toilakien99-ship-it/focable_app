import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { Users, Search, UserPlus, Check, X, Flame, MessageCircle, Bell, Send, Clock } from 'lucide-react-native';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/dateUtils';

type FriendRow = {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  profile: { full_name: string; username: string | null };
  partnerId: string;
  unreadCount: number;
};

type DuoStreak = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  task_name: string;
  streak_count: number;
  status: string;
  partnerProfile: { full_name: string };
  myDone: boolean;
  partnerDone: boolean;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

const TASK_SUGGESTIONS = [
  'Uống đủ nước mỗi ngày',
  'Không lướt TikTok quá 30 phút',
  'Đọc sách 15 phút',
  'Tập thể dục 20 phút',
  'Ngủ trước 12 giờ đêm',
  'Không dùng điện thoại trước ngủ',
  'Viết 1 điều biết ơn',
];

export default function FriendsScreen() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'friends' | 'duo' | 'notif'>('friends');
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendRow[]>([]);
  const [duoStreaks, setDuoStreaks] = useState<DuoStreak[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendRow | null>(null);
  const [duoTaskName, setDuoTaskName] = useState('');
  const [sendingDuo, setSendingDuo] = useState(false);
  const [unreadNotif, setUnreadNotif] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadAll();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        const n = payload.new as Notification;
        setNotifications(prev => [n, ...prev]);
        setUnreadNotif(c => c + 1);
        showToast(n.title, 'info');
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useFocusEffect(useCallback(() => { if (user) loadAll(); }, [user]));

  async function loadAll() {
    await Promise.all([loadFriends(), loadDuoStreaks(), loadNotifications()]);
  }

  async function loadFriends() {
    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`);

    if (!data) return;

    const accepted: FriendRow[] = [];
    const pending: FriendRow[] = [];

    for (const row of data) {
      const isRequester = row.user_id === user!.id;
      const otherId = isRequester ? row.friend_id : row.user_id;

      const { data: prof } = await supabase
        .from('user_profiles')
        .select('full_name, username')
        .eq('id', otherId)
        .maybeSingle();

      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user!.id)
        .eq('sender_id', otherId)
        .neq('status', 'seen');

      const enriched: FriendRow = {
        ...row,
        profile: prof ?? { full_name: 'Người dùng', username: null },
        partnerId: otherId,
        unreadCount: count ?? 0,
      };

      if (row.status === 'accepted') {
        accepted.push(enriched);
      } else if (row.status === 'pending' && row.friend_id === user!.id) {
        pending.push(enriched);
      }
    }

    setFriends(accepted);
    setPendingReceived(pending);
  }

  async function loadDuoStreaks() {
    const { data } = await supabase
      .from('duo_streaks')
      .select('*')
      .or(`user_a_id.eq.${user!.id},user_b_id.eq.${user!.id}`)
      .in('status', ['active', 'pending']);

    if (!data) return;
    const today = formatDate(new Date());
    const enriched: DuoStreak[] = [];

    for (const row of data) {
      const partnerId = row.user_a_id === user!.id ? row.user_b_id : row.user_a_id;
      const { data: partnerProf } = await supabase.from('user_profiles').select('full_name').eq('id', partnerId).maybeSingle();
      const { data: completions } = await supabase.from('duo_completions').select('user_id').eq('duo_streak_id', row.id).eq('completion_date', today);
      enriched.push({
        ...row,
        partnerProfile: partnerProf ?? { full_name: 'Người dùng' },
        myDone: completions?.some(c => c.user_id === user!.id) ?? false,
        partnerDone: completions?.some(c => c.user_id === partnerId) ?? false,
      });
    }
    setDuoStreaks(enriched);
  }

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) {
      setNotifications(data);
      setUnreadNotif(data.filter(n => !n.is_read).length);
    }
  }

  async function searchUsers() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, username')
      .or(`full_name.ilike.%${searchQuery.trim()}%,username.ilike.%${searchQuery.trim()}%`)
      .neq('id', user!.id)
      .limit(10);
    setSearchResults(data ?? []);
    setSearching(false);
  }

  async function sendFriendRequest(targetId: string) {
    const { error } = await supabase.from('friendships').insert({ user_id: user!.id, friend_id: targetId, status: 'pending' });
    if (error) {
      showToast('Đã gửi lời mời trước đó', 'info');
    } else {
      setSentRequests(prev => new Set([...prev, targetId]));
      showToast('Đã gửi lời mời kết bạn!', 'success');

      await supabase.from('notifications').insert({
        user_id: targetId,
        type: 'friend_request',
        title: 'Lời mời kết bạn mới',
        body: `${profile?.full_name || 'Ai đó'} muốn kết bạn với bạn`,
        data: { from_user_id: user!.id },
      });
    }
  }

  async function acceptFriend(f: FriendRow) {
    await supabase.from('friendships').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', f.id);
    showToast('Đã chấp nhận lời mời!', 'success');
    loadFriends();
  }

  async function declineFriend(f: FriendRow) {
    await supabase.from('friendships').delete().eq('id', f.id);
    showToast('Đã từ chối', 'info');
    loadFriends();
  }

  async function sendDuoInvite() {
    if (!selectedFriend || !duoTaskName.trim()) return;
    setSendingDuo(true);
    await supabase.from('duo_streaks').insert({
      user_a_id: user!.id,
      user_b_id: selectedFriend.partnerId,
      task_name: duoTaskName.trim(),
      status: 'active',
    });
    setSendingDuo(false);
    setShowInviteModal(false);
    showToast('Đã tạo chuỗi đôi!', 'success');
    loadDuoStreaks();
  }

  async function completeDuoTask(duo: DuoStreak) {
    if (duo.myDone) return;
    const today = formatDate(new Date());
    await supabase.from('duo_completions').insert({ duo_streak_id: duo.id, user_id: user!.id, completion_date: today });
    const { data: completions } = await supabase.from('duo_completions').select('user_id').eq('duo_streak_id', duo.id).eq('completion_date', today);
    if (completions && completions.length >= 2) {
      await supabase.from('duo_streaks').update({ streak_count: duo.streak_count + 1, last_completed_date: today, updated_at: new Date().toISOString() }).eq('id', duo.id);
      showToast(`Chuỗi ${duo.streak_count + 1} ngày! Cả hai đã xong!`, 'success');
    } else {
      showToast('Bạn đã xong! Chờ người kia hoàn thành...', 'info');
    }
    loadDuoStreaks();
  }

  async function markNotifRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadNotif(c => Math.max(0, c - 1));
  }

  async function markAllNotifRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadNotif(0);
  }

  function openChat(f: FriendRow) {
    router.push({ pathname: '/(tabs)/chat', params: { friendId: f.partnerId, friendName: f.profile.full_name } });
  }

  const totalPending = pendingReceived.length;
  const totalUnread = unreadNotif;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F3CEF2', '#EDD5F5']} style={styles.header}>
        <Text style={styles.headerTitle}>Bạn bè</Text>
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, activeTab === 'friends' && styles.activeTab]} onPress={() => setActiveTab('friends')}>
            <Users size={14} color={activeTab === 'friends' ? Colors.white : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>Bạn bè</Text>
            {totalPending > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{totalPending}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'duo' && styles.activeTab]} onPress={() => setActiveTab('duo')}>
            <Flame size={14} color={activeTab === 'duo' ? Colors.white : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'duo' && styles.activeTabText]}>Duo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'notif' && styles.activeTab]} onPress={() => { setActiveTab('notif'); }}>
            <Bell size={14} color={activeTab === 'notif' ? Colors.white : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'notif' && styles.activeTabText]}>Thông báo</Text>
            {totalUnread > 0 && <View style={[styles.badge, { backgroundColor: Colors.error }]}><Text style={styles.badgeText}>{totalUnread}</Text></View>}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {activeTab === 'friends' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentPad} keyboardShouldPersistTaps="handled">
          <View style={styles.searchRow}>
            <View style={styles.searchInput}>
              <Search size={16} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchText}
                placeholder="Tìm theo tên hoặc @username..."
                placeholderTextColor={Colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchUsers}
                returnKeyType="search"
              />
            </View>
            <TouchableOpacity style={styles.searchBtn} onPress={searchUsers}>
              {searching ? <ActivityIndicator size="small" color={Colors.white} /> : <Search size={16} color={Colors.white} />}
            </TouchableOpacity>
          </View>

          {searchResults.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kết quả ({searchResults.length})</Text>
              {searchResults.map(r => {
                const sent = sentRequests.has(r.id);
                const alreadyFriend = friends.some(f => f.partnerId === r.id);
                return (
                  <View key={r.id} style={styles.userCard}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{r.full_name?.[0] ?? '?'}</Text></View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{r.full_name}</Text>
                      {r.username ? <Text style={styles.userSub}>@{r.username}</Text> : null}
                    </View>
                    {alreadyFriend ? (
                      <View style={styles.friendedBadge}><Check size={14} color={Colors.success} /><Text style={styles.friendedText}>Bạn bè</Text></View>
                    ) : sent ? (
                      <View style={styles.sentBadge}><Clock size={14} color={Colors.textSecondary} /><Text style={styles.sentText}>Đã gửi</Text></View>
                    ) : (
                      <TouchableOpacity style={styles.addFriendBtn} onPress={() => sendFriendRequest(r.id)}>
                        <UserPlus size={16} color={Colors.white} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {pendingReceived.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lời mời kết bạn ({pendingReceived.length})</Text>
              {pendingReceived.map(req => (
                <View key={req.id} style={styles.userCard}>
                  <View style={[styles.avatar, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.avatarText, { color: '#B45309' }]}>{req.profile.full_name?.[0] ?? '?'}</Text></View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{req.profile.full_name}</Text>
                    <Text style={styles.userSub}>Muốn kết bạn với bạn</Text>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptFriend(req)}><Check size={16} color={Colors.white} /></TouchableOpacity>
                    <TouchableOpacity style={styles.declineBtn} onPress={() => declineFriend(req)}><X size={16} color={Colors.error} /></TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bạn bè ({friends.length})</Text>
            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={40} color={Colors.border} />
                <Text style={styles.emptyText}>Chưa có bạn bè. Tìm kiếm để thêm bạn!</Text>
              </View>
            ) : (
              friends.map(f => (
                <View key={f.id} style={styles.userCard}>
                  <View style={[styles.avatar, { backgroundColor: Colors.primary + '20' }]}>
                    <Text style={[styles.avatarText, { color: Colors.primary }]}>{f.profile.full_name?.[0] ?? '?'}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{f.profile.full_name}</Text>
                    {f.profile.username ? <Text style={styles.userSub}>@{f.profile.username}</Text> : null}
                  </View>
                  <TouchableOpacity style={styles.duoBtn} onPress={() => { setSelectedFriend(f); setDuoTaskName(''); setShowInviteModal(true); }}>
                    <Flame size={14} color={Colors.warning} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chatBtn, f.unreadCount > 0 && styles.chatBtnUnread]} onPress={() => openChat(f)}>
                    <MessageCircle size={14} color={Colors.white} />
                    {f.unreadCount > 0 && <Text style={styles.unreadDot}>{f.unreadCount}</Text>}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {activeTab === 'duo' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentPad}>
          <Text style={styles.sectionDesc}>Tạo thử thách chung với bạn bè. Cả hai cùng hoàn thành mỗi ngày để tăng chuỗi!</Text>
          {duoStreaks.length === 0 ? (
            <View style={styles.emptyState}>
              <Flame size={48} color={Colors.border} />
              <Text style={styles.emptyText}>Chưa có chuỗi đôi nào</Text>
            </View>
          ) : duoStreaks.map(duo => (
            <View key={duo.id} style={styles.duoCard}>
              <View style={styles.duoCardHeader}>
                <View style={styles.duoAvatarRow}>
                  <View style={[styles.duoAvatar, { backgroundColor: Colors.primary + '20' }]}><Text style={[styles.avatarText, { color: Colors.primary }]}>{profile?.full_name?.[0] ?? 'T'}</Text></View>
                  <View style={styles.duoFlame}><Flame size={24} color={Colors.warning} fill={Colors.warning} /><Text style={styles.duoStreakCount}>{duo.streak_count}</Text></View>
                  <View style={[styles.duoAvatar, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.avatarText, { color: '#B45309' }]}>{duo.partnerProfile.full_name?.[0] ?? '?'}</Text></View>
                </View>
                <Text style={styles.duoPartner}>{duo.partnerProfile.full_name}</Text>
              </View>
              <Text style={styles.duoTask}>{duo.task_name}</Text>
              <View style={styles.duoStatus}>
                <View style={[styles.duoStatusItem, duo.myDone && styles.duoStatusDone]}>
                  {duo.myDone ? <Check size={14} color={Colors.success} /> : <View style={styles.statusDot} />}
                  <Text style={[styles.duoStatusText, duo.myDone && { color: Colors.success }]}>Bạn</Text>
                </View>
                <View style={[styles.duoStatusItem, duo.partnerDone && styles.duoStatusDone]}>
                  {duo.partnerDone ? <Check size={14} color={Colors.success} /> : <View style={styles.statusDot} />}
                  <Text style={[styles.duoStatusText, duo.partnerDone && { color: Colors.success }]}>{duo.partnerProfile.full_name}</Text>
                </View>
              </View>
              {!duo.myDone && (
                <TouchableOpacity style={styles.doneBtn} onPress={() => completeDuoTask(duo)}>
                  <Check size={16} color={Colors.white} />
                  <Text style={styles.doneBtnText}>Đánh dấu hoàn thành hôm nay</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {activeTab === 'notif' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentPad}>
          {notifications.length > 0 && unreadNotif > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={markAllNotifRead}>
              <Text style={styles.markAllText}>Đánh dấu tất cả đã đọc</Text>
            </TouchableOpacity>
          )}
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Bell size={40} color={Colors.border} />
              <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
            </View>
          ) : notifications.map(n => (
            <TouchableOpacity
              key={n.id}
              style={[styles.notifCard, !n.is_read && styles.notifCardUnread]}
              onPress={() => markNotifRead(n.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.notifIcon, { backgroundColor: n.type === 'friend_request' ? '#FEF3C7' : n.type === 'message' ? '#DBEAFE' : Colors.backgroundLight }]}>
                {n.type === 'friend_request' ? <UserPlus size={16} color="#B45309" /> :
                 n.type === 'message' ? <MessageCircle size={16} color={Colors.info} /> :
                 <Bell size={16} color={Colors.textSecondary} />}
              </View>
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifBody}>{n.body}</Text>
                <Text style={styles.notifTime}>{new Date(n.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</Text>
              </View>
              {!n.is_read && <View style={styles.unreadIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={showInviteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo chuỗi đôi</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}><X size={22} color={Colors.text} /></TouchableOpacity>
            </View>
            {selectedFriend && (
              <Text style={styles.modalSub}>
                Thử thách cùng <Text style={{ color: Colors.primary, fontFamily: 'Quicksand-Bold' }}>{selectedFriend.profile.full_name}</Text>
              </Text>
            )}
            <Text style={styles.inputLabel}>Chọn nhiệm vụ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              {TASK_SUGGESTIONS.map(t => (
                <TouchableOpacity key={t} style={[styles.suggestionChip, duoTaskName === t && styles.suggestionChipActive]} onPress={() => setDuoTaskName(t)}>
                  <Text style={[styles.suggestionChipText, duoTaskName === t && styles.suggestionChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={styles.textInput}
              value={duoTaskName}
              onChangeText={setDuoTaskName}
              placeholder="Hoặc nhập nhiệm vụ tùy chỉnh..."
              placeholderTextColor={Colors.textLight}
              maxLength={80}
            />
            <TouchableOpacity
              style={[styles.sendDuoBtn, (!duoTaskName.trim() || sendingDuo) && { opacity: 0.5 }]}
              onPress={sendDuoInvite}
              disabled={!duoTaskName.trim() || sendingDuo}
            >
              <Send size={16} color={Colors.white} />
              <Text style={styles.sendDuoBtnText}>{sendingDuo ? 'Đang tạo...' : 'Bắt đầu chuỗi đôi'}</Text>
            </TouchableOpacity>
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
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: BorderRadius.full, gap: 4 },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { ...Typography.captionMedium, color: Colors.textSecondary },
  activeTabText: { color: Colors.white },
  badge: { backgroundColor: Colors.warning, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  badgeText: { fontSize: 9, color: Colors.white, fontFamily: 'Quicksand-Bold' },
  content: { flex: 1 },
  contentPad: { padding: Spacing.lg, paddingBottom: 100 },
  searchRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  searchInput: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.backgroundLight, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, borderWidth: 1.5, borderColor: Colors.border },
  searchText: { flex: 1, ...Typography.body, color: Colors.text, paddingVertical: 11 },
  searchBtn: { backgroundColor: Colors.primary, width: 44, height: 44, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.md },
  sectionDesc: { ...Typography.small, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.lg },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundLight, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  avatarText: { ...Typography.bodySemiBold, color: Colors.primary },
  userInfo: { flex: 1 },
  userName: { ...Typography.bodyMedium, color: Colors.text },
  userSub: { ...Typography.caption, color: Colors.textSecondary },
  addFriendBtn: { backgroundColor: Colors.primary, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  friendedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full },
  friendedText: { ...Typography.caption, color: Colors.success, fontFamily: 'Quicksand-SemiBold' },
  sentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.backgroundLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  sentText: { ...Typography.caption, color: Colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: 8 },
  acceptBtn: { backgroundColor: Colors.success, width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  declineBtn: { backgroundColor: Colors.error + '20', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.error + '40' },
  duoBtn: { backgroundColor: '#FEF3C7', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.warning },
  chatBtn: { backgroundColor: Colors.primary, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  chatBtnUnread: { backgroundColor: Colors.info },
  unreadDot: { position: 'absolute', top: -4, right: -4, backgroundColor: Colors.error, color: Colors.white, fontSize: 9, fontFamily: 'Quicksand-Bold', width: 16, height: 16, borderRadius: 8, textAlign: 'center', lineHeight: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: Spacing.md },
  emptyText: { ...Typography.small, color: Colors.textSecondary, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
  duoCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: Colors.border, shadowColor: Colors.warning, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  duoCardHeader: { alignItems: 'center', marginBottom: Spacing.md },
  duoAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: 8 },
  duoAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  duoFlame: { alignItems: 'center', gap: 2 },
  duoStreakCount: { ...Typography.h3, color: Colors.warning },
  duoPartner: { ...Typography.captionMedium, color: Colors.textSecondary },
  duoTask: { ...Typography.bodyMedium, color: Colors.text, textAlign: 'center', marginBottom: Spacing.md },
  duoStatus: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center', marginBottom: Spacing.md },
  duoStatusItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.backgroundLight, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border },
  duoStatusDone: { backgroundColor: '#F0FDF4', borderColor: Colors.success + '50' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  duoStatusText: { ...Typography.captionMedium, color: Colors.textSecondary },
  doneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.success, paddingVertical: 12, borderRadius: BorderRadius.lg },
  doneBtnText: { ...Typography.smallMedium, color: Colors.white },
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.backgroundLight, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  notifCardUnread: { backgroundColor: Colors.primary + '08', borderColor: Colors.primary + '30' },
  notifIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  notifContent: { flex: 1 },
  notifTitle: { ...Typography.smallMedium, color: Colors.text, marginBottom: 2 },
  notifBody: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18, marginBottom: 4 },
  notifTime: { ...Typography.caption, color: Colors.textLight },
  unreadIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
  markAllBtn: { alignSelf: 'flex-end', marginBottom: Spacing.md },
  markAllText: { ...Typography.captionMedium, color: Colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  modalTitle: { ...Typography.h3, color: Colors.text },
  modalSub: { ...Typography.small, color: Colors.textSecondary, marginBottom: Spacing.lg },
  inputLabel: { ...Typography.smallMedium, color: Colors.text, marginBottom: 8 },
  suggestionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, marginRight: 8, backgroundColor: Colors.backgroundLight },
  suggestionChipActive: { borderColor: Colors.warning, backgroundColor: '#FEF3C7' },
  suggestionChipText: { ...Typography.caption, color: Colors.textSecondary, fontFamily: 'Quicksand-SemiBold' },
  suggestionChipTextActive: { color: '#B45309' },
  textInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Typography.body, color: Colors.text, marginBottom: Spacing.lg },
  sendDuoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.warning, paddingVertical: 14, borderRadius: BorderRadius.lg },
  sendDuoBtnText: { ...Typography.bodyMedium, color: Colors.white, fontFamily: 'Quicksand-Bold' },
});
