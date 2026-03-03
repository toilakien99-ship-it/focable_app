import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { Bot, Send, Trash2, Sparkles, TrendingUp, Target, Clock } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
};

type UserContext = {
  tasks_completed: number;
  tasks_total: number;
  focus_minutes: number;
  streak_day: number;
};

const QUICK_PROMPTS = [
  { label: 'Phân tích hôm nay', icon: <TrendingUp size={14} color={Colors.primary} />, text: 'Phân tích hiệu suất và thói quen của tôi hôm nay' },
  { label: 'Gợi ý tập trung', icon: <Target size={14} color={Colors.success} />, text: 'Cho tôi gợi ý để tập trung tốt hơn ngay bây giờ' },
  { label: 'Lịch tối ưu', icon: <Clock size={14} color={Colors.warning} />, text: 'Thời điểm nào trong ngày tôi nên tập trung nhất?' },
];

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
      {!isUser && (
        <View style={styles.botAvatar}>
          <Bot size={16} color={Colors.primary} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

export default function AIScreen() {
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);

  useFocusEffect(useCallback(() => {
    if (user) {
      loadHistory();
      loadContext();
    }
  }, [user]));

  async function loadHistory() {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant/history`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (data.history) {
      setMessages(data.history.map((h: { role: string; content: string; created_at: string }, i: number) => ({ id: String(i), ...h })));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }

  async function loadContext() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('behavior_analytics')
      .select('*')
      .eq('user_id', user!.id)
      .eq('date', today)
      .maybeSingle();

    if (data) {
      setUserContext({
        tasks_completed: data.tasks_completed,
        tasks_total: data.tasks_total,
        focus_minutes: data.focus_minutes,
        streak_day: data.streak_day,
      });
    }
  }

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, context: userContext ?? {} }),
      });
      const data = await res.json();
      const reply = data.reply ?? 'Xin lỗi, tôi không thể trả lời lúc này.';
      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: reply };
      setMessages(prev => [...prev, assistantMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Lỗi kết nối. Vui lòng thử lại.' }]);
    } finally {
      setSending(false);
    }
  }

  async function clearHistory() {
    setClearing(true);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (token) {
      await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant/history`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    setMessages([]);
    setClearing(false);
  }

  const isEmpty = messages.length === 0;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.botIcon}>
              <Sparkles size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Foca AI</Text>
              <Text style={styles.headerSub}>Trợ lý kỷ luật cá nhân</Text>
            </View>
          </View>
          {!isEmpty && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearHistory} disabled={clearing}>
              {clearing ? <ActivityIndicator size="small" color={Colors.textLight} /> : <Trash2 size={18} color={Colors.textLight} />}
            </TouchableOpacity>
          )}
        </View>

        {userContext && (
          <View style={styles.contextBar}>
            <View style={styles.contextItem}>
              <Text style={styles.contextVal}>{userContext.tasks_completed}/{userContext.tasks_total}</Text>
              <Text style={styles.contextLabel}>nhiệm vụ</Text>
            </View>
            <View style={styles.contextDivider} />
            <View style={styles.contextItem}>
              <Text style={styles.contextVal}>{userContext.focus_minutes}p</Text>
              <Text style={styles.contextLabel}>tập trung</Text>
            </View>
            <View style={styles.contextDivider} />
            <View style={styles.contextItem}>
              <Text style={styles.contextVal}>{userContext.streak_day}</Text>
              <Text style={styles.contextLabel}>ngày streak</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={[styles.messagesPad, isEmpty && styles.messagesEmpty]}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <View style={styles.welcomeWrap}>
            <View style={styles.welcomeIcon}>
              <Bot size={40} color={Colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Xin chào! Tôi là Foca</Text>
            <Text style={styles.welcomeDesc}>
              Tôi có thể phân tích thói quen, đưa ra lời khuyên tập trung và giúp bạn duy trì kỷ luật số mỗi ngày.
            </Text>
            <View style={styles.quickPrompts}>
              {QUICK_PROMPTS.map((q, i) => (
                <TouchableOpacity key={i} style={styles.quickPrompt} onPress={() => sendMessage(q.text)}>
                  {q.icon}
                  <Text style={styles.quickPromptText}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} message={msg} />)
        )}

        {sending && (
          <View style={[styles.msgRow, styles.msgRowAssistant]}>
            <View style={styles.botAvatar}><Bot size={16} color={Colors.primary} /></View>
            <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.typingText}>Đang trả lời...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {!isEmpty && (
        <View style={styles.quickRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRowContent}>
            {QUICK_PROMPTS.map((q, i) => (
              <TouchableOpacity key={i} style={styles.quickPromptSmall} onPress={() => sendMessage(q.text)} disabled={sending}>
                {q.icon}
                <Text style={styles.quickPromptSmallText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Nhắn với Foca..."
          placeholderTextColor="#64748B"
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || sending}
        >
          <Send size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  botIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.primary + '40' },
  headerTitle: { ...Typography.h4, color: Colors.white },
  headerSub: { ...Typography.caption, color: '#94A3B8' },
  clearBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  contextBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  contextItem: { flex: 1, alignItems: 'center' },
  contextVal: { ...Typography.h4, color: Colors.primary },
  contextLabel: { ...Typography.caption, color: '#64748B' },
  contextDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  messages: { flex: 1 },
  messagesPad: { padding: Spacing.lg, paddingBottom: Spacing.md },
  messagesEmpty: { flex: 1, justifyContent: 'center' },
  welcomeWrap: { alignItems: 'center', paddingVertical: Spacing.xl },
  welcomeIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '30' },
  welcomeTitle: { ...Typography.h3, color: Colors.white, marginBottom: Spacing.sm },
  welcomeDesc: { ...Typography.small, color: '#94A3B8', textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl, paddingHorizontal: Spacing.md },
  quickPrompts: { width: '100%', gap: Spacing.sm },
  quickPrompt: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  quickPromptText: { ...Typography.smallMedium, color: Colors.white },
  msgRow: { flexDirection: 'row', marginBottom: Spacing.md, gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAssistant: { justifyContent: 'flex-start', alignItems: 'flex-end' },
  botAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.primary + '30' },
  bubble: { maxWidth: '78%', borderRadius: 18, padding: Spacing.md },
  bubbleUser: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: 'rgba(255,255,255,0.08)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  bubbleText: { ...Typography.small, lineHeight: 22 },
  bubbleTextUser: { color: Colors.white },
  bubbleTextAssistant: { color: '#E2E8F0' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  typingText: { ...Typography.small, color: '#94A3B8' },
  quickRow: { paddingHorizontal: Spacing.lg, paddingBottom: 8 },
  quickRowContent: { gap: 8 },
  quickPromptSmall: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  quickPromptSmallText: { ...Typography.caption, color: '#94A3B8', fontFamily: 'Quicksand-SemiBold' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, padding: Spacing.lg, paddingTop: Spacing.sm, backgroundColor: '#0F172A', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  textInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingHorizontal: Spacing.md, paddingVertical: 10, ...Typography.small, color: Colors.white, maxHeight: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
