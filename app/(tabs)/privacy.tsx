import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, ChevronDown, ChevronRight, Lock, Eye, Trash2, Mail, MapPin, Bell, Bot, Users } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';

type PolicySection = {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: string;
};

const POLICY_SECTIONS: PolicySection[] = [
  {
    id: 'collect',
    icon: <Eye size={18} color="#3B82F6" />,
    title: 'Dữ liệu chúng tôi thu thập',
    content: `Focable thu thập các loại dữ liệu sau để cung cấp dịch vụ:

• Thông tin tài khoản: Email, tên hiển thị, ảnh đại diện (tùy chọn)
• Dữ liệu vị trí: Tọa độ GPS, thành phố, quốc gia — chỉ khi bạn bật tính năng theo dõi vị trí
• Nhiệm vụ & lịch trình: Dữ liệu do bạn tự nhập
• Lịch sử sử dụng app: Số nhiệm vụ hoàn thành, thời gian tập trung (analytics tổng hợp)
• Tin nhắn AI: Cuộc hội thoại với trợ lý Foca AI
• Log bảo mật: Hành vi đáng ngờ (chỉ khi có Parent Mode)`,
  },
  {
    id: 'use',
    icon: <Shield size={18} color="#22C55E" />,
    title: 'Mục đích sử dụng dữ liệu',
    content: `Dữ liệu của bạn chỉ được dùng để:

• Cung cấp và cải thiện tính năng ứng dụng
• Cá nhân hóa gợi ý và nhắc nhở từ AI
• Hỗ trợ tính năng giám sát phụ huynh (nếu bạn đồng ý kết nối)
• Gửi thông báo lịch trình và cảnh báo bạn đã đăng ký
• Phân tích hành vi tổng hợp để cải thiện sản phẩm (ẩn danh)

Chúng tôi KHÔNG bao giờ bán dữ liệu của bạn cho bên thứ ba.`,
  },
  {
    id: 'location',
    icon: <MapPin size={18} color="#F59E0B" />,
    title: 'Chính sách vị trí',
    content: `Quyền vị trí (Location Permission):

• Foreground: Chỉ lấy vị trí khi bạn mở app và bật tính năng tracking
• Background: Chỉ được dùng khi bạn bật Parent Mode và đồng ý chia sẻ với phụ huynh
• Bạn có thể tắt tracking bất kỳ lúc nào trong tab "Vị trí"
• Vị trí được mã hóa và lưu trong Supabase database của bạn
• Chỉ bạn và phụ huynh liên kết (nếu có) mới xem được lịch sử vị trí`,
  },
  {
    id: 'notifications',
    icon: <Bell size={18} color="#EC4899" />,
    title: 'Thông báo',
    content: `Focable gửi các loại thông báo sau (với sự cho phép của bạn):

• Nhắc nhở lịch trình sắp đến
• Cảnh báo nhiệm vụ quá hạn
• Thông báo từ trợ lý AI Foca
• Cảnh báo bảo mật (Parent Mode)

Bạn có thể tắt từng loại thông báo trong Cài đặt hệ thống bất kỳ lúc nào.`,
  },
  {
    id: 'ai',
    icon: <Bot size={18} color={Colors.primary} />,
    title: 'AI & Dữ liệu tổng hợp',
    content: `Tính năng AI (Trợ lý Foca):

• Cuộc hội thoại được lưu để duy trì ngữ cảnh trong phiên
• Nội dung được gửi đến OpenAI API để xử lý (nếu có cấu hình)
• Chúng tôi không dùng dữ liệu cá nhân để huấn luyện mô hình AI
• Bạn có thể xóa toàn bộ lịch sử hội thoại AI bất kỳ lúc nào

Theo chính sách App Store 2024: ứng dụng này sử dụng AI tạo sinh (Generative AI) để cung cấp lời khuyên và gợi ý cá nhân hóa.`,
  },
  {
    id: 'parent',
    icon: <Users size={18} color="#14B8A6" />,
    title: 'Parent Mode & Giám sát',
    content: `Tính năng Parent Mode:

• Liên kết phụ huynh-trẻ yêu cầu xác nhận 2 chiều bằng mã 6 số
• Phụ huynh chỉ xem được dữ liệu sau khi trẻ đồng ý kết nối
• Trẻ có thể hủy liên kết bất kỳ lúc nào
• Dữ liệu chia sẻ bao gồm: vị trí, lịch sử bypass attempts
• Không có bên thứ ba nào khác có quyền truy cập vào dữ liệu này`,
  },
  {
    id: 'security',
    icon: <Lock size={18} color="#EF4444" />,
    title: 'Bảo mật dữ liệu',
    content: `Chúng tôi bảo vệ dữ liệu của bạn bằng:

• Mã hóa TLS/HTTPS cho tất cả kết nối mạng
• Supabase PostgreSQL với Row Level Security (RLS) — mỗi user chỉ đọc được dữ liệu của mình
• JWT authentication token có thời hạn
• Không lưu mật khẩu dạng plain text (Supabase Auth bcrypt)
• Audit log cho các thao tác nhạy cảm

Trong trường hợp vi phạm bảo mật, chúng tôi sẽ thông báo cho bạn trong vòng 72 giờ.`,
  },
  {
    id: 'rights',
    icon: <Trash2 size={18} color="#64748B" />,
    title: 'Quyền của bạn',
    content: `Bạn có toàn quyền với dữ liệu của mình:

• Xem: Toàn bộ dữ liệu cá nhân trong app
• Chỉnh sửa: Cập nhật thông tin profile, nhiệm vụ, lịch trình
• Xóa: Xóa lịch sử vị trí, cuộc trò chuyện AI, hoặc toàn bộ tài khoản
• Xuất: Liên hệ chúng tôi để xuất dữ liệu theo định dạng JSON
• Từ chối: Tắt bất kỳ quyền nào trong Cài đặt hệ thống

Để xóa tài khoản hoàn toàn, gửi email đến: privacy@focable.app`,
  },
];

