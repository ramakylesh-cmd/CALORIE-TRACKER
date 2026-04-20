// =============================================================================
// NutriPulse — Water Tracker Component
// =============================================================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { FontSize, BorderRadius, Spacing, Shadow } from '@/theme/spacing';
import { useWaterStore } from '@/stores/useWaterStore';
import { useEffect } from 'react';

const QUICK_ADD = [150, 250, 500];

export function WaterTracker() {
  const { consumedMl, goalMl, addWater, resetWater } = useWaterStore();
  const pct = Math.min(consumedMl / Math.max(goalMl, 1), 1);
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withTiming(pct, { duration: 800 });
  }, [pct]);

  const animatedFill = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%` as any,
  }));

  return (
    <View style={[styles.card, Shadow.card]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="water" size={18} color={Colors.water} />
          <Text style={styles.title}>Hydration</Text>
        </View>
        <TouchableOpacity onPress={resetWater} hitSlop={8}>
          <Ionicons name="refresh" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={styles.amount}>
        {Math.round(consumedMl)}{' '}
        <Text style={styles.goalText}>/ {goalMl} ml</Text>
      </Text>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, animatedFill]} />
      </View>

      <View style={styles.buttons}>
        {QUICK_ADD.map((ml) => (
          <TouchableOpacity
            key={ml}
            style={styles.addBtn}
            onPress={() => addWater(ml)}
            activeOpacity={0.7}
          >
            <Text style={styles.addBtnText}>+{ml}ml</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  amount: {
    color: Colors.water,
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  goalText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontWeight: '400',
  },
  track: {
    height: 8,
    backgroundColor: 'rgba(0,180,216,0.1)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.water,
    borderRadius: BorderRadius.full,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  addBtn: {
    flex: 1,
    backgroundColor: 'rgba(0,180,216,0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,180,216,0.2)',
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  addBtnText: {
    color: Colors.water,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
