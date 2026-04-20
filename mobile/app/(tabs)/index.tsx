// =============================================================================
// NutriPulse — Dashboard Screen
// =============================================================================
import React, { useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalorieRing } from '@/components/CalorieRing';
import { MacroBar } from '@/components/MacroBar';
import { StatCard } from '@/components/StatCard';
import { FoodLogItem } from '@/components/FoodLogItem';
import { WaterTracker } from '@/components/WaterTracker';
import { InsightCard } from '@/components/InsightCard';
import { useNutritionStore } from '@/stores/useNutritionStore';
import { useWaterStore } from '@/stores/useWaterStore';
import { Colors } from '@/theme/colors';
import { FontSize, Spacing, BorderRadius } from '@/theme/spacing';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { entries, goals, insights, isLoading, fetchTotals, deleteEntry } = useNutritionStore();
  const { setWater } = useWaterStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const totals = React.useMemo(() => {
    return entries.reduce(
      (acc, e) => ({
        calories: acc.calories + (e.calories || 0),
        protein: acc.protein + (e.protein || 0),
        carbs: acc.carbs + (e.carbs || 0),
        fats: acc.fats + (e.fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [entries]);

  const loadData = useCallback(async () => {
    await fetchTotals();
  }, []);

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  if (isLoading && entries.length === 0) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
      }
    >
      {/* Header */}
      <Text style={styles.header}>NutriPulse</Text>
      <Text style={styles.subheader}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </Text>

      {/* Calorie Ring */}
      <View style={styles.ringSection}>
        <CalorieRing consumed={Math.round(totals.calories)} goal={goals.calories} />
      </View>

      {/* Stat Cards Grid */}
      <View style={styles.statsGrid}>
        <StatCard icon="flame" label="Calories" value={Math.round(totals.calories)} subtitle={`/ ${goals.calories}`} color={Colors.accent} />
        <StatCard icon="fitness" label="Protein" value={`${Math.round(totals.protein)}g`} subtitle={`/ ${goals.protein}g`} color={Colors.protein} />
      </View>
      <View style={styles.statsGrid}>
        <StatCard icon="flash" label="Carbs" value={`${Math.round(totals.carbs)}g`} subtitle={`/ ${goals.carbs}g`} color={Colors.carbs} />
        <StatCard icon="water" label="Fats" value={`${Math.round(totals.fats)}g`} subtitle={`/ ${goals.fats}g`} color={Colors.fats} />
      </View>

      {/* Macro Bars */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Macro Breakdown</Text>
        <View style={styles.card}>
          <MacroBar label="Protein" current={totals.protein} goal={goals.protein} color={Colors.protein} />
          <MacroBar label="Carbs" current={totals.carbs} goal={goals.carbs} color={Colors.carbs} />
          <MacroBar label="Fats" current={totals.fats} goal={goals.fats} color={Colors.fats} />
        </View>
      </View>

      {/* Water Tracker */}
      <View style={styles.section}>
        <WaterTracker />
      </View>

      {/* Today's Log */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Today's Log{' '}
          <Text style={styles.entryCount}>({entries.length})</Text>
        </Text>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No food logged yet today</Text>
            <Text style={styles.emptyHint}>Tap "Log Food" to get started</Text>
          </View>
        ) : (
          entries.map((entry) => (
            <FoodLogItem key={entry.id} entry={entry} onDelete={deleteEntry} />
          ))
        )}
      </View>

      {/* Insights */}
      <View style={styles.section}>
        <InsightCard insights={insights} />
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.md },
  loadingContainer: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  header: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: -0.5 },
  subheader: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2, marginBottom: Spacing.lg },
  ringSection: { alignItems: 'center', marginBottom: Spacing.lg },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  section: { marginTop: Spacing.lg },
  sectionTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.sm },
  entryCount: { color: Colors.textMuted, fontWeight: '400' },
  card: {
    backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.glassBorder, padding: Spacing.md,
  },
  emptyState: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.xl, alignItems: 'center',
  },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '500' },
  emptyHint: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.xs },
});
