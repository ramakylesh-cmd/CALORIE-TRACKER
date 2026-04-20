// =============================================================================
// NutriPulse — Insight Card Component
// =============================================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { FontSize, BorderRadius, Spacing } from '@/theme/spacing';

interface InsightCardProps {
  insights: string[];
}

export function InsightCard({ insights }: InsightCardProps) {
  if (!insights || insights.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color={Colors.warning} />
        <Text style={styles.title}>AI Insights</Text>
      </View>
      {insights.map((insight, i) => (
        <View key={i} style={styles.insightRow}>
          <Text style={styles.bullet}>›</Text>
          <Text style={styles.insightText}>{insight}</Text>
        </View>
      ))}
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
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  insightRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  bullet: {
    color: Colors.accent,
    fontSize: FontSize.lg,
    fontWeight: '700',
    lineHeight: 20,
  },
  insightText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});
