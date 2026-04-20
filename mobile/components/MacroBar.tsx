// =============================================================================
// NutriPulse — Macro Progress Bar Component
// =============================================================================
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { FontSize, BorderRadius, Spacing } from '@/theme/spacing';

interface MacroBarProps {
  label: string;
  current: number;
  goal: number;
  color: string;
  unit?: string;
}

export function MacroBar({ label, current, goal, color, unit = 'g' }: MacroBarProps) {
  const progress = useSharedValue(0);
  const pct = Math.min(current / Math.max(goal, 1), 1);

  useEffect(() => {
    progress.value = withTiming(pct, {
      duration: 1000,
      easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
    });
  }, [pct]);

  const animatedWidth = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <View style={styles.labelLeft}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.value}>
          {Math.round(current)}{unit}{' '}
          <Text style={styles.goalText}>/ {Math.round(goal)}{unit}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: color },
            animatedWidth,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  goalText: {
    color: Colors.textMuted,
    fontWeight: '400',
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});
