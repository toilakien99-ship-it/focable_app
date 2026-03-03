import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Colors, Typography, Spacing } from '@/lib/theme';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface ScrollPickerColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  label?: string;
}

function ScrollPickerColumn({ items, selectedIndex, onSelect, label }: ScrollPickerColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const paddedItems = ['', '', ...items, '', ''];

  useEffect(() => {
    const offset = selectedIndex * ITEM_HEIGHT;
    scrollRef.current?.scrollTo({ y: offset, animated: false });
  }, [selectedIndex]);

  function handleScrollEnd(e: any) {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    if (clamped !== selectedIndex) {
      onSelect(clamped);
    }
    scrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
  }

  return (
    <View style={styles.column}>
      {label ? <Text style={styles.columnLabel}>{label}</Text> : null}
      <View style={styles.columnInner}>
        <View style={styles.selectionOverlay} pointerEvents="none" />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={handleScrollEnd}
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        >
          {items.map((item, idx) => (
            <View key={idx} style={styles.item}>
              <Text style={[styles.itemText, idx === selectedIndex && styles.itemTextSelected]}>
                {item}
              </Text>
            </View>
          ))}
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
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
    zIndex: 1,
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