export default function PrivacyScreen() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
        <View style={styles.headerIcon}>
          <Shield size={28} color={Colors.primary} />
        </View>
        <Text style={styles.headerTitle}>Chính sách Bảo mật</Text>
        <Text style={styles.headerSub}>Cập nhật lần cuối: 3/3/2026 · Focable v1.0</Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPad} showsVerticalScrollIndicator={false}>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Tóm tắt ngắn gọn</Text>
          <Text style={styles.summaryText}>
            Focable thu thập dữ liệu tối thiểu cần thiết để cung cấp dịch vụ. Chúng tôi không bán dữ liệu, không quảng cáo. Bạn kiểm soát hoàn toàn dữ liệu của mình.
          </Text>
        </View>

        {POLICY_SECTIONS.map(section => {
          const isOpen = expanded[section.id];
          return (
            <TouchableOpacity
              key={section.id}
              style={styles.sectionCard}
              onPress={() => toggle(section.id)}
              activeOpacity={0.8}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionLeft}>
                  <View style={styles.sectionIconWrap}>{section.icon}</View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
                {isOpen ? <ChevronDown size={18} color="#64748B" /> : <ChevronRight size={18} color="#64748B" />}
              </View>
              {isOpen && (
                <Text style={styles.sectionContent}>{section.content}</Text>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.contactCard}>
          <Mail size={20} color={Colors.primary} />
          <View style={styles.contactText}>
            <Text style={styles.contactTitle}>Liên hệ về quyền riêng tư</Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:privacy@focable.app')}>
              <Text style={styles.contactEmail}>privacy@focable.app</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.legalLinks}>
          <Text style={styles.legalTitle}>Tuân thủ pháp lý</Text>
          <Text style={styles.legalText}>
            Ứng dụng này tuân thủ Google Play Developer Program Policies, App Store Review Guidelines, và GDPR (đối với người dùng EU). Dữ liệu được lưu trữ tại Supabase (US/EU region).
          </Text>
        </View>

        <Text style={styles.version}>Focable · com.focable.app · Phiên bản 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, alignItems: 'center' },
  headerIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '40' },
  headerTitle: { ...Typography.h2, color: Colors.white, marginBottom: 4 },
  headerSub: { ...Typography.caption, color: '#64748B', textAlign: 'center' },
  content: { flex: 1 },
  contentPad: { padding: Spacing.lg, paddingBottom: 100 },
  summaryCard: { backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '30' },
  summaryTitle: { ...Typography.bodyMedium, color: Colors.primary, marginBottom: 8, fontFamily: 'Quicksand-Bold' },
  summaryText: { ...Typography.small, color: '#CBD5E1', lineHeight: 22 },
  sectionCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  sectionIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { ...Typography.smallMedium, color: Colors.white, flex: 1 },
  sectionContent: { ...Typography.small, color: '#94A3B8', lineHeight: 22, marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.primary + '10', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginTop: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '30' },
  contactText: {},
  contactTitle: { ...Typography.smallMedium, color: Colors.white, marginBottom: 4 },
  contactEmail: { ...Typography.small, color: Colors.primary, textDecorationLine: 'underline' },
  legalLinks: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  legalTitle: { ...Typography.captionMedium, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  legalText: { ...Typography.small, color: '#475569', lineHeight: 20 },
  version: { ...Typography.caption, color: '#334155', textAlign: 'center', marginTop: Spacing.xl },
});
