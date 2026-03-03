import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { MapPin, Navigation, Clock, Shield, ToggleLeft as Toggle, TrendingUp, CircleAlert as AlertCircle } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type LocationEntry = {
  id: string;
  city: string;
  district: string;
  country: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
};

type PermStatus = 'unknown' | 'granted' | 'denied';

export default function LocationScreen() {
  const { user } = useAuth();
  const [permStatus, setPermStatus] = useState<PermStatus>('unknown');
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [currentGeo, setCurrentGeo] = useState<Location.LocationGeocodedAddress | null>(null);
  const [history, setHistory] = useState<LocationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useFocusEffect(useCallback(() => {
    checkPermission();
    if (user) loadHistory();
  }, [user]));

  async function checkPermission() {
    const { status } = await Location.getForegroundPermissionsAsync();
    setPermStatus(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'unknown');
  }

  async function requestPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermStatus(status === 'granted' ? 'granted' : 'denied');
    if (status === 'granted') {
      fetchCurrentLocation();
    }
  }

  async function fetchCurrentLocation() {
    setFetching(true);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCurrentLocation(pos);
      const [geo] = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      setCurrentGeo(geo);

      if (user && trackingEnabled) {
        await supabase.from('location_history').insert({
          user_id: user.id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          city: geo?.city ?? geo?.region ?? '',
          district: geo?.district ?? geo?.subregion ?? '',
          country: geo?.country ?? '',
          country_code: geo?.isoCountryCode ?? '',
          recorded_at: new Date().toISOString(),
        });
        loadHistory();
      }
    } catch {
    } finally {
      setFetching(false);
    }
  }

  async function loadHistory() {
    setLoading(true);
    const { data } = await supabase
      .from('location_history')
      .select('*')
      .eq('user_id', user!.id)
      .order('recorded_at', { ascending: false })
      .limit(20);
    if (data) setHistory(data);
    setLoading(false);
  }

  async function toggleTracking(val: boolean) {
    setTrackingEnabled(val);
    if (val && permStatus !== 'granted') {
      await requestPermission();
      return;
    }
    if (val) fetchCurrentLocation();
  }

  async function clearHistory() {
    await supabase.from('location_history').delete().eq('user_id', user!.id);
    setHistory([]);
  }

  const locationName = currentGeo
    ? [currentGeo.district ?? currentGeo.subregion, currentGeo.city ?? currentGeo.region, currentGeo.country].filter(Boolean).join(', ')
    : null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
        <Text style={styles.headerTitle}>Vị trí</Text>
        <Text style={styles.headerSub}>Theo dõi và lịch sử vị trí</Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPad} showsVerticalScrollIndicator={false}>

        {permStatus === 'denied' && (
          <View style={styles.permDeniedCard}>
            <AlertCircle size={24} color={Colors.error} />
            <View style={styles.permDeniedText}>
              <Text style={styles.permDeniedTitle}>Quyền vị trí bị từ chối</Text>
              <Text style={styles.permDeniedDesc}>Vào Cài đặt {'>'} Ứng dụng {'>'} Focable {'>'} Quyền để bật lại.</Text>
            </View>
          </View>
        )}

        {permStatus !== 'denied' && (
          <View style={styles.trackingCard}>
            <View style={styles.trackingCardLeft}>
              <Navigation size={24} color={trackingEnabled ? Colors.success : Colors.textSecondary} />
              <View>
                <Text style={styles.trackingTitle}>Theo dõi vị trí</Text>
                <Text style={styles.trackingDesc}>{trackingEnabled ? 'Đang ghi lịch sử vị trí' : 'Tắt - không lưu vị trí'}</Text>
              </View>
            </View>
            <Switch
              value={trackingEnabled}
              onValueChange={toggleTracking}
              trackColor={{ false: Colors.border, true: Colors.success }}
              thumbColor={Colors.white}
            />
          </View>
        )}

        {permStatus === 'unknown' && (
          <TouchableOpacity style={styles.requestPermBtn} onPress={requestPermission}>
            <MapPin size={18} color={Colors.white} />
            <Text style={styles.requestPermBtnText}>Cấp quyền vị trí</Text>
          </TouchableOpacity>
        )}

        {permStatus === 'granted' && (
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchCurrentLocation} disabled={fetching}>
            {fetching ? <ActivityIndicator size="small" color={Colors.primary} /> : (
              <>
                <Navigation size={16} color={Colors.primary} />
                <Text style={styles.refreshBtnText}>Cập nhật vị trí hiện tại</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {currentLocation && (
          <View style={styles.currentLocationCard}>
            <View style={styles.currentLocationHeader}>
              <MapPin size={20} color={Colors.success} />
              <Text style={styles.currentLocationTitle}>Vị trí hiện tại</Text>
            </View>
            {locationName && <Text style={styles.currentLocationName}>{locationName}</Text>}
            <Text style={styles.currentLocationCoords}>
              {currentLocation.coords.latitude.toFixed(5)}, {currentLocation.coords.longitude.toFixed(5)}
            </Text>
            {currentLocation.coords.accuracy && (
              <Text style={styles.currentLocationAccuracy}>Độ chính xác: ±{Math.round(currentLocation.coords.accuracy)}m</Text>
            )}
          </View>
        )}

        <View style={styles.infoCard}>
          <Shield size={16} color={Colors.info} />
          <Text style={styles.infoText}>
            Dữ liệu vị trí được mã hóa và chỉ lưu trong tài khoản của bạn. Phụ huynh liên kết có thể xem lịch sử nếu bạn đồng ý kết nối.
          </Text>
        </View>

        <View style={styles.historySection}>
          <View style={styles.historySectionHeader}>
            <Text style={styles.historyTitle}>Lịch sử vị trí</Text>
            {history.length > 0 && (
              <TouchableOpacity onPress={clearHistory}>
                <Text style={styles.clearHistoryText}>Xóa tất cả</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
          ) : history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <TrendingUp size={36} color="#334155" />
              <Text style={styles.emptyHistoryText}>Chưa có lịch sử vị trí</Text>
              <Text style={styles.emptyHistoryDesc}>Bật theo dõi và nhấn "Cập nhật" để bắt đầu ghi lại.</Text>
            </View>
          ) : (
            history.map((entry, i) => {
              const loc = [entry.district, entry.city, entry.country].filter(Boolean).join(', ');
              const time = new Date(entry.recorded_at);
              const isToday = time.toDateString() === new Date().toDateString();
              return (
                <View key={entry.id} style={styles.historyEntry}>
                  <View style={[styles.historyDot, i === 0 && styles.historyDotActive]} />
                  {i < history.length - 1 && <View style={styles.historyLine} />}
                  <View style={styles.historyEntryContent}>
                    <Text style={styles.historyEntryCity}>{loc || 'Vị trí không xác định'}</Text>
                    <Text style={styles.historyEntryCoords}>{entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}</Text>
                    <View style={styles.historyEntryTime}>
                      <Clock size={11} color="#64748B" />
                      <Text style={styles.historyEntryTimeText}>
                        {isToday ? 'Hôm nay ' : time.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' '}
                        {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerTitle: { ...Typography.h2, color: Colors.white },
  headerSub: { ...Typography.small, color: '#94A3B8', marginTop: 2 },
  content: { flex: 1 },
  contentPad: { padding: Spacing.lg, paddingBottom: 100 },
  permDeniedCard: { flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.error + '15', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.error + '30', alignItems: 'flex-start' },
  permDeniedText: { flex: 1 },
  permDeniedTitle: { ...Typography.bodyMedium, color: Colors.error, marginBottom: 4 },
  permDeniedDesc: { ...Typography.small, color: '#94A3B8', lineHeight: 20 },
  trackingCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  trackingCardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  trackingTitle: { ...Typography.bodyMedium, color: Colors.white },
  trackingDesc: { ...Typography.small, color: '#64748B' },
  requestPermBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: BorderRadius.lg, marginBottom: Spacing.md },
  requestPermBtnText: { ...Typography.bodyMedium, color: Colors.white, fontFamily: 'Quicksand-Bold' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary + '15', paddingVertical: 12, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '40' },
  refreshBtnText: { ...Typography.smallMedium, color: Colors.primary },
  currentLocationCard: { backgroundColor: Colors.success + '10', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.success + '30' },
  currentLocationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  currentLocationTitle: { ...Typography.bodyMedium, color: Colors.success },
  currentLocationName: { ...Typography.h4, color: Colors.white, marginBottom: 4 },
  currentLocationCoords: { ...Typography.caption, color: '#64748B', fontFamily: 'Quicksand-Medium' },
  currentLocationAccuracy: { ...Typography.caption, color: '#94A3B8', marginTop: 4 },
  infoCard: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.info + '10', borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.info + '30', marginBottom: Spacing.xl },
  infoText: { ...Typography.small, color: '#94A3B8', flex: 1, lineHeight: 20 },
  historySection: {},
  historySectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  historyTitle: { ...Typography.h4, color: Colors.white },
  clearHistoryText: { ...Typography.small, color: Colors.error, textDecorationLine: 'underline' },
  emptyHistory: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyHistoryText: { ...Typography.bodyMedium, color: '#475569' },
  emptyHistoryDesc: { ...Typography.small, color: '#334155', textAlign: 'center' },
  historyEntry: { flexDirection: 'row', marginBottom: Spacing.lg, gap: Spacing.md },
  historyDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#334155', marginTop: 4, flexShrink: 0 },
  historyDotActive: { backgroundColor: Colors.success },
  historyLine: { position: 'absolute', left: 5, top: 16, width: 2, height: 44, backgroundColor: '#1E293B' },
  historyEntryContent: { flex: 1 },
  historyEntryCity: { ...Typography.smallMedium, color: Colors.white },
  historyEntryCoords: { ...Typography.caption, color: '#475569', marginTop: 2, fontFamily: 'Quicksand-Medium' },
  historyEntryTime: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  historyEntryTimeText: { ...Typography.caption, color: '#64748B' },
});
