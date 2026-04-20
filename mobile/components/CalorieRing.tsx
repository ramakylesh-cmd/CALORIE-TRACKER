// =============================================================================
// NutriPulse — Calorie Ring Component
// =============================================================================
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '@/theme/colors';
import { FontSize } from '@/theme/spacing';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CalorieRingProps {
  consumed: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}

export function CalorieRing({
  consumed,
  goal,
  size = 220,
  strokeWidth = 14,
}: CalorieRingProps) {
  const progress = useSharedValue(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const remaining = Math.max(goal - consumed, 0);
  const pct = Math.min(consumed / Math.max(goal, 1), 1);

  useEffect(() => {
    progress.value = withTiming(pct, {
      duration: 1200,
      easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
    });
  }, [pct]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={Colors.accent} />
            <Stop offset="100%" stopColor={Colors.accentLight} />
          </LinearGradient>
        </Defs>

        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress arc */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Center text */}
      <View style={styles.centerText}>
        <Animated.Text style={styles.remainingValue}>
          {remaining}
        </Animated.Text>
        <Animated.Text style={styles.remainingLabel}>
          kcal left
        </Animated.Text>
        <Animated.Text style={styles.consumedLabel}>
          {consumed} / {goal}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
  },
  remainingValue: {
    color: Colors.text,
    fontSize: FontSize.hero,
    fontWeight: '700',
    letterSpacing: -1,
  },
  remainingLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '500',
    marginTop: -2,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  consumedLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 6,
  },
});
