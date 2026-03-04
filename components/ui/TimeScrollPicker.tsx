import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Colors, Typography, Spacing } from '@/lib/theme';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING_ITEMS = Math.floor(VISIBLE_ITEMS / 2);

interface ScrollPickerColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  label?: string;
}

function ScrollPickerColumn({ items, selectedIndex, onSelect, label }: ScrollPickerColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isScrolling = useRef(false);

  const snapToIndex = useCallback((index: number, animated = true) => {
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    scrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated });
    return clamped;
  }, [items.length]);

  const handleRef = useCallback((ref: ScrollView | null) => {
    (scrollRef as any).current = ref;
    if (ref) {
      setTimeout(() => {
        ref.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
      }, 50);
    }
  }, [selectedIndex]);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isScrolling.current = false;
    const y = e.nativeEvent.contentOffset.y;
    const rawIndex = y / ITEM_HEIGHT;
    const snapped = Math.round(rawIndex);
    const clamped = Math.max(0, Math.min(snapped, items.length - 1));
    snapToIndex(clamped, true);
    if (clamped !== selectedIndex) {
      onSelect(clamped);
    }
  }, [items.length, selectedIndex, onSelect, snapToIndex]);

  const handleScrollBegin = useCallback(() => {
    isScrolling.current = true;
  }, []);

  const paddedItems = [
    ...Array(PADDING_ITEMS).fill(''),
    ...items,
    ...Array(PADDING_ITEMS).fill(''),
  ];

  return (
    <View style={styles.column}>
      {label ? <Text style={styles.columnLabel}>{label}</Text> : null}
      <View style={styles.columnInner}>
        <View style={styles.selectionOverlay} pointerEvents="none" />
        <View style={styles.topFade} pointerEvents="none" />
        <View style={styles.bottomFade} pointerEvents="none" />
        <ScrollView
          ref={handleRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScrollBeginDrag={handleScrollBegin}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          contentContainerStyle={{ paddingVertical: 0 }}
          bounces={false}
          overScrollMode="never"
        >
          {paddedItems.map((item, idx) => {
            const realIdx = idx - PADDING_ITEMS;
            const isSelected = realIdx === selectedIndex;
            const distance = Math.abs(realIdx - selectedIndex);
            const opacity = item === '' ? 0 : distance === 0 ? 1 : distance === 1 ? 0.6 : 0.3;
            return (
              <View key={idx} style={styles.item}>
                <Text style={[
                  styles.itemText,
                  isSelected && styles.itemTextSelected,
                  { opacity },
                ]}>
                  {item}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

export interface TimeValue {
  hour: number;
  minute: number;
}

export interface DateTimeValue {
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
}

interface TimePickerProps {
  value: TimeValue;
  onChange: (v: TimeValue) => void;
}

interface DateTimePickerProps {
  value: DateTimeValue;
  onChange: (v: DateTimeValue) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(CURRENT_YEAR + i));

export function TimePicker({ value, onChange }: TimePickerProps) {
  return (
    <View style={styles.container}>
      <ScrollPickerColumn
        items={HOURS}
        selectedIndex={value.hour}
        onSelect={hour => onChange({ ...value, hour })}
        label="Giờ"
      />
      <Text style={styles.separator}>:</Text>
      <ScrollPickerColumn
        items={MINUTES}
        selectedIndex={value.minute}
        onSelect={minute => onChange({ ...value, minute })}
        label="Phút"
      />
    </View>
  );
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  return (
    <View style={styles.container}>
      <ScrollPickerColumn
        items={DAYS}
        selectedIndex={value.day - 1}
        onSelect={idx => onChange({ ...value, day: idx + 1 })}
        label="Ngày"
      />
      <ScrollPickerColumn
        items={MONTHS}
        selectedIndex={value.month - 1}
        onSelect={idx => onChange({ ...value, month: idx + 1 })}
        label="Tháng"
      />
      <ScrollPickerColumn
        items={YEARS}
        selectedIndex={value.year - CURRENT_YEAR}
        onSelect={idx => onChange({ ...value, year: CURRENT_YEAR + idx })}
        label="Năm"
      />
      <Text style={styles.separator}>  </Text>
      <ScrollPickerColumn
        items={HOURS}
        selectedIndex={value.hour}
        onSelect={hour => onChange({ ...value, hour })}
        label="Giờ"
      />
      <Text style={styles.separator}>:</Text>
      <ScrollPickerColumn
        items={MINUTES}
        selectedIndex={value.minute}
        onSelect={minute => onChange({ ...value, minute })}
        label="Phút"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 16,
    paddingHorizontal: Spacing.sm,
    paddingTop: 4,
    paddingBottom: 8,
  },
  column: { alignItems: 'center', flex: 1 },
  columnLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontFamily: 'Quicksand-SemiBold',
  },
  columnInner: {
    height: PICKER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  selectionOverlay: {
    position: 'absolute',
    top: ITEM_HEIGHT * PADDING_ITEMS,
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
    zIndex: 1,
    borderRadius: 8,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * PADDING_ITEMS,
    zIndex: 2,
    pointerEvents: 'none',
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * PADDING_ITEMS,
    zIndex: 2,
    pointerEvents: 'none',
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    ...Typography.bodyMedium,
    color: Colors.textLight,
    fontSize: 18,
  },
  itemTextSelected: {
    color: Colors.primary,
    fontFamily: 'Quicksand-Bold',
    fontSize: 20,
  },
  separator: {
    ...Typography.h3,
    color: Colors.textSecondary,
    paddingTop: 24,
    paddingHorizontal: 2,
  },
});
