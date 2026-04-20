// =============================================================================
// NutriPulse — Food Log Item Component
// =============================================================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { FontSize, BorderRadius, Spacing } from '@/theme/spacing';
import type { FoodEntry } from '@/stores/useNutritionStore';

interface FoodLogItemProps {
  entry: FoodEntry;
  onDelete: (id: string) => void;
}

export function FoodLogItem({ entry, onDelete }: FoodLogItemProps) {
  const handleDelete = () => {
    Alert.alert('Delete Entry', `Remove ${entry.food_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(entry.id) },
    ]);
  };

  return (
    <View style={styles.item}>
      <View style={styles.left}>
        <Text style={styles.foodName} numberOfLines={1}>
          {entry.food_name}
        </Text>
        <Text style={styles.quantity}>{entry.quantity_g}g</Text>
      </View>

      <View style={styles.macros}>
        <Text style={[styles.macroChip, { color: Colors.accent }]}>
          {Math.round(entry.calories)} kcal
        </Text>
        <Text style={[styles.macroDot, { color: Colors.protein }]}>
          P {Math.round(entry.protein)}
        </Text>
        <Text style={[styles.macroDot, { color: Colors.carbs }]}>
          C {Math.round(entry.carbs)}
        </Text>
        <Text style={[styles.macroDot, { color: Colors.fats }]}>
          F {Math.round(entry.fats)}
        </Text>
      </View>

      <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={12}>
        <Ionicons name="close-circle" size={20} color={Colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  left: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  foodName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  quantity: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  macros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginRight: Spacing.sm,
  },
  macroChip: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  macroDot: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 4,
  },
});
