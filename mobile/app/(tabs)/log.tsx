// =============================================================================
// NutriPulse — Manual Food Log Screen
// =============================================================================
import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNutritionStore } from '@/stores/useNutritionStore';
import { Colors } from '@/theme/colors';
import { FontSize, Spacing, BorderRadius } from '@/theme/spacing';

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const { addFood, searchFoods } = useNutritionStore();
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = useCallback(async (text: string) => {
    setFoodName(text);
    if (text.length >= 2) {
      const results = await searchFoods(text);
      setSearchResults(results);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, []);

  const selectFood = (item: any) => {
    setFoodName(item.name || item.food_name || '');
    setShowResults(false);
  };

  const handleAdd = async () => {
    if (!foodName.trim()) {
      Alert.alert('Error', 'Please enter a food name');
      return;
    }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity in grams');
      return;
    }
    setLoading(true);
    try {
      const result = await addFood(foodName.trim(), Number(quantity));
      if (result.status === 'ok') {
        Alert.alert('Added!', `${result.entry.food_name} — ${result.entry.calories} kcal`);
        setFoodName('');
        setQuantity('');
      } else if (result.status === 'not_found') {
        Alert.alert('Not Found', result.message || 'Food not found in database');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to add food';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const QUICK_FOODS = [
    { name: 'Chicken Breast', qty: 200 },
    { name: 'Rice', qty: 150 },
    { name: 'Egg', qty: 60 },
    { name: 'Banana', qty: 120 },
    { name: 'Oats', qty: 50 },
    { name: 'Milk', qty: 250 },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.header}>Log Food</Text>
        <Text style={styles.subheader}>Search our 80+ food database</Text>

        {/* Food Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Food Name</Text>
          <View style={styles.inputRow}>
            <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., chicken breast, rice..."
              placeholderTextColor={Colors.textMuted}
              value={foodName}
              onChangeText={handleSearch}
              autoCapitalize="none"
            />
          </View>
          {showResults && searchResults.length > 0 && (
            <View style={styles.dropdown}>
              {searchResults.slice(0, 6).map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.dropdownItem}
                  onPress={() => selectFood(item)}
                >
                  <Text style={styles.dropdownText}>{item.name || item.food_name}</Text>
                  <Text style={styles.dropdownCal}>{item.calories} kcal/100g</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Quantity Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quantity (grams)</Text>
          <View style={styles.inputRow}>
            <Ionicons name="scale" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., 200"
              placeholderTextColor={Colors.textMuted}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Add Button */}
        <TouchableOpacity
          onPress={handleAdd}
          disabled={loading}
          activeOpacity={0.8}
          style={styles.addBtnWrapper}
        >
          <LinearGradient
            colors={[Colors.accent, Colors.accentLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addBtn}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={22} color="#fff" />
                <Text style={styles.addBtnText}>Add to Log</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Add Section */}
        <Text style={styles.quickTitle}>Quick Add</Text>
        <View style={styles.quickGrid}>
          {QUICK_FOODS.map((food, i) => (
            <TouchableOpacity
              key={i}
              style={styles.quickChip}
              onPress={() => {
                setFoodName(food.name);
                setQuantity(String(food.qty));
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.quickName}>{food.name}</Text>
              <Text style={styles.quickQty}>{food.qty}g</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  header: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: -0.5 },
  subheader: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2, marginBottom: Spacing.xl },
  inputGroup: { marginBottom: Spacing.lg },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  inputIcon: { paddingLeft: Spacing.md },
  input: { flex: 1, color: Colors.text, fontSize: FontSize.md, paddingVertical: 14, paddingHorizontal: Spacing.sm },
  dropdown: {
    backgroundColor: 'rgba(15,15,30,0.95)', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, marginTop: 4, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dropdownText: { color: Colors.text, fontSize: FontSize.md },
  dropdownCal: { color: Colors.textMuted, fontSize: FontSize.sm },
  addBtnWrapper: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.xl },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  addBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
  quickTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.sm },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickChip: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    width: '48%' as any,
  },
  quickName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  quickQty: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
});
