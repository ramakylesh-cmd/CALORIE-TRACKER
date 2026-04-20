import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNutritionStore, ProfileData } from '@/stores/useNutritionStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Colors } from '@/theme/colors';
import { FontSize, Spacing, BorderRadius, Shadow } from '@/theme/spacing';

const GENDERS = ['male', 'female'];
const ACTIVITIES = [
  { key: 'sedentary', label: 'Sedentary' },
  { key: 'light', label: 'Light' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'active', label: 'Active' },
  { key: 'very_active', label: 'Very Active' },
];
const GOALS = [
  { key: 'lose', label: 'Lose Weight' },
  { key: 'maintain', label: 'Maintain' },
  { key: 'gain', label: 'Gain Muscle' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, goals, updateProfile, fetchTotals } = useNutritionStore();
  const { user, logout } = useAuthStore();
  const [form, setForm] = useState<ProfileData>({ ...profile });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm({ ...profile }); }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateProfile(form);
      Alert.alert('Saved!', `Daily target: ${res.goals.calories} kcal`);
      fetchTotals();
    } catch {
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const Chip = ({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[cs.chip, selected && cs.chipActive]}
      activeOpacity={0.7}
    >
      <Text style={[cs.chipText, selected && cs.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.header}>Profile</Text>

      {/* User Info */}
      {user && (
        <View style={[s.card, Shadow.card]}>
          <View style={s.userRow}>
            <View style={s.avatar}>
              <Ionicons name="person" size={24} color={Colors.accent} />
            </View>
            <View style={s.userInfo}>
              <Text style={s.userName}>{user.name}</Text>
              <Text style={s.userEmail}>{user.email}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Gender */}
      <Text style={s.label}>Gender</Text>
      <View style={s.chipRow}>
        {GENDERS.map((g) => (
          <Chip key={g} label={g.charAt(0).toUpperCase() + g.slice(1)} selected={form.gender === g} onPress={() => setForm({ ...form, gender: g })} />
        ))}
      </View>

      {/* Age, Height, Weight */}
      <View style={s.fieldRow}>
        <View style={s.field}>
          <Text style={s.label}>Age</Text>
          <TextInput style={s.input} value={String(form.age)} onChangeText={(v) => setForm({ ...form, age: parseInt(v) || 0 })} keyboardType="numeric" />
        </View>
        <View style={s.field}>
          <Text style={s.label}>Height (cm)</Text>
          <TextInput style={s.input} value={String(form.height_cm)} onChangeText={(v) => setForm({ ...form, height_cm: parseFloat(v) || 0 })} keyboardType="numeric" />
        </View>
        <View style={s.field}>
          <Text style={s.label}>Weight (kg)</Text>
          <TextInput style={s.input} value={String(form.weight_kg)} onChangeText={(v) => setForm({ ...form, weight_kg: parseFloat(v) || 0 })} keyboardType="numeric" />
        </View>
      </View>

      {/* Activity Level */}
      <Text style={s.label}>Activity Level</Text>
      <View style={s.chipRow}>
        {ACTIVITIES.map((a) => (
          <Chip key={a.key} label={a.label} selected={form.activity === a.key} onPress={() => setForm({ ...form, activity: a.key })} />
        ))}
      </View>

      {/* Goal */}
      <Text style={s.label}>Goal</Text>
      <View style={s.chipRow}>
        {GOALS.map((g) => (
          <Chip key={g.key} label={g.label} selected={form.goal === g.key} onPress={() => setForm({ ...form, goal: g.key })} />
        ))}
      </View>

      {/* Goals Display */}
      <View style={[s.card, { marginTop: Spacing.lg }]}>
        <Text style={s.goalsTitle}>Current Targets</Text>
        <View style={s.goalsGrid}>
          {[
            { l: 'Calories', v: `${goals.calories} kcal`, c: Colors.accent },
            { l: 'Protein', v: `${goals.protein}g`, c: Colors.protein },
            { l: 'Carbs', v: `${goals.carbs}g`, c: Colors.carbs },
            { l: 'Fats', v: `${goals.fats}g`, c: Colors.fats },
          ].map((item, i) => (
            <View key={i} style={s.goalItem}>
              <Text style={[s.goalVal, { color: item.c }]}>{item.v}</Text>
              <Text style={s.goalLabel}>{item.l}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity onPress={handleSave} disabled={saving} style={s.saveWrap} activeOpacity={0.8}>
        <LinearGradient colors={[Colors.accent, Colors.accentLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtn}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={s.saveText}>Calculate & Save</Text></>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity onPress={() => Alert.alert('Logout', 'Are you sure?', [{ text: 'Cancel' }, { text: 'Logout', style: 'destructive', onPress: logout }])} style={s.logoutBtn}>
        <Ionicons name="log-out" size={18} color={Colors.danger} />
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  header: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.lg },
  card: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.glassBorder, padding: Spacing.md, marginBottom: Spacing.lg },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(217,4,41,0.12)', alignItems: 'center', justifyContent: 'center' },
  userInfo: { flex: 1 },
  userName: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  userEmail: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2 },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.sm, marginTop: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  fieldRow: { flexDirection: 'row', gap: Spacing.sm },
  field: { flex: 1 },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.text, fontSize: FontSize.md, paddingVertical: 12, paddingHorizontal: Spacing.md, textAlign: 'center' },
  goalsTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600', marginBottom: Spacing.sm },
  goalsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  goalItem: { alignItems: 'center' },
  goalVal: { fontSize: FontSize.lg, fontWeight: '700' },
  goalLabel: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  saveWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.xl },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  saveText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.lg, paddingVertical: Spacing.md },
  logoutText: { color: Colors.danger, fontSize: FontSize.md, fontWeight: '600' },
});

const cs = StyleSheet.create({
  chip: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  chipActive: { backgroundColor: 'rgba(217,4,41,0.15)', borderColor: Colors.accent },
  chipText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '500' },
  chipTextActive: { color: Colors.accent, fontWeight: '700' },
});
