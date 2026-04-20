// =============================================================================
// NutriPulse — Login Screen (Google Sign-In)
// =============================================================================
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { GOOGLE_CLIENT_ID } from '@/services/config';
import { Colors } from '@/theme/colors';
import { FontSize, Spacing, BorderRadius } from '@/theme/spacing';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { loginWithGoogle } = useAuthStore();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token;
      loginWithGoogle(idToken).catch((err) => {
        Alert.alert('Login failed', err.message || 'Something went wrong');
      });
    }
  }, [response]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(217,4,41,0.15)', 'transparent']}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="pulse" size={48} color={Colors.accent} />
          </View>
          <Text style={styles.appName}>NutriPulse</Text>
          <Text style={styles.tagline}>
            AI-Powered Nutrition Tracking
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {[
            { icon: 'camera' as const, text: 'AI Photo Analysis' },
            { icon: 'barcode' as const, text: 'Barcode Scanner' },
            { icon: 'analytics' as const, text: 'Smart Insights' },
            { icon: 'water' as const, text: 'Hydration Tracking' },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name={f.icon} size={18} color={Colors.accent} />
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Sign-In Button */}
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={() => promptAsync()}
          disabled={!request}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.accent, Colors.accentLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.googleBtnGradient}
          >
            <Ionicons name="logo-google" size={20} color="#fff" />
            <Text style={styles.googleBtnText}>Sign in with Google</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Skip for dev */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => {
              // In dev mode, allow skipping auth for testing
              const { loginWithGoogle: _ , ...store } = useAuthStore.getState();
              useAuthStore.setState({
                user: { id: 0, email: 'dev@test.com', name: 'Dev User', picture: '' },
                isAuthenticated: true,
                isLoading: false,
              });
            }}
          >
            <Text style={styles.skipText}>Skip (Dev Mode)</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          By signing in, you agree to our Terms of Service
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(217,4,41,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217,4,41,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  appName: {
    color: Colors.text,
    fontSize: FontSize.xxl + 4,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
  },
  features: {
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  featureText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  googleBtn: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  googleBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  googleBtnText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  disclaimer: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
