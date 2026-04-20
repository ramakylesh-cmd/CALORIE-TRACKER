import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Alert,
  ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';
import { useNutritionStore } from '@/stores/useNutritionStore';
import { Colors } from '@/theme/colors';
import { FontSize, Spacing, BorderRadius, Shadow } from '@/theme/spacing';

interface AnalysisResult {
  food_name: string;
  quantity_g: number;
  nutrition: { calories: number; protein: number; carbs: number; fats: number };
}

export default function PhotoScreen() {
  const insets = useSafeAreaInsets();
  const { addAiEntry } = useNutritionStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [adding, setAdding] = useState(false);

  const pickImage = async (fromCamera: boolean) => {
    const picker = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const res = await picker({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!res.canceled && res.assets[0]?.base64) {
      setImageUri(res.assets[0].uri);
      setResult(null);
      analyzeImage(res.assets[0].base64);
    }
  };

  const analyzeImage = async (base64: string) => {
    setAnalyzing(true);
    try {
      const res = await api.post('/analyze_photo', {
        image: `data:image/jpeg;base64,${base64}`,
        manual_name: manualName || undefined,
      });
      if (res.data.food_name) {
        setResult({
          food_name: res.data.food_name,
          quantity_g: res.data.quantity_g,
          nutrition: res.data.nutrition || res.data.preview || {},
        });
      } else {
        Alert.alert('Error', res.data.message || 'Could not analyze image');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddToLog = async () => {
    if (!result) return;
    setAdding(true);
    try {
      await addAiEntry(result.food_name, result.quantity_g, result.nutrition);
      Alert.alert('Added!', `${result.food_name} logged`);
      setResult(null);
      setImageUri(null);
      setManualName('');
    } catch {
      Alert.alert('Error', 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.header}>AI Food Scanner</Text>
      <Text style={s.sub}>Take a photo and let AI identify your food</Text>

      <View style={s.row}>
        <TouchableOpacity style={s.pickBtn} onPress={() => pickImage(true)}>
          <Ionicons name="camera" size={28} color={Colors.accent} />
          <Text style={s.pickLabel}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.pickBtn} onPress={() => pickImage(false)}>
          <Ionicons name="images" size={28} color={Colors.fats} />
          <Text style={s.pickLabel}>Gallery</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.label}>Food hint (optional)</Text>
      <TextInput
        style={s.hint}
        placeholder="e.g., biryani, pasta..."
        placeholderTextColor={Colors.textMuted}
        value={manualName}
        onChangeText={setManualName}
      />

      {imageUri && (
        <View style={s.preview}>
          <Image source={{ uri: imageUri }} style={s.img} resizeMode="cover" />
          {analyzing && (
            <View style={s.overlay}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={s.overlayText}>Analyzing...</Text>
            </View>
          )}
        </View>
      )}

      {result && (
        <View style={[s.resultCard, Shadow.card]}>
          <Text style={s.rTitle}>{result.food_name}</Text>
          <Text style={s.rQty}>{result.quantity_g}g estimated</Text>
          <View style={s.macroRow}>
            {[
              { v: result.nutrition.calories, l: 'kcal', c: Colors.accent },
              { v: result.nutrition.protein, l: 'Protein', c: Colors.protein },
              { v: result.nutrition.carbs, l: 'Carbs', c: Colors.carbs },
              { v: result.nutrition.fats, l: 'Fats', c: Colors.fats },
            ].map((m, i) => (
              <View key={i} style={s.macroItem}>
                <Text style={[s.macroVal, { color: m.c }]}>{Math.round(m.v)}{m.l === 'kcal' ? '' : 'g'}</Text>
                <Text style={s.macroLabel}>{m.l}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity onPress={handleAddToLog} disabled={adding} style={s.addWrap}>
            <LinearGradient colors={[Colors.accent, Colors.accentLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.addBtn}>
              {adding ? <ActivityIndicator color="#fff" /> : (
                <><Ionicons name="add-circle" size={20} color="#fff" /><Text style={s.addText}>Add to Log</Text></>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  header: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  sub: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2, marginBottom: Spacing.xl },
  row: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  pickBtn: { flex: 1, alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, paddingVertical: Spacing.xl },
  pickLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  hint: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.text, fontSize: FontSize.md, paddingVertical: 14, paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  preview: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  img: { width: '100%', height: 250 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,5,16,0.7)', alignItems: 'center', justifyContent: 'center' },
  overlayText: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600', marginTop: Spacing.sm },
  resultCard: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.glassBorder, padding: Spacing.lg },
  rTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' },
  rQty: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 4, marginBottom: Spacing.md },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  macroItem: { alignItems: 'center' },
  macroVal: { fontSize: FontSize.lg, fontWeight: '700' },
  macroLabel: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  addWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  addText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
});
