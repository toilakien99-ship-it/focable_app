import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { ArrowLeft, Send, Check, CheckCheck } from 'lucide-react-native';

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  status: 'sent' | 'delivered' | 'seen';
  created_at: string;
};

export default function ChatScreen() {
  const { friendId, friendName } = useLocalSearchParams<{ friendId: string; friendName: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user || !friendId) return;
    loadMessages();

    const channel = supabase
      .channel(`chat:${[user.id, friendId].sort().join('-')}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `receiver_id=eq.${user.id}`,
      }, payload => {
        const msg = payload.new as Message;
        if (msg.sender_id === friendId) {
          setMessages(prev => [...prev, msg]);
          markSeen(msg.id);
          scrollToBottom();
        }
      })
      .subscribe();

    markDelivered();

    return () => { supabase.removeChannel(channel); };
  }, [user, friendId]);

  async function loadMessages() {
    setLoading(true);
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user!.id},receiver_id.eq.${friendId}),` +
        `and(sender_id.eq.${friendId},receiver_id.eq.${user!.id})`
      )
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) setMessages(data);
    setLoading(false);
    setTimeout(scrollToBottom, 100);
  }

  async function markDelivered() {
    await supabase
      .from('chat_messages')
      .update({ status: 'delivered' })
      .eq('receiver_id', user!.id)
      .eq('sender_id', friendId)
      .eq('status', 'sent');
  }

  async function markSeen(messageId: string) {
    await supabase.from('chat_messages').update({ status: 'seen' }).eq('id', messageId);
  }

  async function markAllSeen() {
    await supabase
      .from('chat_messages')
      .update({ status: 'seen' })
      .eq('receiver_id', user!.id)
      .eq('sender_id', friendId)
      .neq('status', 'seen');
    setMessages(prev => prev.map(m => m.sender_id === friendId ? { ...m, status: 'seen' } : m));
  }

  function scrollToBottom() {
    listRef.current?.scrollToEnd({ animated: true });
  }

  async function sendMessage() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');

    const optimistic: Message = {
      id: Date.now().toString(),
      sender_id: user!.id,
      receiver_id: friendId,
      content,
      status: 'sent',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    scrollToBottom();

    const { data } = await supabase.from('chat_messages').insert({
      sender_id: user!.id,
      receiver_id: friendId,
      content,
    }).select().maybeSingle();

    if (data) {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
    }
    setSending(false);
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  function renderMessage({ item, index }: { item: Message; index: number }) {
    const isMine = item.sender_id === user!.id;
    const prevMsg = messages[index - 1];
    const showDate = !prevMsg || new Date(item.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

    return (
      <>
        {showDate && (
          <View style={styles.dateSep}>
            <Text style={styles.dateSepText}>
              {new Date(item.created_at).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}
            </Text>
          </View>
        )}
        <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleFriend]}>
            <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.content}</Text>
            <View style={styles.bubbleMeta}>
              <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>{formatTime(item.created_at)}</Text>
              {isMine && (
                item.status === 'seen' ? <CheckCheck size={12} color={Colors.info} /> :
                item.status === 'delivered' ? <CheckCheck size={12} color="rgba(255,255,255,0.7)" /> :
                <Check size={12} color="rgba(255,255,255,0.7)" />
              )}
            </View>
          </View>
        </View>
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <LinearGradient colors={['#F3CEF2', '#EDD5F5']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{(friendName || '?')[0].toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{friendName}</Text>
          <Text style={styles.headerStatus}>Đang hoạt động</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onLayout={scrollToBottom}
          onScrollBeginDrag={markAllSeen}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Nhắn tin..."
          placeholderTextColor={Colors.textLight}
          multiline
          maxLength={2000}
          onFocus={markAllSeen}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? <ActivityIndicator size="small" color={Colors.white} /> : <Send size={18} color={Colors.white} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4FF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: Spacing.md, paddingHorizontal: Spacing.md, gap: Spacing.sm },
  backBtn: { padding: 6 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { ...Typography.bodyMedium, color: Colors.white, fontFamily: 'Quicksand-Bold' },
  headerInfo: { flex: 1 },
  headerName: { ...Typography.bodyMedium, color: Colors.text },
  headerStatus: { ...Typography.caption, color: Colors.success },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { padding: Spacing.md, paddingBottom: 16 },
  dateSep: { alignItems: 'center', marginVertical: Spacing.md },
  dateSepText: { ...Typography.caption, color: Colors.textSecondary, backgroundColor: Colors.border + '60', paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.full },
  msgRow: { flexDirection: 'row', marginBottom: 6 },
  msgRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleFriend: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleText: { ...Typography.small, color: Colors.text, lineHeight: 20 },
  bubbleTextMine: { color: Colors.white },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end' },
  bubbleTime: { fontSize: 10, fontFamily: 'Quicksand-Regular', color: Colors.textLight },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, ...Typography.body, color: Colors.text, maxHeight: 120, backgroundColor: Colors.backgroundLight, borderRadius: 22, paddingHorizontal: Spacing.md, paddingVertical: 10, borderWidth: 1.5, borderColor: Colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
