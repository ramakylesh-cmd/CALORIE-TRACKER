import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';
import { useNutritionStore } from '@/stores/useNutritionStore';
import { Colors } from '@/theme/colors';
import { FontSize, Spacing, BorderRadius, Shadow } from '@/theme/spacing';

interface ScanResult {
  food_name: string;
  quantity_g: number;
  preview?: { calories: number; protein: number; carbs: number; fats: number };
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [adding, setAdding] = useState(false);
  const { addFood } = useNutritionStore();

  const handleBarcode = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    try {
      const res = await api.post('/scan_barcode', { barcode: data });
      if (res.data.status === 'ok') {
        setResult(res.data);
      } else {
        Alert.alert('Not Found', res.data.message || 'Barcode not recognized');
        setScanned(false);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Scan failed';
      Alert.alert('Error', msg);
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!result) return;
    setAdding(true);
    try {
      await addFood(result.food_name, result.quantity_g);
      Alert.alert('Added!', `${result.food_name} logged`);
      setResult(null);
      setScanned(false);
    } catch {
      Alert.alert('Error', 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  if (!permission) {
    return <View style={s.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[s.container, s.center, { paddingTop: insets.top }]}>
        <Ionicons name="barcode" size={64} color={Colors.textMuted} />
        <Text style={s.permTitle}>Camera Permission</Text>
        <Text style={s.permText}>Allow camera access to scan barcodes</Text>
        <TouchableOpacity onPress={requestPermission} style={s.permBtn}>
          <Text style={s.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {!result ? (
        <>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
            onBarcodeScanned={scanned ? undefined : handleBarcode}
          />
          {/* Scan overlay */}
          <View style={[s.overlayTop, { height: insets.top + 80 }]}>
            <Text style={s.scanTitle}>Scan Barcode</Text>
            <Text style={s.scanSub}>Point camera at a product barcode</Text>
          </View>
          <View style={s.scanFrame}>
            <View style={s.frameBorder} />
          </View>
          {loading && (
            <View style={s.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={s.loadingText}>Looking up barcode...</Text>
            </View>
          )}
          {scanned && !loading && !result && (
            <TouchableOpacity style={s.rescanBtn} onPress={() => setScanned(false)}>
              <Text style={s.rescanText}>Tap to Scan Again</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={[s.resultContainer, { paddingTop: insets.top + 20 }]}>
          <View style={[s.resultCard, Shadow.card]}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.success} style={s.resultIcon} />
            <Text style={s.rTitle}>{result.food_name}</Text>
            <Text style={s.rQty}>{result.quantity_g}g serving</Text>
            {result.preview && (
              <View style={s.macroRow}>
                {[
                  { v: result.preview.calories, l: 'kcal', c: Colors.accent },
                  { v: result.preview.protein, l: 'Protein', c: Colors.protein },
                  { v: result.preview.carbs, l: 'Carbs', c: Colors.carbs },
                  { v: result.preview.fats, l: 'Fats', c: Colors.fats },
                ].map((m, i) => (
                  <View key={i} style={s.macroItem}>
                    <Text style={[s.macroVal, { color: m.c }]}>{Math.round(m.v)}</Text>
                    <Text style={s.macroLabel}>{m.l}</Text>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity onPress={handleAdd} disabled={adding} style={s.addWrap}>
              <LinearGradient colors={[Colors.accent, Colors.accentLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.addBtn}>
                {adding ? <ActivityIndicator color="#fff" /> : (
                  <><Ionicons name="add-circle" size={20} color="#fff" /><Text style={s.addText}>Add to Log</Text></>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setResult(null); setScanned(false); }} style={s.scanAgain}>
              <Text style={s.scanAgainText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  permTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700', marginTop: Spacing.lg },
  permText: { color: Colors.textMuted, fontSize: FontSize.md, marginTop: Spacing.sm, textAlign: 'center' },
  permBtn: { backgroundColor: Colors.accent, borderRadius: BorderRadius.lg, paddingVertical: Spacing.sm + 4, paddingHorizontal: Spacing.xl, marginTop: Spacing.lg },
  permBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  overlayTop: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(3,5,16,0.8)', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: Spacing.md },
  scanTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' },
  scanSub: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 4 },
  scanFrame: { position: 'absolute', top: '30%', left: '15%', right: '15%', aspectRatio: 1.4, alignItems: 'center', justifyContent: 'center' },
  frameBorder: { width: '100%', height: '100%', borderWidth: 2, borderColor: Colors.accent, borderRadius: BorderRadius.lg, opacity: 0.7 },
  loadingOverlay: { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center' },
  loadingText: { color: Colors.text, fontSize: FontSize.md, marginTop: Spacing.sm },
  rescanBtn: { position: 'absolute', bottom: 100, left: Spacing.xl, right: Spacing.xl, backgroundColor: 'rgba(3,5,16,0.8)', borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  rescanText: { color: Colors.accent, fontSize: FontSize.md, fontWeight: '600' },
  resultContainer: { flex: 1, paddingHorizontal: Spacing.md, justifyContent: 'center' },
  resultCard: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.glassBorder, padding: Spacing.lg, alignItems: 'center' },
  resultIcon: { marginBottom: Spacing.md },
  rTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' },
  rQty: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 4, marginBottom: Spacing.lg },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: Spacing.lg },
  macroItem: { alignItems: 'center', flex: 1 },
  macroVal: { fontSize: FontSize.lg, fontWeight: '700' },
  macroLabel: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  addWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden', width: '100%' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  addText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
  scanAgain: { marginTop: Spacing.md, paddingVertical: Spacing.sm },
  scanAgainText: { color: Colors.textMuted, fontSize: FontSize.md },
});
