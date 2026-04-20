// =============================================================================
// NutriPulse — Stat Card Component
// =============================================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { FontSize, BorderRadius, Spacing, Shadow } from '@/theme/spacing';
import { Ionicons } from '@expo/vector-icons';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
}

export function StatCard({ icon, label, value, subtitle, color }: StatCardProps) {
  return (
    <View style={[styles.card, Shadow.card]}>
      <LinearGradient
        colors={['rgba(15,15,30,0.9)', 'rgba(10,10,20,0.7)']}
        style={styles.gradient}
      >
        <View style={[styles.iconCircle, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  gradient: {
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  label: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
});
